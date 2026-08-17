import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { CredentialsSignin } from "next-auth";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import authConfig from "./auth.config";
import { isAdminOfSomeGroup, refreshTokenClaims } from "@/lib/jwt-refresh";
import { TRUSTED_DEVICE_COOKIE, hashDeviceToken } from "@/lib/two-factor";
import { verifyUserSecondFactor } from "@/lib/second-factor";
import {
  clearRateLimit,
  clientIpFrom,
  consumeRateLimit,
} from "@/lib/rate-limit";

// Hash válido de uma senha aleatória descartada: usado quando o indicativo
// não existe, para que o tempo de resposta não revele se a conta existe.
const DUMMY_PASSWORD_HASH =
  "$2b$10$5x3I574G3xElPdkeO6rNF.pusj/dFm6QhhBLGKzwbGcYO1wd9X/ha";

class EmailNotVerifiedError extends CredentialsSignin {
  code = "EMAIL_NOT_VERIFIED";
}

class TwoFactorRequiredError extends CredentialsSignin {
  code = "TWO_FACTOR_REQUIRED";
}

class InvalidTwoFactorError extends CredentialsSignin {
  code = "INVALID_2FA";
}

class RateLimitedError extends CredentialsSignin {
  code = "RATE_LIMITED";
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

        if (!callsign || !password) return null;

        // Brute force: janela por conta (com lockout progressivo) e por IP.
        // Consumidas antes do bcrypt; a da conta é zerada no login válido.
        const ip = clientIpFrom(request?.headers ?? new Headers());
        const accountKey = `login:acct:${callsign.toUpperCase()}`;
        const [byAccount, byIp] = await Promise.all([
          consumeRateLimit({
            key: accountKey,
            limit: 5,
            windowSeconds: 15 * 60,
            lockoutSeconds: 60,
          }),
          consumeRateLimit({
            key: `login:ip:${ip}`,
            limit: 20,
            windowSeconds: 15 * 60,
          }),
        ]);
        if (!byAccount.allowed || !byIp.allowed) {
          throw new RateLimitedError();
        }

        const user = await prisma.user.findUnique({
          where: { callsign: callsign.toUpperCase() },
        });

        // Sempre executa o bcrypt.compare, mesmo sem usuário: pular a
        // comparação tornaria a resposta mensuravelmente mais rápida e
        // permitiria enumerar indicativos cadastrados pelo tempo.
        const isValid = await compare(
          password,
          user?.passwordHash ?? DUMMY_PASSWORD_HASH
        );
        if (!user || !isValid) {
          return null;
        }

        if (!user.emailVerified) {
          throw new EmailNotVerifiedError();
        }

        const twoFactor = await prisma.twoFactorAuth.findUnique({
          where: { userId: user.id },
        });

        if (twoFactor?.enabled) {
          const trusted = await isTrustedDevice(user.id, request);
          if (!trusted) {
            if (!otp) {
              throw new TwoFactorRequiredError();
            }
            const second = await verifyUserSecondFactor(user.id, otp);
            if (second === "rate_limited") {
              throw new RateLimitedError();
            }
            if (second !== "valid") {
              throw new InvalidTwoFactorError();
            }
          }
        }

        await clearRateLimit(accountKey);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          callsign: user.callsign,
          sessionVersion: user.sessionVersion,
          groupAdmin: await isAdminOfSomeGroup(user.id),
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Sobrescreve o jwt do auth.config.ts (Edge, sem Prisma): aqui, no Node,
    // os claims são revalidados periodicamente contra o banco.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.callsign = user.callsign;
        token.sessionVersion = user.sessionVersion;
        token.groupAdmin = user.groupAdmin ?? false;
        token.refreshedAt = Math.floor(Date.now() / 1000);
        return token;
      }
      return refreshTokenClaims(token);
    },
  },
});
