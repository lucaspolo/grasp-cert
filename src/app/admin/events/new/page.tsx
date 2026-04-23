import { createEvent } from "@/app/actions/event";
import { listTemplates } from "@/app/actions/template";
import { EventForm } from "@/components/event-form";

export default async function NewEventPage() {
  const templates = await listTemplates();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Novo Evento</h1>
      <EventForm
        action={createEvent}
        templates={templates.map((t) => ({ id: t.id, name: t.name }))}
      />
    </div>
  );
}
