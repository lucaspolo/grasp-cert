"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import sharp from "sharp";
import type { TemplateConfig } from "@/lib/template-config";

const templateConfigSchema = z.object({
  fields: z.record(
    z.string(),
    z.object({
      x: z.number().min(0),
      y: z.number().min(0),
      fontSize: z.number().min(8).max(120),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      label: z.string(),
    })
  ),
});

const templateNameSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").max(100),
});

export type TemplateFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

// --- CRUD ---

export async function listTemplates() {
  await requireRole(["OWNER", "ADMIN"]);
  return prisma.template.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      bgMimeType: true,
      createdAt: true,
      _count: { select: { events: true } },
    },
  });
}

export async function getTemplate(id: string) {
  return prisma.template.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      bgMimeType: true,
      config: true,
      _count: { select: { events: true } },
    },
  });
}

export async function createTemplate(
  _prevState: TemplateFormState,
  formData: FormData
): Promise<TemplateFormState> {
  await requireRole(["OWNER", "ADMIN"]);

  const parsed = templateNameSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const template = await prisma.template.create({
    data: { name: parsed.data.name },
  });

  redirect(`/admin/templates/${template.id}/edit`);
}

export async function updateTemplateName(
  templateId: string,
  _prevState: TemplateFormState,
  formData: FormData
): Promise<TemplateFormState> {
  await requireRole(["OWNER", "ADMIN"]);

  const parsed = templateNameSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  await prisma.template.update({
    where: { id: templateId },
    data: { name: parsed.data.name },
  });

  revalidatePath(`/admin/templates/${templateId}/edit`);
  revalidatePath("/admin/templates");
  return { message: "Nome atualizado." };
}

export async function deleteTemplate(templateId: string) {
  await requireRole(["OWNER", "ADMIN"]);

  const template = await prisma.template.findUnique({
    where: { id: templateId },
    select: { _count: { select: { events: true } } },
  });

  if (!template) {
    return { error: "Template não encontrado." };
  }

  if (template._count.events > 0) {
    return {
      error: `Não é possível excluir — ${template._count.events} evento(s) usam este template.`,
    };
  }

  await prisma.template.delete({ where: { id: templateId } });

  revalidatePath("/admin/templates");
  return { success: true };
}

// --- Background Image ---

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MIN_WIDTH = 800;
const MIN_HEIGHT = 500;
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1200;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function uploadTemplateBg(templateId: string, formData: FormData) {
  await requireRole(["OWNER", "ADMIN"]);

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { error: "Nenhum arquivo enviado." };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Formato inválido. Use PNG, JPEG ou WebP." };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { error: "Arquivo muito grande. Máximo 5MB." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Validate image dimensions with sharp
  const metadata = await sharp(buffer).metadata();
  if (!metadata.width || !metadata.height) {
    return { error: "Não foi possível ler as dimensões da imagem." };
  }

  if (metadata.width < MIN_WIDTH || metadata.height < MIN_HEIGHT) {
    return {
      error: `Resolução mínima: ${MIN_WIDTH}×${MIN_HEIGHT}px. A imagem tem ${metadata.width}×${metadata.height}px.`,
    };
  }

  if (metadata.width > MAX_WIDTH || metadata.height > MAX_HEIGHT) {
    return {
      error: `Resolução máxima: ${MAX_WIDTH}×${MAX_HEIGHT}px. A imagem tem ${metadata.width}×${metadata.height}px.`,
    };
  }

  await prisma.template.update({
    where: { id: templateId },
    data: {
      bgImage: buffer,
      bgMimeType: file.type,
    },
  });

  revalidatePath(`/admin/templates/${templateId}/edit`);
  return { success: true };
}

// --- Config ---

export async function saveTemplateConfig(
  templateId: string,
  config: TemplateConfig
) {
  await requireRole(["OWNER", "ADMIN"]);

  const parsed = templateConfigSchema.safeParse(config);
  if (!parsed.success) {
    return { error: "Configuração inválida." };
  }

  await prisma.template.update({
    where: { id: templateId },
    data: { config: parsed.data },
  });

  revalidatePath(`/admin/templates/${templateId}/edit`);
  return { success: true };
}
