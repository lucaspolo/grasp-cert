import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    trustedDevice: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { auth } from "@/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hashDeviceToken, TRUSTED_DEVICE_COOKIE } from "@/lib/two-factor";
import { listTrustedDevices, revokeTrustedDevice } from "./two-factor";

const authMock = auth as unknown as Mock;
const cookiesMock = cookies as unknown as Mock;
const findManyMock = prisma.trustedDevice.findMany as unknown as Mock;
const findFirstMock = prisma.trustedDevice.findFirst as unknown as Mock;
const deleteMock = prisma.trustedDevice.delete as unknown as Mock;

const USER_ID = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
const OTHER_USER_ID = "3f8e8b1c-2d4a-4e5b-9c6d-7a8b9c0d1e2f";
const CURRENT_TOKEN = "current-device-token";

// Espião do cookieStore.delete para checar limpeza do cookie da sessão.
const cookieDeleteMock = vi.fn();

function mockCookies(currentToken: string | null) {
  cookiesMock.mockResolvedValue({
    get: (name: string) =>
      name === TRUSTED_DEVICE_COOKIE && currentToken
        ? { value: currentToken }
        : undefined,
    delete: cookieDeleteMock,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { id: USER_ID, callsign: "PY2ABC" } });
  mockCookies(CURRENT_TOKEN);
});

describe("listTrustedDevices", () => {
  it("marca o dispositivo atual, não vaza tokenHash e escopa por usuário", async () => {
    findManyMock.mockResolvedValue([
      {
        id: "dev-current",
        label: "Chrome em Linux",
        lastUsedAt: new Date("2026-07-25T00:00:00Z"),
        expires: new Date("2026-08-24T00:00:00Z"),
        tokenHash: hashDeviceToken(CURRENT_TOKEN),
      },
      {
        id: "dev-other",
        label: "Safari em iPhone",
        lastUsedAt: null,
        expires: new Date("2026-08-24T00:00:00Z"),
        tokenHash: hashDeviceToken("outro-token"),
      },
    ]);

    const result = await listTrustedDevices();

    // Escopo: userId + não-expirados.
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER_ID, expires: { gt: expect.any(Date) } },
      })
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: "dev-current",
      label: "Chrome em Linux",
      lastUsedAt: new Date("2026-07-25T00:00:00Z"),
      expires: new Date("2026-08-24T00:00:00Z"),
      current: true,
    });
    expect(result[1].current).toBe(false);
    // tokenHash nunca vaza.
    expect(result[0]).not.toHaveProperty("tokenHash");
    expect(result[1]).not.toHaveProperty("tokenHash");
  });

  it("sem cookie, nenhum dispositivo é marcado como atual", async () => {
    mockCookies(null);
    findManyMock.mockResolvedValue([
      {
        id: "dev-1",
        label: "Chrome em Linux",
        lastUsedAt: null,
        expires: new Date("2026-08-24T00:00:00Z"),
        tokenHash: hashDeviceToken(CURRENT_TOKEN),
      },
    ]);

    const result = await listTrustedDevices();
    expect(result[0].current).toBe(false);
  });

  it("usuário não autenticado recebe lista vazia", async () => {
    authMock.mockResolvedValue(null);
    await expect(listTrustedDevices()).resolves.toEqual([]);
    expect(findManyMock).not.toHaveBeenCalled();
  });
});

describe("revokeTrustedDevice", () => {
  it("dispositivo de outro usuário: não encontrado, nada é apagado", async () => {
    // O escopo { id, userId } no findFirst já filtra: retorna null.
    findFirstMock.mockResolvedValue(null);

    const result = await revokeTrustedDevice("dev-de-outro");

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: "dev-de-outro", userId: USER_ID },
      select: { id: true, tokenHash: true },
    });
    expect(result).toEqual({ ok: false, error: "Dispositivo não encontrado." });
    expect(deleteMock).not.toHaveBeenCalled();
    expect(cookieDeleteMock).not.toHaveBeenCalled();
  });

  it("revogar dispositivo que não é o atual: apaga, mantém o cookie", async () => {
    findFirstMock.mockResolvedValue({
      id: "dev-other",
      tokenHash: hashDeviceToken("outro-token"),
    });

    const result = await revokeTrustedDevice("dev-other");

    expect(result).toEqual({ ok: true });
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "dev-other" } });
    expect(cookieDeleteMock).not.toHaveBeenCalled();
  });

  it("revogar o dispositivo atual: apaga e limpa o cookie da sessão", async () => {
    findFirstMock.mockResolvedValue({
      id: "dev-current",
      tokenHash: hashDeviceToken(CURRENT_TOKEN),
    });

    const result = await revokeTrustedDevice("dev-current");

    expect(result).toEqual({ ok: true });
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "dev-current" } });
    expect(cookieDeleteMock).toHaveBeenCalledWith(TRUSTED_DEVICE_COOKIE);
  });

  it("usuário não autenticado é rejeitado", async () => {
    authMock.mockResolvedValue(null);
    const result = await revokeTrustedDevice("dev-current");
    expect(result).toEqual({ ok: false, error: "Não autenticado." });
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("ignora userId do argumento — usa o da sessão (device de outro user id não é usado)", async () => {
    // Garante que não há caminho onde OTHER_USER_ID seria aceito.
    findFirstMock.mockResolvedValue(null);
    await revokeTrustedDevice(OTHER_USER_ID);
    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: OTHER_USER_ID, userId: USER_ID } })
    );
  });
});
