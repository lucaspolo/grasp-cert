"use client";

import { deleteEvent } from "@/app/actions/event";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

type EventRow = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  eventBands: { band: { id: string; name: string; label: string } }[];
  eventModes: { mode: { id: string; name: string; label: string } }[];
  template: { id: string; name: string } | null;
  _count: { qsos: number };
};

export function EventTable({ events, showActions = true }: { events: EventRow[]; showActions?: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Início</TableHead>
          <TableHead>Fim</TableHead>
          <TableHead>Modalidades</TableHead>
          <TableHead>Faixas</TableHead>
          <TableHead>Template</TableHead>
          <TableHead>QSOs</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.length === 0 && (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-muted-foreground">
              Nenhum evento cadastrado.
            </TableCell>
          </TableRow>
        )}
        {events.map((event) => (
          <TableRow key={event.id}>
            <TableCell className="font-medium">{event.name}</TableCell>
            <TableCell>
              {new Date(event.startDate).toLocaleDateString("pt-BR")}
            </TableCell>
            <TableCell>
              {new Date(event.endDate).toLocaleDateString("pt-BR")}
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {event.eventModes.map((em) => (
                  <Badge key={em.mode.id} variant="secondary">
                    {em.mode.label}
                  </Badge>
                ))}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {event.eventBands.map((eb) => (
                  <Badge key={eb.band.id} variant="outline">
                    {eb.band.label}
                  </Badge>
                ))}
              </div>
            </TableCell>
            <TableCell>
              {event.template ? (
                <Badge variant="secondary">{event.template.name}</Badge>
              ) : (
                <span className="text-muted-foreground text-sm">Padrão</span>
              )}
            </TableCell>
            <TableCell>{event._count.qsos}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Link href={`/admin/events/${event.id}/qsos`}>
                  <Button variant="outline" size="sm">
                    QSOs
                  </Button>
                </Link>
                {showActions && (
                  <>
                    <Link href={`/admin/events/${event.id}/edit`}>
                      <Button variant="outline" size="sm">
                        Editar
                      </Button>
                    </Link>
                    <form
                      action={async () => {
                        await deleteEvent(event.id);
                      }}
                    >
                      <Button variant="destructive" size="sm" type="submit">
                        Excluir
                      </Button>
                    </form>
                  </>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
