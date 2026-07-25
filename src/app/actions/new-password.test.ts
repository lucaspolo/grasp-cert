import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    passwordResetToken: { findUnique: vi.fn(), delete: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
    trustedDevice: { deleteMany: vi.fn() },
    $transaction: vi.fn().mockResolvedValue([]),
  },
}));

import { prisma } from "@/lib/prisma";
import { newPassword } from "./new-password";

const tokenFindUniqueMock = prisma.passwordResetToken.findUnique as unknown as Mock;
const userFindUniqueMock = prisma.user.findUnique as unknown as Mock;
const userUpdateMock = prisma.user.update as unknown as Mock;
const trustedDeleteManyMock = prisma.trustedDevice.deleteMany as unknown as Mock;

const USER_ID = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("newPassword", () => {
  it("rejeita senha com menos de 8 caracteres", async () => {
    const result = await newPassword(
      {},
      form({ token: "tok-1", password: "1234567" })
    );
    expect(result.error).toContain("mínimo 8");
  });

  it("rejeita token inexistente", async () => {
    tokenFindUniqueMock.mockResolvedValue(null);
    const result = await newPassword(
      {},
      form({ token: "tok-x", password: "12345678" })
    );
    expect(result.error).toBe("Token inválido ou expirado.");
  });

  it("redefine a senha, invalida sessões e revoga dispositivos confiáveis", async () => {
    tokenFindUniqueMock.mockResolvedValue({
      id: "prt-1",
      email: "user@example.com",
      expires: new Date(Date.now() + 60_000),
    });
    userFindUniqueMock.mockResolvedValue({ id: USER_ID });

    const result = await newPassword(
      {},
      form({ token: "tok-1", password: "12345678" })
    );

    expect(result.success).toBeDefined();
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: {
        passwordHash: expect.any(String),
        sessionVersion: { increment: 1 },
      },
    });
    expect(trustedDeleteManyMock).toHaveBeenCalledWith({
      where: { userId: USER_ID },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
