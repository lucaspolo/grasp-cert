import { NextRequest } from "next/server";
import { clientIpFrom, consumeRateLimit } from "@/lib/rate-limit";
import {
  CERTIFICATE_CACHE_CONTROL,
  loadCertificateData,
  renderCertificate,
  renderCertificatePdf,
} from "@/lib/certificate";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string; callsign: string }> }
) {
  // Rota pública que renderiza imagem cara (Satori) — freia abuso por IP.
  const attempt = await consumeRateLimit({
    key: `cert:ip:${clientIpFrom(req.headers)}`,
    limit: 30,
    windowSeconds: 10 * 60,
  });
  if (!attempt.allowed) {
    return new Response("Too many requests", {
      status: 429,
      headers: { "Retry-After": String(attempt.retryAfterSeconds) },
    });
  }

  const { eventId, callsign } = await params;
  const operatorCallsign = decodeURIComponent(callsign);

  const data = await loadCertificateData("operator", eventId, operatorCallsign);
  if (!data) {
    return new Response("No QSOs found for this operator in this event", {
      status: 404,
    });
  }

  const headers = { "Cache-Control": CERTIFICATE_CACHE_CONTROL };

  return req.nextUrl.searchParams.get("format") === "pdf"
    ? renderCertificatePdf(data, { headers })
    : renderCertificate(data, { headers });
}
