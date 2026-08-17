import { listEvents } from "@/app/actions/event";
import { EventTable } from "@/components/event-table";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { adminGroupIds, isPlatformAdmin } from "@/lib/group-access";
import Link from "next/link";

export default async function EventsPage() {
  const session = await auth();
  const platformAdmin = isPlatformAdmin(session?.user?.role);

  // `listEvents` já entrega só o que a sessão enxerga (grupos administrados +
  // eventos designados). Os ids dos grupos administrados servem para decidir,
  // linha a linha, quem ganha os botões de editar e excluir: um operador que
  // também administre outro grupo vê os dois tipos de evento na mesma lista.
  const [events, myGroupIds] = await Promise.all([
    listEvents(),
    platformAdmin || !session?.user?.id
      ? Promise.resolve<string[]>([])
      : adminGroupIds(session.user.id),
  ]);

  const adminOf = new Set(myGroupIds);
  const rows = events.map((event) => ({
    ...event,
    canEdit: platformAdmin || adminOf.has(event.groupId),
  }));

  const canCreateEvent = platformAdmin || myGroupIds.length > 0;

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
      <EventTable events={rows} />
    </div>
  );
}
