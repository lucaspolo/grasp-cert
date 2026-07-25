import { describe, expect, it } from "vitest";

import {
  clampTimePart,
  composeMaskedDateTime,
  padTimePart,
  splitMaskedDateTime,
} from "./time-parts";

describe("clampTimePart", () => {
  it("mantém no máximo 2 dígitos — impede '20' virar '020'", () => {
    expect(clampTimePart("020", 23)).toBe("02");
    expect(clampTimePart("200", 23)).toBe("20");
  });

  it("preserva zero à esquerda e dígito único durante a digitação", () => {
    expect(clampTimePart("0", 23)).toBe("0");
    expect(clampTimePart("02", 23)).toBe("02");
    expect(clampTimePart("2", 23)).toBe("2");
    expect(clampTimePart("20", 23)).toBe("20");
  });

  it("limita hora a 23 e minuto a 59", () => {
    expect(clampTimePart("25", 23)).toBe("23");
    expect(clampTimePart("99", 23)).toBe("23");
    expect(clampTimePart("60", 59)).toBe("59");
    expect(clampTimePart("59", 59)).toBe("59");
  });

  it("descarta não-dígitos e aceita vazio", () => {
    expect(clampTimePart("", 23)).toBe("");
    expect(clampTimePart("a1", 23)).toBe("1");
    expect(clampTimePart("1h", 23)).toBe("1");
  });
});

describe("padTimePart", () => {
  it("normaliza para 2 dígitos, vazio vira 00", () => {
    expect(padTimePart("")).toBe("00");
    expect(padTimePart("2")).toBe("02");
    expect(padTimePart("20")).toBe("20");
  });
});

describe("splitMaskedDateTime", () => {
  it("extrai data e hora de um valor completo", () => {
    expect(splitMaskedDateTime("25/07/2026 20:30")).toEqual({
      dateStr: "25/07/2026",
      hh: "20",
      mm: "30",
    });
  });

  it("data sem hora completa → hora padrão 00:00", () => {
    expect(splitMaskedDateTime("25/07/2026 __:__")).toEqual({
      dateStr: "25/07/2026",
      hh: "00",
      mm: "00",
    });
  });

  it("sem data → dateStr vazio", () => {
    expect(splitMaskedDateTime("__/__/____ 20:30")).toEqual({
      dateStr: "",
      hh: "20",
      mm: "30",
    });
    expect(splitMaskedDateTime("")).toEqual({ dateStr: "", hh: "00", mm: "00" });
  });
});

describe("composeMaskedDateTime", () => {
  it("compõe no formato DD/MM/YYYY HH:mm que o server espera", () => {
    expect(composeMaskedDateTime("25/07/2026", "20", "0")).toBe(
      "25/07/2026 20:00"
    );
    expect(composeMaskedDateTime("25/07/2026", "9", "5")).toBe(
      "25/07/2026 09:05"
    );
  });

  it("round-trip: split → compose reproduz o valor", () => {
    const parts = splitMaskedDateTime("25/07/2026 20:30");
    expect(composeMaskedDateTime(parts.dateStr, parts.hh, parts.mm)).toBe(
      "25/07/2026 20:30"
    );
  });
});
