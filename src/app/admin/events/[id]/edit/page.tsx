import { getEvent, updateEvent } from "@/app/actions/event";
import { listSelectableTemplates } from "@/app/actions/template";
import { listAdminGroups } from "@/app/actions/group";
import { listBands } from "@/app/actions/band";
import { listModes } from "@/app/actions/mode";
import { listEventOperators, listOperatorUsers } from "@/app/actions/user";
import { EventForm } from "@/components/event-form";
import { OperatorAssignment } from "@/components/operator-assignment";
import { pageRead, requireEventAccess } from "@/lib/group-access";
import { notFound, redirect } from "next/navigation";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Editar é de quem administra o grupo do evento; evento de outro grupo dá
  // 404. O operador designado chega aqui pelo link da tabela: em vez de
  // estourar um erro, vai para os QSOs, que é o que ele de fato pode fazer.
  const access = await pageRead(() => requireEventAccess(id));
  if (access.scope === "operator") redirect(`/admin/events/${id}/qsos`);

  const [event, groups, templates, operators, availableOperators, bands, modes] =
    await pageRead(() =>
      Promise.all([
        getEvent(id),
        listAdminGroups(),
        listSelectableTemplates(),
        listEventOperators(id),
        listOperatorUsers(),
        listBands(),
        listModes(),
      ])
    );

  if (!event) notFound();

  // O grupo atual entra na lista mesmo quando quem edita não o administra
  // (caso do admin da plataforma), senão o seletor perderia o valor gravado.
  const groupOptions = groups.some((g) => g.id === event.groupId)
    ? groups
    : [{ id: event.group.id, name: event.group.name }, ...groups];

  const boundUpdate = updateEvent.bind(null, id);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Editar Evento</h1>
      <EventForm
        action={boundUpdate}
        defaultValues={{
          name: event.name,
          groupId: event.groupId,
          startDate: event.startDate.toISOString(),
          endDate: event.endDate.toISOString(),
          modeIds: event.eventModes.map((em) => em.modeId),
          bandIds: event.eventBands.map((eb) => eb.bandId),
          observations: event.observations,
          templateId: event.templateId,
        }}
        groups={groupOptions}
        templates={templates}
        bands={bands}
        modes={modes}
      />

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
    </div>
  );
}
