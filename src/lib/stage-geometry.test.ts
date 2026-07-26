import { describe, expect, it } from "vitest";
import { CENTER_X, dragToPosition, nudgeToPosition } from "./stage-geometry";

const base = { originX: 100, originY: 100, scale: 1 };

describe("dragToPosition", () => {
  it("soma o deslocamento do ponteiro na posição de origem", () => {
    const pos = dragToPosition({ ...base, deltaScreenX: 40, deltaScreenY: -25 });

    expect(pos).toMatchObject({ x: 140, y: 75 });
  });

  it("divide o deslocamento pela escala do palco", () => {
    // Palco a 50%: arrastar 40px de tela move 80px no certificado.
    const pos = dragToPosition({
      ...base,
      scale: 0.5,
      deltaScreenX: 40,
      deltaScreenY: 0,
    });

    expect(pos.x).toBe(180);
  });

  it("prende o campo dentro do certificado", () => {
    const fora = dragToPosition({
      ...base,
      deltaScreenX: 5000,
      deltaScreenY: 5000,
    });
    expect(fora).toMatchObject({ x: 800, y: 500 });

    const antes = dragToPosition({
      ...base,
      deltaScreenX: -5000,
      deltaScreenY: -5000,
    });
    expect(antes).toMatchObject({ x: 0, y: 0 });
  });

  it("gruda no centro dentro da tolerância", () => {
    const perto = dragToPosition({
      ...base,
      originX: CENTER_X - 20,
      deltaScreenX: 15,
      deltaScreenY: 0,
    });

    expect(perto.x).toBe(CENTER_X);
    expect(perto.snapped).toBe(true);
  });

  it("não gruda fora da tolerância", () => {
    const longe = dragToPosition({
      ...base,
      originX: CENTER_X - 20,
      deltaScreenX: 0,
      deltaScreenY: 0,
    });

    expect(longe.x).toBe(CENTER_X - 20);
    expect(longe.snapped).toBe(false);
  });

  it("arredonda para não gravar coordenada fracionária", () => {
    const pos = dragToPosition({
      ...base,
      scale: 0.37,
      deltaScreenX: 10,
      deltaScreenY: 10,
    });

    expect(Number.isInteger(pos.x)).toBe(true);
    expect(Number.isInteger(pos.y)).toBe(true);
  });

  it("sobrevive a escala zero (palco ainda não medido)", () => {
    const pos = dragToPosition({
      ...base,
      scale: 0,
      deltaScreenX: 10,
      deltaScreenY: 10,
    });

    expect(pos).toMatchObject({ x: 110, y: 110 });
  });
});

describe("nudgeToPosition", () => {
  it("move 1 px por seta e 10 px com Shift", () => {
    expect(nudgeToPosition(100, 100, "ArrowRight", false)?.x).toBe(101);
    expect(nudgeToPosition(100, 100, "ArrowRight", true)?.x).toBe(110);
    expect(nudgeToPosition(100, 100, "ArrowUp", false)?.y).toBe(99);
  });

  it("respeita as bordas do certificado", () => {
    expect(nudgeToPosition(0, 0, "ArrowLeft", true)).toMatchObject({ x: 0 });
    expect(nudgeToPosition(800, 500, "ArrowDown", true)).toMatchObject({
      y: 500,
    });
  });

  it("ignora teclas que não são setas", () => {
    expect(nudgeToPosition(100, 100, "Enter", false)).toBeNull();
  });
});
