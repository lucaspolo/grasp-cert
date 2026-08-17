import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { Prisma } from "@prisma/client";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    group: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    groupMember: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    user: { findUnique: vi.fn() },
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  addGroupMember,
  createGroup,
  deleteGroup,
  removeGroupMember,
  updateGroupMemberRole,
} from "./group";

const authMock = auth as unknown as Mock;
const groupCreateMock = prisma.group.create as unknown as Mock;
const groupFindMock = prisma.group.findUnique as unknown as Mock;
const groupDeleteMock = prisma.group.delete as unknown as Mock;
const memberCreateMock = prisma.groupMember.create as unknown as Mock;
const memberUpdateMock = prisma.groupMember.update as unknown as Mock;
const memberDeleteMock = prisma.groupMember.delete as unknown as Mock;
const memberCountMock = prisma.groupMember.count as unknown as Mock;
const memberFindMock = prisma.groupMember.findUnique as unknown as Mock;
const userFindMock = prisma.user.findUnique as unknown as Mock;

function groupForm(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

function duplicateName() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "7.7.0",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({
    user: { id: "u1", role: "OWNER", callsign: "PY2ADM" },
  });
  groupCreateMock.mockResolvedValue({ id: "grp-1", name: "Clube Novo" });
  groupFindMock.mockResolvedValue({
    name: "Clube Novo",
    _count: { events: 0, templates: 0 },
  });
  memberFindMock.mockResolvedValue(null);
  memberCountMock.mockResolvedValue(1);
  userFindMock.mockResolvedValue({ id: "u9", callsign: "PY2ABC" });
});

describe("createGroup", () => {
  it("exige cargo administrativo da plataforma", async () => {
    authMock.mockResolvedValue({
      user: { id: "u2", role: "USER", callsign: "PY2ABC" },
    });

    await expect(
      createGroup({}, groupForm({ name: "Clube Novo" }))
    ).rejects.toThrow("Forbidden");
    expect(groupCreateMock).not.toHaveBeenCalled();
  });

  it("recusa nome curto sem tocar no banco", async () => {
    const state = await createGroup({}, groupForm({ name: "C" }));
    expect(state.errors?.name?.[0]).toContain("mínimo 2");
    expect(groupCreateMock).not.toHaveBeenCalled();
  });

  it("nome repetido devolve erro amigável (P2002)", async () => {
    groupCreateMock.mockRejectedValue(duplicateName());
    const state = await createGroup({}, groupForm({ name: "GRASP" }));
    expect(state.errors?.name?.[0]).toBe("Já existe um grupo com esse nome.");
  });

  it("primeiro admin inexistente é reportado antes de criar o grupo", async () => {
    userFindMock.mockResolvedValue(null);
    const state = await createGroup(
      {},
      groupForm({ name: "Clube Novo", adminCallsign: "py9zzz" })
    );
    expect(state.errors?.adminCallsign?.[0]).toContain("PY9ZZZ");
    expect(groupCreateMock).not.toHaveBeenCalled();
  });

  it("cria o grupo já com o primeiro admin", async () => {
    await createGroup(
      {},
      groupForm({ name: "Clube Novo", adminCallsign: "py2abc" })
    );

    expect(groupCreateMock.mock.calls[0][0].data.members).toEqual({
      create: { userId: "u9", role: "ADMIN" },
    });
  });
});

describe("addGroupMember", () => {
  it("indicativo sem conta é recusado", async () => {
    userFindMock.mockResolvedValue(null);
    const result = await addGroupMember("grp-1", "py9zzz", "MEMBER");
    expect(result.error).toContain("PY9ZZZ");
    expect(memberCreateMock).not.toHaveBeenCalled();
  });

  it("quem já é membro não entra duas vezes", async () => {
    memberFindMock.mockResolvedValue({ id: "gm-1" });
    const result = await addGroupMember("grp-1", "PY2ABC", "MEMBER");
    expect(result.error).toContain("já é membro");
    expect(memberCreateMock).not.toHaveBeenCalled();
  });

  it("cargo inválido é recusado", async () => {
    const result = await addGroupMember("grp-1", "PY2ABC", "SUPERVISOR");
    expect(result.error).toBe("Cargo inválido.");
    expect(memberCreateMock).not.toHaveBeenCalled();
  });

  it("adiciona normalizando o indicativo", async () => {
    await addGroupMember("grp-1", " py2abc ", "ADMIN");
    expect(userFindMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { callsign: "PY2ABC" } })
    );
    expect(memberCreateMock).toHaveBeenCalledWith({
      data: { groupId: "grp-1", userId: "u9", role: "ADMIN" },
    });
  });
});

// Um grupo sem admin próprio fica órfão: ninguém de dentro consegue mais
// cadastrar template, criar evento ou chamar gente nova.
describe("o grupo não pode ficar sem admin", () => {
  beforeEach(() => {
    memberFindMock.mockResolvedValue({
      role: "ADMIN",
      user: { callsign: "PY2ABC" },
    });
  });

  it("rebaixar o último admin é bloqueado", async () => {
    memberCountMock.mockResolvedValue(0);
    const result = await updateGroupMemberRole("grp-1", "u9", "MEMBER");
    expect(result.error).toBe("O grupo precisa de pelo menos um admin.");
    expect(memberUpdateMock).not.toHaveBeenCalled();
  });

  it("rebaixar com outro admin no grupo é permitido", async () => {
    memberCountMock.mockResolvedValue(1);
    const result = await updateGroupMemberRole("grp-1", "u9", "MEMBER");
    expect(result).toEqual({ success: true });
    expect(memberUpdateMock).toHaveBeenCalledTimes(1);
  });

  it("remover o último admin é bloqueado", async () => {
    memberCountMock.mockResolvedValue(0);
    const result = await removeGroupMember("grp-1", "u9");
    expect(result.error).toBe("O grupo precisa de pelo menos um admin.");
    expect(memberDeleteMock).not.toHaveBeenCalled();
  });

  it("remover um membro comum não esbarra na regra", async () => {
    memberFindMock.mockResolvedValue({
      role: "MEMBER",
      user: { callsign: "PY3XYZ" },
    });
    memberCountMock.mockResolvedValue(0);
    const result = await removeGroupMember("grp-1", "u9");
    expect(result).toEqual({ success: true });
    expect(memberDeleteMock).toHaveBeenCalledTimes(1);
  });
});

describe("deleteGroup", () => {
  it("é privativo do OWNER", async () => {
    authMock.mockResolvedValue({
      user: { id: "u2", role: "ADMIN", callsign: "PY2ADM" },
    });
    await expect(deleteGroup("grp-1")).rejects.toThrow("Forbidden");
  });

  // Eventos e templates carregam certificados já emitidos.
  it("recusa grupo com eventos ou templates", async () => {
    groupFindMock.mockResolvedValue({
      name: "GRASP",
      _count: { events: 3, templates: 1 },
    });
    const result = await deleteGroup("grp-1");
    expect(result.error).toContain("3 evento(s)");
    expect(groupDeleteMock).not.toHaveBeenCalled();
  });

  it("exclui grupo vazio", async () => {
    const result = await deleteGroup("grp-1");
    expect(result).toEqual({ success: true });
    expect(groupDeleteMock).toHaveBeenCalledWith({ where: { id: "grp-1" } });
  });
});
