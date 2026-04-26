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
