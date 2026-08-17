import { getEvent } from "@/app/actions/event";
import { listQSOsByEvent } from "@/app/actions/qso";
import { QSOForm } from "@/components/qso-form";
import { QSOImport } from "@/components/qso-import";
import { QSOTable } from "@/components/qso-table";
import { Button } from "@/components/ui/button";
import { pageRead, requireEventAccess } from "@/lib/group-access";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function QSOsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Um único porteiro para os três perfis: admin da plataforma, admin do grupo
  // dono do evento e operador designado. Evento de outro grupo dá 404.
  const { session, scope } = await pageRead(() => requireEventAccess(id));

  const event = await getEvent(id);
  if (!event) notFound();

  const qsos = await listQSOsByEvent(id);
  // O operador só mexe nos próprios lançamentos; quem administra, em todos.
  const canManageAll = scope !== "operator";
  const eventBands = event.eventBands.map((eb) => eb.band);
  const eventModes = event.eventModes.map((em) => em.mode);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">QSOs — {event.name}</h1>
          <p className="text-sm text-muted-foreground">
            {qsos.length} QSO{qsos.length !== 1 ? "s" : ""} lançado
            {qsos.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/events/${id}/adif`} download>
            <Button variant="outline">Exportar ADIF</Button>
          </a>
          <Link href="/admin/events">
            <Button variant="outline">Voltar</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <QSOForm
          eventId={id}
          eventBands={eventBands}
          eventModes={eventModes}
        />
        <QSOImport eventId={id} />
      </div>

      <div className="mt-6">
        <QSOTable
          qsos={qsos}
          eventId={id}
          eventBands={eventBands}
          eventModes={eventModes}
          canManageAll={canManageAll}
          currentCallsign={session?.user?.callsign ?? null}
        />
      </div>
    </div>
  );
}
