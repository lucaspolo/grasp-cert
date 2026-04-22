import { getEvent } from "@/app/actions/event";
import { listQSOsByEvent } from "@/app/actions/qso";
import { QSOForm } from "@/components/qso-form";
import { QSOTable } from "@/components/qso-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function QSOsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEvent(id);

  if (!event) notFound();

  const qsos = await listQSOsByEvent(id);

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
        <Link href="/admin/events">
          <Button variant="outline">Voltar</Button>
        </Link>
      </div>

      <QSOForm eventId={id} eventModes={event.modes} eventBands={event.bands} />

      <div className="mt-6">
        <QSOTable qsos={qsos} eventId={id} />
      </div>
    </div>
  );
}
