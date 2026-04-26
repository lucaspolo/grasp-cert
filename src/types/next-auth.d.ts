import type { DefaultSession, DefaultJWT } from "next-auth";

type AppRole = "OWNER" | "ADMIN" | "OPERATOR" | "USER";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
      callsign: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: AppRole;
    callsign: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: AppRole;
    callsign: string;
  }
}
