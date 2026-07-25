import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { generateSync } from "otplib";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    twoFactorAuth: { findUnique: vi.fn(), update: vi.fn() },
    twoFactorRecoveryCode: { findMany: vi.fn(), update: vi.fn() },
  },
}));
vi.mock("@/lib/rate-limit", () => ({
  consumeRateLimit: vi.fn(),
  clearRateLimit: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { clearRateLimit, consumeRateLimit } from "@/lib/rate-limit";
import { generateTotpSecret, hashRecoveryCode } from "./two-factor";
import { verifyUserSecondFactor } from "./second-factor";

const twoFactorFindMock = prisma.twoFactorAuth.findUnique as unknown as Mock;
const twoFactorUpdateMock = prisma.twoFactorAuth.update as unknown as Mock;
const recoveryFindManyMock = prisma.twoFactorRecoveryCode.findMany as unknown as Mock;
const consumeMock = consumeRateLimit as unknown as Mock;
const clearMock = clearRateLimit as unknown as Mock;

const USER_ID = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
const secret = generateTotpSecret();

beforeEach(() => {
  vi.clearAllMocks();
  consumeMock.mockResolvedValue({ allowed: true, remaining: 4 });
  recoveryFindManyMock.mockResolvedValue([]);
  twoFactorFindMock.mockResolvedValue({
    userId: USER_ID,
    secret,
    enabled: true,
    lastUsedStep: null,
  });
});

describe("verifyUserSecondFactor", () => {
  it("2FA inativo: invalid, sem consumir rate limit", async () => {
    twoFactorFindMock.mockResolvedValue(null);
    await expect(verifyUserSecondFactor(USER_ID, "123456")).resolves.toBe(
      "invalid"
    );
    expect(consumeMock).not.toHaveBeenCalled();
  });

  it("estouro do limite: rate_limited antes de verificar o código", async () => {
    consumeMock.mockResolvedValue({ allowed: false, retryAfterSeconds: 60 });
    const token = generateSync({ secret });
    await expect(verifyUserSecondFactor(USER_ID, token)).resolves.toBe(
      "rate_limited"
    );
    expect(twoFactorUpdateMock).not.toHaveBeenCalled();
  });

  it("TOTP válido: registra o timestep (anti-replay) e zera o contador", async () => {
    const token = generateSync({ secret });

    await expect(verifyUserSecondFactor(USER_ID, token)).resolves.toBe("valid");

    expect(twoFactorUpdateMock).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: { lastUsedStep: expect.any(Number) },
    });
    expect(clearMock).toHaveBeenCalledWith(`2fa:${USER_ID}`);
  });

  it("código de recuperação válido: marca como usado e zera o contador", async () => {
    const recoveryUpdateMock =
      prisma.twoFactorRecoveryCode.update as unknown as Mock;
    recoveryFindManyMock.mockResolvedValue([
      { id: "rc-1", codeHash: hashRecoveryCode("AB2C-3DEF") },
    ]);

    await expect(verifyUserSecondFactor(USER_ID, "AB2C-3DEF")).resolves.toBe(
      "valid"
    );

    expect(recoveryUpdateMock).toHaveBeenCalledWith({
      where: { id: "rc-1" },
      data: { usedAt: expect.any(Date) },
    });
    expect(clearMock).toHaveBeenCalled();
  });

  it("código errado: invalid e o contador permanece", async () => {
    await expect(verifyUserSecondFactor(USER_ID, "000000")).resolves.toBe(
      "invalid"
    );
    expect(clearMock).not.toHaveBeenCalled();
  });
});
