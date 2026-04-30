"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const bandSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(20),
  label: z.string().min(1, "Rótulo é obrigatório").max(50),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export async function listBands() {
  return prisma.band.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function createBand(formData: FormData) {
  await requireRole(["OWNER", "ADMIN"]);

  const parsed = bandSchema.safeParse({
    name: formData.get("name"),
    label: formData.get("label"),
    sortOrder: formData.get("sortOrder"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const existing = await prisma.band.findUnique({ where: { name: parsed.data.name } });
  if (existing) {
    return { error: "Já existe uma banda com este nome." };
  }

  await prisma.band.create({ data: parsed.data });
  revalidatePath("/admin/bands");
  return { success: true };
}

export async function updateBand(id: string, formData: FormData) {
  await requireRole(["OWNER", "ADMIN"]);

  const parsed = bandSchema.safeParse({
    name: formData.get("name"),
    label: formData.get("label"),
    sortOrder: formData.get("sortOrder"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const existing = await prisma.band.findUnique({ where: { name: parsed.data.name } });
  if (existing && existing.id !== id) {
    return { error: "Já existe uma banda com este nome." };
  }

  await prisma.band.update({ where: { id }, data: parsed.data });
  revalidatePath("/admin/bands");
  return { success: true };
}

export async function deleteBand(id: string) {
  await requireRole(["OWNER", "ADMIN"]);

  try {
    await prisma.band.delete({ where: { id } });
    revalidatePath("/admin/bands");
    return { success: true } as const;
  } catch {
    return { error: "Não foi possível excluir a banda. Ela pode estar em uso." };
  }
}
