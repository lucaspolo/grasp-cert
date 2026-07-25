import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn(), create: vi.fn() } },
}));
vi.mock("@/lib/tokens", () => ({
  generateEmailVerificationToken: vi.fn(),
}));
vi.mock("@/lib/mail", () => ({ sendVerificationEmail: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { registerUser } from "./auth";

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("registerUser — política de senha", () => {
  it("rejeita senha com menos de 8 caracteres", async () => {
    const result = await registerUser(
      {},
      form({
        callsign: "PY2ABC",
        name: "Fulano",
        email: "fulano@example.com",
        city: "Campinas",
        state: "SP",
        password: "1234567",
        confirmPassword: "1234567",
      })
    );

    expect(result.errors?.password?.[0]).toContain("mínimo 8");
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
