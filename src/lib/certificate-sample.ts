import type { CertificateKind } from "@/lib/certificate-kind";

/**
 * Dados de exemplo do editor de templates. Deliberadamente pessimistas — nome
 * de evento comprido, vários modos e faixas — para o admin posicionar os campos
 * contra o pior caso e não contra um texto curto que sempre cabe.
 *
 * As chaves precisam cobrir as de DEFAULT_TEMPLATE_CONFIG.fields; há teste.
 */
export const SAMPLE_VERIFY_URL =
  "https://grasp-cert.exemplo.br/verificar-certificado/evento-exemplo/PY2ABC";

const SAMPLE_ROLE: Record<CertificateKind, string> = {
  participant: "Participante",
  operator: "Operador",
};

export const SAMPLE_BADGE: Record<CertificateKind, string> = {
  participant: "Certificado de Participação",
  operator: "Certificado de Operador",
};

export function sampleCertificateValues(
  kind: CertificateKind
): Record<string, string> {
  return {
    eventName: "Contest Brasileiro de Radioamadorismo",
    participantCallsign: "PY2ABC",
    participantName: "João da Silva",
    eventDate: "01/01/2026 — 02/01/2026",
    qsoInfo: "Modos: SSB, CW, FT8 · Faixas: 10 m, 20 m, 40 m",
    qsoDateTime: `${SAMPLE_ROLE[kind]} · 12 QSOs realizados`,
    serial: "Nº GC-SVX9-DR0P",
  };
}
