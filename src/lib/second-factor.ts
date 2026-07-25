import "server-only";

import { prisma } from "@/lib/prisma";
import { compareRecoveryCode, verifyTotp } from "@/lib/two-factor";
import { clearRateLimit, consumeRateLimit } from "@/lib/rate-limit";
import { decryptSecret, maybeReencryptSecret } from "@/lib/secret-crypto";

export type SecondFactorResult = "valid" | "invalid" | "rate_limited";

// 5 tentativas por 15 min, depois lockout progressivo (60s, 120s, ...).
// Sem isso o espaço de 10^6 códigos TOTP cai por força bruta online.
const SECOND_FACTOR_LIMIT = { limit: 5, windowSeconds: 15 * 60, lockoutSeconds: 60 };

/**
 * Verifica um segundo fator do usuário: TOTP (com anti-replay via
 * lastUsedStep) ou, como fallback, um código de recuperação de uso único.
 * Retorna "invalid" se o 2FA não estiver ativo — quem chama decide se a
 * ausência de 2FA passa (login) ou bloqueia (ações sensíveis).
 */
export async function verifyUserSecondFactor(
  userId: string,
  code: string
): Promise<SecondFactorResult> {
  const twoFactor = await prisma.twoFactorAuth.findUnique({
    where: { userId },
  });
  if (!twoFactor?.enabled) return "invalid";

  const rateKey = `2fa:${userId}`;
  const attempt = await consumeRateLimit({ key: rateKey, ...SECOND_FACTOR_LIMIT });
  if (!attempt.allowed) return "rate_limited";

  const totp = verifyTotp(
    code,
    decryptSecret(twoFactor.secret),
    twoFactor.lastUsedStep
  );
  if (totp.valid) {
    // Anti-replay: registra o timestep aceito para rejeitar reuso do código.
    // Aproveita a escrita para migrar secrets legados em claro para a forma
    // cifrada, quando TOTP_ENC_KEY está configurada.
    const reencrypted = maybeReencryptSecret(twoFactor.secret);
    await prisma.twoFactorAuth.update({
      where: { userId },
      data: {
        lastUsedStep: totp.timeStep,
        ...(reencrypted && { secret: reencrypted }),
      },
    });
    await clearRateLimit(rateKey);
    return "valid";
  }

  const recoveryCodes = await prisma.twoFactorRecoveryCode.findMany({
    where: { userId, usedAt: null },
  });
  for (const recovery of recoveryCodes) {
    if (compareRecoveryCode(code, recovery.codeHash)) {
      await prisma.twoFactorRecoveryCode.update({
        where: { id: recovery.id },
        data: { usedAt: new Date() },
      });
      await clearRateLimit(rateKey);
      return "valid";
    }
  }
  return "invalid";
}
