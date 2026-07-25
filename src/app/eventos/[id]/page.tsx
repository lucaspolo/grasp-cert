import { getPublicEventStats } from "@/app/actions/event";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
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
import { LocalDateTime } from "@/components/local-datetime";
import { Calendar, Radio, Users } from "lucide-react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

// Dados mudam pouco após o evento — revalida a cada 5 min (ISR).
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const stats = await getPublicEventStats(id);
  if (!stats) return { title: "Evento não encontrado — GRASP Cert" };
  return {
    title: `${stats.name} — GRASP Cert`,
    description: `${stats.totalQsos} QSOs e ${stats.participants} participantes em ${stats.name}.`,
  };
}

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const stats = await getPublicEventStats(id);
  if (!stats) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">{stats.name}</h1>
        <p className="mt-2 flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <LocalDateTime date={stats.startDate} showTime /> —{" "}
          <LocalDateTime date={stats.endDate} showTime />
        </p>

        {(stats.bands.length > 0 || stats.modes.length > 0) && (
          <div className="mt-4 flex flex-wrap gap-1">
            {stats.bands.map((band) => (
              <Badge key={`b-${band}`} variant="secondary">
                {band}
              </Badge>
            ))}
            {stats.modes.map((mode) => (
              <Badge key={`m-${mode}`} variant="outline">
                {mode}
              </Badge>
            ))}
          </div>
        )}

        {stats.observations && (
          <p className="mt-4 text-sm text-muted-foreground">
            {stats.observations}
          </p>
        )}
      </header>

      <section className="mb-8 grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Radio className="h-4 w-4" /> Total de QSOs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{stats.totalQsos}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4" /> Participantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">
              {stats.participants}
            </p>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Ranking por QSOs</h2>
        {stats.ranking.length === 0 ? (
          <p className="text-muted-foreground">
            Nenhum QSO registrado neste evento ainda.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Indicativo</TableHead>
                <TableHead className="text-right">QSOs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.ranking.map((row, index) => (
                <TableRow key={row.callsign}>
                  <TableCell className="font-medium tabular-nums text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-mono">{row.callsign}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.qsos}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
