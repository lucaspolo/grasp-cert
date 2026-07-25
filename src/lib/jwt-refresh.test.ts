import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import type { JWT } from "next-auth/jwt";

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));

import { prisma } from "@/lib/prisma";
import {
  JWT_REFRESH_INTERVAL_SECONDS,
  refreshTokenClaims,
} from "./jwt-refresh";

const findUniqueMock = prisma.user.findUnique as unknown as Mock;

const NOW_MS = 1_800_000_000_000; // época fixa para os testes
const nowSec = Math.floor(NOW_MS / 1000);

const baseToken: JWT = {
  id: "3f8e8b1c-2d4a-4e5b-9c6d-7a8b9c0d1e2f",
  role: "ADMIN",
  callsign: "PY2ABC",
  sessionVersion: 1,
  refreshedAt: nowSec - JWT_REFRESH_INTERVAL_SECONDS - 1,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW_MS);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("refreshTokenClaims", () => {
  it("token fresco: retorna intacto sem consultar o banco", async () => {
    const fresh = { ...baseToken, refreshedAt: nowSec - 60 };
    const result = await refreshTokenClaims(fresh);
    expect(result).toBe(fresh);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("token velho: atualiza role/callsign e carimba refreshedAt", async () => {
    findUniqueMock.mockResolvedValue({
      role: "USER",
      callsign: "PY2ABC",
      sessionVersion: 1,
    });

    const result = await refreshTokenClaims(baseToken);

    expect(result).not.toBeNull();
    expect(result?.role).toBe("USER"); // rebaixamento refletido sem re-login
    expect(result?.refreshedAt).toBe(nowSec);
  });

  it("usuário excluído: invalida a sessão (null)", async () => {
    findUniqueMock.mockResolvedValue(null);
    await expect(refreshTokenClaims(baseToken)).resolves.toBeNull();
  });

  it("sessionVersion divergente (reset de senha): invalida a sessão", async () => {
    findUniqueMock.mockResolvedValue({
      role: "ADMIN",
      callsign: "PY2ABC",
      sessionVersion: 2,
    });
    await expect(refreshTokenClaims(baseToken)).resolves.toBeNull();
  });

  it("token legado sem sessionVersion: adota a versão atual sem derrubar", async () => {
    findUniqueMock.mockResolvedValue({
      role: "ADMIN",
      callsign: "PY2ABC",
      sessionVersion: 3,
    });
    const legacy = { ...baseToken };
    delete legacy.sessionVersion;
    delete legacy.refreshedAt;

    const result = await refreshTokenClaims(legacy);

    expect(result).not.toBeNull();
    expect(result?.sessionVersion).toBe(3);
  });

  it("token sem id: invalida a sessão", async () => {
    const anonymous = { ...baseToken, refreshedAt: undefined };
    delete (anonymous as Record<string, unknown>).id;
    await expect(refreshTokenClaims(anonymous)).resolves.toBeNull();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });
});
