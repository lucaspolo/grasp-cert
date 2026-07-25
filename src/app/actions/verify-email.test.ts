import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));
vi.mock("@/lib/rate-limit", () => ({
  consumeRateLimit: vi.fn(),
  getClientIp: vi.fn(),
}));
vi.mock("@/lib/tokens", () => ({
  generateEmailVerificationToken: vi.fn(),
}));
vi.mock("@/lib/mail", () => ({ sendVerificationEmail: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { generateEmailVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/mail";
import { resendVerificationEmail } from "./verify-email";

const findUniqueMock = prisma.user.findUnique as unknown as Mock;
const consumeMock = consumeRateLimit as unknown as Mock;
const getIpMock = getClientIp as unknown as Mock;
const genTokenMock = generateEmailVerificationToken as unknown as Mock;
const sendMock = sendVerificationEmail as unknown as Mock;

const GENERIC_SUCCESS =
  "Se a conta existir e ainda não estiver verificada, enviamos um novo e-mail de confirmação.";

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  getIpMock.mockResolvedValue("203.0.113.1");
  consumeMock.mockResolvedValue({ allowed: true, remaining: 2 });
  genTokenMock.mockResolvedValue({ token: "tok-123" });
});

describe("resendVerificationEmail", () => {
  it("indicativo inválido é rejeitado sem consultar nada", async () => {
    const result = await resendVerificationEmail({}, form({ callsign: "PY" }));
    expect(result.error).toBe("Indicativo inválido.");
    expect(consumeMock).not.toHaveBeenCalled();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("conta não-verificada: envia novo e-mail e retorna sucesso genérico", async () => {
    findUniqueMock.mockResolvedValue({
      email: "fulano@example.com",
      emailVerified: null,
    });

    const result = await resendVerificationEmail(
      {},
      form({ callsign: "py2abc" })
    );

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { callsign: "PY2ABC" },
    });
    expect(genTokenMock).toHaveBeenCalledWith("fulano@example.com");
    expect(sendMock).toHaveBeenCalledWith("fulano@example.com", "tok-123");
    expect(result).toEqual({ success: GENERIC_SUCCESS });
  });

  it("conta já verificada: não envia, mesmo sucesso genérico", async () => {
    findUniqueMock.mockResolvedValue({
      email: "fulano@example.com",
      emailVerified: new Date(),
    });

    const result = await resendVerificationEmail(
      {},
      form({ callsign: "PY2ABC" })
    );

    expect(sendMock).not.toHaveBeenCalled();
    expect(result).toEqual({ success: GENERIC_SUCCESS });
  });

  it("conta inexistente: não envia, mesmo sucesso genérico (anti-enumeração)", async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await resendVerificationEmail(
      {},
      form({ callsign: "PY9ZZZ" })
    );

    expect(sendMock).not.toHaveBeenCalled();
    expect(result).toEqual({ success: GENERIC_SUCCESS });
  });

  it("rate limit estourado: erro e nenhum envio", async () => {
    consumeMock.mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 600 });

    const result = await resendVerificationEmail(
      {},
      form({ callsign: "PY2ABC" })
    );

    expect(result.error).toContain("Muitas solicitações");
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });
});
