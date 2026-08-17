import type { DefaultSession, DefaultJWT } from "next-auth";

type AppRole = "OWNER" | "ADMIN" | "OPERATOR" | "USER";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
      callsign: string;
      /** Administra ao menos um grupo — ver `groupAdmin` no JWT. */
      groupAdmin?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: AppRole;
    callsign: string;
    sessionVersion?: number;
    groupAdmin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: AppRole;
    callsign: string;
    /** Versão da sessão no momento do login — divergência invalida o token. */
    sessionVersion?: number;
    /**
     * O usuário é ADMIN de ao menos um grupo. Existe só para o proxy (Edge,
     * sem Prisma) saber que um USER global pode abrir /admin — a permissão
     * real, por grupo, é sempre reconferida no servidor. Como todo claim, é
     * revalidado a cada `JWT_REFRESH_INTERVAL_SECONDS`.
     */
    groupAdmin?: boolean;
    /** Epoch (s) da última revalidação dos claims contra o banco. */
    refreshedAt?: number;
  }
}
