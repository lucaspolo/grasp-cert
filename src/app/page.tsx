import { listPublicEvents } from "@/app/actions/event";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar, Radio } from "lucide-react";

export default async function Home() {
  const events = await listPublicEvents();
  const now = new Date();

  const happening = events.filter(
    (e) => e.startDate <= now && e.endDate >= now
  );
  const upcoming = events.filter((e) => e.startDate > now);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">GRASP Cert</h1>
        <p className="mt-2 text-muted-foreground">
          Certificados de participação em concursos de radioamadorismo
        </p>
      </div>

      {happening.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <Radio className="h-5 w-5 text-green-500" />
            Acontecendo agora
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {happening.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className={happening.length > 0 ? "mt-10" : ""}>
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-blue-500" />
            Em breve
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {upcoming.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      {happening.length === 0 && upcoming.length === 0 && (
        <p className="text-muted-foreground">
          Nenhum evento programado no momento.
        </p>
      )}
    </div>
  );
}

function EventCard({
  event,
}: {
  event: Awaited<ReturnType<typeof listPublicEvents>>[number];
}) {
  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{event.name}</CardTitle>
        <CardDescription>
          {formatDate(event.startDate)} — {formatDate(event.endDate)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {event.eventBands.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {event.eventBands.map((eb) => (
              <Badge key={eb.bandId} variant="secondary">
                {eb.band.label}
              </Badge>
            ))}
          </div>
        )}
        {event.eventModes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {event.eventModes.map((em) => (
              <Badge key={em.modeId} variant="outline">
                {em.mode.label}
              </Badge>
            ))}
          </div>
        )}
        {event.observations && (
          <p className="text-sm text-muted-foreground">{event.observations}</p>
        )}
      </CardContent>
    </Card>
  );
}
