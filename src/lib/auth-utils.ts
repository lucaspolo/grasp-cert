import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type AppRole = "OWNER" | "ADMIN" | "OPERATOR" | "USER";

const ROLE_HIERARCHY: Record<AppRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  OPERATOR: 2,
  USER: 1,
};

/**
 * Sessão autenticada, sem exigir cargo global. É o ponto de partida de tudo
 * que depende de cargo POR GRUPO (`src/lib/group-access.ts`): um USER global
 * pode ser admin do próprio grupo, então a permissão não cabe mais numa lista
 * de cargos. Quem não usa grupo continua em `requireRole`.
 */
export async function requireSession() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  return session;
}

export type AppSession = Awaited<ReturnType<typeof requireSession>>;

/**
 * Zero-Trust session + role check for Server Actions.
 * Throws if the user is not authenticated or lacks the required role.
 */
export async function requireRole(allowedRoles: AppRole[]) {
  const session = await requireSession();

  if (!allowedRoles.includes(session.user.role as AppRole)) {
    throw new Error("Forbidden");
  }

  return session;
}

/**
 * Check if a user role meets a minimum role level.
 */
export function hasMinRole(userRole: AppRole, minRole: AppRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

/**
 * Verify that an OPERATOR is assigned to a specific event.
 * Throws "Forbidden" if not assigned.
 */
export async function requireEventOperator(eventId: string, userId: string) {
  const assignment = await prisma.eventOperator.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });

  if (!assignment) {
    throw new Error("Forbidden");
  }
}
