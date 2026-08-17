"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireEventAccess, type EventAccess } from "@/lib/group-access";
import { recordAudit } from "@/lib/audit";
import { parseBRDateTime, localToUTC } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type QSOFormState = {
  errors?: Record<string, string[]>;
  /** Erro geral do formulário (ex.: registro inexistente), não atrelado a um campo. */
  error?: string;
  message?: string;
};

const qsoSchema = z.object({
  participantCallsign: z
    .string()
    .min(3, "Indicativo deve ter no mínimo 3 caracteres")
    .max(10)
    .transform((v) => v.toUpperCase().trim()),
  dateTime: z
    .string()
    .min(1, "Data/hora é obrigatória")
    // O horário digitado vale como UTC (o formulário rotula "Data/Hora (UTC)" e a
    // tabela exibe em UTC), independentemente do fuso do servidor.
    .transform((v) => {
      const parsed = parseBRDateTime(v);
      return parsed ? localToUTC(parsed, "UTC") : null;
    })
    .refine((d): d is Date => d !== null, { message: "Data/hora inválida. Use DD/MM/AAAA HH:mm" }),
  bandId: z.string().min(1, "Banda é obrigatória"),
  modeId: z.string().min(1, "Modo é obrigatório"),
  frequency: z.string().optional(),
  rstSent: z.string().min(1, "RST enviado é obrigatório"),
  rstReceived: z.string().min(1, "RST recebido é obrigatório"),
  observations: z.string().optional(),
});

function parseQSOForm(formData: FormData) {
  return qsoSchema.safeParse({
    participantCallsign: formData.get("participantCallsign"),
    dateTime: formData.get("dateTime"),
    bandId: formData.get("bandId"),
    modeId: formData.get("modeId"),
    frequency: formData.get("frequency") || undefined,
    rstSent: formData.get("rstSent"),
    rstReceived: formData.get("rstReceived"),
    observations: formData.get("observations"),
  });
}

/** Confere se banda e modo pertencem ao evento. Retorna os erros de campo, ou null. */
async function validateEventBandMode(
  eventId: string,
  bandId: string,
  modeId: string
): Promise<Record<string, string[]> | null> {
  const [eventBand, eventMode] = await Promise.all([
    prisma.eventBand.findUnique({
      where: { eventId_bandId: { eventId, bandId } },
    }),
    prisma.eventMode.findUnique({
      where: { eventId_modeId: { eventId, modeId } },
    }),
  ]);

  const fieldErrors: Record<string, string[]> = {};
  if (!eventBand) {
    fieldErrors.bandId = ["Banda não pertence a este evento"];
  }
  if (!eventMode) {
    fieldErrors.modeId = ["Modo não pertence a este evento"];
  }
  return Object.keys(fieldErrors).length > 0 ? fieldErrors : null;
}

/**
 * Quem administra a plataforma ou o grupo dono do evento gerencia qualquer
 * QSO. O operador designado só mexe nos próprios lançamentos (operatorCallsign
 * igual ao seu) — QSOs sem operatorCallsign (importações antigas) ficam
 * restritos a quem administra.
 *
 * O acesso ao evento já foi conferido por `requireEventAccess`; aqui só resta
 * a regra de autoria.
 */
function assertQSOAuthorship(
  access: EventAccess,
  qso: { operatorCallsign: string | null }
) {
  if (access.scope !== "operator") return;

  if (
    !qso.operatorCallsign ||
    qso.operatorCallsign !== access.session.user.callsign
  ) {
    throw new Error("Forbidden");
  }
}

export async function createQSO(
  eventId: string,
  _prevState: QSOFormState,
  formData: FormData
): Promise<QSOFormState> {
  const { session } = await requireEventAccess(eventId);

  const parsed = parseQSOForm(formData);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { participantCallsign, dateTime, bandId, modeId, frequency, rstSent, rstReceived, observations } =
    parsed.data;

  const bandModeErrors = await validateEventBandMode(eventId, bandId, modeId);
  if (bandModeErrors) {
    return { errors: bandModeErrors };
  }

  try {
    await prisma.qSO.create({
      data: {
        eventId,
        participantCallsign,
        operatorCallsign: session.user.callsign ?? null,
        dateTime,
        bandId,
        modeId,
        frequency: frequency || "",
        rstSent,
        rstReceived,
        observations: observations || null,
      },
    });
  } catch (error) {
    // Violação da constraint de unicidade do QSO (mesmo contato repetido).
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        errors: {
          participantCallsign: [
            "QSO duplicado — já existe um contato idêntico neste evento.",
          ],
        },
      };
    }
    throw error;
  }

  revalidatePath(`/admin/events/${eventId}/qsos`);
  return { message: "QSO adicionado com sucesso." };
}

