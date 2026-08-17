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

/**
 * Quem pode executar um procedimento do tutorial.
 *
 * "GROUP_ADMIN" não é cargo global e por isso não sai de `AppRole`: administrar
 * um grupo é ortogonal ao cargo da conta — um Usuário comum pode ser admin do
 * clube dele. Como a matriz do manual é lista explícita e não hierarquia, esse
 * público precisa aparecer no selo, senão o manual negaria acesso que o sistema
 * concede.
 */
export type TutorialAudience = AppRole | "PUBLIC" | "GROUP_ADMIN";

export const AUDIENCE_LABELS: Record<TutorialAudience, string> = {
  ...ROLE_LABELS,
  PUBLIC: "Sem login",
  GROUP_ADMIN: "Admin do grupo",
};
