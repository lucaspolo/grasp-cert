import type { DefaultSession, DefaultJWT } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "USER" | "ADMIN";
      callsign: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: "USER" | "ADMIN";
    callsign: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: "USER" | "ADMIN";
    callsign: string;
  }
}
