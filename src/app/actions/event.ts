"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const eventSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  startDate: z.string().refine((v) => !isNaN(Date.parse(v)), {
    message: "Data de início inválida",
  }),
  endDate: z.string().refine((v) => !isNaN(Date.parse(v)), {
    message: "Data de fim inválida",
  }),
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

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

export type EventFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

export async function createEvent(
  _prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  await requireAdmin();

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
      startDate: new Date(startDate),
      endDate: new Date(endDate),
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
  await requireAdmin();

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
      startDate: new Date(startDate),
      endDate: new Date(endDate),
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
  await requireAdmin();

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
