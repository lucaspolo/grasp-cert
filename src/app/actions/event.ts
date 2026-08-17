"use server";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireSession } from "@/lib/auth-utils";
import {
  adminGroupIds,
  assertGroupAdmin,
  isPlatformAdmin,
  requireEventGroupAdmin,
  requireGroupAdmin,
} from "@/lib/group-access";
import { recordAudit } from "@/lib/audit";
import { parseBRDateTime, localToUTC } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const brDateTimeField = (label: string) =>
  z
    .string()
    .min(1, `${label} é obrigatória`)
    .transform((v) => parseBRDateTime(v))
    .refine((d): d is Date => d !== null, { message: "Data/hora inválida. Use DD/MM/AAAA HH:mm" });

const eventSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  groupId: z.string().min(1, "Escolha o grupo organizador"),
  startDate: brDateTimeField("Data de início"),
  endDate: brDateTimeField("Data de fim"),
  bandIds: z.array(z.string()).default([]),
  modeIds: z.array(z.string()).default([]),
  observations: z.string().optional(),
  templateId: z.string().optional(),
});

export type EventFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

function parseEventForm(formData: FormData) {
  return eventSchema.safeParse({
    name: formData.get("name"),
    groupId: formData.get("groupId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    bandIds: formData.getAll("bandIds") as string[],
    modeIds: formData.getAll("modeIds") as string[],
    observations: formData.get("observations"),
    templateId: formData.get("templateId") || undefined,
  });
}

/**
 * O template do evento tem de ser do próprio grupo ou global da plataforma —
 * senão um grupo usaria a arte de outro só mandando o id no formulário.
 */
async function validateTemplateForGroup(
  templateId: string | undefined,
  groupId: string
): Promise<Record<string, string[]> | null> {
  if (!templateId) return null;

  const template = await prisma.template.findUnique({
    where: { id: templateId },
    select: { groupId: true },
  });

  if (!template || (template.groupId !== null && template.groupId !== groupId)) {
    return { templateId: ["Template indisponível para este grupo."] };
  }
  return null;
}

/**
 * Filtro de eventos visíveis: tudo para quem administra a plataforma; os
 * grupos administrados (mais os eventos designados, no caso do operador) para
 * os demais. Lança "Forbidden" para quem não alcança evento nenhum.
 */
async function eventScopeFilter(
  session: Awaited<ReturnType<typeof requireSession>>
) {
  if (isPlatformAdmin(session.user.role)) return undefined;

  const groupIds = await adminGroupIds(session.user.id);
  const or: Prisma.EventWhereInput[] = [];

  if (groupIds.length > 0) or.push({ groupId: { in: groupIds } });
  if (session.user.role === "OPERATOR") {
    or.push({ operators: { some: { userId: session.user.id } } });
  }

  if (or.length === 0) throw new Error("Forbidden");
  return { OR: or };
}

export async function createEvent(
  _prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const parsed = parseEventForm(formData);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { name, groupId, startDate, endDate, observations, templateId } =
    parsed.data;

  let session;
  try {
    session = await requireGroupAdmin(groupId);
  } catch {
    return { errors: { groupId: ["Você não administra este grupo."] } };
  }

  const templateErrors = await validateTemplateForGroup(templateId, groupId);
  if (templateErrors) return { errors: templateErrors };

  const timezone = (formData.get("timezone") as string) || "UTC";

  const event = await prisma.event.create({
    data: {
      name,
      groupId,
      startDate: localToUTC(startDate, timezone),
      endDate: localToUTC(endDate, timezone),
      observations: observations || null,
      templateId: templateId || null,
      eventBands: {
        create: parsed.data.bandIds.map((bandId) => ({ bandId })),
      },
      eventModes: {
        create: parsed.data.modeIds.map((modeId) => ({ modeId })),
      },
    },
  });

  await recordAudit(session.user, {
    action: "event.created",
    entityType: "event",
    entityId: event.id,
    summary: `Evento ${name} criado`,
    details: { groupId },
  });

  revalidatePath("/admin/events");
  revalidatePath("/");
  redirect("/admin/events");
}

export async function updateEvent(
  eventId: string,
  _prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  // Permissão sobre o evento COMO ESTÁ hoje: quem não administra o grupo atual
  // não pode nem editá-lo, nem transferi-lo para outro grupo.
  const session = await requireEventGroupAdmin(eventId);

  const parsed = parseEventForm(formData);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { name, groupId, startDate, endDate, observations, templateId } =
    parsed.data;

  // Mudar de grupo exige administrar também o grupo de destino.
  try {
    await assertGroupAdmin(session, groupId);
  } catch {
    return { errors: { groupId: ["Você não administra este grupo."] } };
  }

  const templateErrors = await validateTemplateForGroup(templateId, groupId);
  if (templateErrors) return { errors: templateErrors };

  const timezone = (formData.get("timezone") as string) || "UTC";

  await prisma.$transaction([
    prisma.eventBand.deleteMany({ where: { eventId } }),
    prisma.eventMode.deleteMany({ where: { eventId } }),
    prisma.event.update({
      where: { id: eventId },
      data: {
        name,
        groupId,
        startDate: localToUTC(startDate, timezone),
        endDate: localToUTC(endDate, timezone),
        observations: observations || null,
        templateId: templateId || null,
        eventBands: {
          create: parsed.data.bandIds.map((bandId) => ({ bandId })),
        },
        eventModes: {
          create: parsed.data.modeIds.map((modeId) => ({ modeId })),
        },
      },
    }),
  ]);

  await recordAudit(session.user, {
    action: "event.updated",
    entityType: "event",
    entityId: eventId,
    summary: `Evento ${name} atualizado`,
    details: { groupId },
  });

  revalidatePath("/admin/events");
  revalidatePath("/");
  redirect("/admin/events");
}

export async function deleteEvent(eventId: string) {
  const session = await requireEventGroupAdmin(eventId);

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { name: true, _count: { select: { qsos: true } } },
  });
  if (!event) return;

  await prisma.event.delete({ where: { id: eventId } });

  await recordAudit(session.user, {
    action: "event.deleted",
    entityType: "event",
    entityId: eventId,
    summary: `Evento ${event.name} excluído (${event._count.qsos} QSOs em cascata)`,
    details: { name: event.name, qsoCount: event._count.qsos },
  });

  revalidatePath("/admin/events");
}

