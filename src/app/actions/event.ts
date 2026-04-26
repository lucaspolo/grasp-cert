"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, requireEventOperator } from "@/lib/auth-utils";
import { parseBRDateTime } from "@/lib/utils";
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
  modes: z.string().transform((v) =>
    v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  ),
  bands: z.string().transform((v) =>
    v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  ),
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
  await requireRole(["OWNER", "ADMIN"]);

  const parsed = eventSchema.safeParse({
    name: formData.get("name"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    modes: formData.get("modes"),
    bands: formData.get("bands"),
    observations: formData.get("observations"),
    templateId: formData.get("templateId") || undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { name, startDate, endDate, modes, bands, observations, templateId } = parsed.data;

  await prisma.event.create({
    data: {
      name,
      startDate,
      endDate,
      modes,
      bands,
      observations: observations || null,
      templateId: templateId || null,
    },
  });

  revalidatePath("/admin/events");
  redirect("/admin/events");
}

export async function updateEvent(
  eventId: string,
  _prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  await requireRole(["OWNER", "ADMIN"]);

  const parsed = eventSchema.safeParse({
    name: formData.get("name"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    modes: formData.get("modes"),
    bands: formData.get("bands"),
    observations: formData.get("observations"),
    templateId: formData.get("templateId") || undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { name, startDate, endDate, modes, bands, observations, templateId } = parsed.data;

  await prisma.event.update({
    where: { id: eventId },
    data: {
      name,
      startDate,
      endDate,
      modes,
      bands,
      observations: observations || null,
      templateId: templateId || null,
    },
  });

  revalidatePath("/admin/events");
  redirect("/admin/events");
}

export async function deleteEvent(eventId: string) {
  await requireRole(["OWNER", "ADMIN"]);

  await prisma.event.delete({ where: { id: eventId } });

  revalidatePath("/admin/events");
}

export async function listEvents() {
  return prisma.event.findMany({
    orderBy: { startDate: "desc" },
    include: {
      _count: { select: { qsos: true } },
      template: { select: { id: true, name: true } },
    },
  });
}

export async function getEvent(id: string) {
  return prisma.event.findUnique({
    where: { id },
    include: { template: { select: { id: true, name: true } } },
  });
}
