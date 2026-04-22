export type TemplateConfigField = {
  x: number;
  y: number;
  fontSize: number;
  color: string;
  label: string;
};

export type TemplateConfig = {
  fields: Record<string, TemplateConfigField>;
};

export const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
  fields: {
    eventName: {
      x: 400,
      y: 80,
      fontSize: 32,
      color: "#1a1a1a",
      label: "Nome do Evento",
    },
    participantCallsign: {
      x: 400,
      y: 200,
      fontSize: 48,
      color: "#0f172a",
      label: "Indicativo do Participante",
    },
    participantName: {
      x: 400,
      y: 260,
      fontSize: 24,
      color: "#334155",
      label: "Nome do Participante",
    },
    eventDate: {
      x: 400,
      y: 320,
      fontSize: 20,
      color: "#475569",
      label: "Data do Evento",
    },
    qsoInfo: {
      x: 400,
      y: 380,
      fontSize: 18,
      color: "#475569",
      label: "Info do QSO (freq, modo, RST)",
    },
    qsoDateTime: {
      x: 400,
      y: 420,
      fontSize: 18,
      color: "#475569",
      label: "Data/Hora do QSO",
    },
  },
};

export function getDefaultTemplateConfig(): TemplateConfig {
  return structuredClone(DEFAULT_TEMPLATE_CONFIG);
}
