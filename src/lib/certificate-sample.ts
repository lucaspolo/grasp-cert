import type { CertificateKind } from "@/lib/certificate-kind";
import {
  CERTIFICATE_LABELS,
  certificateValues,
  type CertificateData,
} from "@/lib/certificate-values";
import {
  getDefaultTemplateConfig,
  type TemplateConfig,
} from "@/lib/template-config";

/**
 * Certificado de exemplo do editor. Deliberadamente pessimista — nome de evento
 * comprido, vários modos e faixas — para o admin posicionar os campos contra o
 * pior caso, e não contra um texto curto que sempre cabe.
 *
 * O texto sai de `certificateValues`, a mesma função do certificado real: não
 * há como o exemplo e o resultado divergirem.
 */
export const SAMPLE_VERIFY_URL =
  "https://grasp-cert.exemplo.br/verificar-certificado/evento-exemplo/PY2ABC";

export const SAMPLE_BADGE: Record<CertificateKind, string> = {
  participant: CERTIFICATE_LABELS.participant.badge,
  operator: CERTIFICATE_LABELS.operator.badge,
};

export function sampleCertificateData(
  kind: CertificateKind,
  config: TemplateConfig = getDefaultTemplateConfig()
): CertificateData {
  return {
    kind,
    eventId: "evento-exemplo",
    callsign: "PY2ABC",
    eventName: "Contest Brasileiro de Radioamadorismo",
    personName: "João da Silva",
    eventStartStr: "01/01/2026",
    eventEndStr: "02/01/2026",
    modes: ["SSB", "CW", "FT8"],
    bands: ["10 m", "20 m", "40 m"],
    qsoCount: 12,
    config,
    bgDataUri: null,
    verifyUrl: SAMPLE_VERIFY_URL,
    serial: "GC-SVX9-DR0P",
  };
}

export function sampleCertificateValues(
  kind: CertificateKind
): Record<string, string> {
  return certificateValues(sampleCertificateData(kind));
}
