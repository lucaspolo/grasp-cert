import { getEvent } from "@/app/actions/event";
import { listQSOsByEvent } from "@/app/actions/qso";
import { QSOForm } from "@/components/qso-form";
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
  const canDelete = role === "OWNER" || role === "ADMIN";

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

      <QSOForm
        eventId={id}
        eventBands={event.eventBands.map((eb) => eb.band)}
        eventModes={event.eventModes.map((em) => em.mode)}
      />

      <div className="mt-6">
        <QSOTable qsos={qsos} eventId={id} showDelete={canDelete} />
      </div>
    </div>
  );
}
