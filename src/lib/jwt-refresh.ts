import type { JWT } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

/** Idade máxima dos claims antes de revalidar contra o banco. */
export const JWT_REFRESH_INTERVAL_SECONDS = 10 * 60;

/**
 * O usuário é ADMIN de ao menos um grupo? Vira o claim `groupAdmin`, que o
 * proxy (Edge, sem Prisma) usa para liberar /admin a quem não tem cargo global.
 */
export async function isAdminOfSomeGroup(userId: string): Promise<boolean> {
  const membership = await prisma.groupMember.findFirst({
    where: { userId, role: "ADMIN" },
    select: { id: true },
  });
  return membership !== null;
}

/**
 * Revalida os claims do JWT contra o banco quando estão mais velhos que
 * JWT_REFRESH_INTERVAL_SECONDS. Retorna:
 * - o token intacto, se ainda está fresco;
 * - o token com role/callsign/groupAdmin atualizados, se o usuário ainda existe;
 * - null (invalida a sessão), se o usuário foi excluído ou se a
 *   sessionVersion mudou (ex.: reset de senha).
 *
 * Importa Prisma — só pode ser usada no NextAuth de src/auth.ts (Node),
 * nunca em src/auth.config.ts, que roda no Edge Runtime do proxy.
 */
export async function refreshTokenClaims(token: JWT): Promise<JWT | null> {
  const now = Math.floor(Date.now() / 1000);

  if (
    typeof token.refreshedAt === "number" &&
    now - token.refreshedAt < JWT_REFRESH_INTERVAL_SECONDS
  ) {
    return token;
  }

  if (!token.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: token.id },
    select: { role: true, callsign: true, sessionVersion: true },
  });

  if (!user) return null;

  // Tokens emitidos antes desta coluna existir não têm sessionVersion —
  // nesse caso apenas adota a versão atual em vez de derrubar a sessão.
  if (
    typeof token.sessionVersion === "number" &&
    token.sessionVersion !== user.sessionVersion
  ) {
    return null;
  }

  return {
    ...token,
    role: user.role,
    callsign: user.callsign,
    sessionVersion: user.sessionVersion,
    groupAdmin: await isAdminOfSomeGroup(token.id),
    refreshedAt: now,
  };
}
