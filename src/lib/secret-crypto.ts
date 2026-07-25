import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * Criptografia em repouso para secrets TOTP (AES-256-GCM).
 *
 * A chave vem de TOTP_ENC_KEY (32 bytes em base64 — `openssl rand -base64 32`).
 * Sem a chave configurada o armazenamento continua em claro (comportamento
 * anterior), com aviso no log — assim o deploy não quebra antes de a variável
 * existir no ambiente. Registros legados em claro são aceitos na leitura e
 * re-criptografados de forma preguiçosa no próximo uso bem-sucedido.
 */

const PREFIX = "enc:v1:";
const IV_BYTES = 12;

let warnedMissingKey = false;

function loadKey(): Buffer | null {
  const raw = process.env.TOTP_ENC_KEY;
  if (!raw) return null;

  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "TOTP_ENC_KEY inválida: esperados 32 bytes em base64 (gere com `openssl rand -base64 32`)."
    );
  }
  return key;
}

export function isEncryptedSecret(stored: string): boolean {
  return stored.startsWith(PREFIX);
}

/** Cifra um secret para armazenamento. Sem chave configurada, retorna em claro. */
export function encryptSecret(plain: string): string {
  const key = loadKey();
  if (!key) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      console.warn(
        "TOTP_ENC_KEY não configurada — secrets TOTP serão armazenados em claro."
      );
    }
    return plain;
  }

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

/** Decifra um secret armazenado; valores legados em claro passam intactos. */
export function decryptSecret(stored: string): string {
  if (!isEncryptedSecret(stored)) return stored;

  const key = loadKey();
  if (!key) {
    throw new Error(
      "Secret TOTP cifrado no banco, mas TOTP_ENC_KEY não está configurada."
    );
  }

  const [ivB64, tagB64, dataB64] = stored.slice(PREFIX.length).split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Secret TOTP cifrado em formato inválido.");
  }

  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/**
 * Migração preguiçosa: se há chave configurada e o valor armazenado ainda
 * está em claro, retorna a forma cifrada para regravação; senão, null.
 */
export function maybeReencryptSecret(stored: string): string | null {
  if (isEncryptedSecret(stored)) return null;
  if (!process.env.TOTP_ENC_KEY) return null;
  return encryptSecret(stored);
}
