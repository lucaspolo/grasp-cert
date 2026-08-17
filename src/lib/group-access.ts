import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  requireEventOperator,
  requireSession,
  type AppRole,
  type AppSession,
} from "@/lib/auth-utils";

/**
 * Autorização por grupo.
 *
 * Duas camadas de cargo convivem:
 *
 * - **Global** (`User.role`): OWNER e ADMIN administram a PLATAFORMA e, por
 *   consequência, qualquer grupo. É o comportamento que existia antes dos
 *   grupos e continua valendo.
 * - **Por grupo** (`GroupMember.role`): um ADMIN de grupo administra só o
 *   próprio grupo — os templates dele e os eventos dele — independentemente do
 *   cargo global. Um USER global pode ser admin do seu clube.
 *
 * Toda checagem começa por `isPlatformAdmin`: além de ser o caminho comum, ela
 * responde sem ir ao banco.
 */

/** OWNER e ADMIN globais atuam em qualquer grupo. */
export function isPlatformAdmin(role: AppRole | string | undefined): boolean {
  return role === "OWNER" || role === "ADMIN";
}

/** Ids dos grupos em que o usuário é ADMIN. Vazio quando não administra nenhum. */
export async function adminGroupIds(userId: string): Promise<string[]> {
  const memberships = await prisma.groupMember.findMany({
    where: { userId, role: "ADMIN" },
    select: { groupId: true },
  });
  return memberships.map((m) => m.groupId);
}

/** Ids dos grupos de que o usuário participa, em qualquer cargo. */
export async function memberGroupIds(userId: string): Promise<string[]> {
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    select: { groupId: true },
  });
  return memberships.map((m) => m.groupId);
}

export async function isGroupAdmin(
  userId: string,
  groupId: string
): Promise<boolean> {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: { role: true },
  });
  return membership?.role === "ADMIN";
}

/**
 * Lança "Forbidden" quando a sessão não pode administrar o grupo.
 *
 * `groupId` nulo é o template GLOBAL da plataforma (o "Padrão", usado por todo
 * evento sem template próprio): mexer nele afeta todos os grupos, então só
 * quem administra a plataforma pode.
 */
export async function assertGroupAdmin(
  session: AppSession,
  groupId: string | null | undefined
): Promise<void> {
  if (isPlatformAdmin(session.user.role)) return;
  if (!groupId) throw new Error("Forbidden");
  if (!(await isGroupAdmin(session.user.id, groupId))) {
    throw new Error("Forbidden");
  }
}

/** Sessão autenticada + permissão de administrar `groupId`. */
export async function requireGroupAdmin(groupId: string): Promise<AppSession> {
  const session = await requireSession();
  await assertGroupAdmin(session, groupId);
  return session;
}

export type AdminScope = {
  session: AppSession;
  /**
   * Grupos que a sessão administra, ou `null` para "todos" (admin da
   * plataforma). Nunca é uma lista vazia: sem nenhum grupo, a chamada falha.
   */
  groupIds: string[] | null;
};

/**
 * Porteiro das telas administrativas de grupo: exige que a sessão administre a
 * plataforma ou ao menos um grupo.
 *
 * Vem ANTES de qualquer leitura da entidade de propósito — quem não pode
 * administrar nada não deve nem disparar a consulta.
 */
export async function requireAnyGroupAdmin(): Promise<AdminScope> {
  const session = await requireSession();

  if (isPlatformAdmin(session.user.role)) {
    return { session, groupIds: null };
  }

  const groupIds = await adminGroupIds(session.user.id);
  if (groupIds.length === 0) throw new Error("Forbidden");

  return { session, groupIds };
}

/** Quem administra o evento — ou de que forma o alcança. */
export type EventScope = "platform" | "group" | "operator";

export type EventAccess = {
  session: AppSession;
  scope: EventScope;
};

async function isEventGroupAdmin(
  userId: string,
  eventId: string
): Promise<boolean> {
  const membership = await prisma.groupMember.findFirst({
    where: {
      userId,
      role: "ADMIN",
      group: { events: { some: { id: eventId } } },
    },
    select: { id: true },
  });
  return membership !== null;
}

/**
 * Quem pode trabalhar no evento: admin da plataforma, admin do grupo dono do
 * evento, ou operador designado a ele.
 *
 * O `scope` devolvido distingue os dois primeiros do terceiro — o operador tem
 * poderes menores (só mexe nos próprios lançamentos), e quem chama precisa
 * saber disso.
 */
export async function requireEventAccess(
  eventId: string
): Promise<EventAccess> {
  const session = await requireSession();

  if (isPlatformAdmin(session.user.role)) {
    return { session, scope: "platform" };
  }

  if (await isEventGroupAdmin(session.user.id, eventId)) {
    return { session, scope: "group" };
  }

  if (session.user.role === "OPERATOR") {
    await requireEventOperator(eventId, session.user.id);
    return { session, scope: "operator" };
  }

  throw new Error("Forbidden");
}

/** Como `requireEventAccess`, mas recusa o operador: só quem administra. */
export async function requireEventGroupAdmin(
  eventId: string
): Promise<AppSession> {
  const { session, scope } = await requireEventAccess(eventId);
  if (scope === "operator") throw new Error("Forbidden");
  return session;
}

/**
 * Envolve a leitura de uma PÁGINA administrativa e traduz a recusa em 404.
 *
 * Numa Server Action o `throw` é o contrato certo — vira erro tratado no
 * cliente. Numa página ele viraria tela de erro 500 e ruído no Sentry, quando
 * o que aconteceu foi apenas alguém pedindo o recurso de outro grupo: para
 * quem não pode vê-lo, ele simplesmente não existe.
 */
export async function pageRead<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Forbidden" || error.message === "Unauthorized")
    ) {
      notFound();
    }
    throw error;
  }
}
