import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

export default async function Home() {
  const session = await auth();
  const callsign = session?.user?.callsign;

  const qsos = callsign
    ? await prisma.qSO.findMany({
        where: { participantCallsign: { equals: callsign, mode: "insensitive" } },
        include: { event: { select: { id: true, name: true, startDate: true, endDate: true } } },
        orderBy: { dateTime: "desc" },
      })
    : [];

  // Query events where the user was the operator (admin who logged QSOs)
  const operatorQsos =
    callsign && session?.user?.role === "ADMIN"
      ? await prisma.qSO.findMany({
          where: { operatorCallsign: { equals: callsign, mode: "insensitive" } },
          include: {
            event: { select: { id: true, name: true, startDate: true, endDate: true } },
          },
          orderBy: { dateTime: "desc" },
        })
      : [];

  // Group QSOs by event
  const grouped = new Map<
    string,
    { event: { id: string; name: string; startDate: Date; endDate: Date }; qsos: typeof qsos }
  >();
  for (const qso of qsos) {
    const existing = grouped.get(qso.eventId);
    if (existing) {
      existing.qsos.push(qso);
    } else {
      grouped.set(qso.eventId, { event: qso.event, qsos: [qso] });
    }
  }

  // Group operator QSOs by event, collecting unique modes and bands
  const operatorGrouped = new Map<
    string,
    {
      event: { id: string; name: string; startDate: Date; endDate: Date };
      qsoCount: number;
      modes: Set<string>;
      bands: Set<string>;
    }
  >();
  for (const qso of operatorQsos) {
    const existing = operatorGrouped.get(qso.eventId);
    if (existing) {
      existing.qsoCount++;
      existing.modes.add(qso.mode);
      existing.bands.add(qso.frequency);
    } else {
      operatorGrouped.set(qso.eventId, {
        event: qso.event,
        qsoCount: 1,
        modes: new Set([qso.mode]),
        bands: new Set([qso.frequency]),
      });
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">
        Bem-vindo, {session?.user?.name ?? session?.user?.callsign}!
      </h1>

      {grouped.size === 0 ? (
        <p className="mt-4 text-muted-foreground">
          Você ainda não possui QSOs registrados. Quando um administrador
          lançar seus contatos em um evento, eles aparecerão aqui.
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          {Array.from(grouped.values()).map(({ event, qsos: eventQsos }) => (
            <Card key={event.id}>
              <CardHeader>
                <CardTitle>{event.name}</CardTitle>
                <CardDescription>
                  {new Date(event.startDate).toLocaleDateString("pt-BR")} —{" "}
                  {new Date(event.endDate).toLocaleDateString("pt-BR")} ·{" "}
                  <Badge variant="secondary">
                    {eventQsos.length} QSO{eventQsos.length !== 1 ? "s" : ""}
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Frequência</TableHead>
                      <TableHead>Modo</TableHead>
                      <TableHead>RST S/R</TableHead>
                      <TableHead className="text-right">Certificado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventQsos.map((qso) => (
                      <TableRow key={qso.id}>
                        <TableCell>
                          {new Date(qso.dateTime).toLocaleString("pt-BR", {
                            timeZone: "UTC",
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </TableCell>
                        <TableCell>{qso.frequency}</TableCell>
                        <TableCell>{qso.mode}</TableCell>
                        <TableCell>
                          {qso.rstSent}/{qso.rstReceived}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/api/cert/${qso.id}`}
                            target="_blank"
                          >
                            <Button variant="outline" size="sm">
                              Download
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {operatorGrouped.size > 0 && (
        <>
          <h2 className="mt-10 text-xl font-bold">
            Eventos que você operou
          </h2>
          <div className="mt-4 space-y-6">
            {Array.from(operatorGrouped.values()).map(
              ({ event, qsoCount, modes, bands }) => (
                <Card key={event.id}>
                  <CardHeader>
                    <CardTitle>{event.name}</CardTitle>
                    <CardDescription>
                      {new Date(event.startDate).toLocaleDateString("pt-BR")}{" "}
                      —{" "}
                      {new Date(event.endDate).toLocaleDateString("pt-BR")} ·{" "}
                      <Badge variant="secondary">
                        {qsoCount} QSO{qsoCount !== 1 ? "s" : ""} lançado
                        {qsoCount !== 1 ? "s" : ""}
                      </Badge>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                      <p>
                        <span className="font-medium text-foreground">
                          Modos:
                        </span>{" "}
                        {Array.from(modes).sort().join(", ")}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">
                          Faixas:
                        </span>{" "}
                        {Array.from(bands).sort().join(", ")}
                      </p>
                    </div>
                    <div className="mt-4">
                      <Link
                        href={`/api/cert/operator/${event.id}`}
                        target="_blank"
                      >
                        <Button variant="outline" size="sm">
                          Download Certificado de Operador
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}
