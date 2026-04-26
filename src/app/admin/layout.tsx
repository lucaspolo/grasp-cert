import { auth } from "@/auth";
import { redirect } from "next/navigation";
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {children}
    </div>
  );
}
