import { listEvents } from "@/app/actions/event";
import { EventTable } from "@/components/event-table";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { AppRole } from "@/lib/auth-utils";

export default async function EventsPage() {
  const session = await auth();
  const role = session?.user?.role as AppRole;

  let events;
  if (role === "OPERATOR") {
    // OPERATORs see only events they are assigned to
    const assignments = await prisma.eventOperator.findMany({
      where: { userId: session!.user.id },
      select: { eventId: true },
    });
    const eventIds = assignments.map((a) => a.eventId);
    events = await prisma.event.findMany({
      where: { id: { in: eventIds } },
      orderBy: { startDate: "desc" },
      include: {
        _count: { select: { qsos: true } },
        template: { select: { id: true, name: true } },
        eventBands: { include: { band: true } },
        eventModes: { include: { mode: true } },
      },
    });
  } else {
    events = await listEvents();
  }

  const canCreateEvent = role === "OWNER" || role === "ADMIN";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Eventos</h1>
        {canCreateEvent && (
          <Link href="/admin/events/new">
            <Button>Novo Evento</Button>
          </Link>
        )}
      </div>
      <EventTable events={events} showActions={canCreateEvent} />
    </div>
  );
}
