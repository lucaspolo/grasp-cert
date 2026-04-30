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
  mode: string;
  band: { id: string; name: string; label: string } | null;
  modeRef: { id: string; name: string; label: string } | null;
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Indicativo</TableHead>
          <TableHead>Operador</TableHead>
          <TableHead>Data/Hora</TableHead>
          <TableHead>Banda</TableHead>
          <TableHead>Modo</TableHead>
          <TableHead>RST S/R</TableHead>
          <TableHead>Obs</TableHead>
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
            <TableCell className="text-muted-foreground">
              {qso.operatorCallsign ?? "—"}
            </TableCell>
            <TableCell>
              {new Date(qso.dateTime).toLocaleString("pt-BR", {
                timeZone: "UTC",
                dateStyle: "short",
                timeStyle: "short",
              })}
            </TableCell>
            <TableCell>{qso.band?.label ?? qso.frequency}</TableCell>
            <TableCell>{qso.modeRef?.label ?? qso.mode}</TableCell>
            <TableCell>
              {qso.rstSent}/{qso.rstReceived}
            </TableCell>
            <TableCell className="max-w-[200px] truncate">
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
  );
}
