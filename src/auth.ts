import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { CredentialsSignin } from "next-auth";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import authConfig from "./auth.config";
import {
  TRUSTED_DEVICE_COOKIE,
  compareRecoveryCode,
  hashDeviceToken,
  verifyTotp,
} from "@/lib/two-factor";

class EmailNotVerifiedError extends CredentialsSignin {
  code = "EMAIL_NOT_VERIFIED";
}

class TwoFactorRequiredError extends CredentialsSignin {
  code = "TWO_FACTOR_REQUIRED";
}

class InvalidTwoFactorError extends CredentialsSignin {
  code = "INVALID_2FA";
}

function readCookie(request: Request | undefined, name: string): string | null {
  const header = request?.headers?.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

async function isTrustedDevice(
  userId: string,
  request: Request | undefined
): Promise<boolean> {
  const token = readCookie(request, TRUSTED_DEVICE_COOKIE);
  if (!token) return false;

  const device = await prisma.trustedDevice.findUnique({
    where: { tokenHash: hashDeviceToken(token) },
  });

  if (!device || device.userId !== userId || device.expires < new Date()) {
    return false;
  }

  await prisma.trustedDevice.update({
    where: { id: device.id },
    data: { lastUsedAt: new Date() },
  });
  return true;
}

async function verifyTwoFactor(userId: string, code: string): Promise<boolean> {
  const twoFactor = await prisma.twoFactorAuth.findUnique({
    where: { userId },
  });
  if (!twoFactor?.enabled) return true;

  if (verifyTotp(code, twoFactor.secret)) {
    return true;
  }

  // Fall back to one-time recovery codes.
  const recoveryCodes = await prisma.twoFactorRecoveryCode.findMany({
    where: { userId, usedAt: null },
  });
  for (const recovery of recoveryCodes) {
    if (compareRecoveryCode(code, recovery.codeHash)) {
      await prisma.twoFactorRecoveryCode.update({
        where: { id: recovery.id },
        data: { usedAt: new Date() },
      });
      return true;
    }
  }
  return false;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        callsign: { label: "Indicativo", type: "text" },
        password: { label: "Senha", type: "password" },
        otp: { label: "Código", type: "text" },
      },
      async authorize(credentials, request) {
        const callsign = credentials?.callsign as string | undefined;
        const password = credentials?.password as string | undefined;
        const otp = (credentials?.otp as string | undefined)?.trim() ?? "";

        console.log("[2fa-auth] authorize: start", {
          callsign,
          hasPassword: !!password,
          hasOtp: !!otp,
        });

        if (!callsign || !password) return null;

        const user = await prisma.user.findUnique({
          where: { callsign: callsign.toUpperCase() },
        });

        if (!user) {
          console.log("[2fa-auth] authorize: user not found");
          return null;
        }

        const isValid = await compare(password, user.passwordHash);
        if (!isValid) {
          console.log("[2fa-auth] authorize: invalid password");
          return null;
        }

        if (!user.emailVerified) {
          console.log("[2fa-auth] authorize: email not verified");
          throw new EmailNotVerifiedError();
        }

        const twoFactor = await prisma.twoFactorAuth.findUnique({
          where: { userId: user.id },
        });

        console.log("[2fa-auth] authorize: twoFactor", {
          enabled: twoFactor?.enabled ?? false,
        });

        if (twoFactor?.enabled) {
          const trusted = await isTrustedDevice(user.id, request);
          console.log("[2fa-auth] authorize: trustedDevice", { trusted });
          if (!trusted) {
            if (!otp) {
              console.log("[2fa-auth] authorize: throwing TwoFactorRequired");
              throw new TwoFactorRequiredError();
            }
            const ok = await verifyTwoFactor(user.id, otp);
            console.log("[2fa-auth] authorize: verifyTwoFactor", { ok });
            if (!ok) {
              throw new InvalidTwoFactorError();
            }
          }
        }

        console.log("[2fa-auth] authorize: success, returning user");
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          callsign: user.callsign,
        };
      },
    }),
  ],
});
