import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { Prisma } from "@prisma/client";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    eventBand: { findUnique: vi.fn() },
    eventMode: { findUnique: vi.fn() },
    qSO: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
    eventOperator: { findUnique: vi.fn() },
    groupMember: { findFirst: vi.fn() },
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { createQSO, deleteQSO, updateQSO } from "./qso";

const authMock = auth as unknown as Mock;
const eventBandMock = prisma.eventBand.findUnique as unknown as Mock;
const eventModeMock = prisma.eventMode.findUnique as unknown as Mock;
const createMock = prisma.qSO.create as unknown as Mock;
const updateMock = prisma.qSO.update as unknown as Mock;
const deleteMock = prisma.qSO.delete as unknown as Mock;
const findQsoMock = prisma.qSO.findUnique as unknown as Mock;
const eventOperatorMock = prisma.eventOperator.findUnique as unknown as Mock;
const groupMemberMock = prisma.groupMember.findFirst as unknown as Mock;
const recordAuditMock = recordAudit as unknown as Mock;

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

const validQso = {
  participantCallsign: "PY2ABC",
  dateTime: "25/07/2026 14:30",
  bandId: "band-40m",
  modeId: "mode-ssb",
  rstSent: "59",
  rstReceived: "59",
  frequency: "",
  observations: "",
};

/** QSO existente no banco, lançado pelo operador PY2OPR. */
const storedQso = {
  eventId: "evt-1",
  operatorCallsign: "PY2OPR",
  participantCallsign: "PY2ABC",
  dateTime: new Date("2026-07-25T14:30:00Z"),
  bandId: "band-40m",
  modeId: "mode-ssb",
  frequency: "",
  rstSent: "59",
  rstReceived: "59",
  observations: null,
  event: { name: "Contest 2026" },
};

function asOperator(callsign = "PY2OPR") {
  authMock.mockResolvedValue({
    user: { id: "u2", role: "OPERATOR", callsign },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({
    user: { id: "u1", role: "ADMIN", callsign: "PY2ADM" },
  });
  eventBandMock.mockResolvedValue({ eventId: "evt-1", bandId: "band-40m" });
  eventModeMock.mockResolvedValue({ eventId: "evt-1", modeId: "mode-ssb" });
  findQsoMock.mockResolvedValue(storedQso);
  eventOperatorMock.mockResolvedValue({ eventId: "evt-1", userId: "u2" });
  // Ninguém aqui é admin do grupo do evento por padrão: os casos deste arquivo
  // são sobre cargo global e designação de operador.
  groupMemberMock.mockResolvedValue(null);
  // clearAllMocks limpa chamadas, não implementações: redefinir evita que um
  // mockRejectedValue de um teste vaze para o seguinte.
  createMock.mockResolvedValue({ id: "qso-1" });
  updateMock.mockResolvedValue({ id: "qso-1" });
  deleteMock.mockResolvedValue({ id: "qso-1" });
});

describe("createQSO — constraint de unicidade", () => {
  it("QSO duplicado (P2002) retorna erro amigável, sem stack trace", async () => {
    createMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "7.7.0",
      })
    );

    const result = await createQSO("evt-1", {}, form(validQso));

    expect(result.errors?.participantCallsign?.[0]).toContain("QSO duplicado");
    expect(result.message).toBeUndefined();
  });

  it("QSO novo é criado normalmente", async () => {
    createMock.mockResolvedValue({ id: "qso-1" });

    const result = await createQSO("evt-1", {}, form(validQso));

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(result.message).toContain("adicionado");
  });

  it("erro não-P2002 é propagado (não engolido como duplicata)", async () => {
    createMock.mockRejectedValue(new Error("db offline"));
    await expect(createQSO("evt-1", {}, form(validQso))).rejects.toThrow(
      "db offline"
    );
  });
});

