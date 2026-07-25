import { describe, expect, it } from "vitest";

import {
  buildAdif,
  mapAdifRecord,
  parseAdif,
  parseAdifDateTime,
  type ExportQso,
} from "./adif";

describe("parseAdif", () => {
  it("descarta o cabeçalho e extrai registros com nomes em maiúsculas", () => {
    const content = `Gerado por WSJT-X
<adif_ver:5>3.1.4
<EOH>
<call:6>PY2ABC <qso_date:8>20260725 <time_on:6>143000 <band:3>40m <mode:3>SSB <rst_sent:2>59 <rst_rcvd:2>59 <eor>
<CALL:6>PY3XYZ <QSO_DATE:8>20260725 <TIME_ON:4>1445 <BAND:3>20m <MODE:3>FT8 <EOR>`;
    const records = parseAdif(content);
    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      CALL: "PY2ABC",
      QSO_DATE: "20260725",
      TIME_ON: "143000",
      BAND: "40m",
      MODE: "SSB",
    });
    expect(records[1].CALL).toBe("PY3XYZ");
    expect(records[1].TIME_ON).toBe("1445");
  });

  it("funciona sem cabeçalho e lê valores com espaços (LEN respeitado)", () => {
    const content = `<call:6>PY2ABC <comment:11>bom contato <eor>`;
    const records = parseAdif(content);
    expect(records[0].CALL).toBe("PY2ABC");
    expect(records[0].COMMENT).toBe("bom contato");
  });

  it("ignora registro vazio (sem campos antes de <eor>)", () => {
    expect(parseAdif("<eor><eor>")).toEqual([]);
  });
});

describe("parseAdifDateTime", () => {
  it("YYYYMMDD + HHMMSS vira Date UTC", () => {
    const d = parseAdifDateTime("20260725", "143005");
    expect(d?.toISOString()).toBe("2026-07-25T14:30:05.000Z");
  });

  it("HHMM (sem segundos) completa com 00", () => {
    const d = parseAdifDateTime("20260725", "1445");
    expect(d?.toISOString()).toBe("2026-07-25T14:45:00.000Z");
  });

  it("rejeita data inexistente e formatos inválidos", () => {
    expect(parseAdifDateTime("20260231", "1200")).toBeNull(); // 31/02
    expect(parseAdifDateTime("2026072", "1200")).toBeNull();
    expect(parseAdifDateTime("20260725", "99")).toBeNull();
    expect(parseAdifDateTime("20260725", "2500")).toBeNull(); // hora 25
  });
});

describe("mapAdifRecord", () => {
  const bands = new Map([
    ["40M", "band-40m"],
    ["20M", "band-20m"],
  ]);
  const modes = new Map([
    ["SSB", "mode-ssb"],
    ["FT8", "mode-ft8"],
  ]);

  it("mapeia um registro válido resolvendo banda/modo por nome", () => {
    const result = mapAdifRecord(
      {
        CALL: "py2abc",
        QSO_DATE: "20260725",
        TIME_ON: "1430",
        BAND: "40m",
        MODE: "SSB",
        RST_SENT: "59",
        RST_RCVD: "57",
        FREQ: "7.100",
      },
      bands,
      modes
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.qso).toMatchObject({
        participantCallsign: "PY2ABC",
        bandId: "band-40m",
        modeId: "mode-ssb",
        rstSent: "59",
        rstReceived: "57",
        frequency: "7.100",
      });
      expect(result.qso.dateTime.toISOString()).toBe("2026-07-25T14:30:00.000Z");
    }
  });

  it("rejeita banda fora do evento", () => {
    const result = mapAdifRecord(
      { CALL: "PY2ABC", QSO_DATE: "20260725", TIME_ON: "1430", BAND: "10m", MODE: "SSB" },
      bands,
      modes
    );
    expect(result).toEqual({
      ok: false,
      reason: 'Banda "10m" não pertence ao evento.',
    });
  });

  it("rejeita modo fora do evento", () => {
    const result = mapAdifRecord(
      { CALL: "PY2ABC", QSO_DATE: "20260725", TIME_ON: "1430", BAND: "40m", MODE: "RTTY" },
      bands,
      modes
    );
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.reason).toContain("RTTY");
  });

  it("rejeita indicativo ausente e data inválida", () => {
    expect(
      mapAdifRecord({ QSO_DATE: "20260725", TIME_ON: "1430", BAND: "40m", MODE: "SSB" }, bands, modes)
    ).toMatchObject({ ok: false });
    expect(
      mapAdifRecord({ CALL: "PY2ABC", QSO_DATE: "xxxx", TIME_ON: "1430", BAND: "40m", MODE: "SSB" }, bands, modes)
    ).toMatchObject({ ok: false });
  });

  it("RST/FREQ ausentes viram string vazia", () => {
    const result = mapAdifRecord(
      { CALL: "PY2ABC", QSO_DATE: "20260725", TIME_ON: "1430", BAND: "40m", MODE: "SSB" },
      bands,
      modes
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.qso.rstSent).toBe("");
      expect(result.qso.frequency).toBe("");
    }
  });
});

describe("buildAdif", () => {
  const qsos: ExportQso[] = [
    {
      participantCallsign: "PY2ABC",
      dateTime: new Date("2026-07-25T14:30:05.000Z"),
      frequency: "7.100",
      rstSent: "59",
      rstReceived: "57",
      band: { name: "40m" },
      modeRef: { name: "SSB" },
    },
  ];

  it("gera cabeçalho + registro com campos e comprimentos corretos", () => {
    const adif = buildAdif(qsos);
    expect(adif).toContain("<EOH>");
    expect(adif).toContain("<CALL:6>PY2ABC");
    expect(adif).toContain("<QSO_DATE:8>20260725");
    expect(adif).toContain("<TIME_ON:6>143005");
    expect(adif).toContain("<BAND:3>40m");
    expect(adif).toContain("<MODE:3>SSB");
    expect(adif).toContain("<RST_SENT:2>59");
    expect(adif).toContain("<EOR>");
  });

  it("round-trip: o que é gerado é relido pelo parser", () => {
    const adif = buildAdif(qsos);
    const parsed = parseAdif(adif);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      CALL: "PY2ABC",
      QSO_DATE: "20260725",
      TIME_ON: "143005",
      BAND: "40m",
      MODE: "SSB",
    });
  });

  it("evento sem QSOs gera só o cabeçalho", () => {
    const adif = buildAdif([]);
    expect(adif).toContain("<EOH>");
    expect(parseAdif(adif)).toEqual([]);
  });
});
