import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest } from "next/server";
import type { TemplateConfig } from "@/lib/template-config";
import { getDefaultTemplateConfig } from "@/lib/template-config";

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

  // Find all QSOs in this event where the current user was the operator
  const qsos = await prisma.qSO.findMany({
    where: {
      eventId,
      operatorCallsign: { equals: operatorCallsign, mode: "insensitive" },
    },
    include: {
      event: {
        include: {
          template: {
            select: { config: true, bgImage: true, bgMimeType: true },
          },
        },
      },
    },
  });

  if (qsos.length === 0) {
    return new Response("No QSOs found for this operator in this event", {
      status: 404,
    });
  }

  const event = qsos[0].event;

  // Collect unique modes and bands (frequency) operated
  const modesSet = new Set<string>();
  const bandsSet = new Set<string>();
  for (const qso of qsos) {
    modesSet.add(qso.mode);
    bandsSet.add(qso.frequency);
  }
  const modes = Array.from(modesSet).sort();
  const bands = Array.from(bandsSet).sort();

  // Resolve template: event's template > default "Padrão" template > code fallback
  let templateConfig: TemplateConfig | null = null;
  let bgDataUri: string | null = null;

  const template = event.template;
  if (template) {
    templateConfig = template.config as TemplateConfig | null;
    if (template.bgImage && template.bgMimeType) {
      const b64 = Buffer.from(template.bgImage).toString("base64");
      bgDataUri = `data:${template.bgMimeType};base64,${b64}`;
    }
  } else {
    const defaultTemplate = await prisma.template.findFirst({
      where: { name: "Padrão" },
      select: { config: true, bgImage: true, bgMimeType: true },
    });
    if (defaultTemplate) {
      templateConfig = defaultTemplate.config as TemplateConfig | null;
      if (defaultTemplate.bgImage && defaultTemplate.bgMimeType) {
        const b64 = Buffer.from(defaultTemplate.bgImage).toString("base64");
        bgDataUri = `data:${defaultTemplate.bgMimeType};base64,${b64}`;
      }
    }
  }

  const config: TemplateConfig = templateConfig ?? getDefaultTemplateConfig();

  // Lookup operator name from users table
  const operator = await prisma.user.findFirst({
    where: {
      callsign: { equals: operatorCallsign, mode: "insensitive" },
    },
    select: { name: true },
  });

  const fields = config.fields;
  const eventStartStr = event.startDate.toLocaleDateString("pt-BR");
  const eventEndStr = event.endDate.toLocaleDateString("pt-BR");

  const hasCustomBg = !!bgDataUri;

  return new ImageResponse(
    (
      <div
        style={{
          width: 800,
          height: 500,
          display: "flex",
          position: "relative",
          background: bgDataUri
            ? `url(${bgDataUri}) center/cover`
            : "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Decorative border — only when no custom background */}
        {!hasCustomBg && (
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              right: 12,
              bottom: 12,
              border: "2px solid rgba(251, 191, 36, 0.4)",
              borderRadius: 12,
              display: "flex",
            }}
          />
        )}

        {/* Header badge */}
        {!hasCustomBg && (
          <div
            style={{
              position: "absolute",
              top: 24,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: 14,
                color: "#fbbf24",
                letterSpacing: 4,
                textTransform: "uppercase",
              }}
            >
              Certificado de Operador
            </span>
          </div>
        )}

        {/* Event name */}
        <span
          style={{
            position: "absolute",
            left: fields.eventName.x,
            top: fields.eventName.y,
            fontSize: fields.eventName.fontSize,
            color:
              !hasCustomBg && fields.eventName.color === "#1a1a1a"
                ? "#e2e8f0"
                : fields.eventName.color,
            fontWeight: 700,
            transform: "translateX(-50%)",
            textAlign: "center",
            display: "flex",
          }}
        >
          {event.name}
        </span>

        {/* Operator callsign */}
        <span
          style={{
            position: "absolute",
            left: fields.participantCallsign.x,
            top: fields.participantCallsign.y,
            fontSize: fields.participantCallsign.fontSize,
            color:
              !hasCustomBg && fields.participantCallsign.color === "#0f172a"
                ? "#fbbf24"
                : fields.participantCallsign.color,
            fontWeight: 700,
            transform: "translateX(-50%)",
            display: "flex",
          }}
        >
          {operatorCallsign.toUpperCase()}
        </span>

        {/* Operator name */}
        <span
          style={{
            position: "absolute",
            left: fields.participantName.x,
            top: fields.participantName.y,
            fontSize: fields.participantName.fontSize,
            color:
              !hasCustomBg && fields.participantName.color === "#334155"
                ? "#94a3b8"
                : fields.participantName.color,
            transform: "translateX(-50%)",
            display: "flex",
          }}
        >
          {operator?.name ?? operatorCallsign}
        </span>

        {/* Event date range */}
        <span
          style={{
            position: "absolute",
            left: fields.eventDate.x,
            top: fields.eventDate.y,
            fontSize: fields.eventDate.fontSize,
            color:
              !hasCustomBg && fields.eventDate.color === "#475569"
                ? "#cbd5e1"
                : fields.eventDate.color,
            transform: "translateX(-50%)",
            display: "flex",
          }}
        >
          {eventStartStr} — {eventEndStr}
        </span>

        {/* Modes and bands operated */}
        <span
          style={{
            position: "absolute",
            left: fields.qsoInfo.x,
            top: fields.qsoInfo.y,
            fontSize: fields.qsoInfo.fontSize,
            color:
              !hasCustomBg && fields.qsoInfo.color === "#475569"
                ? "#94a3b8"
                : fields.qsoInfo.color,
            transform: "translateX(-50%)",
            display: "flex",
          }}
        >
          Modos: {modes.join(", ")} · Faixas: {bands.join(", ")}
        </span>

        {/* QSO count */}
        <span
          style={{
            position: "absolute",
            left: fields.qsoDateTime.x,
            top: fields.qsoDateTime.y,
            fontSize: fields.qsoDateTime.fontSize,
            color:
              !hasCustomBg && fields.qsoDateTime.color === "#475569"
                ? "#94a3b8"
                : fields.qsoDateTime.color,
            transform: "translateX(-50%)",
            display: "flex",
          }}
        >
          Operador · {qsos.length} QSO{qsos.length !== 1 ? "s" : ""}{" "}
          realizado{qsos.length !== 1 ? "s" : ""}
        </span>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: hasCustomBg ? "#666" : "#64748b",
            }}
          >
            Gerado por GRASP-CERT
          </span>
        </div>
      </div>
    ),
    { width: 800, height: 500 }
  );
}
