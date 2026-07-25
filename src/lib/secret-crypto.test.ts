import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  decryptSecret,
  encryptSecret,
  isEncryptedSecret,
  maybeReencryptSecret,
} from "./secret-crypto";

// 32 bytes fixos em base64 para os testes.
const TEST_KEY = Buffer.alloc(32, 7).toString("base64");

beforeEach(() => {
  vi.stubEnv("TOTP_ENC_KEY", TEST_KEY);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("encryptSecret / decryptSecret", () => {
  it("roundtrip com chave configurada", () => {
    const stored = encryptSecret("JBSWY3DPEHPK3PXP");
    expect(isEncryptedSecret(stored)).toBe(true);
    expect(stored).not.toContain("JBSWY3DPEHPK3PXP");
    expect(decryptSecret(stored)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("IVs aleatórios: duas cifras do mesmo secret diferem", () => {
    expect(encryptSecret("JBSWY3DPEHPK3PXP")).not.toBe(
      encryptSecret("JBSWY3DPEHPK3PXP")
    );
  });

  it("valor legado em claro passa intacto na leitura", () => {
    expect(decryptSecret("JBSWY3DPEHPK3PXP")).toBe("JBSWY3DPEHPK3PXP");
  });

  it("cifra adulterada é rejeitada (auth tag do GCM)", () => {
    const stored = encryptSecret("JBSWY3DPEHPK3PXP");
    const tampered = stored.slice(0, -4) + (stored.endsWith("AAAA") ? "BBBB" : "AAAA");
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("sem chave: armazena em claro (comportamento anterior)", () => {
    vi.stubEnv("TOTP_ENC_KEY", "");
    const stored = encryptSecret("JBSWY3DPEHPK3PXP");
    expect(stored).toBe("JBSWY3DPEHPK3PXP");
  });

  it("secret cifrado sem chave configurada: erro claro", () => {
    const stored = encryptSecret("JBSWY3DPEHPK3PXP");
    vi.stubEnv("TOTP_ENC_KEY", "");
    expect(() => decryptSecret(stored)).toThrow(/TOTP_ENC_KEY/);
  });

  it("chave com tamanho errado: erro claro", () => {
    vi.stubEnv("TOTP_ENC_KEY", Buffer.alloc(16, 1).toString("base64"));
    expect(() => encryptSecret("JBSWY3DPEHPK3PXP")).toThrow(/32 bytes/);
  });
});

describe("maybeReencryptSecret", () => {
  it("valor em claro com chave: retorna forma cifrada", () => {
    const reencrypted = maybeReencryptSecret("JBSWY3DPEHPK3PXP");
    expect(reencrypted).not.toBeNull();
    expect(isEncryptedSecret(reencrypted!)).toBe(true);
    expect(decryptSecret(reencrypted!)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("já cifrado: null (nada a migrar)", () => {
    const stored = encryptSecret("JBSWY3DPEHPK3PXP");
    expect(maybeReencryptSecret(stored)).toBeNull();
  });

  it("sem chave: null (não há como migrar)", () => {
    vi.stubEnv("TOTP_ENC_KEY", "");
    expect(maybeReencryptSecret("JBSWY3DPEHPK3PXP")).toBeNull();
  });
});