describe("updateQSO — autorização", () => {
  it("OPERATOR edita o próprio QSO em evento ao qual está designado", async () => {
    asOperator("PY2OPR");

    const result = await updateQSO("qso-1", "evt-1", {}, form(validQso));

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(result.message).toContain("atualizado");
  });

  it("OPERATOR não edita QSO lançado por outro operador", async () => {
    asOperator("PY2XYZ");

    await expect(
      updateQSO("qso-1", "evt-1", {}, form(validQso))
    ).rejects.toThrow("Forbidden");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("OPERATOR não designado ao evento não edita nada", async () => {
    asOperator("PY2OPR");
    eventOperatorMock.mockResolvedValue(null);

    await expect(
      updateQSO("qso-1", "evt-1", {}, form(validQso))
    ).rejects.toThrow("Forbidden");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("OPERATOR não edita QSO sem autor registrado", async () => {
    asOperator("PY2OPR");
    findQsoMock.mockResolvedValue({ ...storedQso, operatorCallsign: null });

    await expect(
      updateQSO("qso-1", "evt-1", {}, form(validQso))
    ).rejects.toThrow("Forbidden");
  });

  it("ADMIN edita QSO de qualquer operador", async () => {
    const result = await updateQSO("qso-1", "evt-1", {}, form(validQso));

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(result.message).toContain("atualizado");
  });

  it("USER não tem acesso à edição", async () => {
    authMock.mockResolvedValue({
      user: { id: "u3", role: "USER", callsign: "PY2USR" },
    });

    await expect(
      updateQSO("qso-1", "evt-1", {}, form(validQso))
    ).rejects.toThrow("Forbidden");
  });

  it("eventId divergente do QSO é rejeitado", async () => {
    await expect(
      updateQSO("qso-1", "evt-outro", {}, form(validQso))
    ).rejects.toThrow("Forbidden");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("QSO inexistente retorna erro amigável", async () => {
    findQsoMock.mockResolvedValue(null);

    const result = await updateQSO("qso-x", "evt-1", {}, form(validQso));

    expect(result.error).toContain("não encontrado");
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("updateQSO — validação e auditoria", () => {
  it("banda fora do evento é recusada", async () => {
    eventBandMock.mockResolvedValue(null);

    const result = await updateQSO("qso-1", "evt-1", {}, form(validQso));

    expect(result.errors?.bandId?.[0]).toContain("não pertence");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("QSO duplicado (P2002) retorna erro amigável", async () => {
    updateMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "7.7.0",
      })
    );

    const result = await updateQSO("qso-1", "evt-1", {}, form(validQso));

    expect(result.errors?.participantCallsign?.[0]).toContain("QSO duplicado");
    expect(result.message).toBeUndefined();
  });

  it("registra auditoria qso.updated com os campos alterados", async () => {
    const result = await updateQSO(
      "qso-1",
      "evt-1",
      {},
      form({ ...validQso, rstSent: "57" })
    );

    expect(result.message).toContain("atualizado");
    expect(recordAuditMock).toHaveBeenCalledTimes(1);
    const entry = recordAuditMock.mock.calls[0][1];
    expect(entry.action).toBe("qso.updated");
    expect(entry.entityId).toBe("qso-1");
    expect(entry.details.changes).toEqual({
      rstSent: { de: "59", para: "57" },
    });
  });

  it("não altera o autor do lançamento", async () => {
    await updateQSO("qso-1", "evt-1", {}, form(validQso));

    expect(updateMock.mock.calls[0][0].data).not.toHaveProperty(
      "operatorCallsign"
    );
  });

  it("interpreta a data/hora digitada como UTC", async () => {
    await updateQSO("qso-1", "evt-1", {}, form(validQso));

    expect(updateMock.mock.calls[0][0].data.dateTime.toISOString()).toBe(
      "2026-07-25T14:30:00.000Z"
    );
  });
});

describe("deleteQSO — permissões", () => {
  it("OPERATOR exclui o próprio QSO", async () => {
    asOperator("PY2OPR");

    await deleteQSO("qso-1", "evt-1");

    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "qso-1" } });
  });

  it("OPERATOR não exclui QSO de outro operador", async () => {
    asOperator("PY2XYZ");

    await expect(deleteQSO("qso-1", "evt-1")).rejects.toThrow("Forbidden");
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("ADMIN exclui qualquer QSO", async () => {
    await deleteQSO("qso-1", "evt-1");

    expect(deleteMock).toHaveBeenCalledTimes(1);
  });

  it("USER não exclui QSO", async () => {
    authMock.mockResolvedValue({
      user: { id: "u3", role: "USER", callsign: "PY2USR" },
    });

    await expect(deleteQSO("qso-1", "evt-1")).rejects.toThrow("Forbidden");
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
