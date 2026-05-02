import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

export default async function VerificarCertificadoRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const qso = await prisma.qSO.findUnique({
    where: { id },
    select: { eventId: true, participantCallsign: true },
  });

  if (!qso) {
    notFound();
  }

  redirect(
    `/verificar-certificado/${qso.eventId}/${encodeURIComponent(qso.participantCallsign)}`
  );
}
