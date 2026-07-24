import type { AuditLog } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LocalDateTime } from "@/components/local-datetime";

type AuditTableProps = {
  logs: AuditLog[];
};

export function AuditTable({ logs }: AuditTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Autor</TableHead>
            <TableHead className="hidden md:table-cell">Ação</TableHead>
            <TableHead>Resumo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-center text-muted-foreground"
              >
                Nenhum registro de auditoria.
              </TableCell>
            </TableRow>
          )}
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="whitespace-nowrap">
                <LocalDateTime date={log.createdAt} showTime />
              </TableCell>
              <TableCell className="font-medium">{log.actorCallsign}</TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge variant="secondary">{log.action}</Badge>
              </TableCell>
              <TableCell>
                {log.summary}
                {log.details != null && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-muted-foreground">
                      Detalhes
                    </summary>
                    <pre className="mt-1 max-w-md overflow-x-auto rounded bg-muted p-2 text-xs">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </details>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
