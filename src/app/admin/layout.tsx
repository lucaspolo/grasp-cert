import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <nav className="mb-6 flex items-center gap-4 text-sm">
        <Link
          href="/admin/events"
          className="text-muted-foreground hover:text-foreground"
        >
          Eventos
        </Link>
      </nav>
      {children}
    </div>
  );
}
