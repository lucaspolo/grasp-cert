import { getEvent } from "@/app/actions/event";
import { listQSOsByEvent } from "@/app/actions/qso";
import { QSOForm } from "@/components/qso-form";
import { QSOImport } from "@/components/qso-import";
import { QSOTable } from "@/components/qso-table";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { AppRole } from "@/lib/auth-utils";

export default async function QSOsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const role = session?.user?.role as AppRole;

  // OPERATORs must be assigned to this event
  if (role === "OPERATOR") {
    const assignment = await prisma.eventOperator.findUnique({
      where: { eventId_userId: { eventId: id, userId: session!.user.id } },
    });
    if (!assignment) redirect("/admin/events");
  }

  const event = await getEvent(id);
  if (!event) notFound();

  const qsos = await listQSOsByEvent(id);
  const canManageAll = role === "OWNER" || role === "ADMIN";
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
