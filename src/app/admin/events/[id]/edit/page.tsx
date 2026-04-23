import { getEvent, updateEvent } from "@/app/actions/event";
import { listTemplates } from "@/app/actions/template";
import { EventForm } from "@/components/event-form";
import { notFound } from "next/navigation";

function toDatetimeLocal(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event, templates] = await Promise.all([
    getEvent(id),
    listTemplates(),
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
          startDate: toDatetimeLocal(event.startDate),
          endDate: toDatetimeLocal(event.endDate),
          modes: event.modes,
          bands: event.bands,
          observations: event.observations,
          templateId: event.templateId,
        }}
        templates={templates.map((t) => ({ id: t.id, name: t.name }))}
      />
    </div>
  );
}
