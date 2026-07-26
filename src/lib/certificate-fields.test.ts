import { describe, expect, it, vi } from "vitest";
import { DEFAULT_TEMPLATE_CONFIG } from "./template-config";
import { sampleCertificateValues } from "./certificate-sample";
import type { CertificateData } from "./certificate";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
const { certificateValues } = await import("./certificate");

const FIELD_KEYS = Object.keys(DEFAULT_TEMPLATE_CONFIG.fields);

const data: CertificateData = {
  kind: "participant",
  eventId: "evt-1",
  callsign: "PY2ABC",
  eventName: "Contest de Teste",
  personName: "João da Silva",
  eventStartStr: "01/01/2026",
  eventEndStr: "02/01/2026",
  modes: ["SSB"],
  bands: ["20 m"],
  qsoCount: 1,
  config: DEFAULT_TEMPLATE_CONFIG,
  bgDataUri: null,
  verifyUrl: "https://exemplo.test/verificar",
  serial: "GC-SVX9-DR0P",
};

/**
 * O campo `serial` já nasceu invisível no editor por não ter texto de exemplo.
 * Estes testes fecham a classe: campo sem texto de um dos lados quebra a build.
 */
describe("cobertura dos campos do certificado", () => {
  it("todo campo do template tem texto no certificado real", () => {
    const values = certificateValues(data);

    for (const key of FIELD_KEYS) {
      expect(values[key], `campo "${key}" sem texto em certificateValues`).toBeTruthy();
    }
  });

  it.each(["participant", "operator"] as const)(
    "todo campo do template tem texto de exemplo no editor (%s)",
    (kind) => {
      const values = sampleCertificateValues(kind);

      for (const key of FIELD_KEYS) {
        expect(
          values[key],
          `campo "${key}" sem amostra em sampleCertificateValues`
        ).toBeTruthy();
      }
    }
  );

  it("o certificado e o editor cobrem exatamente as mesmas chaves", () => {
    expect(Object.keys(certificateValues(data)).sort()).toEqual(
      Object.keys(sampleCertificateValues("participant")).sort()
    );
  });

  it("o papel muda entre participante e operador", () => {
    expect(sampleCertificateValues("participant").qsoDateTime).toContain(
      "Participante"
    );
    expect(sampleCertificateValues("operator").qsoDateTime).toContain(
      "Operador"
    );
    expect(certificateValues({ ...data, kind: "operator" }).qsoDateTime).toContain(
      "Operador"
    );
  });
});
