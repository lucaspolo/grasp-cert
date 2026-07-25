"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-utils";
import { recordAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const updateRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["OWNER", "ADMIN", "OPERATOR", "USER"]),
});

export async function listUsers() {
  await requireRole(["OWNER"]);

  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      callsign: true,
      email: true,
      name: true,
      city: true,
      state: true,
      role: true,
      emailVerified: true,
      createdAt: true,
    },
  });
}

export async function updateUserRole(userId: string, newRole: string) {
  const session = await requireRole(["OWNER"]);

  if (session.user.id === userId) {
    return { error: "Você não pode alterar seu próprio cargo." };
  }

  const parsed = updateRoleSchema.safeParse({ userId, role: newRole });
  if (!parsed.success) {
    return { error: "Cargo inválido." };
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { callsign: true, role: true },
  });
  if (!target) {
    return { error: "Usuário não encontrado." };
  }

  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { role: parsed.data.role },
  });

  await recordAudit(session.user, {
    action: "user.role_updated",
    entityType: "user",
    entityId: parsed.data.userId,
    summary: `Cargo de ${target.callsign} alterado de ${target.role} para ${parsed.data.role}`,
    details: { from: target.role, to: parsed.data.role },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function deleteUser(userId: string) {
  const session = await requireRole(["OWNER"]);

  if (session.user.id === userId) {
    return { error: "Você não pode excluir sua própria conta." };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { callsign: true, email: true, role: true },
  });
  if (!target) {
    return { error: "Usuário não encontrado." };
  }

  await prisma.user.delete({ where: { id: userId } });

  await recordAudit(session.user, {
    action: "user.deleted",
    entityType: "user",
    entityId: userId,
    summary: `Usuário ${target.callsign} (${target.email}) excluído`,
    details: { callsign: target.callsign, email: target.email, role: target.role },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function assignOperatorToEvent(userId: string, eventId: string) {
  const session = await requireRole(["OWNER", "ADMIN"]);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { callsign: true, role: true },
  });

  if (!user) {
    return { error: "Usuário não encontrado." };
  }

  if (user.role !== "OPERATOR") {
    return { error: "Apenas usuários com cargo OPERATOR podem ser designados." };
  }

  await prisma.eventOperator.upsert({
    where: { eventId_userId: { eventId, userId } },
    update: {},
    create: { eventId, userId },
  });

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { name: true },
  });

  await recordAudit(session.user, {
    action: "event.operator_assigned",
    entityType: "event",
    entityId: eventId,
    summary: `Operador ${user.callsign} designado ao evento ${event?.name ?? eventId}`,
    details: { userId, callsign: user.callsign },
  });

  revalidatePath(`/admin/events/${eventId}/edit`);
  return { success: true };
}

export async function removeOperatorFromEvent(userId: string, eventId: string) {
  const session = await requireRole(["OWNER", "ADMIN"]);

  await prisma.eventOperator.delete({
    where: { eventId_userId: { eventId, userId } },
  });

  const [user, event] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { callsign: true } }),
    prisma.event.findUnique({ where: { id: eventId }, select: { name: true } }),
  ]);

  await recordAudit(session.user, {
    action: "event.operator_removed",
    entityType: "event",
    entityId: eventId,
    summary: `Operador ${user?.callsign ?? userId} removido do evento ${event?.name ?? eventId}`,
    details: { userId, callsign: user?.callsign },
  });

  revalidatePath(`/admin/events/${eventId}/edit`);
  return { success: true };
}

export async function listEventOperators(eventId: string) {
  await requireRole(["OWNER", "ADMIN"]);

  return prisma.eventOperator.findMany({
    where: { eventId },
    include: {
      user: {
        select: { id: true, callsign: true, name: true },
      },
    },
  });
}

export async function listOperatorUsers() {
  await requireRole(["OWNER", "ADMIN"]);

  return prisma.user.findMany({
    where: { role: "OPERATOR" },
    select: { id: true, callsign: true, name: true },
    orderBy: { callsign: "asc" },
  });
}

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  callsign: z
    .string()
    .min(3, "Indicativo deve ter no mínimo 3 caracteres")
    .max(10, "Indicativo deve ter no máximo 10 caracteres")
    .transform((v) => v.toUpperCase().trim()),
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  city: z.string().min(2, "Cidade deve ter no mínimo 2 caracteres"),
  state: z
    .string()
    .length(2, "Estado deve ter 2 caracteres (UF)")
    .transform((v) => v.toUpperCase().trim()),
});

export async function updateUser(userId: string, data: {
  callsign: string;
  name: string;
  email: string;
  city: string;
  state: string;
}) {
  const session = await requireRole(["OWNER", "ADMIN"]);

  const parsed = updateUserSchema.safeParse({ userId, ...data });
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors).flat()[0];
    return { error: firstError || "Dados inválidos." };
  }

  const { callsign, name, email, city, state } = parsed.data;

  const currentUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!currentUser) {
    return { error: "Usuário não encontrado." };
  }

  // Check callsign uniqueness if changed
  if (callsign !== currentUser.callsign) {
    const existing = await prisma.user.findUnique({ where: { callsign } });
    if (existing) {
      return { error: "Indicativo já cadastrado por outro usuário." };
    }
  }

  // Check email uniqueness if changed
  if (email !== currentUser.email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { error: "E-mail já cadastrado por outro usuário." };
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { callsign, name, email, city, state },
  });

  const next = { callsign, name, email, city, state };
  const before: Record<string, string> = {};
  const after: Record<string, string> = {};
  for (const key of Object.keys(next) as (keyof typeof next)[]) {
    if (currentUser[key] !== next[key]) {
      before[key] = currentUser[key];
      after[key] = next[key];
    }
  }

  await recordAudit(session.user, {
    action: "user.updated",
    entityType: "user",
    entityId: userId,
    summary: `Dados de ${currentUser.callsign} atualizados (${Object.keys(after).join(", ") || "sem alterações"})`,
    details: { before, after },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function verifyUserEmail(userId: string) {
  const session = await requireRole(["OWNER", "ADMIN"]);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { error: "Usuário não encontrado." };
  }

  if (user.emailVerified) {
    return { error: "E-mail já verificado." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: new Date() },
  });

  await recordAudit(session.user, {
    action: "user.email_verified",
    entityType: "user",
    entityId: userId,
    summary: `E-mail de ${user.callsign} verificado manualmente`,
    details: { email: user.email },
  });

  revalidatePath("/admin/users");
  return { success: true };
}
