import { createEvent } from "@/app/actions/event";
import { listSelectableTemplates } from "@/app/actions/template";
import { listAdminGroups } from "@/app/actions/group";
import { listBands } from "@/app/actions/band";
import { listModes } from "@/app/actions/mode";
import { EventForm } from "@/components/event-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function NewEventPage() {
  const [groups, templates, bands, modes] = await Promise.all([
    listAdminGroups(),
    listSelectableTemplates(),
    listBands(),
    listModes(),
  ]);

  // Todo evento nasce dentro de um grupo: sem grupo administrado não há o que
  // preencher, e um formulário sem opção de grupo só produziria erro no envio.
  if (groups.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-2">Novo Evento</h1>
        <p className="text-muted-foreground mb-6">
          Você ainda não administra nenhum grupo. Todo evento pertence a um
          grupo — peça a um admin da plataforma para criar o seu ou incluí-lo
          como admin de um existente.
        </p>
        <Link href="/admin/groups">
          <Button variant="outline">Ver grupos</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Novo Evento</h1>
      <EventForm
        action={createEvent}
        groups={groups}
        templates={templates}
        bands={bands}
        modes={modes}
      />
    </div>
  );
}
