import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { loadCertificateData, renderCertificate } from "@/lib/certificate";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; callsign: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id: eventId, callsign } = await params;
  const participantCallsign = decodeURIComponent(callsign);

  // Auth check: admin can generate any, user can only generate their own
  if (
    session.user.role !== "ADMIN" &&
    session.user.role !== "OWNER" &&
    participantCallsign.toUpperCase() !== session.user.callsign?.toUpperCase()
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  const data = await loadCertificateData(
    "participant",
    eventId,
    participantCallsign
  );
  if (!data) {
    return new Response("No QSOs found for this participant in this event", {
      status: 404,
    });
  }

  return renderCertificate(data);
}
