import { auth, signOut } from "@/auth";
import Link from "next/link";
import type { AppRole } from "@/lib/auth-utils";

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
          <nav className="flex items-center gap-4 text-sm">
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
              <Link
                href="/admin/templates"
                className="text-muted-foreground hover:text-foreground"
              >
                Templates
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
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
      </div>
    </header>
  );
}
