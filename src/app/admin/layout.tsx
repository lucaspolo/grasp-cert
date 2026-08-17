import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { AppRole } from "@/lib/auth-utils";
import { adminGroupIds } from "@/lib/group-access";

const ADMIN_ROLES: AppRole[] = ["OWNER", "ADMIN", "OPERATOR"];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) redirect("/");

  // Admin de grupo entra sem cargo global. O claim do JWT só serve ao proxy
  // (Edge, sem banco); aqui, no servidor, a checagem é contra o banco — o
  // claim leva até 10 minutos para refletir uma promoção recente.
  const hasGlobalRole = ADMIN_ROLES.includes(session.user.role as AppRole);
  if (!hasGlobalRole) {
    const groups = await adminGroupIds(session.user.id);
    if (groups.length === 0) redirect("/");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {children}
    </div>
  );
}
