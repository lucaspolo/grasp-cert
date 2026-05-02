import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  const qso = await prisma.qSO.findUnique({
    where: { id },
    select: { eventId: true, participantCallsign: true },
  });

  if (!qso) {
    return new Response("QSO not found", { status: 404 });
  }

  const newUrl = `/api/cert/${qso.eventId}/${encodeURIComponent(qso.participantCallsign)}`;
  return NextResponse.redirect(new URL(newUrl, _req.url), 308);
}
