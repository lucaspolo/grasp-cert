import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { loadCertificateData, renderCertificate } from "@/lib/certificate";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { eventId } = await params;
  const operatorCallsign = session.user.callsign;

  if (!operatorCallsign) {
    return new Response("Callsign not found in session", { status: 400 });
  }

  const data = await loadCertificateData("operator", eventId, operatorCallsign);
  if (!data) {
    return new Response("No QSOs found for this operator in this event", {
      status: 404,
    });
  }

  return renderCertificate(data);
}
