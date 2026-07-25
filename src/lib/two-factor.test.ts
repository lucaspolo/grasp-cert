import { describe, expect, it } from "vitest";
import { generateSync } from "otplib";
import {
  RECOVERY_CODE_COUNT,
  buildOtpAuthUrl,
  compareRecoveryCode,
  generateDeviceToken,
  generateRecoveryCodes,
  generateTotpSecret,
  hashDeviceToken,
  hashRecoveryCode,
  normalizeRecoveryCode,
  verifyTotp,
} from "./two-factor";

describe("verifyTotp", () => {
  it("aceita um código gerado agora e informa o timestep", () => {
    const secret = generateTotpSecret();
    const token = generateSync({ secret });
    const result = verifyTotp(token, secret);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.timeStep).toBeGreaterThan(0);
    }
  });

  it("aceita código com espaços (formato de app autenticador)", () => {
    const secret = generateTotpSecret();
    const token = generateSync({ secret });
    const spaced = `${token.slice(0, 3)} ${token.slice(3)}`;
    expect(verifyTotp(spaced, secret).valid).toBe(true);
  });

  it("rejeita código de outro secret", () => {
    const secret = generateTotpSecret();
    const other = generateTotpSecret();
    const token = generateSync({ secret: other });
    // Colisão entre dois secrets aleatórios é possível mas astronomicamente rara.
    expect(verifyTotp(token, secret).valid).toBe(false);
  });

  it("rejeita formatos inválidos sem lançar erro", () => {
    const secret = generateTotpSecret();
    expect(verifyTotp("", secret).valid).toBe(false);
    expect(verifyTotp("12345", secret).valid).toBe(false);
    expect(verifyTotp("1234567", secret).valid).toBe(false);
    expect(verifyTotp("abcdef", secret).valid).toBe(false);
    expect(verifyTotp("12 34 5a", secret).valid).toBe(false);
  });

  it("não lança erro com secret inválido", () => {
    expect(verifyTotp("123456", "not-base32-!!!").valid).toBe(false);
  });
});

describe("verifyTotp — anti-replay (RFC 6238 §5.2)", () => {
  it("rejeita o mesmo código quando afterTimeStep é o timestep aceito", () => {
    const secret = generateTotpSecret();
    const token = generateSync({ secret });
    const first = verifyTotp(token, secret);
    expect(first.valid).toBe(true);
    if (!first.valid) return;

    // Replay: o código do timestep já usado não vale de novo.
    expect(verifyTotp(token, secret, first.timeStep).valid).toBe(false);
  });

  it("aceita código de timestep posterior ao último usado", () => {
    const secret = generateTotpSecret();
    const token = generateSync({ secret });
    const result = verifyTotp(token, secret);
    expect(result.valid).toBe(true);
    if (!result.valid) return;

    // Simula último uso no passo anterior: o código atual continua válido.
    expect(verifyTotp(token, secret, result.timeStep - 1).valid).toBe(true);
  });

  it("sem afterTimeStep (null) o código atual é aceito", () => {
    const secret = generateTotpSecret();
    const token = generateSync({ secret });
    expect(verifyTotp(token, secret, null).valid).toBe(true);
  });
});

describe("buildOtpAuthUrl", () => {
  it("monta a URI otpauth com issuer e indicativo", () => {
    const secret = generateTotpSecret();
    const url = buildOtpAuthUrl("PY2ABC", secret);
    expect(url.startsWith("otpauth://totp/")).toBe(true);
    expect(url).toContain("PY2ABC");
    expect(url).toContain(secret);
    expect(url).toContain("GRASP");
  });
});

describe("códigos de recuperação", () => {
  it("gera a quantidade padrão no formato XXXX-XXXX", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(RECOVERY_CODE_COUNT);
    for (const code of codes) {
      // Alfabeto exclui caracteres ambíguos (I, O, 0, 1)
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    }
  });

  it("normaliza maiúsculas e separadores", () => {
    expect(normalizeRecoveryCode("ab2c-3def")).toBe("AB2C3DEF");
    expect(normalizeRecoveryCode(" ab2c 3def ")).toBe("AB2C3DEF");
  });

  it("hash e comparação toleram variação de caixa e separador", () => {
    const [code] = generateRecoveryCodes(1);
    const hash = hashRecoveryCode(code);
    expect(compareRecoveryCode(code, hash)).toBe(true);
    expect(compareRecoveryCode(code.toLowerCase(), hash)).toBe(true);
    expect(compareRecoveryCode(code.replace("-", ""), hash)).toBe(true);
  });

  it("rejeita código errado", () => {
    const [a, b] = generateRecoveryCodes(2);
    const hash = hashRecoveryCode(a);
    expect(compareRecoveryCode(b, hash)).toBe(false);
  });
});

describe("token de dispositivo confiável", () => {
  it("gera 32 bytes em hex", () => {
    const token = generateDeviceToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(generateDeviceToken()).not.toBe(token);
  });

  it("hash SHA-256 é determinístico e distinto por token", () => {
    const token = generateDeviceToken();
    expect(hashDeviceToken(token)).toBe(hashDeviceToken(token));
    expect(hashDeviceToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashDeviceToken(generateDeviceToken())).not.toBe(
      hashDeviceToken(token)
    );
  });
});
