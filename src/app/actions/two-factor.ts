"use server";

import { cookies } from "next/headers";
import QRCode from "qrcode";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  TRUSTED_DEVICE_COOKIE,
  TRUSTED_DEVICE_MAX_AGE_SECONDS,
  buildOtpAuthUrl,
  generateDeviceToken,
  generateRecoveryCodes,
  generateTotpSecret,
  hashDeviceToken,
  hashRecoveryCode,
  verifyTotp,
} from "@/lib/two-factor";
import { verifyUserSecondFactor } from "@/lib/second-factor";
import { decryptSecret, encryptSecret } from "@/lib/secret-crypto";

export type TwoFactorStatus = {
  enabled: boolean;
  pendingSetup: boolean;
  trustedDevices: number;
};

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  return { id: session.user.id, callsign: session.user.callsign };
}

export async function getTwoFactorStatus(): Promise<TwoFactorStatus | null> {
  const user = await requireUser();
  if (!user) return null;

  const [twoFactor, trustedDevices] = await Promise.all([
    prisma.twoFactorAuth.findUnique({ where: { userId: user.id } }),
    prisma.trustedDevice.count({
      where: { userId: user.id, expires: { gt: new Date() } },
    }),
  ]);

  return {
    enabled: twoFactor?.enabled ?? false,
    pendingSetup: !!twoFactor && !twoFactor.enabled,
    trustedDevices,
  };
}

export type StartSetupResult =
  | { ok: true; qrDataUrl: string; secret: string; otpauthUrl: string }
  | { ok: false; error: string };

export async function startTwoFactorSetup(): Promise<StartSetupResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const existing = await prisma.twoFactorAuth.findUnique({
    where: { userId: user.id },
  });
  if (existing?.enabled) {
    return { ok: false, error: "A autenticação de dois fatores já está ativa." };
  }

  const secret = generateTotpSecret();
  const storedSecret = encryptSecret(secret);
  await prisma.twoFactorAuth.upsert({
    where: { userId: user.id },
    create: { userId: user.id, secret: storedSecret, enabled: false },
    update: { secret: storedSecret, enabled: false, confirmedAt: null },
  });

  const otpauthUrl = buildOtpAuthUrl(user.callsign, secret);
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

  return { ok: true, qrDataUrl, secret, otpauthUrl };
}

export type ConfirmSetupResult =
  | { ok: true; recoveryCodes: string[] }
  | { ok: false; error: string };

export async function confirmTwoFactorSetup(
  code: string
): Promise<ConfirmSetupResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const twoFactor = await prisma.twoFactorAuth.findUnique({
    where: { userId: user.id },
  });
  if (!twoFactor) {
    return { ok: false, error: "Inicie a configuração antes de confirmar." };
  }
  if (twoFactor.enabled) {
    return { ok: false, error: "A autenticação de dois fatores já está ativa." };
  }

  const totp = verifyTotp(
    code,
    decryptSecret(twoFactor.secret),
    twoFactor.lastUsedStep
  );
  if (!totp.valid) {
    return { ok: false, error: "Código inválido. Tente novamente." };
  }

  const recoveryCodes = generateRecoveryCodes();

  await prisma.$transaction([
    prisma.twoFactorAuth.update({
      where: { userId: user.id },
      data: {
        enabled: true,
        confirmedAt: new Date(),
        lastUsedStep: totp.timeStep,
      },
    }),
    prisma.twoFactorRecoveryCode.deleteMany({ where: { userId: user.id } }),
    prisma.twoFactorRecoveryCode.createMany({
      data: recoveryCodes.map((c) => ({
        userId: user.id,
        codeHash: hashRecoveryCode(c),
      })),
    }),
  ]);

  return { ok: true, recoveryCodes };
}

export type SimpleResult = { ok: true } | { ok: false; error: string };

const SECOND_FACTOR_ERRORS: Record<"invalid" | "rate_limited", string> = {
  invalid: "Código inválido. Tente novamente.",
  rate_limited: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
};

export async function disableTwoFactor(code: string): Promise<SimpleResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const second = await verifyUserSecondFactor(user.id, code);
  if (second !== "valid") {
    return { ok: false, error: SECOND_FACTOR_ERRORS[second] };
  }

  await prisma.$transaction([
    prisma.twoFactorRecoveryCode.deleteMany({ where: { userId: user.id } }),
    prisma.trustedDevice.deleteMany({ where: { userId: user.id } }),
    prisma.twoFactorAuth.deleteMany({ where: { userId: user.id } }),
  ]);

  const cookieStore = await cookies();
  cookieStore.delete(TRUSTED_DEVICE_COOKIE);

  return { ok: true };
}

export type RegenerateResult =
  | { ok: true; recoveryCodes: string[] }
  | { ok: false; error: string };

export async function regenerateRecoveryCodes(
  code: string
): Promise<RegenerateResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const second = await verifyUserSecondFactor(user.id, code);
  if (second !== "valid") {
    return { ok: false, error: SECOND_FACTOR_ERRORS[second] };
  }

  const recoveryCodes = generateRecoveryCodes();
  await prisma.$transaction([
    prisma.twoFactorRecoveryCode.deleteMany({ where: { userId: user.id } }),
    prisma.twoFactorRecoveryCode.createMany({
      data: recoveryCodes.map((c) => ({
        userId: user.id,
        codeHash: hashRecoveryCode(c),
      })),
    }),
  ]);

  return { ok: true, recoveryCodes };
}

export async function trustCurrentDevice(): Promise<SimpleResult> {
  const user = await requireUser();
  if (!user) {
    return { ok: false, error: "Não autenticado." };
  }

  const twoFactor = await prisma.twoFactorAuth.findUnique({
    where: { userId: user.id },
  });
  if (!twoFactor?.enabled) {
    return { ok: false, error: "Autenticação de dois fatores não está ativa." };
  }

  const token = generateDeviceToken();
  const expires = new Date(Date.now() + TRUSTED_DEVICE_MAX_AGE_SECONDS * 1000);

  await prisma.trustedDevice.create({
    data: { userId: user.id, tokenHash: hashDeviceToken(token), expires },
  });

  const cookieStore = await cookies();
  cookieStore.set(TRUSTED_DEVICE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TRUSTED_DEVICE_MAX_AGE_SECONDS,
  });

  return { ok: true };
}

export async function revokeTrustedDevices(): Promise<SimpleResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  await prisma.trustedDevice.deleteMany({ where: { userId: user.id } });

  const cookieStore = await cookies();
  cookieStore.delete(TRUSTED_DEVICE_COOKIE);

  return { ok: true };
}
