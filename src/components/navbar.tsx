import { auth, signOut } from "@/auth";
import Link from "next/link";
import type { AppRole } from "@/lib/auth-utils";
import { NavDropdown } from "./nav-dropdown";
import { ThemeToggle } from "./theme-toggle";
import { MobileNav } from "./mobile-nav";

export async function Navbar() {
  const session = await auth();

  if (!session?.user) {
    return (
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="font-semibold text-lg">
            GRASP Cert
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/ajuda"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Ajuda
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Entrar
            </Link>
          </div>
        </div>
      </header>
    );
  }

  const role = session.user.role as AppRole;
  const isOwner = role === "OWNER";
  const isOwnerOrAdmin = isOwner || role === "ADMIN";
  // Claim do JWT: um admin de grupo pode não ter cargo global nenhum. Como
  // todo claim, leva até 10 minutos para refletir uma promoção — o mesmo
  // atraso que já vale para mudança de cargo global.
  const isGroupAdmin = session.user.groupAdmin === true;
  const hasAdminAccess = isOwnerOrAdmin || role === "OPERATOR" || isGroupAdmin;
  const canManageGroups = isOwnerOrAdmin || isGroupAdmin;

  const settingsItems = [
    ...(canManageGroups ? [{ href: "/admin/templates", label: "Templates" }] : []),
    ...(isOwnerOrAdmin
      ? [
          { href: "/admin/bands", label: "Bandas" },
          { href: "/admin/modes", label: "Modos" },
        ]
      : []),
  ];

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold text-lg">
            GRASP Cert
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-sm">
            <Link
              href="/meus-certificados"
              className="text-muted-foreground hover:text-foreground"
            >
              Meus Certificados
            </Link>
            {isOwner && (
              <Link
                href="/admin/users"
                className="text-muted-foreground hover:text-foreground"
              >
                Usuários
              </Link>
            )}
            {isOwner && (
              <Link
                href="/admin/audit"
                className="text-muted-foreground hover:text-foreground"
              >
                Auditoria
              </Link>
            )}
            {hasAdminAccess && (
              <Link
                href="/admin/events"
                className="text-muted-foreground hover:text-foreground"
              >
                Eventos
              </Link>
            )}
            {canManageGroups && (
              <Link
                href="/admin/groups"
                className="text-muted-foreground hover:text-foreground"
              >
                Grupos
              </Link>
            )}
            {settingsItems.length > 0 && (
              <NavDropdown label="Configurações" items={settingsItems} />
            )}
            {/* Por último e sem condicional: os itens acima variam com o cargo,
                e uma posição fixa mantém o menu previsível. */}
            <Link
              href="/ajuda"
              className="text-muted-foreground hover:text-foreground"
            >
              Ajuda
            </Link>
          </nav>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/configuracoes"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {session.user.callsign}
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Sair
            </button>
          </form>
        </div>
        <MobileNav
          callsign={session.user.callsign ?? ""}
          role={role}
          isGroupAdmin={isGroupAdmin}
          signOutAction={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        />
      </div>
    </header>
  );
}
