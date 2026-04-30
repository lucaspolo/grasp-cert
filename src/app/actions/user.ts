"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, type AppRole } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const VALID_ROLES: AppRole[] = ["OWNER", "ADMIN", "OPERATOR", "USER"];

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

  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { role: parsed.data.role },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function deleteUser(userId: string) {
  const session = await requireRole(["OWNER"]);

  if (session.user.id === userId) {
    return { error: "Você não pode excluir sua própria conta." };
  }

  await prisma.user.delete({ where: { id: userId } });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function assignOperatorToEvent(userId: string, eventId: string) {
  await requireRole(["OWNER", "ADMIN"]);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
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

  revalidatePath(`/admin/events/${eventId}/edit`);
  return { success: true };
}

export async function removeOperatorFromEvent(userId: string, eventId: string) {
  await requireRole(["OWNER", "ADMIN"]);

  await prisma.eventOperator.delete({
    where: { eventId_userId: { eventId, userId } },
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
  await requireRole(["OWNER", "ADMIN"]);

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

  revalidatePath("/admin/users");
  return { success: true };
}

export async function verifyUserEmail(userId: string) {
  await requireRole(["OWNER", "ADMIN"]);

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

  revalidatePath("/admin/users");
  return { success: true };
}
