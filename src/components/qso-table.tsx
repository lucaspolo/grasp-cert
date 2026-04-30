"use client";

import { deleteQSO } from "@/app/actions/qso";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type QSORow = {
  id: string;
  participantCallsign: string;
  operatorCallsign: string | null;
  dateTime: Date;
  frequency: string;
  band: { id: string; name: string; label: string };
  modeRef: { id: string; name: string; label: string };
  rstSent: string;
  rstReceived: string;
  observations: string | null;
};

export function QSOTable({
  qsos,
  eventId,
  showDelete = true,
}: {
  qsos: QSORow[];
  eventId: string;
  showDelete?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Indicativo</TableHead>
          <TableHead className="hidden md:table-cell">Operador</TableHead>
          <TableHead>Data/Hora</TableHead>
          <TableHead>Banda</TableHead>
          <TableHead>Modo</TableHead>
          <TableHead>RST S/R</TableHead>
          <TableHead className="hidden md:table-cell">Obs</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {qsos.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={8}
              className="text-center text-muted-foreground"
            >
              Nenhum QSO lançado.
            </TableCell>
          </TableRow>
        )}
        {qsos.map((qso) => (
          <TableRow key={qso.id}>
            <TableCell className="font-medium">
              {qso.participantCallsign}
            </TableCell>
            <TableCell className="hidden md:table-cell text-muted-foreground">
              {qso.operatorCallsign ?? "—"}
            </TableCell>
            <TableCell>
              {new Date(qso.dateTime).toLocaleString("pt-BR", {
                timeZone: "UTC",
                dateStyle: "short",
                timeStyle: "short",
              })}
            </TableCell>
            <TableCell>{qso.band.label}</TableCell>
            <TableCell>{qso.modeRef.label}</TableCell>
            <TableCell>
              {qso.rstSent}/{qso.rstReceived}
            </TableCell>
            <TableCell className="hidden md:table-cell max-w-[200px] truncate">
              {qso.observations ?? "—"}
            </TableCell>
            <TableCell className="text-right">
              {showDelete && (
                <form
                  action={async () => {
                    await deleteQSO(qso.id, eventId);
                  }}
                >
                  <Button variant="destructive" size="sm" type="submit">
                    Excluir
                  </Button>
                </form>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>
  );
}
