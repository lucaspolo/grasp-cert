import { createEvent } from "@/app/actions/event";
import { EventForm } from "@/components/event-form";

export default function NewEventPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Novo Evento</h1>
      <EventForm action={createEvent} />
    </div>
  );
}
