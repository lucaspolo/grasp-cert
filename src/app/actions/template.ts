"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { z } from "zod";
import type { TemplateConfig } from "@/lib/template-config";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

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

export async function uploadTemplate(eventId: string, formData: FormData) {
  await requireAdmin();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { error: "Nenhum arquivo enviado." };
  }

  const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return { error: "Formato inválido. Use PNG, JPEG ou WebP." };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { error: "Arquivo muito grande. Máximo 5MB." };
  }

  // TODO: Replace with S3/R2 upload in production
  // For now, save locally to public/templates/
  const ext = file.name.split(".").pop() || "png";
  const sanitizedName = `${eventId}.${ext}`.replace(/[^a-zA-Z0-9.-]/g, "");
  const dir = path.join(process.cwd(), "public", "templates");
  await mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(dir, sanitizedName);
  await writeFile(filePath, buffer);

  const templateBgUrl = `/templates/${sanitizedName}`;

  await prisma.event.update({
    where: { id: eventId },
    data: { templateBgUrl },
  });

  revalidatePath(`/admin/events/${eventId}/template`);
  return { success: true, url: templateBgUrl };
}

export async function saveTemplateConfig(
  eventId: string,
  config: TemplateConfig
) {
  await requireAdmin();

  const parsed = templateConfigSchema.safeParse(config);
  if (!parsed.success) {
    return { error: "Configuração inválida." };
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { templateConfig: parsed.data },
  });

  revalidatePath(`/admin/events/${eventId}/template`);
  return { success: true };
}

export async function getEventTemplate(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      templateBgUrl: true,
      templateConfig: true,
    },
  });
  return event;
}
