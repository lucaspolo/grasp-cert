import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";
import QRCode from "qrcode";
import { PDFDocument } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { mergeTemplateConfig } from "@/lib/template-config";
import { certificateSerial } from "@/lib/certificate-serial";
import type { CertificateKind } from "@/lib/certificate-kind";
import {
  CertificateCanvas,
  CERTIFICATE_FONT_FAMILY,
} from "@/lib/certificate-canvas";
import {
  CERTIFICATE_HEIGHT,
  CERTIFICATE_WIDTH,
} from "@/lib/certificate-dimensions";
import {
  CERTIFICATE_LABELS,
  certificateValues,
  type CertificateData,
} from "@/lib/certificate-values";

export {
  CERTIFICATE_WIDTH,
  CERTIFICATE_HEIGHT,
} from "@/lib/certificate-dimensions";
export { certificateValues } from "@/lib/certificate-values";
export type { CertificateData } from "@/lib/certificate-values";

// O certificado é determinístico por evento+indicativo (muda só com QSOs novos):
// cache curto no navegador, mais longo na CDN da Vercel.
export const CERTIFICATE_CACHE_CONTROL =
  "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

// O tipo mora num módulo próprio para que páginas e helpers possam importá-lo
// sem arrastar next/og, qrcode e fs junto.
export type { CertificateKind } from "@/lib/certificate-kind";

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
    serial: certificateSerial(kind, eventId, callsign),
  };
}

/**
 * A mesma face que o Satori já usava por padrão, agora registrada de forma
 * explícita para que o navegador possa carregar o binário idêntico via
 * @font-face — sem isso o editor mede o texto numa fonte e o certificado sai
 * em outra. Verificado: registrar assim gera PNG byte a byte igual.
 */
let cachedFont: Buffer | null = null;

function certificateFonts() {
  try {
    cachedFont ??= readFileSync(
      join(process.cwd(), "public", "fonts", "geist-regular.ttf")
    );
  } catch {
    // Sem o arquivo, o Satori cai na face embutida. Devolver [] NÃO serve:
    // o bundle faz `fonts || defaultFonts` e um array vazio é truthy, o que
    // derruba o render com "No fonts are loaded".
    return undefined;
  }

  return [
    {
      name: CERTIFICATE_FONT_FAMILY,
      data: cachedFont,
      weight: 400 as const,
      style: "normal" as const,
    },
  ];
}

/** Nome de arquivo do download: certificado-nome-do-evento-py2abc.ext */
export function certificateFilename(
  data: CertificateData,
  extension: "png" | "pdf"
): string {
  const slug = data.eventName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `certificado-${slug}-${data.callsign.toLowerCase()}.${extension}`;
}

/**
 * Fator de resolução do PDF: o certificado é rasterizado em 3× e desenhado na
 * página de 800×500pt, dando ~216 DPI. Sem isso o texto sai serrilhado ao dar
 * zoom ou imprimir, já que no PDF ele é imagem, não vetor.
 */
const PDF_SCALE = 3;

/**
 * Embute o certificado rasterizado numa página do mesmo tamanho — mesmo layout
 * do PNG, sem reimplementá-lo, só com mais resolução.
 */
export async function renderCertificatePdf(
  data: CertificateData,
  init?: { headers?: Record<string, string> }
): Promise<Response> {
  const png = await (
    await renderCertificate(data, { scale: PDF_SCALE })
  ).arrayBuffer();

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Certificado ${data.serial} — ${data.eventName}`);
  pdf.setSubject(`${data.callsign.toUpperCase()} · ${data.verifyUrl}`);
  pdf.setCreator("GRASP-CERT");

  const page = pdf.addPage([CERTIFICATE_WIDTH, CERTIFICATE_HEIGHT]);
  const image = await pdf.embedPng(png);
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: CERTIFICATE_WIDTH,
    height: CERTIFICATE_HEIGHT,
  });

  const bytes = await pdf.save();

  return new Response(bytes as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${certificateFilename(data, "pdf")}"`,
      ...init?.headers,
    },
  });
}

export async function renderCertificate(
  data: CertificateData,
  init?: { headers?: Record<string, string>; scale?: number }
): Promise<ImageResponse> {
  // O layout é sempre escrito em 800×500; a escala só amplia o raster de saída
  // (o PDF usa isso para não sair serrilhado ao dar zoom ou imprimir).
  const scale = init?.scale ?? 1;

  const fonts = certificateFonts();

  const qrSvg = await QRCode.toString(data.verifyUrl, {
    type: "svg",
    width: 100 * scale,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });

  return new ImageResponse(
    (
      <CertificateCanvas
        config={data.config}
        values={certificateValues(data)}
        badge={CERTIFICATE_LABELS[data.kind].badge}
        verifyUrl={data.verifyUrl}
        bgSrc={data.bgDataUri}
        qrSrc={`data:image/svg+xml,${encodeURIComponent(qrSvg)}`}
        scale={scale}
      />
    ),
    {
      width: CERTIFICATE_WIDTH * scale,
      height: CERTIFICATE_HEIGHT * scale,
      // Omitir a chave quando não há fonte própria — nunca passar [].
      ...(fonts ? { fonts } : {}),
      ...(init?.headers ? { headers: init.headers } : {}),
    }
  );
}
