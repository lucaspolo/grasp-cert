import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    qSO: { findMany: vi.fn() },
    event: { findMany: vi.fn(), findUnique: vi.fn() },
    template: { findUnique: vi.fn() },
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listQSOsByEvent } from "./qso";
import { getEvent, listEvents, listPublicEvents } from "./event";
import { getTemplate } from "./template";

const authMock = auth as unknown as Mock;

const session = (role: string) => ({
  user: { id: "3f8e8b1c-2d4a-4e5b-9c6d-7a8b9c0d1e2f", role, callsign: "PY2ABC" },
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("actions de leitura exigem sessão e papel", () => {
  const cases: Array<{ name: string; call: () => Promise<unknown>; query: Mock }> = [
    {
      name: "listQSOsByEvent",
      call: () => listQSOsByEvent("evt-1"),
      query: prisma.qSO.findMany as unknown as Mock,
    },
    {
      name: "listEvents",
      call: () => listEvents(),
      query: prisma.event.findMany as unknown as Mock,
    },
    {
      name: "getEvent",
      call: () => getEvent("evt-1"),
      query: prisma.event.findUnique as unknown as Mock,
    },
    {
      name: "getTemplate",
      call: () => getTemplate("tpl-1"),
      query: prisma.template.findUnique as unknown as Mock,
    },
  ];

  for (const { name, call, query } of cases) {
    it(`${name}: rejeita chamada sem sessão`, async () => {
      authMock.mockResolvedValue(null);
      await expect(call()).rejects.toThrow("Unauthorized");
      expect(query).not.toHaveBeenCalled();
    });

    it(`${name}: rejeita papel USER`, async () => {
      authMock.mockResolvedValue(session("USER"));
      await expect(call()).rejects.toThrow("Forbidden");
      expect(query).not.toHaveBeenCalled();
    });

    it(`${name}: permite ADMIN`, async () => {
      authMock.mockResolvedValue(session("ADMIN"));
      query.mockResolvedValue(name.startsWith("list") ? [] : null);
      await call();
      expect(query).toHaveBeenCalledTimes(1);
    });
  }

  it("listQSOsByEvent: permite OPERATOR (usa a página de QSOs)", async () => {
    authMock.mockResolvedValue(session("OPERATOR"));
    (prisma.qSO.findMany as unknown as Mock).mockResolvedValue([]);
    await listQSOsByEvent("evt-1");
    expect(prisma.qSO.findMany).toHaveBeenCalledTimes(1);
  });

  it("getTemplate: rejeita OPERATOR (templates são de ADMIN/OWNER)", async () => {
    authMock.mockResolvedValue(session("OPERATOR"));
    await expect(getTemplate("tpl-1")).rejects.toThrow("Forbidden");
  });

  it("listPublicEvents: continua pública (alimenta a página inicial)", async () => {
    authMock.mockResolvedValue(null);
    (prisma.event.findMany as unknown as Mock).mockResolvedValue([]);
    await expect(listPublicEvents()).resolves.toEqual([]);
  });
});
