import "server-only";

import { createHash, randomBytes, randomInt } from "crypto";
import { generateSecret, generateURI, verifySync } from "otplib";
import { compareSync, hashSync } from "bcryptjs";

const ISSUER = "GRASP Cert";

/** Tolerance (in seconds) applied when verifying TOTP codes (~1 step). */
const EPOCH_TOLERANCE_SECONDS = 30;

/** Number of one-time recovery codes generated when 2FA is enabled. */
export const RECOVERY_CODE_COUNT = 10;

/** Trusted device cookie name and lifetime (30 days). */
export const TRUSTED_DEVICE_COOKIE = "2fa_trusted_device";
export const TRUSTED_DEVICE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/** Generates a new base32 TOTP secret. */
export function generateTotpSecret(): string {
  return generateSecret();
}

/** Builds the otpauth:// URI used to render the enrollment QR code. */
export function buildOtpAuthUrl(callsign: string, secret: string): string {
  return generateURI({ issuer: ISSUER, label: callsign, secret });
}

export type TotpVerification =
  | { valid: true; timeStep: number }
  | { valid: false };

/**
 * Verifies a 6-digit TOTP code against the secret (with small time window).
 * Pass the last accepted timestep as `afterTimeStep` to reject replay of
 * previously accepted codes (RFC 6238 §5.2); persist `timeStep` on success.
 */
export function verifyTotp(
  token: string,
  secret: string,
  afterTimeStep?: number | null
): TotpVerification {
  const normalized = token.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalized)) return { valid: false };
  try {
    const result = verifySync({
      token: normalized,
      secret,
      epochTolerance: EPOCH_TOLERANCE_SECONDS,
      ...(afterTimeStep != null && { afterTimeStep }),
    });
    // O retorno é uma união TOTP|HOTP; só a variante TOTP tem timeStep.
    return result.valid && "timeStep" in result
      ? { valid: true, timeStep: result.timeStep }
      : { valid: false };
  } catch {
    return { valid: false };
  }
}

/** Generates an array of human-friendly recovery codes (format: XXXX-XXXX). */
export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT): string[] {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    let raw = "";
    for (let j = 0; j < 8; j++) {
      raw += alphabet[randomInt(alphabet.length)];
    }
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4)}`);
  }
  return codes;
}

/** Normalizes a recovery code for comparison (uppercase, no separators). */
export function normalizeRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashRecoveryCode(code: string): string {
  return hashSync(normalizeRecoveryCode(code), 10);
}

export function compareRecoveryCode(code: string, hash: string): boolean {
  return compareSync(normalizeRecoveryCode(code), hash);
}

/** Generates a high-entropy trusted-device token (returned to the client cookie). */
export function generateDeviceToken(): string {
  return randomBytes(32).toString("hex");
}

/** Hashes a device token with SHA-256 for storage and lookup. */
export function hashDeviceToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
