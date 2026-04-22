"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

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
  dateTime: z.string().refine((v) => !isNaN(Date.parse(v)), {
    message: "Data/hora inválida",
  }),
  frequency: z.string().min(1, "Frequência é obrigatória"),
  mode: z.string().min(1, "Modalidade é obrigatória"),
  rstSent: z.string().min(1, "RST enviado é obrigatório"),
  rstReceived: z.string().min(1, "RST recebido é obrigatório"),
  observations: z.string().optional(),
});

export async function createQSO(
  eventId: string,
  _prevState: QSOFormState,
  formData: FormData
): Promise<QSOFormState> {
  await requireAdmin();

  const parsed = qsoSchema.safeParse({
    participantCallsign: formData.get("participantCallsign"),
    dateTime: formData.get("dateTime"),
    frequency: formData.get("frequency"),
    mode: formData.get("mode"),
    rstSent: formData.get("rstSent"),
    rstReceived: formData.get("rstReceived"),
    observations: formData.get("observations"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { participantCallsign, dateTime, frequency, mode, rstSent, rstReceived, observations } =
    parsed.data;

  await prisma.qSO.create({
    data: {
      eventId,
      participantCallsign,
      dateTime: new Date(dateTime),
      frequency,
      mode,
      rstSent,
      rstReceived,
      observations: observations || null,
    },
  });

  revalidatePath(`/admin/events/${eventId}/qsos`);
  return { message: "QSO adicionado com sucesso." };
}

export async function deleteQSO(qsoId: string, eventId: string) {
  await requireAdmin();

  await prisma.qSO.delete({ where: { id: qsoId } });

  revalidatePath(`/admin/events/${eventId}/qsos`);
}

export async function listQSOsByEvent(eventId: string) {
  return prisma.qSO.findMany({
    where: { eventId },
    orderBy: { dateTime: "desc" },
  });
}
