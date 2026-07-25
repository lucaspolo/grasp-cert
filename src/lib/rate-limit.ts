import "server-only";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

/** Teto do lockout progressivo (1 hora). */
const MAX_LOCKOUT_SECONDS = 60 * 60;

/** Idade a partir da qual uma linha é considerada lixo e pode ser limpa. */
const STALE_ROW_SECONDS = 24 * 60 * 60;

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number };

export type RateLimitOptions = {
  /** Identificador do recurso limitado, ex.: "login:acct:PY2ABC". */
  key: string;
  /** Máximo de tentativas dentro da janela. */
  limit: number;
  /** Duração da janela fixa, em segundos. */
  windowSeconds: number;
  /**
   * Se definido, exceder o limite ativa um bloqueio progressivo:
   * lockoutSeconds × 2^(excedente−1), até MAX_LOCKOUT_SECONDS.
   * Sem ele, o bloqueio dura só até o fim da janela.
   */
  lockoutSeconds?: number;
};

/**
 * Consome uma tentativa na janela da chave. Janela fixa com contadores no
 * Postgres — funciona em serverless, onde memória local não é compartilhada.
 * Corridas entre instâncias podem subcontar uma tentativa; irrelevante aqui.
 */
export async function consumeRateLimit(
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const { key, limit, windowSeconds, lockoutSeconds } = options;
  const now = new Date();

  const row = await prisma.rateLimit.findUnique({ where: { key } });

  if (row?.lockedUntil && row.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: secondsUntil(row.lockedUntil, now),
    };
  }

  const windowExpired =
    !row || now.getTime() - row.windowStart.getTime() >= windowSeconds * 1000;

  if (windowExpired) {
    await prisma.rateLimit.upsert({
      where: { key },
      create: { key, count: 1, windowStart: now },
      update: { count: 1, windowStart: now, lockedUntil: null },
    });
    // Momento raro (início de janela): aproveita para limpar linhas mortas.
    await prisma.rateLimit.deleteMany({
      where: {
        windowStart: { lt: new Date(now.getTime() - STALE_ROW_SECONDS * 1000) },
        OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
      },
    });
    return { allowed: true, remaining: limit - 1 };
  }

  const updated = await prisma.rateLimit.update({
    where: { key },
    data: { count: { increment: 1 } },
  });

  if (updated.count > limit) {
    const windowEnd = new Date(
      row.windowStart.getTime() + windowSeconds * 1000
    );
    let retryAfterSeconds = secondsUntil(windowEnd, now);

    if (lockoutSeconds) {
      const overflow = updated.count - limit;
      const lockSeconds = Math.min(
        lockoutSeconds * 2 ** (overflow - 1),
        MAX_LOCKOUT_SECONDS
      );
      await prisma.rateLimit.update({
        where: { key },
        data: { lockedUntil: new Date(now.getTime() + lockSeconds * 1000) },
      });
      retryAfterSeconds = lockSeconds;
    }

    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true, remaining: limit - updated.count };
}

/** Zera a janela da chave (ex.: login bem-sucedido). */
export async function clearRateLimit(key: string): Promise<void> {
  await prisma.rateLimit.deleteMany({ where: { key } });
}

/** Extrai o IP do cliente de um Headers (x-forwarded-for da Vercel/proxy). */
export function clientIpFrom(requestHeaders: Headers): string {
  const forwarded = requestHeaders.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return requestHeaders.get("x-real-ip") ?? "unknown";
}

/** IP do cliente dentro de Server Actions (via next/headers). */
export async function getClientIp(): Promise<string> {
  return clientIpFrom(await headers());
}

function secondsUntil(date: Date, now: Date): number {
  return Math.max(1, Math.ceil((date.getTime() - now.getTime()) / 1000));
}
