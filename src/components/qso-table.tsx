"use client";

import { useState } from "react";
import { deleteQSO, updateQSO, type QSOFormState } from "@/app/actions/qso";
import { QSOForm } from "@/components/qso-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBRDateTimeInTZ } from "@/lib/utils";

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

type BandOption = { id: string; name: string; label: string };
type ModeOption = { id: string; name: string; label: string };

export function QSOTable({
  qsos,
  eventId,
  eventBands,
  eventModes,
  canManageAll = true,
  currentCallsign = null,
}: {
  qsos: QSORow[];
  eventId: string;
  eventBands: BandOption[];
  eventModes: ModeOption[];
  /** OWNER/ADMIN: gerencia qualquer QSO do evento. */
  canManageAll?: boolean;
  /** Indicativo de quem está logado — habilita o OPERATOR nos próprios QSOs. */
  currentCallsign?: string | null;
}) {
  const [editing, setEditing] = useState<QSORow | null>(null);

  function canManage(qso: QSORow) {
    return (
      canManageAll ||
      (!!qso.operatorCallsign && qso.operatorCallsign === currentCallsign)
    );
  }

  // Fecha o dialog quando a edição dá certo; erros permanecem visíveis no form.
  async function editAction(prevState: QSOFormState, formData: FormData) {
    if (!editing) return prevState;
    const result = await updateQSO(editing.id, eventId, prevState, formData);
    if (result.message) setEditing(null);
    return result;
  }

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
              })}{" "}UTC
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
              {canManage(qso) && (
                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => setEditing(qso)}
                  >
                    Editar
                  </Button>
                  <form
                    action={async () => {
                      await deleteQSO(qso.id, eventId);
                    }}
                    onSubmit={(e) => {
                      if (
                        !confirm(
                          `Excluir o QSO de ${qso.participantCallsign}?`
                        )
                      ) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <Button variant="destructive" size="sm" type="submit">
                      Excluir
                    </Button>
                  </form>
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>

    <Dialog
      open={editing !== null}
      onOpenChange={(open) => {
        if (!open) setEditing(null);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar QSO</DialogTitle>
        </DialogHeader>
        {editing && (
          <QSOForm
            key={editing.id}
            eventId={eventId}
            eventBands={eventBands}
            eventModes={eventModes}
            action={editAction}
            defaultValues={{
              participantCallsign: editing.participantCallsign,
              dateTime: formatBRDateTimeInTZ(editing.dateTime, "UTC"),
              bandId: editing.band.id,
              modeId: editing.modeRef.id,
              rstSent: editing.rstSent,
              rstReceived: editing.rstReceived,
              observations: editing.observations ?? "",
            }}
            title=""
            submitLabel="Salvar"
            className="border-0 p-0"
          />
        )}
      </DialogContent>
    </Dialog>
    </div>
  );
}
