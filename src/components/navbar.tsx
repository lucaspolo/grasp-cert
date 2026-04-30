import { auth, signOut } from "@/auth";
import Link from "next/link";
import type { AppRole } from "@/lib/auth-utils";
import { NavDropdown } from "./nav-dropdown";
import { ThemeToggle } from "./theme-toggle";
import { MobileNav } from "./mobile-nav";

export async function Navbar() {
  const session = await auth();

  if (!session?.user) return null;

  const role = session.user.role as AppRole;
  const isOwner = role === "OWNER";
  const isOwnerOrAdmin = isOwner || role === "ADMIN";
  const hasAdminAccess = isOwnerOrAdmin || role === "OPERATOR";

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold text-lg">
            GRASP Cert
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-sm">
            <Link
              href="/"
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
            {hasAdminAccess && (
              <Link
                href="/admin/events"
                className="text-muted-foreground hover:text-foreground"
              >
                Eventos
              </Link>
            )}
            {isOwnerOrAdmin && (
              <NavDropdown
                label="Configurações"
                items={[
                  { href: "/admin/templates", label: "Templates" },
                  { href: "/admin/bands", label: "Bandas" },
                  { href: "/admin/modes", label: "Modos" },
                ]}
              />
            )}
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
          signOutAction={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        />
      </div>
    </header>
  );
}
