import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { mergeTemplateConfig, type TemplateConfig } from "@/lib/template-config";

export const CERTIFICATE_WIDTH = 800;
export const CERTIFICATE_HEIGHT = 500;

// O certificado é determinístico por evento+indicativo (muda só com QSOs novos):
// cache curto no navegador, mais longo na CDN da Vercel.
export const CERTIFICATE_CACHE_CONTROL =
  "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

/** Certificado do participante (quem foi contatado) ou do operador (quem lançou). */
export type CertificateKind = "participant" | "operator";

export type CertificateData = {
  kind: CertificateKind;
  eventId: string;
  callsign: string;
  eventName: string;
  personName: string;
  eventStartStr: string;
  eventEndStr: string;
  modes: string[];
  bands: string[];
  qsoCount: number;
  config: TemplateConfig;
  bgDataUri: string | null;
  verifyUrl: string;
};

const LABELS: Record<CertificateKind, { badge: string; role: string }> = {
  participant: { badge: "Certificado de Participação", role: "Participante" },
  operator: { badge: "Certificado de Operador", role: "Operador" },
};

/** Caminho público de verificação — também usado no QR Code do certificado. */
export function verificationPath(
  kind: CertificateKind,
  eventId: string,
  callsign: string
): string {
  const cs = encodeURIComponent(callsign);
  return kind === "participant"
    ? `/verificar-certificado/${eventId}/${cs}`
    : `/verificar-certificado/operador/${eventId}/${cs}`;
}

/**
 * Carrega tudo que o certificado exibe. Retorna null quando o indicativo não
 * tem QSO no evento — as rotas traduzem isso em 404.
 */
export async function loadCertificateData(
  kind: CertificateKind,
  eventId: string,
  callsign: string
): Promise<CertificateData | null> {
  const qsos = await prisma.qSO.findMany({
    where: {
      eventId,
      ...(kind === "participant"
        ? { participantCallsign: { equals: callsign, mode: "insensitive" as const } }
        : { operatorCallsign: { equals: callsign, mode: "insensitive" as const } }),
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

  if (qsos.length === 0) return null;

  const event = qsos[0].event;

  const modesSet = new Set<string>();
  const bandsSet = new Set<string>();
  for (const qso of qsos) {
    modesSet.add(qso.modeRef.label);
    bandsSet.add(qso.band.label);
  }

  // Template do evento > template "Padrão" > defaults do código.
  let storedConfig: unknown = null;
  let bgDataUri: string | null = null;

  const template =
    event.template ??
    (await prisma.template.findFirst({
      where: { name: "Padrão" },
      select: { config: true, bgImage: true, bgMimeType: true },
    }));

  if (template) {
    storedConfig = template.config;
    if (template.bgImage && template.bgMimeType) {
      const b64 = Buffer.from(template.bgImage).toString("base64");
      bgDataUri = `data:${template.bgMimeType};base64,${b64}`;
    }
  }

  const person = await prisma.user.findFirst({
    where: { callsign: { equals: callsign, mode: "insensitive" } },
    select: { name: true },
  });

  return {
    kind,
    eventId,
    callsign,
    eventName: event.name,
    personName: person?.name ?? callsign,
    eventStartStr: event.startDate.toLocaleDateString("pt-BR"),
    eventEndStr: event.endDate.toLocaleDateString("pt-BR"),
    modes: Array.from(modesSet).sort(),
    bands: Array.from(bandsSet).sort(),
    qsoCount: qsos.length,
    config: mergeTemplateConfig(storedConfig),
    bgDataUri,
    verifyUrl: `${process.env.NEXT_PUBLIC_APP_URL}${verificationPath(kind, eventId, callsign)}`,
  };
}

/** Marca d'água usada só quando o template não tem imagem de fundo própria. */
function loadWatermark(): string | null {
  try {
    const logoPath = join(process.cwd(), "public", "logo_grasp.png");
    return `data:image/png;base64,${readFileSync(logoPath).toString("base64")}`;
  } catch {
    return null;
  }
}

export async function renderCertificate(
  data: CertificateData,
  init?: { headers?: Record<string, string> }
): Promise<ImageResponse> {
  const { config, bgDataUri, verifyUrl } = data;
  const fields = config.fields;
  const hasCustomBg = !!bgDataUri;
  const labels = LABELS[data.kind];
  const watermarkDataUri = hasCustomBg ? null : loadWatermark();

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
          width: CERTIFICATE_WIDTH,
          height: CERTIFICATE_HEIGHT,
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
              {labels.badge}
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
          {data.eventName}
        </span>

        {/* Callsign */}
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
          {data.callsign.toUpperCase()}
        </span>

        {/* Name */}
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
          {data.personName}
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
          {data.eventStartStr} — {data.eventEndStr}
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
          Modos: {data.modes.join(", ")} · Faixas: {data.bands.join(", ")}
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
          {labels.role} · {data.qsoCount} QSO{data.qsoCount !== 1 ? "s" : ""}{" "}
          realizado{data.qsoCount !== 1 ? "s" : ""}
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
    {
      width: CERTIFICATE_WIDTH,
      height: CERTIFICATE_HEIGHT,
      ...(init?.headers ? { headers: init.headers } : {}),
    }
  );
}
