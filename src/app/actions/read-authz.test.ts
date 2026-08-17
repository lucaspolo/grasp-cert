import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    qSO: { findMany: vi.fn() },
    event: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
    template: { findUnique: vi.fn() },
    eventOperator: { findUnique: vi.fn() },
    groupMember: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn() },
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listQSOsByEvent } from "./qso";
import { getEvent, listEvents, listPublicEvents } from "./event";
import { getTemplate } from "./template";

const authMock = auth as unknown as Mock;
const groupMemberFindManyMock = prisma.groupMember.findMany as unknown as Mock;
const groupMemberFindFirstMock = prisma.groupMember.findFirst as unknown as Mock;

const session = (role: string) => ({
  user: { id: "3f8e8b1c-2d4a-4e5b-9c6d-7a8b9c0d1e2f", role, callsign: "PY2ABC" },
});

beforeEach(() => {
  vi.clearAllMocks();
  // Sem vínculo de grupo por padrão: quem não é admin da plataforma nem admin
  // de grupo nem operador designado não passa.
  groupMemberFindManyMock.mockResolvedValue([]);
  groupMemberFindFirstMock.mockResolvedValue(null);
  (prisma.eventOperator.findUnique as unknown as Mock).mockResolvedValue(null);
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
      query: prisma.event.findFirst as unknown as Mock,
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

    it(`${name}: rejeita USER sem grupo administrado`, async () => {
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

  it("listQSOsByEvent: permite OPERATOR designado (usa a página de QSOs)", async () => {
    authMock.mockResolvedValue(session("OPERATOR"));
    (prisma.eventOperator.findUnique as unknown as Mock).mockResolvedValue({
      eventId: "evt-1",
    });
    (prisma.qSO.findMany as unknown as Mock).mockResolvedValue([]);
    await listQSOsByEvent("evt-1");
    expect(prisma.qSO.findMany).toHaveBeenCalledTimes(1);
  });

  it("listQSOsByEvent: rejeita OPERATOR não designado", async () => {
    authMock.mockResolvedValue(session("OPERATOR"));
    await expect(listQSOsByEvent("evt-1")).rejects.toThrow("Forbidden");
    expect(prisma.qSO.findMany).not.toHaveBeenCalled();
  });

  it("getTemplate: rejeita OPERATOR (templates são de quem administra)", async () => {
    authMock.mockResolvedValue(session("OPERATOR"));
    await expect(getTemplate("tpl-1")).rejects.toThrow("Forbidden");
    expect(prisma.template.findUnique).not.toHaveBeenCalled();
  });

  // O cargo por grupo é a novidade: um USER global que administra um clube
  // enxerga os templates e os eventos DELE, e nada além.
  it("getTemplate: permite USER que administra o grupo do template", async () => {
    authMock.mockResolvedValue(session("USER"));
    groupMemberFindManyMock.mockResolvedValue([{ groupId: "grp-1" }]);
    (prisma.groupMember.findUnique as unknown as Mock).mockResolvedValue({
      role: "ADMIN",
    });
    (prisma.template.findUnique as unknown as Mock).mockResolvedValue({
      id: "tpl-1",
      name: "Contest",
      groupId: "grp-1",
    });

    await expect(getTemplate("tpl-1")).resolves.toMatchObject({ id: "tpl-1" });
  });

  it("getTemplate: recusa template de outro grupo", async () => {
    authMock.mockResolvedValue(session("USER"));
    groupMemberFindManyMock.mockResolvedValue([{ groupId: "grp-1" }]);
    (prisma.groupMember.findUnique as unknown as Mock).mockResolvedValue(null);
    (prisma.template.findUnique as unknown as Mock).mockResolvedValue({
      id: "tpl-9",
      name: "De outro clube",
      groupId: "grp-2",
    });

    await expect(getTemplate("tpl-9")).rejects.toThrow("Forbidden");
  });

  it("getTemplate: template global é só de quem administra a plataforma", async () => {
    authMock.mockResolvedValue(session("USER"));
    groupMemberFindManyMock.mockResolvedValue([{ groupId: "grp-1" }]);
    (prisma.template.findUnique as unknown as Mock).mockResolvedValue({
      id: "tpl-padrao",
      name: "Padrão",
      groupId: null,
    });

    await expect(getTemplate("tpl-padrao")).rejects.toThrow("Forbidden");
  });

  it("listEvents: admin de grupo enxerga só os eventos dos seus grupos", async () => {
    authMock.mockResolvedValue(session("USER"));
    groupMemberFindManyMock.mockResolvedValue([{ groupId: "grp-1" }]);
    (prisma.event.findMany as unknown as Mock).mockResolvedValue([]);

    await listEvents();

    expect(
      (prisma.event.findMany as unknown as Mock).mock.calls[0][0].where
    ).toEqual({ OR: [{ groupId: { in: ["grp-1"] } }] });
  });

  it("listEvents: ADMIN global não recebe filtro de grupo", async () => {
    authMock.mockResolvedValue(session("ADMIN"));
    (prisma.event.findMany as unknown as Mock).mockResolvedValue([]);

    await listEvents();

    expect(
      (prisma.event.findMany as unknown as Mock).mock.calls[0][0].where
    ).toBeUndefined();
  });

  it("listPublicEvents: continua pública (alimenta a página inicial)", async () => {
    authMock.mockResolvedValue(null);
    (prisma.event.findMany as unknown as Mock).mockResolvedValue([]);
    await expect(listPublicEvents()).resolves.toEqual([]);
  });
});
