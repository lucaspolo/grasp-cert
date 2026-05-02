import { getEvent, updateEvent } from "@/app/actions/event";
import { listTemplates } from "@/app/actions/template";
import { listBands } from "@/app/actions/band";
import { listModes } from "@/app/actions/mode";
import { listEventOperators, listOperatorUsers } from "@/app/actions/user";
import { EventForm } from "@/components/event-form";
import { OperatorAssignment } from "@/components/operator-assignment";
import { auth } from "@/auth";
import { notFound } from "next/navigation";
import type { AppRole } from "@/lib/auth-utils";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const role = session?.user?.role as AppRole;

  const [event, templates, operators, availableOperators, bands, modes] = await Promise.all([
    getEvent(id),
    listTemplates(),
    listEventOperators(id),
    listOperatorUsers(),
    listBands(),
    listModes(),
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
          startDate: event.startDate.toISOString(),
          endDate: event.endDate.toISOString(),
          modeIds: event.eventModes.map((em) => em.modeId),
          bandIds: event.eventBands.map((eb) => eb.bandId),
          observations: event.observations,
          templateId: event.templateId,
        }}
        templates={templates.map((t: { id: string; name: string }) => ({ id: t.id, name: t.name }))}
        bands={bands}
        modes={modes}
      />

      {(role === "OWNER" || role === "ADMIN") && (
        <div className="mt-8">
          <OperatorAssignment
            eventId={id}
            assignedOperators={operators.map((o: { user: { id: string; callsign: string; name: string } }) => ({
              userId: o.user.id,
              callsign: o.user.callsign,
              name: o.user.name,
            }))}
            availableOperators={availableOperators.map((u: { id: string; callsign: string; name: string }) => ({
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
