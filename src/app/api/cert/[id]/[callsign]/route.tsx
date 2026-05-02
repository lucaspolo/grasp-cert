import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest } from "next/server";
import type { TemplateConfig } from "@/lib/template-config";
import { getDefaultTemplateConfig } from "@/lib/template-config";
import { readFileSync } from "fs";
import { join } from "path";
import QRCode from "qrcode";

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

  // Find all QSOs in this event for this participant
  const qsos = await prisma.qSO.findMany({
    where: {
      eventId,
      participantCallsign: { equals: participantCallsign, mode: "insensitive" },
    },
    include: {
      event: {
        include: {
          template: {
            select: { config: true, bgImage: true, bgMimeType: true },
          },
        },
      },
      band: true,
      modeRef: true,
    },
  });

  if (qsos.length === 0) {
    return new Response("No QSOs found for this participant in this event", {
      status: 404,
    });
  }

  const event = qsos[0].event;

  // Collect unique modes and bands
  const modesSet = new Set<string>();
  const bandsSet = new Set<string>();
  for (const qso of qsos) {
    modesSet.add(qso.modeRef.label);
    bandsSet.add(qso.band.label);
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

  // Lookup participant name from users table
  const participant = await prisma.user.findFirst({
    where: {
      callsign: { equals: participantCallsign, mode: "insensitive" },
    },
    select: { name: true },
  });

  const fields = config.fields;
  const eventStartStr = event.startDate.toLocaleDateString("pt-BR");
  const eventEndStr = event.endDate.toLocaleDateString("pt-BR");

  const hasCustomBg = !!bgDataUri;

  // Load watermark logo for default certificates
  let watermarkDataUri: string | null = null;
  if (!hasCustomBg) {
    try {
      const logoPath = join(process.cwd(), "public", "logo_grasp.png");
      const logoBuffer = readFileSync(logoPath);
      watermarkDataUri = `data:image/png;base64,${logoBuffer.toString("base64")}`;
    } catch {
      // Logo not available — skip watermark
    }
  }

  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verificar-certificado/${eventId}/${encodeURIComponent(participantCallsign)}`;

  const qrSvg = await QRCode.toString(verifyUrl, {
    type: "svg",
    width: 100,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });
  const qrDataUrl = `data:image/svg+xml,${encodeURIComponent(qrSvg)}`;

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
            : "linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Watermark logo — only when no custom background */}
        {!hasCustomBg && watermarkDataUri && (
          <img
            src={watermarkDataUri}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 300,
              height: 300,
              objectFit: "contain",
              opacity: 0.15,
            }}
          />
        )}

        {/* Decorative border — only when no custom background */}
        {!hasCustomBg && (
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              right: 12,
              bottom: 12,
              border: "2px solid rgba(146, 64, 14, 0.3)",
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
                color: "#92400e",
                letterSpacing: 4,
                textTransform: "uppercase",
              }}
            >
              Certificado de Participação
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
                ? "#1a1a1a"
                : fields.eventName.color,
            fontWeight: 700,
            transform: "translateX(-50%)",
            textAlign: "center",
            display: "flex",
          }}
        >
          {event.name}
        </span>

        {/* Participant callsign */}
        <span
          style={{
            position: "absolute",
            left: fields.participantCallsign.x,
            top: fields.participantCallsign.y,
            fontSize: fields.participantCallsign.fontSize,
            color:
              !hasCustomBg && fields.participantCallsign.color === "#0f172a"
                ? "#92400e"
                : fields.participantCallsign.color,
            fontWeight: 700,
            transform: "translateX(-50%)",
            display: "flex",
          }}
        >
          {participantCallsign.toUpperCase()}
        </span>

        {/* Participant name */}
        <span
          style={{
            position: "absolute",
            left: fields.participantName.x,
            top: fields.participantName.y,
            fontSize: fields.participantName.fontSize,
            color:
              !hasCustomBg && fields.participantName.color === "#334155"
                ? "#334155"
                : fields.participantName.color,
            transform: "translateX(-50%)",
            display: "flex",
          }}
        >
          {participant?.name ?? participantCallsign}
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
                ? "#475569"
                : fields.eventDate.color,
            transform: "translateX(-50%)",
            display: "flex",
          }}
        >
          {eventStartStr} — {eventEndStr}
        </span>

        {/* Modes and bands */}
        <span
          style={{
            position: "absolute",
            left: fields.qsoInfo.x,
            top: fields.qsoInfo.y,
            fontSize: fields.qsoInfo.fontSize,
            color:
              !hasCustomBg && fields.qsoInfo.color === "#475569"
                ? "#475569"
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
                ? "#475569"
                : fields.qsoDateTime.color,
            transform: "translateX(-50%)",
            display: "flex",
          }}
        >
          Participante · {qsos.length} QSO{qsos.length !== 1 ? "s" : ""}{" "}
          realizado{qsos.length !== 1 ? "s" : ""}
        </span>

        {/* QR Code — bottom right */}
        <img
          src={qrDataUrl}
          style={{
            position: "absolute",
            bottom: 12,
            right: 12,
            width: 100,
            height: 100,
          }}
        />

        {/* Footer — verification URL */}
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: hasCustomBg ? "#666" : "#78716c",
            }}
          >
            {verifyUrl}
          </span>
        </div>
      </div>
    ),
    { width: 800, height: 500 }
  );
}
