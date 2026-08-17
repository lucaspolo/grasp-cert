"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-utils";
import { assertGroupAdmin, requireAnyGroupAdmin } from "@/lib/group-access";
import { recordAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import sharp from "sharp";
import { Prisma } from "@prisma/client";
import type { TemplateConfig } from "@/lib/template-config";
import {
  CERTIFICATE_HEIGHT,
  CERTIFICATE_WIDTH,
} from "@/lib/certificate-dimensions";

// Atenção ao acrescentar propriedade de campo: o z.object descarta chave
// desconhecida em silêncio, então o schema precisa aceitá-la ANTES de o editor
// começar a enviá-la — senão a UI diz "Configuração salva." e o dado se perde.
const templateConfigSchema = z.object({
  fields: z.record(
    z.string(),
    z.object({
      x: z.number().min(0).max(CERTIFICATE_WIDTH),
      y: z.number().min(0).max(CERTIFICATE_HEIGHT),
      fontSize: z.number().min(8).max(120),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      label: z.string().max(120),
      align: z.enum(["left", "center", "right"]).optional(),
      visible: z.boolean().optional(),
    })
  ),
});

const templateNameSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").max(100),
});

/**
 * Carrega o dono do template e confere se a sessão pode administrá-lo.
 * Devolve null quando o template não existe — quem chama decide a mensagem.
 */
async function loadTemplateForAdmin(templateId: string) {
  const { session } = await requireAnyGroupAdmin();

  const template = await prisma.template.findUnique({
    where: { id: templateId },
    select: {
      name: true,
      groupId: true,
      _count: { select: { events: true } },
    },
  });
  if (!template) return null;

  await assertGroupAdmin(session, template.groupId);
  return { session, template };
}

/**
 * Nome do template usado como fallback global: `loadCertificateData` o procura
 * por nome quando o evento não tem template. Renomeá-lo ou excluí-lo derruba o
 * certificado de todo evento sem template — daí as guardas abaixo.
 */
const FALLBACK_TEMPLATE_NAME = "Padrão";

/** Registro sumiu entre a leitura e a escrita (P2025). */
function isMissingRecord(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}

export type TemplateFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

// --- CRUD ---

/** Templates que a sessão pode EDITAR — os do seu grupo, e os globais se for admin da plataforma. */
export async function listTemplates() {
  const { groupIds } = await requireAnyGroupAdmin();
  return prisma.template.findMany({
    where: groupIds ? { groupId: { in: groupIds } } : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      bgMimeType: true,
      createdAt: true,
      group: { select: { id: true, name: true } },
      _count: { select: { events: true } },
    },
  });
}

/**
 * Templates que os eventos da sessão podem USAR: os dos grupos administrados
 * mais os globais da plataforma. Diferente de `listTemplates`, que traz só o
 * que dá para editar — um grupo escolhe o "Padrão" sem poder mexer nele.
 *
 * O `groupId` de cada linha vai junto porque o formulário de evento filtra a
 * lista pelo grupo escolhido.
 */
export async function listSelectableTemplates() {
  const { groupIds } = await requireAnyGroupAdmin();
  return prisma.template.findMany({
    where: groupIds
      ? { OR: [{ groupId: { in: groupIds } }, { groupId: null }] }
      : undefined,
    orderBy: { name: "asc" },
    select: { id: true, name: true, groupId: true },
  });
}

export async function getTemplate(id: string) {
  const { session } = await requireAnyGroupAdmin();

  const template = await prisma.template.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      groupId: true,
      bgMimeType: true,
      config: true,
      _count: { select: { events: true } },
    },
  });
  if (!template) return null;

  await assertGroupAdmin(session, template.groupId);
  return template;
}

export async function createTemplate(
  _prevState: TemplateFormState,
  formData: FormData
): Promise<TemplateFormState> {
  const session = await requireSession();

  const parsed = templateNameSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  // Campo vazio = template global da plataforma; `assertGroupAdmin` recusa
  // isso para quem não é OWNER/ADMIN global.
  const groupId = ((formData.get("groupId") as string) || "").trim() || null;
  try {
    await assertGroupAdmin(session, groupId);
  } catch {
    return {
      errors: {
        groupId: [
          groupId
            ? "Você não administra este grupo."
            : "Só quem administra a plataforma cria template global.",
        ],
      },
    };
  }

  const template = await prisma.template.create({
    data: { name: parsed.data.name, groupId },
  });

  await recordAudit(session.user, {
    action: "template.created",
    entityType: "template",
    entityId: template.id,
    summary: `Template ${template.name} criado`,
    details: { groupId },
  });

  redirect(`/admin/templates/${template.id}/edit`);
}

