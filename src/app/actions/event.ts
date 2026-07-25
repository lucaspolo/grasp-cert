"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, requireEventOperator } from "@/lib/auth-utils";
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

export async function createEvent(
  _prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const session = await requireRole(["OWNER", "ADMIN"]);

  const bandIds = formData.getAll("bandIds") as string[];
  const modeIds = formData.getAll("modeIds") as string[];

  const parsed = eventSchema.safeParse({
    name: formData.get("name"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    bandIds,
    modeIds,
    observations: formData.get("observations"),
    templateId: formData.get("templateId") || undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { name, startDate, endDate, observations, templateId } = parsed.data;
  const timezone = (formData.get("timezone") as string) || "UTC";

  const event = await prisma.event.create({
    data: {
      name,
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
  const session = await requireRole(["OWNER", "ADMIN"]);

  const bandIds = formData.getAll("bandIds") as string[];
  const modeIds = formData.getAll("modeIds") as string[];

  const parsed = eventSchema.safeParse({
    name: formData.get("name"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    bandIds,
    modeIds,
    observations: formData.get("observations"),
    templateId: formData.get("templateId") || undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { name, startDate, endDate, observations, templateId } = parsed.data;
  const timezone = (formData.get("timezone") as string) || "UTC";

  await prisma.$transaction([
    prisma.eventBand.deleteMany({ where: { eventId } }),
    prisma.eventMode.deleteMany({ where: { eventId } }),
    prisma.event.update({
      where: { id: eventId },
      data: {
        name,
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
  });

  revalidatePath("/admin/events");
  revalidatePath("/");
  redirect("/admin/events");
}

export async function deleteEvent(eventId: string) {
  const session = await requireRole(["OWNER", "ADMIN"]);

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

export async function listEvents() {
  await requireRole(["OWNER", "ADMIN", "OPERATOR"]);
  return prisma.event.findMany({
    orderBy: { startDate: "desc" },
    include: {
      _count: { select: { qsos: true } },
      template: { select: { id: true, name: true } },
      eventBands: { include: { band: true } },
      eventModes: { include: { mode: true } },
    },
  });
}

export async function getEvent(id: string) {
  await requireRole(["OWNER", "ADMIN", "OPERATOR"]);
  return prisma.event.findUnique({
    where: { id },
    include: {
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
      eventBands: { include: { band: true } },
      eventModes: { include: { mode: true } },
    },
  });
}
