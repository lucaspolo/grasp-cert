import { describe, expect, it } from "vitest";
import {
  formatBRDateTime,
  formatBRDateTimeInTZ,
  localToUTC,
  parseBRDateTime,
} from "./utils";

// Os testes de conversão absoluta assumem TZ=UTC (ver vitest.config.mts).

describe("parseBRDateTime", () => {
  it("aceita o formato brasileiro DD/MM/AAAA HH:mm", () => {
    const d = parseBRDateTime("01/05/2026 14:30");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(4);
    expect(d!.getDate()).toBe(1);
    expect(d!.getHours()).toBe(14);
    expect(d!.getMinutes()).toBe(30);
  });

  it("aceita o formato ISO de datetime-local", () => {
    const d = parseBRDateTime("2026-05-01T14:30");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getHours()).toBe(14);
  });

  it("rejeita data inexistente (31 de fevereiro)", () => {
    expect(parseBRDateTime("31/02/2026 10:00")).toBeNull();
  });

  it("rejeita formatos inválidos", () => {
    expect(parseBRDateTime("")).toBeNull();
    expect(parseBRDateTime("abc")).toBeNull();
    expect(parseBRDateTime("1/5/2026 14:30")).toBeNull();
    expect(parseBRDateTime("01/05/2026")).toBeNull();
  });
});

describe("formatBRDateTime", () => {
  it("formata com zero à esquerda", () => {
    const d = new Date(2026, 4, 1, 9, 5);
    expect(formatBRDateTime(d)).toBe("01/05/2026 09:05");
  });

  it("faz roundtrip com parseBRDateTime", () => {
    const original = "07/11/2026 23:45";
    const parsed = parseBRDateTime(original);
    expect(formatBRDateTime(parsed!)).toBe(original);
  });
});

describe("localToUTC", () => {
  it("converte horário de São Paulo (UTC-3) para UTC", () => {
    const local = parseBRDateTime("01/05/2026 14:00")!;
    const utc = localToUTC(local, "America/Sao_Paulo");
    expect(utc.toISOString()).toBe("2026-05-01T17:00:00.000Z");
  });

  it("é identidade quando o fuso é UTC", () => {
    const local = parseBRDateTime("01/05/2026 14:00")!;
    const utc = localToUTC(local, "UTC");
    expect(utc.toISOString()).toBe("2026-05-01T14:00:00.000Z");
  });
});

describe("formatBRDateTimeInTZ", () => {
  it("apresenta um instante UTC no fuso pedido", () => {
    const d = new Date("2026-05-01T17:00:00Z");
    expect(formatBRDateTimeInTZ(d, "America/Sao_Paulo")).toBe(
      "01/05/2026 14:00"
    );
    expect(formatBRDateTimeInTZ(d, "UTC")).toBe("01/05/2026 17:00");
  });
});
