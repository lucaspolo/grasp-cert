import { describe, expect, it } from "vitest";
import { alignOffset } from "./certificate-canvas";
import { CERTIFICATE_WIDTH } from "./certificate-dimensions";

/**
 * Cada campo é desenhado numa faixa da largura inteira do certificado, e é a
 * faixa que anda. Ancorar o texto em `left: x` fazia a largura disponível virar
 * `800 - x`, então arrastar para a direita quebrava a linha e para a esquerda
 * transbordava — assimetria que o preview honesto expôs.
 */
describe("alignOffset", () => {
  it("centraliza o texto no x pedido", () => {
    expect(alignOffset("center", CERTIFICATE_WIDTH / 2)).toBe(0);
    expect(alignOffset("center", 300)).toBe(-100);
    expect(alignOffset("center", 500)).toBe(100);
  });

  it("alinha o início do texto no x pedido", () => {
    expect(alignOffset("left", 0)).toBe(0);
    expect(alignOffset("left", 24)).toBe(24);
  });

  it("alinha o fim do texto no x pedido", () => {
    expect(alignOffset("right", CERTIFICATE_WIDTH)).toBe(0);
    expect(alignOffset("right", 600)).toBe(-200);
  });

  it("é simétrico em torno do centro", () => {
    const centro = CERTIFICATE_WIDTH / 2;
    for (const distancia of [50, 150, 250]) {
      expect(alignOffset("center", centro + distancia)).toBe(
        -alignOffset("center", centro - distancia)
      );
    }
  });
});
