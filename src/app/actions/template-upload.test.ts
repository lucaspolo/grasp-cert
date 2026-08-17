import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import sharp from "sharp";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    template: { findUnique: vi.fn(), update: vi.fn() },
    groupMember: { findMany: vi.fn(), findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { uploadTemplateBg } from "./template";

const authMock = auth as unknown as Mock;
const updateMock = prisma.template.update as unknown as Mock;

function formWithFile(buffer: Buffer, name: string, type: string): FormData {
  const fd = new FormData();
  fd.set("file", new File([new Uint8Array(buffer)], name, { type }));
  return fd;
}

async function makeImage(format: "png" | "jpeg", width = 900, height = 600) {
  const base = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 12, g: 34, b: 56 },
    },
  });
  return format === "png" ? base.png().toBuffer() : base.jpeg().toBuffer();
}

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({
    user: { id: "owner-1", role: "OWNER", callsign: "PY2ADM" },
  });
  (prisma.template.findUnique as unknown as Mock).mockResolvedValue({
    name: "Padrão",
    groupId: null,
    _count: { events: 0 },
  });
  updateMock.mockResolvedValue({ name: "Padrão" });
});

describe("uploadTemplateBg — re-encode do upload", () => {
  it("re-encoda PNG válido e grava o MIME derivado do conteúdo", async () => {
    const png = await makeImage("png");
    const result = await uploadTemplateBg("tpl-1", formWithFile(png, "bg.png", "image/png"));

    expect(result).toEqual({ success: true });
    const data = updateMock.mock.calls[0][0].data;
    expect(data.bgMimeType).toBe("image/png");
    // O buffer gravado é o re-encodado, e continua PNG decodificável.
    const meta = await sharp(data.bgImage).metadata();
    expect(meta.format).toBe("png");
    expect(meta.width).toBe(900);
  });

  it("MIME forjado: JPEG declarado como PNG é gravado como image/jpeg", async () => {
    const jpeg = await makeImage("jpeg");
    const result = await uploadTemplateBg(
      "tpl-1",
      formWithFile(jpeg, "bg.png", "image/png")
    );

    expect(result).toEqual({ success: true });
    expect(updateMock.mock.calls[0][0].data.bgMimeType).toBe("image/jpeg");
  });

  it("imagem abaixo da resolução mínima continua rejeitada", async () => {
    const small = await makeImage("png", 100, 100);
    const result = await uploadTemplateBg(
      "tpl-1",
      formWithFile(small, "bg.png", "image/png")
    );

    expect(result.error).toContain("Resolução mínima");
    expect(updateMock).not.toHaveBeenCalled();
  });
});
