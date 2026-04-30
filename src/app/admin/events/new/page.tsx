import { createEvent } from "@/app/actions/event";
import { listTemplates } from "@/app/actions/template";
import { listBands } from "@/app/actions/band";
import { listModes } from "@/app/actions/mode";
import { EventForm } from "@/components/event-form";

export default async function NewEventPage() {
  const [templates, bands, modes] = await Promise.all([
    listTemplates(),
    listBands(),
    listModes(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Novo Evento</h1>
      <EventForm
        action={createEvent}
        templates={templates.map((t) => ({ id: t.id, name: t.name }))}
        bands={bands}
        modes={modes}
      />
    </div>
  );
}