export async function updateTemplateName(
  templateId: string,
  _prevState: TemplateFormState,
  formData: FormData
): Promise<TemplateFormState> {
  const parsed = templateNameSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const loaded = await loadTemplateForAdmin(templateId);
  if (!loaded) {
    return { errors: { name: ["Template não encontrado."] } };
  }
  const { session, template: previous } = loaded;

  if (previous.name === FALLBACK_TEMPLATE_NAME) {
    return {
      errors: {
        name: [
          `O template "${FALLBACK_TEMPLATE_NAME}" é o padrão usado por eventos sem template e não pode ser renomeado.`,
        ],
      },
    };
  }

  try {
    await prisma.template.update({
      where: { id: templateId },
      data: { name: parsed.data.name },
    });
  } catch (error) {
    if (isMissingRecord(error)) {
      return { errors: { name: ["Template não encontrado."] } };
    }
    throw error;
  }

  await recordAudit(session.user, {
    action: "template.renamed",
    entityType: "template",
    entityId: templateId,
    summary: `Template renomeado de ${previous.name} para ${parsed.data.name}`,
    details: { from: previous.name, to: parsed.data.name },
  });

  revalidatePath(`/admin/templates/${templateId}/edit`);
  revalidatePath("/admin/templates");
  return { message: "Nome atualizado." };
}

export async function deleteTemplate(templateId: string) {
  const loaded = await loadTemplateForAdmin(templateId);
  if (!loaded) {
    return { error: "Template não encontrado." };
  }
  const { session, template } = loaded;

  if (template.name === FALLBACK_TEMPLATE_NAME) {
    return {
      error: `O template "${FALLBACK_TEMPLATE_NAME}" é usado por todo evento sem template próprio e não pode ser excluído.`,
    };
  }

  if (template._count.events > 0) {
    return {
      error: `Não é possível excluir — ${template._count.events} evento(s) usam este template.`,
    };
  }

  try {
    await prisma.template.delete({ where: { id: templateId } });
  } catch (error) {
    if (isMissingRecord(error)) {
      return { error: "Template não encontrado." };
    }
    throw error;
  }

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
  // Antes de qualquer trabalho com a imagem: decodificar e re-encodar um
  // arquivo de 5MB para depois recusar a gravação seria trabalho à toa.
  const loaded = await loadTemplateForAdmin(templateId);
  if (!loaded) {
    return { error: "Template não encontrado." };
  }
  const { session } = loaded;

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

  let template;
  try {
    template = await prisma.template.update({
      where: { id: templateId },
      data: {
        bgImage: reencoded,
        bgMimeType: mimeType,
      },
      select: { name: true },
    });
  } catch (error) {
    if (isMissingRecord(error)) {
      return { error: "Template não encontrado." };
    }
    throw error;
  }

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

/** Volta o template ao fundo padrão. Sem isso, subir uma arte é irreversível. */
export async function clearTemplateBg(templateId: string) {
  const loaded = await loadTemplateForAdmin(templateId);
  if (!loaded) {
    return { error: "Template não encontrado." };
  }
  const { session } = loaded;

  let template;
  try {
    template = await prisma.template.update({
      where: { id: templateId },
      data: { bgImage: null, bgMimeType: null },
      select: { name: true },
    });
  } catch (error) {
    if (isMissingRecord(error)) {
      return { error: "Template não encontrado." };
    }
    throw error;
  }

  await recordAudit(session.user, {
    action: "template.bg_cleared",
    entityType: "template",
    entityId: templateId,
    summary: `Imagem de fundo do template ${template.name} removida`,
  });

  revalidatePath(`/admin/templates/${templateId}/edit`);
  return { success: true };
}

// --- Config ---

export async function saveTemplateConfig(
  templateId: string,
  config: TemplateConfig
) {
  const parsed = templateConfigSchema.safeParse(config);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      error: `Configuração inválida em ${issue.path.join(".")}: ${issue.message}`,
    };
  }

  const loaded = await loadTemplateForAdmin(templateId);
  if (!loaded) {
    return { error: "Template não encontrado." };
  }
  const { session } = loaded;

  let template;
  try {
    template = await prisma.template.update({
      where: { id: templateId },
      data: { config: parsed.data },
      select: { name: true },
    });
  } catch (error) {
    if (isMissingRecord(error)) {
      return { error: "Template não encontrado." };
    }
    throw error;
  }

  await recordAudit(session.user, {
    action: "template.config_updated",
    entityType: "template",
    entityId: templateId,
    summary: `Layout do template ${template.name} atualizado`,
  });

  revalidatePath(`/admin/templates/${templateId}/edit`);
  return { success: true };
}
