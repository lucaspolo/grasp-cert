import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export default {
  providers: [
    Credentials({
      credentials: {
        callsign: { label: "Indicativo", type: "text" },
        password: { label: "Senha", type: "password" },
      },
      // authorize is defined in src/auth.ts to avoid importing Node.js modules
      // (bcryptjs, pg) in the Edge Runtime used by middleware
      authorize: () => null,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.callsign = user.callsign;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "USER" | "ADMIN";
        session.user.callsign = token.callsign as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
