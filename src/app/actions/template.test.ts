import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { Prisma } from "@prisma/client";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    template: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    groupMember: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  clearTemplateBg,
  deleteTemplate,
  saveTemplateConfig,
  updateTemplateName,
} from "./template";
import { getDefaultTemplateConfig } from "@/lib/template-config";

const authMock = auth as unknown as Mock;
const findMock = prisma.template.findUnique as unknown as Mock;
const updateMock = prisma.template.update as unknown as Mock;
const deleteMock = prisma.template.delete as unknown as Mock;

function form(name: string): FormData {
  const fd = new FormData();
  fd.set("name", name);
  return fd;
}

function missingRecord() {
  return new Prisma.PrismaClientKnownRequestError("Record not found", {
    code: "P2025",
    clientVersion: "7.7.0",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({
    user: { id: "u1", role: "ADMIN", callsign: "PY2ADM" },
  });
  findMock.mockResolvedValue({
    name: "Contest",
    groupId: "grp-1",
    _count: { events: 0 },
  });
  updateMock.mockResolvedValue({ name: "Contest" });
  deleteMock.mockResolvedValue({ id: "tpl-1" });
  // Sem vínculo de grupo por padrão: os testes deste arquivo exercitam o cargo
  // global, e quem não tem nenhum dos dois deve ser barrado.
  (prisma.groupMember.findMany as unknown as Mock).mockResolvedValue([]);
  (prisma.groupMember.findUnique as unknown as Mock).mockResolvedValue(null);
});

/**
 * `loadCertificateData` acha o template de fallback pelo NOME. Renomear ou
 * excluir o "Padrão" derruba o certificado de todo evento sem template próprio.
 */
describe("proteção do template Padrão", () => {
  it("não deixa renomear", async () => {
    findMock.mockResolvedValue({ name: "Padrão", _count: { events: 0 } });

    const result = await updateTemplateName("tpl-1", {}, form("Outro Nome"));

    expect(result.errors?.name?.[0]).toContain("não pode ser renomeado");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("não deixa excluir, mesmo sem evento apontando para ele", async () => {
    // O fallback serve eventos com templateId nulo, que a contagem não vê.
    findMock.mockResolvedValue({ name: "Padrão", _count: { events: 0 } });

    const result = await deleteTemplate("tpl-1");

    expect(result.error).toContain("não pode ser excluído");
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("deixa renomear e excluir os demais", async () => {
    expect(
      (await updateTemplateName("tpl-1", {}, form("Novo Nome"))).errors
    ).toBeUndefined();
    expect(await deleteTemplate("tpl-1")).toEqual({ success: true });
  });
});

describe("clearTemplateBg", () => {
  it("zera imagem e mime type", async () => {
    const result = await clearTemplateBg("tpl-1");

    expect(updateMock.mock.calls[0][0].data).toEqual({
      bgImage: null,
      bgMimeType: null,
    });
    expect(result).toEqual({ success: true });
  });

  it("exige papel administrativo", async () => {
    authMock.mockResolvedValue({
      user: { id: "u2", role: "OPERATOR", callsign: "PY2OPR" },
    });

    await expect(clearTemplateBg("tpl-1")).rejects.toThrow("Forbidden");
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("registro removido durante a escrita (P2025)", () => {
  it("clearTemplateBg devolve erro amigável", async () => {
    updateMock.mockRejectedValue(missingRecord());

    expect(await clearTemplateBg("tpl-1")).toEqual({
      error: "Template não encontrado.",
    });
  });

  it("saveTemplateConfig devolve erro amigável", async () => {
    updateMock.mockRejectedValue(missingRecord());

    expect(await saveTemplateConfig("tpl-1", getDefaultTemplateConfig())).toEqual(
      { error: "Template não encontrado." }
    );
  });

  it("erro que não é P2025 continua propagando", async () => {
    updateMock.mockRejectedValue(new Error("db offline"));

    await expect(clearTemplateBg("tpl-1")).rejects.toThrow("db offline");
  });
});

describe("saveTemplateConfig", () => {
  it("aponta o campo inválido em vez de erro genérico", async () => {
    const config = getDefaultTemplateConfig();
    config.fields.eventName.x = 5000;

    const result = await saveTemplateConfig("tpl-1", config);

    expect(result.error).toContain("eventName");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("aceita align e visible", async () => {
    const config = getDefaultTemplateConfig();
    config.fields.eventName.align = "right";
    config.fields.eventName.visible = false;

    expect(await saveTemplateConfig("tpl-1", config)).toEqual({ success: true });
    const salvo = updateMock.mock.calls[0][0].data.config;
    expect(salvo.fields.eventName).toMatchObject({
      align: "right",
      visible: false,
    });
  });
});
