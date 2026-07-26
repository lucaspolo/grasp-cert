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

/**
 * Normaliza a config vinda do banco: templates salvos antes de um campo novo
 * existir não têm a chave no JSON, então os defaults preenchem as lacunas.
 * Campos desconhecidos são descartados — só o que o certificado desenha vale.
 */
export function mergeTemplateConfig(stored: unknown): TemplateConfig {
  const merged = getDefaultTemplateConfig();

  const storedFields = (stored as TemplateConfig | null)?.fields;
  if (!storedFields || typeof storedFields !== "object") return merged;

  for (const [key, field] of Object.entries(merged.fields)) {
    const override = storedFields[key];
    if (override && typeof override === "object") {
      merged.fields[key] = { ...field, ...override };
    }
  }

  return merged;
}
