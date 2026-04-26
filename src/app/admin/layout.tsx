import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { AppRole } from "@/lib/auth-utils";

const ADMIN_ROLES: AppRole[] = ["OWNER", "ADMIN", "OPERATOR"];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user || !ADMIN_ROLES.includes(session.user.role as AppRole)) {
    redirect("/");
  }

  const role = session.user.role as AppRole;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <nav className="mb-6 flex items-center gap-4 text-sm">
        {role === "OWNER" && (
          <Link
            href="/admin/users"
            className="text-muted-foreground hover:text-foreground"
          >
            Usuários
          </Link>
        )}
        <Link
          href="/admin/events"
          className="text-muted-foreground hover:text-foreground"
        >
          Eventos
        </Link>
        {(role === "OWNER" || role === "ADMIN") && (
          <Link
            href="/admin/templates"
            className="text-muted-foreground hover:text-foreground"
          >
            Templates
          </Link>
        )}
      </nav>
      {children}
    </div>
  );
}
