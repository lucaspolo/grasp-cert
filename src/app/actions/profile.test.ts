import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { hashSync } from "bcryptjs";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    twoFactorAuth: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/mail", () => ({
  sendEmailChangeNotice: vi.fn(),
  sendVerificationEmail: vi.fn(),
}));
vi.mock("@/lib/tokens", () => ({
  generateEmailVerificationToken: vi.fn().mockResolvedValue({ token: "tok-1" }),
}));
vi.mock("@/lib/second-factor", () => ({ verifyUserSecondFactor: vi.fn() }));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendEmailChangeNotice, sendVerificationEmail } from "@/lib/mail";
import { verifyUserSecondFactor } from "@/lib/second-factor";
import { updateProfile } from "./profile";

const authMock = auth as unknown as Mock;
const userFindUniqueMock = prisma.user.findUnique as unknown as Mock;
const userUpdateMock = prisma.user.update as unknown as Mock;
const twoFactorFindUniqueMock = prisma.twoFactorAuth.findUnique as unknown as Mock;
const verifySecondFactorMock = verifyUserSecondFactor as unknown as Mock;

const USER_ID = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
const PASSWORD = "senha-atual-123";
const passwordHash = hashSync(PASSWORD, 4);

const currentUser = {
  id: USER_ID,
  callsign: "PY2ABC",
  name: "Fulano",
  email: "antigo@example.com",
  city: "Campinas",
  state: "SP",
  passwordHash,
};

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

const baseForm = {
  name: "Fulano",
  city: "Campinas",
  state: "SP",
};

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { id: USER_ID } });
  userFindUniqueMock.mockImplementation(({ where }: { where: Record<string, string> }) =>
    where.id === USER_ID ? Promise.resolve(currentUser) : Promise.resolve(null)
  );
  twoFactorFindUniqueMock.mockResolvedValue(null);
});

describe("updateProfile — troca de e-mail exige re-autenticação", () => {
  it("sem senha atual: rejeita a troca", async () => {
    const result = await updateProfile(
      {},
      form({ ...baseForm, email: "novo@example.com" })
    );
    expect(result.errors?.currentPassword?.[0]).toContain("senha atual");
    expect(userUpdateMock).not.toHaveBeenCalled();
  });

  it("com senha errada: rejeita a troca", async () => {
    const result = await updateProfile(
      {},
      form({
        ...baseForm,
        email: "novo@example.com",
        currentPassword: "senha-errada",
      })
    );
    expect(result.errors?.currentPassword).toEqual(["Senha atual incorreta"]);
    expect(userUpdateMock).not.toHaveBeenCalled();
  });

  it("com senha certa: troca, avisa o endereço antigo e reenvia verificação", async () => {
    const result = await updateProfile(
      {},
      form({
        ...baseForm,
        email: "novo@example.com",
        currentPassword: PASSWORD,
      })
    );

    expect(result.success).toBeDefined();
    expect(userUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "novo@example.com",
          emailVerified: null,
        }),
      })
    );
    expect(sendEmailChangeNotice).toHaveBeenCalledWith(
      "antigo@example.com",
      "novo@example.com",
      "PY2ABC"
    );
    expect(sendVerificationEmail).toHaveBeenCalledWith(
      "novo@example.com",
      "tok-1"
    );
  });

  it("com 2FA ativo e sem código: rejeita a troca", async () => {
    twoFactorFindUniqueMock.mockResolvedValue({ enabled: true });
    const result = await updateProfile(
      {},
      form({
        ...baseForm,
        email: "novo@example.com",
        currentPassword: PASSWORD,
      })
    );
    expect(result.errors?.otp?.[0]).toContain("código do autenticador");
    expect(userUpdateMock).not.toHaveBeenCalled();
  });

  it("com 2FA ativo e código válido: troca", async () => {
    twoFactorFindUniqueMock.mockResolvedValue({ enabled: true });
    verifySecondFactorMock.mockResolvedValue("valid");

    const result = await updateProfile(
      {},
      form({
        ...baseForm,
        email: "novo@example.com",
        currentPassword: PASSWORD,
        otp: "123456",
      })
    );

    expect(verifySecondFactorMock).toHaveBeenCalledWith(USER_ID, "123456");
    expect(result.success).toBeDefined();
  });

  it("com 2FA ativo e tentativas estouradas: informa o bloqueio", async () => {
    twoFactorFindUniqueMock.mockResolvedValue({ enabled: true });
    verifySecondFactorMock.mockResolvedValue("rate_limited");

    const result = await updateProfile(
      {},
      form({
        ...baseForm,
        email: "novo@example.com",
        currentPassword: PASSWORD,
        otp: "123456",
      })
    );

    expect(result.errors?.otp?.[0]).toContain("Muitas tentativas");
    expect(userUpdateMock).not.toHaveBeenCalled();
  });
});

describe("updateProfile — demais fluxos", () => {
  it("sem troca de e-mail não exige senha", async () => {
    const result = await updateProfile(
      {},
      form({ ...baseForm, email: "antigo@example.com" })
    );
    expect(result.success).toBeDefined();
    expect(sendEmailChangeNotice).not.toHaveBeenCalled();
  });

  it("nova senha com menos de 8 caracteres é rejeitada", async () => {
    const result = await updateProfile(
      {},
      form({
        ...baseForm,
        email: "antigo@example.com",
        currentPassword: PASSWORD,
        newPassword: "1234567",
        confirmNewPassword: "1234567",
      })
    );
    expect(result.errors?.newPassword?.[0]).toContain("mínimo 8");
    expect(userUpdateMock).not.toHaveBeenCalled();
  });
});
