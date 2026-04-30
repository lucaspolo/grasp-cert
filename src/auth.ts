import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import authConfig from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        callsign: { label: "Indicativo", type: "text" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const callsign = credentials?.callsign as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!callsign || !password) return null;

        const user = await prisma.user.findUnique({
          where: { callsign: callsign.toUpperCase() },
        });

        if (!user) return null;

        const isValid = await compare(password, user.passwordHash);
        if (!isValid) return null;

        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

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
