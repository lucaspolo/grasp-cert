import type { CertificateKind } from "@/lib/certificate-kind";
import type { TemplateConfig } from "@/lib/template-config";

/**
 * Dados do certificado e o texto de cada campo. Módulo puro: o editor importa
 * daqui sem arrastar prisma, next/og e fs para o bundle do cliente, e assim o
 * texto de exemplo e o texto real saem da MESMA função.
 */
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
  serial: string;
};

export const CERTIFICATE_LABELS: Record<
  CertificateKind,
  { badge: string; role: string }
> = {
  participant: { badge: "Certificado de Participação", role: "Participante" },
  operator: { badge: "Certificado de Operador", role: "Operador" },
};

/** Texto de cada campo posicionável, na chave usada em `config.fields`. */
export function certificateValues(
  data: CertificateData
): Record<string, string> {
  const plural = data.qsoCount !== 1 ? "s" : "";

  return {
    eventName: data.eventName,
    participantCallsign: data.callsign.toUpperCase(),
    participantName: data.personName,
    eventDate: `${data.eventStartStr} — ${data.eventEndStr}`,
    qsoInfo: `Modos: ${data.modes.join(", ")} · Faixas: ${data.bands.join(", ")}`,
    qsoDateTime: `${CERTIFICATE_LABELS[data.kind].role} · ${data.qsoCount} QSO${plural} realizado${plural}`,
    serial: `Nº ${data.serial}`,
  };
}
