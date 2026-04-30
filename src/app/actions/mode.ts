"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const modeSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(20),
  label: z.string().min(1, "Rótulo é obrigatório").max(50),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export async function listModes() {
  return prisma.mode.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function createMode(formData: FormData) {
  await requireRole(["OWNER", "ADMIN"]);

  const parsed = modeSchema.safeParse({
    name: formData.get("name"),
    label: formData.get("label"),
    sortOrder: formData.get("sortOrder"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const existing = await prisma.mode.findUnique({ where: { name: parsed.data.name } });
  if (existing) {
    return { error: "Já existe um modo com este nome." };
  }

  await prisma.mode.create({ data: parsed.data });
  revalidatePath("/admin/modes");
  return { success: true };
}

export async function updateMode(id: string, formData: FormData) {
  await requireRole(["OWNER", "ADMIN"]);

  const parsed = modeSchema.safeParse({
    name: formData.get("name"),
    label: formData.get("label"),
    sortOrder: formData.get("sortOrder"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const existing = await prisma.mode.findUnique({ where: { name: parsed.data.name } });
  if (existing && existing.id !== id) {
    return { error: "Já existe um modo com este nome." };
  }

  await prisma.mode.update({ where: { id }, data: parsed.data });
  revalidatePath("/admin/modes");
  return { success: true };
}

export async function deleteMode(id: string) {
  await requireRole(["OWNER", "ADMIN"]);

  try {
    await prisma.mode.delete({ where: { id } });
    revalidatePath("/admin/modes");
    return { success: true } as const;
  } catch {
    return { error: "Não foi possível excluir o modo. Ele pode estar em uso." };
  }
}
