import { describe, expect, it } from "vitest";
import {
  DEFAULT_TEMPLATE_CONFIG,
  mergeTemplateConfig,
} from "./template-config";

describe("mergeTemplateConfig", () => {
  it("usa os defaults quando não há config salva", () => {
    expect(mergeTemplateConfig(null)).toEqual(DEFAULT_TEMPLATE_CONFIG);
    expect(mergeTemplateConfig({})).toEqual(DEFAULT_TEMPLATE_CONFIG);
  });

  it("preenche campos que a config salva não conhece", () => {
    // Template salvo antes do campo `serial` existir.
    const stored = {
      fields: { eventName: { x: 10, y: 20, fontSize: 40, color: "#fff", label: "Evento" } },
    };

    const merged = mergeTemplateConfig(stored);

    expect(merged.fields.eventName.x).toBe(10);
    expect(merged.fields.serial).toEqual(DEFAULT_TEMPLATE_CONFIG.fields.serial);
  });

  it("aceita override parcial de um campo", () => {
    const merged = mergeTemplateConfig({ fields: { serial: { x: 700 } } });

    expect(merged.fields.serial.x).toBe(700);
    expect(merged.fields.serial.fontSize).toBe(
      DEFAULT_TEMPLATE_CONFIG.fields.serial.fontSize
    );
  });

  it("descarta campos desconhecidos", () => {
    const merged = mergeTemplateConfig({
      fields: { inexistente: { x: 1, y: 2, fontSize: 3, color: "#000", label: "?" } },
    });

    expect(merged.fields.inexistente).toBeUndefined();
  });

  it("o rótulo vem sempre do código, não do que está gravado", () => {
    // O label é persistido junto da config; sem isso, um rótulo gravado antes
    // de uma correção venceria os defaults para sempre.
    const merged = mergeTemplateConfig({
      fields: { qsoInfo: { label: "Info do QSO (freq, modo, RST)" } },
    });

    expect(merged.fields.qsoInfo.label).toBe(
      DEFAULT_TEMPLATE_CONFIG.fields.qsoInfo.label
    );
  });

  it("prende x e y dentro do canvas", () => {
    const merged = mergeTemplateConfig({
      fields: { eventName: { x: 5000, y: -20 } },
    });

    expect(merged.fields.eventName.x).toBe(800);
    expect(merged.fields.eventName.y).toBe(0);
  });

  it("arredonda coordenadas fracionárias", () => {
    const merged = mergeTemplateConfig({
      fields: { eventName: { x: 403.174603174603 } },
    });

    expect(merged.fields.eventName.x).toBe(403);
  });

  it("normaliza a cor legada do indicativo", () => {
    // O renderizador pintava #0f172a de marrom; o editor mostrava azul.
    const merged = mergeTemplateConfig({
      fields: { participantCallsign: { color: "#0f172a" } },
    });

    expect(merged.fields.participantCallsign.color).toBe("#92400e");
  });

  it("preserva cor escolhida pelo admin", () => {
    const merged = mergeTemplateConfig({
      fields: { participantCallsign: { color: "#ffffff" } },
    });

    expect(merged.fields.participantCallsign.color).toBe("#ffffff");
  });

  it("preserva align e visible", () => {
    const merged = mergeTemplateConfig({
      fields: { eventName: { align: "right", visible: false } },
    });

    expect(merged.fields.eventName.align).toBe("right");
    expect(merged.fields.eventName.visible).toBe(false);
    expect(merged.fields.serial.align).toBe("left");
  });

  it("não deixa a config salva mutar os defaults", () => {
    const merged = mergeTemplateConfig({ fields: { eventName: { x: 999 } } });
    merged.fields.eventName.y = 1;

    expect(DEFAULT_TEMPLATE_CONFIG.fields.eventName.x).toBe(400);
    expect(DEFAULT_TEMPLATE_CONFIG.fields.eventName.y).toBe(80);
  });
});
