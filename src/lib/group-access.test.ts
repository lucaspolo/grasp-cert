import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    groupMember: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    eventOperator: { findUnique: vi.fn() },
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  assertGroupAdmin,
  isPlatformAdmin,
  requireAnyGroupAdmin,
  requireEventAccess,
  requireEventGroupAdmin,
  requireGroupAdmin,
} from "./group-access";

const authMock = auth as unknown as Mock;
const findManyMock = prisma.groupMember.findMany as unknown as Mock;
const findFirstMock = prisma.groupMember.findFirst as unknown as Mock;
const findUniqueMock = prisma.groupMember.findUnique as unknown as Mock;
const eventOperatorMock = prisma.eventOperator.findUnique as unknown as Mock;

const sessionFor = (role: string) => ({
  user: { id: "u1", role: role as "OWNER", callsign: "PY2ABC" },
  expires: "2099-01-01T00:00:00.000Z",
});

beforeEach(() => {
  vi.clearAllMocks();
  findManyMock.mockResolvedValue([]);
  findFirstMock.mockResolvedValue(null);
  findUniqueMock.mockResolvedValue(null);
  eventOperatorMock.mockResolvedValue(null);
});

describe("isPlatformAdmin", () => {
  it("OWNER e ADMIN administram qualquer grupo", () => {
    expect(isPlatformAdmin("OWNER")).toBe(true);
    expect(isPlatformAdmin("ADMIN")).toBe(true);
  });

  it("OPERATOR, USER e ausência de cargo não administram", () => {
    expect(isPlatformAdmin("OPERATOR")).toBe(false);
    expect(isPlatformAdmin("USER")).toBe(false);
    expect(isPlatformAdmin(undefined)).toBe(false);
  });
});

describe("assertGroupAdmin", () => {
  it("admin da plataforma passa sem consultar o quadro de membros", async () => {
    await expect(
      assertGroupAdmin(sessionFor("ADMIN"), "grp-1")
    ).resolves.toBeUndefined();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("admin do grupo passa", async () => {
    findUniqueMock.mockResolvedValue({ role: "ADMIN" });
    await expect(
      assertGroupAdmin(sessionFor("USER"), "grp-1")
    ).resolves.toBeUndefined();
  });

  it("membro comum não administra", async () => {
    findUniqueMock.mockResolvedValue({ role: "MEMBER" });
    await expect(assertGroupAdmin(sessionFor("USER"), "grp-1")).rejects.toThrow(
      "Forbidden"
    );
  });

  it("quem não é do grupo não administra", async () => {
    await expect(assertGroupAdmin(sessionFor("USER"), "grp-1")).rejects.toThrow(
      "Forbidden"
    );
  });

  // Template global (groupId null) afeta todos os grupos.
  it("recurso global é só de quem administra a plataforma", async () => {
    findUniqueMock.mockResolvedValue({ role: "ADMIN" });
    await expect(assertGroupAdmin(sessionFor("USER"), null)).rejects.toThrow(
      "Forbidden"
    );
    await expect(
      assertGroupAdmin(sessionFor("OWNER"), null)
    ).resolves.toBeUndefined();
  });
});

describe("requireGroupAdmin", () => {
  it("sem sessão: Unauthorized", async () => {
    authMock.mockResolvedValue(null);
    await expect(requireGroupAdmin("grp-1")).rejects.toThrow("Unauthorized");
  });

  it("com sessão e cargo no grupo: devolve a sessão", async () => {
    authMock.mockResolvedValue(sessionFor("USER"));
    findUniqueMock.mockResolvedValue({ role: "ADMIN" });
    const session = await requireGroupAdmin("grp-1");
    expect(session.user.id).toBe("u1");
  });
});

describe("requireAnyGroupAdmin", () => {
  it("sem sessão: Unauthorized", async () => {
    authMock.mockResolvedValue(null);
    await expect(requireAnyGroupAdmin()).rejects.toThrow("Unauthorized");
  });

  it("admin da plataforma: groupIds null (todos)", async () => {
    authMock.mockResolvedValue(sessionFor("OWNER"));
    const { groupIds } = await requireAnyGroupAdmin();
    expect(groupIds).toBeNull();
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("admin de grupo: devolve os ids que administra", async () => {
    authMock.mockResolvedValue(sessionFor("USER"));
    findManyMock.mockResolvedValue([{ groupId: "grp-1" }, { groupId: "grp-2" }]);
    const { groupIds } = await requireAnyGroupAdmin();
    expect(groupIds).toEqual(["grp-1", "grp-2"]);
  });

  it("sem nenhum grupo administrado: Forbidden", async () => {
    authMock.mockResolvedValue(sessionFor("USER"));
    await expect(requireAnyGroupAdmin()).rejects.toThrow("Forbidden");
  });
});

describe("requireEventAccess", () => {
  it("admin da plataforma: escopo platform, sem consulta", async () => {
    authMock.mockResolvedValue(sessionFor("ADMIN"));
    const { scope } = await requireEventAccess("evt-1");
    expect(scope).toBe("platform");
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("admin do grupo dono do evento: escopo group", async () => {
    authMock.mockResolvedValue(sessionFor("USER"));
    findFirstMock.mockResolvedValue({ id: "gm-1" });
    const { scope } = await requireEventAccess("evt-1");
    expect(scope).toBe("group");
  });

  it("operador designado: escopo operator", async () => {
    authMock.mockResolvedValue(sessionFor("OPERATOR"));
    eventOperatorMock.mockResolvedValue({ eventId: "evt-1", userId: "u1" });
    const { scope } = await requireEventAccess("evt-1");
    expect(scope).toBe("operator");
  });

  it("operador não designado: Forbidden", async () => {
    authMock.mockResolvedValue(sessionFor("OPERATOR"));
    await expect(requireEventAccess("evt-1")).rejects.toThrow("Forbidden");
  });

  it("usuário comum: Forbidden", async () => {
    authMock.mockResolvedValue(sessionFor("USER"));
    await expect(requireEventAccess("evt-1")).rejects.toThrow("Forbidden");
  });

  // Um operador que também administre o grupo tem os poderes maiores: a
  // checagem de grupo vem antes da de designação.
  it("operador que administra o grupo recebe escopo group", async () => {
    authMock.mockResolvedValue(sessionFor("OPERATOR"));
    findFirstMock.mockResolvedValue({ id: "gm-1" });
    const { scope } = await requireEventAccess("evt-1");
    expect(scope).toBe("group");
  });
});

describe("requireEventGroupAdmin", () => {
  it("recusa o operador designado", async () => {
    authMock.mockResolvedValue(sessionFor("OPERATOR"));
    eventOperatorMock.mockResolvedValue({ eventId: "evt-1", userId: "u1" });
    await expect(requireEventGroupAdmin("evt-1")).rejects.toThrow("Forbidden");
  });

  it("aceita o admin do grupo", async () => {
    authMock.mockResolvedValue(sessionFor("USER"));
    findFirstMock.mockResolvedValue({ id: "gm-1" });
    await expect(requireEventGroupAdmin("evt-1")).resolves.toMatchObject({
      user: { id: "u1" },
    });
  });
});
