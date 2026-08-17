/**
 * Utilitários ADIF (Amateur Data Interchange Format) — parse, mapeamento e
 * geração. O formato é uma sequência de campos `<NAME:LEN>VALUE` terminados
 * por `<EOR>`, opcionalmente precedidos de um cabeçalho encerrado por `<EOH>`.
 * Como o comprimento do valor é declarado, valores podem conter espaços e
 * quebras de linha — por isso o parser lê exatamente LEN caracteres.
 *
 * Referência de campos: CALL, QSO_DATE (YYYYMMDD), TIME_ON (HHMM[SS]),
 * BAND (ex. "40m"), MODE (ex. "SSB"), FREQ, RST_SENT, RST_RCVD.
 */

export type AdifRecord = Record<string, string>;

const TAG_RE = /<([A-Za-z0-9_]+)(?::(\d+))?(?::[^>]*)?>/g;

/** Extrai os registros de um conteúdo ADIF (campos com nome em maiúsculas). */
export function parseAdif(content: string): AdifRecord[] {
  // Descarta o cabeçalho, se houver (tudo até <EOH>).
  const eoh = /<eoh>/i.exec(content);
  const body = eoh ? content.slice(eoh.index + eoh[0].length) : content;

  const records: AdifRecord[] = [];
  let current: AdifRecord = {};
  let hasFields = false;

  TAG_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TAG_RE.exec(body)) !== null) {
    const name = match[1].toUpperCase();

    if (name === "EOR") {
      if (hasFields) records.push(current);
      current = {};
      hasFields = false;
      continue;
    }
    if (name === "EOH") continue;

    const len = match[2] ? parseInt(match[2], 10) : 0;
    const valueStart = TAG_RE.lastIndex;
    current[name] = body.slice(valueStart, valueStart + len);
    hasFields = true;
    // Pula exatamente LEN caracteres do valor (que pode conter espaços/<).
    TAG_RE.lastIndex = valueStart + len;
  }

  return records;
}

/**
 * Converte QSO_DATE (YYYYMMDD) + TIME_ON (HHMM ou HHMMSS) em Date UTC.
 * Valida cada componente (rejeita datas inexistentes como 20260231).
 */
export function parseAdifDateTime(
  qsoDate: string,
  timeOn: string
): Date | null {
  if (!/^\d{8}$/.test(qsoDate)) return null;
  const t = (timeOn ?? "").padEnd(6, "0");
  if (!/^\d{6}$/.test(t)) return null;

  const year = Number(qsoDate.slice(0, 4));
  const month = Number(qsoDate.slice(4, 6));
  const day = Number(qsoDate.slice(6, 8));
  const hour = Number(t.slice(0, 2));
  const minute = Number(t.slice(2, 4));
  const second = Number(t.slice(4, 6));

  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second
  ) {
    return null;
  }
  return date;
}

export type MappedQso = {
  participantCallsign: string;
  dateTime: Date;
  bandId: string;
  modeId: string;
  frequency: string;
  rstSent: string;
  rstReceived: string;
};

export type AdifMapResult =
  | { ok: true; qso: MappedQso }
  | { ok: false; reason: string };

/**
 * Mapeia um registro ADIF para um QSO, validando contra as bandas/modos do
 * evento. `bandIdByName`/`modeIdByName` têm chaves em MAIÚSCULAS (nome ADIF).
 * Função pura — não toca no banco, para ser testável isoladamente.
 */
export function mapAdifRecord(
  record: AdifRecord,
  bandIdByName: Map<string, string>,
  modeIdByName: Map<string, string>
): AdifMapResult {
  const call = (record.CALL ?? "").toUpperCase().trim();
  if (call.length < 3 || call.length > 10) {
    return { ok: false, reason: "Indicativo ausente ou inválido." };
  }

  const dateTime = parseAdifDateTime(record.QSO_DATE ?? "", record.TIME_ON ?? "");
  if (!dateTime) {
    return { ok: false, reason: "Data/hora (QSO_DATE/TIME_ON) inválida." };
  }

  const bandName = (record.BAND ?? "").toUpperCase().trim();
  const bandId = bandIdByName.get(bandName);
  if (!bandId) {
    return {
      ok: false,
      reason: bandName
        ? `Banda "${record.BAND}" não pertence ao evento.`
        : "Banda (BAND) ausente.",
    };
  }

  const modeName = (record.MODE ?? "").toUpperCase().trim();
  const modeId = modeIdByName.get(modeName);
  if (!modeId) {
    return {
      ok: false,
      reason: modeName
        ? `Modo "${record.MODE}" não pertence ao evento.`
        : "Modo (MODE) ausente.",
    };
  }

  return {
    ok: true,
    qso: {
      participantCallsign: call,
      dateTime,
      bandId,
      modeId,
      frequency: (record.FREQ ?? "").trim(),
      rstSent: (record.RST_SENT ?? "").trim(),
      rstReceived: (record.RST_RCVD ?? "").trim(),
    },
  };
}

export type ExportQso = {
  participantCallsign: string;
  dateTime: Date;
  frequency: string;
  rstSent: string;
  rstReceived: string;
  band: { name: string };
  modeRef: { name: string };
};

function adifField(name: string, value: string): string {
  if (!value) return "";
  return `<${name}:${value.length}>${value} `;
}

function utcDate(d: Date): string {
  const y = String(d.getUTCFullYear()).padStart(4, "0");
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function utcTime(d: Date): string {
  const h = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  const s = String(d.getUTCSeconds()).padStart(2, "0");
  return `${h}${min}${s}`;
}

/**
 * Gera o conteúdo de um arquivo .adi com os QSOs do evento. `generatedAt`
 * é injetável para tornar a saída determinística nos testes.
 */
export function buildAdif(qsos: ExportQso[], generatedAt?: Date): string {
  const stamp = generatedAt ? utcDate(generatedAt) + " " + utcTime(generatedAt) : "";
  const header =
    `Ham Cert ADIF export\n` +
    (stamp ? `Gerado em ${stamp} UTC\n` : "") +
    `<ADIF_VER:5>3.1.4\n` +
    // O número é o comprimento do valor, não um id: "Ham Cert" tem 8 bytes.
    `<PROGRAMID:8>Ham Cert\n` +
    `<EOH>\n`;

  const records = qsos.map((qso) => {
    const fields =
      adifField("CALL", qso.participantCallsign.toUpperCase()) +
      adifField("QSO_DATE", utcDate(qso.dateTime)) +
      adifField("TIME_ON", utcTime(qso.dateTime)) +
      adifField("BAND", qso.band.name) +
      adifField("MODE", qso.modeRef.name) +
      adifField("FREQ", qso.frequency) +
      adifField("RST_SENT", qso.rstSent) +
      adifField("RST_RCVD", qso.rstReceived);
    return `${fields}<EOR>`;
  });

  return header + records.join("\n") + (records.length ? "\n" : "");
}