/**
 * Eventos que a sessão enxerga na área administrativa — já filtrados por
 * grupo/designação, então a página não precisa refazer o recorte.
 */
export async function listEvents() {
  const session = await requireSession();
  const where = await eventScopeFilter(session);

  return prisma.event.findMany({
    where,
    orderBy: { startDate: "desc" },
    include: {
      _count: { select: { qsos: true } },
      group: { select: { id: true, name: true } },
      template: { select: { id: true, name: true } },
      eventBands: { include: { band: true } },
      eventModes: { include: { mode: true } },
    },
  });
}

export async function getEvent(id: string) {
  const session = await requireSession();
  const where = await eventScopeFilter(session);

  // O filtro entra no `where` da própria busca: pedir um evento de outro grupo
  // devolve null (404), sem vazar que ele existe.
  return prisma.event.findFirst({
    where: where ? { AND: [{ id }, where] } : { id },
    include: {
      group: { select: { id: true, name: true } },
      template: { select: { id: true, name: true } },
      eventBands: { include: { band: true } },
      eventModes: { include: { mode: true } },
    },
  });
}

// Intencionalmente pública (sem requireRole): alimenta a página inicial
// sem login, que exibe nome, datas, faixas/modos e observações do evento.
export async function listPublicEvents() {
  const now = new Date();
  return prisma.event.findMany({
    where: { endDate: { gte: now } },
    orderBy: { startDate: "asc" },
    include: {
      group: { select: { id: true, name: true } },
      eventBands: { include: { band: true } },
      eventModes: { include: { mode: true } },
    },
  });
}

export type PublicEventStats = {
  id: string;
  name: string;
  groupName: string;
  startDate: Date;
  endDate: Date;
  observations: string | null;
  bands: string[];
  modes: string[];
  totalQsos: number;
  participants: number;
  ranking: { callsign: string; qsos: number }[];
};

const RANKING_SIZE = 20;

/**
 * Estatísticas públicas de um evento (sem login). Expõe SOMENTE dados
 * públicos: nome/período/faixas/modos e observações do evento (já visíveis
 * na home), mais agregados de QSO (total, participantes distintos, ranking
 * por indicativo). Nunca retorna observações de QSO nem dados de conta
 * (e-mail, cidade). Agregações via count/groupBy — sem N+1.
 */
export async function getPublicEventStats(
  eventId: string
): Promise<PublicEventStats | null> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      observations: true,
      group: { select: { name: true } },
      eventBands: { include: { band: true } },
      eventModes: { include: { mode: true } },
    },
  });
  if (!event) return null;

  const [totalQsos, grouped] = await Promise.all([
    prisma.qSO.count({ where: { eventId } }),
    prisma.qSO.groupBy({
      by: ["participantCallsign"],
      where: { eventId },
      _count: { participantCallsign: true },
      orderBy: { _count: { participantCallsign: "desc" } },
    }),
  ]);

  return {
    id: event.id,
    name: event.name,
    groupName: event.group.name,
    startDate: event.startDate,
    endDate: event.endDate,
    observations: event.observations,
    bands: event.eventBands.map((eb) => eb.band.label),
    modes: event.eventModes.map((em) => em.mode.label),
    totalQsos,
    participants: grouped.length,
    ranking: grouped.slice(0, RANKING_SIZE).map((g) => ({
      callsign: g.participantCallsign,
      qsos: g._count.participantCallsign,
    })),
  };
}
