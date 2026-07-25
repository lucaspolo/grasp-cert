import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    rateLimit: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  clearRateLimit,
  clientIpFrom,
  consumeRateLimit,
} from "./rate-limit";

const findUniqueMock = prisma.rateLimit.findUnique as unknown as Mock;
const upsertMock = prisma.rateLimit.upsert as unknown as Mock;
const updateMock = prisma.rateLimit.update as unknown as Mock;
const deleteManyMock = prisma.rateLimit.deleteMany as unknown as Mock;

const NOW_MS = 1_800_000_000_000;
const OPTS = { key: "login:acct:PY2ABC", limit: 5, windowSeconds: 900 };

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW_MS);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("consumeRateLimit", () => {
  it("primeira tentativa abre a janela e permite", async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await consumeRateLimit(OPTS);

    expect(result).toEqual({ allowed: true, remaining: 4 });
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: OPTS.key },
        create: expect.objectContaining({ count: 1 }),
      })
    );
  });

  it("dentro da janela e sob o limite: incrementa e permite", async () => {
    findUniqueMock.mockResolvedValue({
      key: OPTS.key,
      count: 2,
      windowStart: new Date(NOW_MS - 60_000),
      lockedUntil: null,
    });
    updateMock.mockResolvedValue({ count: 3 });

    const result = await consumeRateLimit(OPTS);

    expect(result).toEqual({ allowed: true, remaining: 2 });
    expect(updateMock).toHaveBeenCalledWith({
      where: { key: OPTS.key },
      data: { count: { increment: 1 } },
    });
  });

  it("acima do limite sem lockout: nega até o fim da janela", async () => {
    findUniqueMock.mockResolvedValue({
      key: OPTS.key,
      count: 5,
      windowStart: new Date(NOW_MS - 300_000), // faltam 600s de janela
      lockedUntil: null,
    });
    updateMock.mockResolvedValue({ count: 6 });

    const result = await consumeRateLimit(OPTS);

    expect(result).toEqual({ allowed: false, retryAfterSeconds: 600 });
    // Sem lockoutSeconds não grava lockedUntil (só o increment).
    expect(updateMock).toHaveBeenCalledTimes(1);
  });

  it("acima do limite com lockout: escala 60s, 120s, ...", async () => {
    const row = {
      key: OPTS.key,
      count: 5,
      windowStart: new Date(NOW_MS - 60_000),
      lockedUntil: null,
    };
    findUniqueMock.mockResolvedValue(row);

    updateMock.mockResolvedValueOnce({ count: 6 }).mockResolvedValueOnce({});
    const first = await consumeRateLimit({ ...OPTS, lockoutSeconds: 60 });
    expect(first).toEqual({ allowed: false, retryAfterSeconds: 60 });
    expect(updateMock).toHaveBeenLastCalledWith({
      where: { key: OPTS.key },
      data: { lockedUntil: new Date(NOW_MS + 60_000) },
    });

    updateMock.mockResolvedValueOnce({ count: 7 }).mockResolvedValueOnce({});
    const second = await consumeRateLimit({ ...OPTS, lockoutSeconds: 60 });
    expect(second).toEqual({ allowed: false, retryAfterSeconds: 120 });
  });

  it("bloqueado (lockedUntil no futuro): nega sem incrementar", async () => {
    findUniqueMock.mockResolvedValue({
      key: OPTS.key,
      count: 8,
      windowStart: new Date(NOW_MS - 60_000),
      lockedUntil: new Date(NOW_MS + 90_000),
    });

    const result = await consumeRateLimit(OPTS);

    expect(result).toEqual({ allowed: false, retryAfterSeconds: 90 });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("janela expirada: zera o contador e permite", async () => {
    findUniqueMock.mockResolvedValue({
      key: OPTS.key,
      count: 99,
      windowStart: new Date(NOW_MS - 901_000),
      lockedUntil: null,
    });

    const result = await consumeRateLimit(OPTS);

    expect(result).toEqual({ allowed: true, remaining: 4 });
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ count: 1, lockedUntil: null }),
      })
    );
  });
});

describe("clearRateLimit", () => {
  it("remove a chave", async () => {
    await clearRateLimit("login:acct:PY2ABC");
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { key: "login:acct:PY2ABC" },
    });
  });
});

describe("clientIpFrom", () => {
  it("usa o primeiro IP do x-forwarded-for", () => {
    const h = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" });
    expect(clientIpFrom(h)).toBe("203.0.113.7");
  });

  it("cai para x-real-ip e depois para 'unknown'", () => {
    expect(clientIpFrom(new Headers({ "x-real-ip": "203.0.113.9" }))).toBe(
      "203.0.113.9"
    );
    expect(clientIpFrom(new Headers())).toBe("unknown");
  });
});
