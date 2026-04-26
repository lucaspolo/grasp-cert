import { getEvent, updateEvent } from "@/app/actions/event";
import { listTemplates } from "@/app/actions/template";
import { listEventOperators, listOperatorUsers } from "@/app/actions/user";
import { EventForm } from "@/components/event-form";
import { OperatorAssignment } from "@/components/operator-assignment";
import { auth } from "@/auth";
import { notFound } from "next/navigation";
import type { AppRole } from "@/lib/auth-utils";
import { formatBRDateTime } from "@/lib/utils";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const role = session?.user?.role as AppRole;

  const [event, templates, operators, availableOperators] = await Promise.all([
    getEvent(id),
    listTemplates(),
    listEventOperators(id),
    listOperatorUsers(),
  ]);

  if (!event) notFound();

  const boundUpdate = updateEvent.bind(null, id);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Editar Evento</h1>
      <EventForm
        action={boundUpdate}
        defaultValues={{
          name: event.name,
          startDate: formatBRDateTime(event.startDate),
          endDate: formatBRDateTime(event.endDate),
          modes: event.modes,
          bands: event.bands,
          observations: event.observations,
          templateId: event.templateId,
        }}
        templates={templates.map((t) => ({ id: t.id, name: t.name }))}
      />

      {(role === "OWNER" || role === "ADMIN") && (
        <div className="mt-8">
          <OperatorAssignment
            eventId={id}
            assignedOperators={operators.map((o) => ({
              userId: o.user.id,
              callsign: o.user.callsign,
              name: o.user.name,
            }))}
            availableOperators={availableOperators.map((u) => ({
              id: u.id,
              callsign: u.callsign,
              name: u.name,
            }))}
          />
        </div>
      )}
    </div>
  );
}
