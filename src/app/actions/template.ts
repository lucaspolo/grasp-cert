"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-utils";
import { recordAudit } from "@/lib/audit";
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
  await requireRole(["OWNER", "ADMIN"]);
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
  const session = await requireRole(["OWNER", "ADMIN"]);

  const parsed = templateNameSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const template = await prisma.template.create({
    data: { name: parsed.data.name },
  });

  await recordAudit(session.user, {
    action: "template.created",
    entityType: "template",
    entityId: template.id,
    summary: `Template ${template.name} criado`,
  });

  redirect(`/admin/templates/${template.id}/edit`);
}

export async function updateTemplateName(
  templateId: string,
  _prevState: TemplateFormState,
  formData: FormData
): Promise<TemplateFormState> {
  const session = await requireRole(["OWNER", "ADMIN"]);

  const parsed = templateNameSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const previous = await prisma.template.findUnique({
    where: { id: templateId },
    select: { name: true },
  });

  await prisma.template.update({
    where: { id: templateId },
    data: { name: parsed.data.name },
  });

  await recordAudit(session.user, {
    action: "template.renamed",
    entityType: "template",
    entityId: templateId,
    summary: `Template renomeado de ${previous?.name ?? "?"} para ${parsed.data.name}`,
    details: { from: previous?.name, to: parsed.data.name },
  });

  revalidatePath(`/admin/templates/${templateId}/edit`);
  revalidatePath("/admin/templates");
  return { message: "Nome atualizado." };
}

export async function deleteTemplate(templateId: string) {
  const session = await requireRole(["OWNER", "ADMIN"]);

  const template = await prisma.template.findUnique({
    where: { id: templateId },
    select: { name: true, _count: { select: { events: true } } },
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

  await recordAudit(session.user, {
    action: "template.deleted",
    entityType: "template",
    entityId: templateId,
    summary: `Template ${template.name} excluído`,
    details: { name: template.name },
  });

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
  const session = await requireRole(["OWNER", "ADMIN"]);

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

  // file.type é controlado pelo cliente — o formato real vem do sharp.
  // Re-encodar normaliza o arquivo e descarta metadados/payloads embutidos.
  const format = metadata.format;
  if (format !== "png" && format !== "jpeg" && format !== "webp") {
    return { error: "Formato inválido. Use PNG, JPEG ou WebP." };
  }

  const reencoded = new Uint8Array(
    await sharp(buffer)
      .rotate() // aplica a orientação EXIF antes de descartá-la
      .toFormat(format, format === "png" ? {} : { quality: 90 })
      .toBuffer()
  );
  const mimeType = `image/${format}`;

  const template = await prisma.template.update({
    where: { id: templateId },
    data: {
      bgImage: reencoded,
      bgMimeType: mimeType,
    },
    select: { name: true },
  });

  await recordAudit(session.user, {
    action: "template.bg_uploaded",
    entityType: "template",
    entityId: templateId,
    summary: `Imagem de fundo do template ${template.name} atualizada`,
    details: {
      mimeType,
      sizeBytes: reencoded.length,
      width: metadata.width,
      height: metadata.height,
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
  const session = await requireRole(["OWNER", "ADMIN"]);

  const parsed = templateConfigSchema.safeParse(config);
  if (!parsed.success) {
    return { error: "Configuração inválida." };
  }

  const template = await prisma.template.update({
    where: { id: templateId },
    data: { config: parsed.data },
    select: { name: true },
  });

  await recordAudit(session.user, {
    action: "template.config_updated",
    entityType: "template",
    entityId: templateId,
    summary: `Layout do template ${template.name} atualizado`,
  });

  revalidatePath(`/admin/templates/${templateId}/edit`);
  return { success: true };
}
