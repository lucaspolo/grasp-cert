import type { AppRole } from "@/lib/auth-utils";

/**
 * Rótulos dos cargos em português. Fonte única: a tabela de usuários e o
 * tutorial precisam falar o mesmo vocabulário — se aqui disser "Admin" e o
 * tutorial disser "Administrador", o leitor não liga uma coisa à outra.
 *
 * Sem imports de runtime de propósito: `@/lib/auth-utils` puxa `@/auth` e o
 * Prisma no topo do módulo, então não pode ser importado por componente de
 * cliente. O `import type` acima é apagado na compilação.
 */
export const ROLE_LABELS: Record<AppRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  OPERATOR: "Operador",
  USER: "Usuário",
};

/** Quem pode executar um procedimento do tutorial. */
export type TutorialAudience = AppRole | "PUBLIC";

export const AUDIENCE_LABELS: Record<TutorialAudience, string> = {
  ...ROLE_LABELS,
  PUBLIC: "Sem login",
};
