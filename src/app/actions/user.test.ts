import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    event: { findUnique: vi.fn() },
    eventOperator: { upsert: vi.fn(), delete: vi.fn(), findMany: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { deleteUser, updateUserRole } from "./user";

const authMock = auth as unknown as Mock;
const findUniqueMock = prisma.user.findUnique as unknown as Mock;
const updateMock = prisma.user.update as unknown as Mock;
const deleteMock = prisma.user.delete as unknown as Mock;
const auditCreateMock = prisma.auditLog.create as unknown as Mock;

const OWNER_ID = "3f8e8b1c-2d4a-4e5b-9c6d-7a8b9c0d1e2f";
const TARGET_ID = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";

const ownerSession = {
  user: { id: OWNER_ID, role: "OWNER", callsign: "PY2ADM" },
};

describe("updateUserRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue(ownerSession);
  });

  it("rejeita usuário não autenticado", async () => {
    authMock.mockResolvedValue(null);
    await expect(updateUserRole(TARGET_ID, "ADMIN")).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("rejeita quem não é OWNER", async () => {
    authMock.mockResolvedValue({
      user: { id: OWNER_ID, role: "ADMIN", callsign: "PY2ADM" },
    });
    await expect(updateUserRole(TARGET_ID, "ADMIN")).rejects.toThrow(
      "Forbidden"
    );
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("impede alterar o próprio cargo", async () => {
    const result = await updateUserRole(OWNER_ID, "USER");
    expect(result).toEqual({ error: "Você não pode alterar seu próprio cargo." });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejeita cargo inválido", async () => {
    const result = await updateUserRole(TARGET_ID, "SUPERADMIN");
    expect(result).toEqual({ error: "Cargo inválido." });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("retorna erro quando o usuário alvo não existe", async () => {
    findUniqueMock.mockResolvedValue(null);
    const result = await updateUserRole(TARGET_ID, "ADMIN");
    expect(result).toEqual({ error: "Usuário não encontrado." });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("atualiza o cargo e registra auditoria", async () => {
    findUniqueMock.mockResolvedValue({ callsign: "PY2XYZ", role: "USER" });

    const result = await updateUserRole(TARGET_ID, "ADMIN");

    expect(result).toEqual({ success: true });
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: TARGET_ID },
      data: { role: "ADMIN" },
    });
    expect(auditCreateMock).toHaveBeenCalledTimes(1);
    const audit = auditCreateMock.mock.calls[0][0].data;
    expect(audit.action).toBe("user.role_updated");
    expect(audit.actorCallsign).toBe("PY2ADM");
    expect(audit.entityId).toBe(TARGET_ID);
    expect(audit.details).toEqual({ from: "USER", to: "ADMIN" });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/users");
  });
});

describe("deleteUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue(ownerSession);
  });

  it("impede excluir a própria conta", async () => {
    const result = await deleteUser(OWNER_ID);
    expect(result).toEqual({ error: "Você não pode excluir sua própria conta." });
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("retorna erro quando o usuário alvo não existe", async () => {
    findUniqueMock.mockResolvedValue(null);
    const result = await deleteUser(TARGET_ID);
    expect(result).toEqual({ error: "Usuário não encontrado." });
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("exclui o usuário e registra auditoria", async () => {
    findUniqueMock.mockResolvedValue({
      callsign: "PY2DEL",
      email: "del@example.com",
      role: "USER",
    });

    const result = await deleteUser(TARGET_ID);

    expect(result).toEqual({ success: true });
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: TARGET_ID } });
    const audit = auditCreateMock.mock.calls[0][0].data;
    expect(audit.action).toBe("user.deleted");
    expect(audit.summary).toContain("PY2DEL");
  });
});
