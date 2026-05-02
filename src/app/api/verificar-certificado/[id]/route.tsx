import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const qso = await prisma.qSO.findUnique({
    where: { id },
    select: { eventId: true, participantCallsign: true },
  });

  if (!qso) {
    return new Response("QSO not found", { status: 404 });
  }

  const newUrl = `/api/verificar-certificado/${qso.eventId}/${encodeURIComponent(qso.participantCallsign)}`;
  return NextResponse.redirect(new URL(newUrl, _req.url), 308);
}
