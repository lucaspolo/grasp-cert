import { listEvents } from "@/app/actions/event";
import { EventTable } from "@/components/event-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function EventsPage() {
  const events = await listEvents();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Eventos</h1>
        <Link href="/admin/events/new">
          <Button>Novo Evento</Button>
        </Link>
      </div>
      <EventTable events={events} />
    </div>
  );
}
