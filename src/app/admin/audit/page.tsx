import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listAuditLogs } from "@/app/actions/audit";
import { AuditTable } from "@/components/audit-table";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  // O layout admin permite ADMIN/OPERATOR; auditoria é restrita a OWNER.
  const session = await auth();
  if (session?.user?.role !== "OWNER") {
    redirect("/");
  }

  const { page: pageParam } = await searchParams;
  const requested = Number.parseInt(pageParam ?? "1", 10) || 1;
  const { logs, total, page, pageSize } = await listAuditLogs(requested);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Auditoria</h1>
        <p className="text-sm text-muted-foreground">
          Registro das ações administrativas realizadas no sistema.
        </p>
      </div>

      <AuditTable logs={logs} />

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={`/admin/audit?page=${page - 1}`}
              className="text-muted-foreground hover:text-foreground"
            >
              ← Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">
            Página {page} de {totalPages} · {total} registros
          </span>
          {page < totalPages ? (
            <Link
              href={`/admin/audit?page=${page + 1}`}
              className="text-muted-foreground hover:text-foreground"
            >
              Próxima →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
