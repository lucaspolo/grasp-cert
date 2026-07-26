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

  it("não deixa a config salva mutar os defaults", () => {
    const merged = mergeTemplateConfig({ fields: { eventName: { x: 999 } } });
    merged.fields.eventName.y = 1;

    expect(DEFAULT_TEMPLATE_CONFIG.fields.eventName.x).toBe(400);
    expect(DEFAULT_TEMPLATE_CONFIG.fields.eventName.y).toBe(80);
  });
});