export async function updateQSO(
  qsoId: string,
  eventId: string,
  _prevState: QSOFormState,
  formData: FormData
): Promise<QSOFormState> {
  const access = await requireEventAccess(eventId);
  const session = access.session;

  const qso = await prisma.qSO.findUnique({
    where: { id: qsoId },
    select: {
      eventId: true,
      operatorCallsign: true,
      participantCallsign: true,
      dateTime: true,
      bandId: true,
      modeId: true,
      frequency: true,
      rstSent: true,
      rstReceived: true,
      observations: true,
      event: { select: { name: true } },
    },
  });
  if (!qso) return { error: "QSO não encontrado." };

  // O eventId vem da URL/formulário: se não bater com o do registro, é adulteração.
  if (qso.eventId !== eventId) throw new Error("Forbidden");

  assertQSOAuthorship(access, qso);

  const parsed = parseQSOForm(formData);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { participantCallsign, dateTime, bandId, modeId, frequency, rstSent, rstReceived, observations } =
    parsed.data;

  const bandModeErrors = await validateEventBandMode(eventId, bandId, modeId);
  if (bandModeErrors) {
    return { errors: bandModeErrors };
  }

  // operatorCallsign não é alterado: o autor do lançamento é preservado.
  const data = {
    participantCallsign,
    dateTime,
    bandId,
    modeId,
    frequency: frequency || "",
    rstSent,
    rstReceived,
    observations: observations || null,
  };

  try {
    await prisma.qSO.update({ where: { id: qsoId }, data });
  } catch (error) {
    // A constraint cobre evento + indicativo + data/hora + banda + modo, todos editáveis.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        errors: {
          participantCallsign: [
            "QSO duplicado — já existe um contato idêntico neste evento.",
          ],
        },
      };
    }
    throw error;
  }

  await recordAudit(session.user, {
    action: "qso.updated",
    entityType: "qso",
    entityId: qsoId,
    summary: `QSO de ${participantCallsign} atualizado no evento ${qso.event.name}`,
    details: { eventId, changes: diffQSO(qso, data) },
  });

  revalidatePath(`/admin/events/${eventId}/qsos`);
  return { message: "QSO atualizado com sucesso." };
}

/** Campos que mudaram, no formato { campo: { de, para } }, para a auditoria. */
function diffQSO(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Record<string, { de: string; para: string }> {
  const changes: Record<string, { de: string; para: string }> = {};
  for (const [field, value] of Object.entries(after)) {
    const from = normalizeForDiff(before[field]);
    const to = normalizeForDiff(value);
    if (from !== to) changes[field] = { de: from, para: to };
  }
  return changes;
}

function normalizeForDiff(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return value == null ? "" : String(value);
}

export async function deleteQSO(qsoId: string, eventId: string) {
  const access = await requireEventAccess(eventId);
  const session = access.session;

  const qso = await prisma.qSO.findUnique({
    where: { id: qsoId },
    select: {
      eventId: true,
      operatorCallsign: true,
      participantCallsign: true,
      dateTime: true,
      event: { select: { name: true } },
    },
  });
  if (!qso) return;

  if (qso.eventId !== eventId) throw new Error("Forbidden");

  assertQSOAuthorship(access, qso);

  await prisma.qSO.delete({ where: { id: qsoId } });

  await recordAudit(session.user, {
    action: "qso.deleted",
    entityType: "qso",
    entityId: qsoId,
    summary: `QSO de ${qso.participantCallsign} excluído do evento ${qso.event.name}`,
    details: {
      participantCallsign: qso.participantCallsign,
      dateTime: qso.dateTime.toISOString(),
      eventId,
    },
  });

  revalidatePath(`/admin/events/${eventId}/qsos`);
}

export async function listQSOsByEvent(eventId: string) {
  await requireEventAccess(eventId);
  return prisma.qSO.findMany({
    where: { eventId },
    orderBy: { dateTime: "desc" },
    include: {
      band: true,
      modeRef: true,
    },
  });
}
