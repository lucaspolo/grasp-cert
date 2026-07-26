import {
  CERTIFICATE_HEIGHT,
  CERTIFICATE_WIDTH,
} from "@/lib/certificate-dimensions";

/** Âncora horizontal do texto em relação ao x do campo. */
export type TemplateFieldAlign = "left" | "center" | "right";

export type TemplateConfigField = {
  x: number;
  y: number;
  fontSize: number;
  color: string;
  /** Rótulo exibido no editor. Vem sempre do código — ver mergeTemplateConfig. */
  label: string;
  align?: TemplateFieldAlign;
  /** false esconde o campo do certificado. Ausente = visível. */
  visible?: boolean;
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
      color: "#92400e",
      label: "Indicativo",
    },
    participantName: {
      x: 400,
      y: 260,
      fontSize: 24,
      color: "#334155",
      label: "Nome",
    },
    eventDate: {
      x: 400,
      y: 320,
      fontSize: 20,
      color: "#475569",
      label: "Período do Evento",
    },
    qsoInfo: {
      x: 400,
      y: 380,
      fontSize: 18,
      color: "#475569",
      label: "Modos e Faixas",
    },
    qsoDateTime: {
      x: 400,
      y: 420,
      fontSize: 18,
      color: "#475569",
      label: "Papel e Nº de QSOs",
    },
    serial: {
      x: 24,
      y: 468,
      fontSize: 10,
      color: "#78716c",
      label: "Número de Série",
      align: "left",
    },
  },
};

export function getDefaultTemplateConfig(): TemplateConfig {
  return structuredClone(DEFAULT_TEMPLATE_CONFIG);
}

/**
 * Cor legada do indicativo: o renderizador pintava #0f172a de marrom quando não
 * havia imagem de fundo, então o editor mostrava azul-marinho e o certificado
 * saía marrom. A condicional morreu; aqui o valor antigo é normalizado para o
 * que sempre foi desenhado de fato.
 */
const LEGACY_CALLSIGN_COLOR = "#0f172a";

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(Math.round(value), min), max);
}

/**
 * Funil único de leitura da config: tudo que sai do banco passa por aqui, tanto
 * na renderização quanto no editor.
 *
 * - Campo ausente no JSON (template salvo antes de ele existir) ganha o default.
 * - Campo desconhecido é descartado: só o que o certificado desenha vale.
 * - `label` vem sempre do código. Ele é persistido junto da config, então sem
 *   isso um rótulo gravado em 2026 venceria a correção para sempre.
 * - x/y são presos ao canvas: config antiga com x fora de faixa deixaria o
 *   campo invisível e, com o teto novo do Zod, impossível de salvar.
 */
export function mergeTemplateConfig(stored: unknown): TemplateConfig {
  const merged = getDefaultTemplateConfig();

  const storedFields = (stored as TemplateConfig | null)?.fields;
  if (!storedFields || typeof storedFields !== "object") return merged;

  for (const [key, field] of Object.entries(merged.fields)) {
    const override = storedFields[key];
    if (!override || typeof override !== "object") continue;

    merged.fields[key] = {
      ...field,
      ...override,
      label: field.label,
      x: clamp(override.x ?? field.x, 0, CERTIFICATE_WIDTH),
      y: clamp(override.y ?? field.y, 0, CERTIFICATE_HEIGHT),
    };

    if (
      key === "participantCallsign" &&
      merged.fields[key].color === LEGACY_CALLSIGN_COLOR
    ) {
      merged.fields[key].color = field.color;
    }
  }

  return merged;
}
