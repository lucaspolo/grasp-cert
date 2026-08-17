import { describe, expect, it } from "vitest";
import { certificateSerial } from "./certificate-serial";

describe("certificateSerial", () => {
  it("é estável para o mesmo evento + indicativo", () => {
    const a = certificateSerial("participant", "evt-1", "PY2ABC");
    const b = certificateSerial("participant", "evt-1", "PY2ABC");

    expect(a).toBe(b);
  });

  it("ignora caixa e espaços no indicativo", () => {
    expect(certificateSerial("participant", "evt-1", " py2abc ")).toBe(
      certificateSerial("participant", "evt-1", "PY2ABC")
    );
  });

  it("difere por evento, por indicativo e por tipo de certificado", () => {
    const base = certificateSerial("participant", "evt-1", "PY2ABC");

    expect(certificateSerial("participant", "evt-2", "PY2ABC")).not.toBe(base);
    expect(certificateSerial("participant", "evt-1", "PY2DEF")).not.toBe(base);
    expect(certificateSerial("operator", "evt-1", "PY2ABC")).not.toBe(base);
  });

  it("usa o formato HC-XXXX-XXXX sem caracteres ambíguos", () => {
    const serial = certificateSerial("participant", "evt-1", "PY2ABC");

    expect(serial).toMatch(/^HC-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
    expect(serial.slice(3)).not.toMatch(/[ILOU]/);
  });

  it("mantém os números já emitidos (regressão do salt)", () => {
    // Mudar o salt ou o algoritmo renumeraria certificados já entregues.
    expect(certificateSerial("participant", "evt-1", "PY2ABC")).toBe(
      certificateSerial("participant", "evt-1", "PY2ABC")
    );
    expect(certificateSerial("participant", "evt-smoke", "PY2ABC")).toBe(
      "HC-1JCY-2SSM"
    );
  });
});
