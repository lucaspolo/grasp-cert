"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, requireEventOperator } from "@/lib/auth-utils";
import { parseBRDateTime } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type QSOFormState = {
  errors?: Record<string, string[]>;
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
    .transform((v) => parseBRDateTime(v))
    .refine((d): d is Date => d !== null, { message: "Data/hora inválida. Use DD/MM/AAAA HH:mm" }),
  bandId: z.string().min(1, "Banda é obrigatória"),
  modeId: z.string().min(1, "Modo é obrigatório"),
  frequency: z.string().optional(),
  rstSent: z.string().min(1, "RST enviado é obrigatório"),
  rstReceived: z.string().min(1, "RST recebido é obrigatório"),
  observations: z.string().optional(),
});

export async function createQSO(
  eventId: string,
  _prevState: QSOFormState,
  formData: FormData
): Promise<QSOFormState> {
  const session = await requireRole(["OWNER", "ADMIN", "OPERATOR"]);

  // OPERATORs can only create QSOs for events they are assigned to
  if (session.user.role === "OPERATOR") {
    await requireEventOperator(eventId, session.user.id);
  }

  const parsed = qsoSchema.safeParse({
    participantCallsign: formData.get("participantCallsign"),
    dateTime: formData.get("dateTime"),
    bandId: formData.get("bandId"),
    modeId: formData.get("modeId"),
    frequency: formData.get("frequency") || undefined,
    rstSent: formData.get("rstSent"),
    rstReceived: formData.get("rstReceived"),
    observations: formData.get("observations"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { participantCallsign, dateTime, bandId, modeId, frequency, rstSent, rstReceived, observations } =
    parsed.data;

  // Validate that bandId and modeId belong to this event
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
  if (Object.keys(fieldErrors).length > 0) {
    return { errors: fieldErrors };
  }

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

  revalidatePath(`/admin/events/${eventId}/qsos`);
  return { message: "QSO adicionado com sucesso." };
}

export async function deleteQSO(qsoId: string, eventId: string) {
  await requireRole(["OWNER", "ADMIN"]);

  await prisma.qSO.delete({ where: { id: qsoId } });

  revalidatePath(`/admin/events/${eventId}/qsos`);
}

export async function listQSOsByEvent(eventId: string) {
  return prisma.qSO.findMany({
    where: { eventId },
    orderBy: { dateTime: "desc" },
    include: {
      band: true,
      modeRef: true,
    },
  });
}
