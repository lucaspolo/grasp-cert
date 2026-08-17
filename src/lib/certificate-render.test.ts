import { describe, expect, it, vi } from "vitest";
import { getDefaultTemplateConfig } from "./template-config";
import type { CertificateData } from "./certificate";

// certificate.tsx importa o cliente Prisma no topo; o render em si não toca no banco.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const { renderCertificate } = await import("./certificate");

/** PNG 4×4 sólido, gerado com sharp e embutido para o teste não depender de I/O. */
const PNG_4X4 =
  "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEElEQVR42mM4IWcDRwzEcQDgQxIhOJFYZQAAAABJRU5ErkJggg==";

function certificateData(
  overrides: Partial<CertificateData> = {}
): CertificateData {
  return {
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
    config: getDefaultTemplateConfig(),
    bgDataUri: null,
    verifyUrl: "https://exemplo.test/verificar-certificado/evt-1/PY2ABC",
    serial: "HC-1JCY-2SSM",
    ...overrides,
  };
}

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

/**
 * O corpo do ImageResponse é um stream preguiçoso: construir NUNCA lança, o erro
 * só aparece ao consumir. Todo teste aqui precisa ler o arrayBuffer — sem isso
 * um certificado quebrado passa como verde.
 */
async function renderToBytes(data: CertificateData): Promise<Uint8Array> {
  const response = await renderCertificate(data);
  return new Uint8Array(await response.arrayBuffer());
}

describe("renderCertificate", () => {
  it("renderiza com o fundo padrão", async () => {
    const bytes = await renderToBytes(certificateData());

    expect(Array.from(bytes.slice(0, 4))).toEqual(PNG_MAGIC);
  });

  it("renderiza com imagem de fundo do template", async () => {
    // Regressão: o shorthand `background: url(<data uri>) center/cover` fazia o
    // Satori lançar InvalidCharacterError e abortar o stream — todo certificado
    // de template com arte própria saía quebrado.
    const bytes = await renderToBytes(
      certificateData({ bgDataUri: `data:image/png;base64,${PNG_4X4}` })
    );

    expect(Array.from(bytes.slice(0, 4))).toEqual(PNG_MAGIC);
  });

  it("renderiza o certificado de operador com imagem de fundo", async () => {
    const bytes = await renderToBytes(
      certificateData({
        kind: "operator",
        bgDataUri: `data:image/png;base64,${PNG_4X4}`,
      })
    );

    expect(Array.from(bytes.slice(0, 4))).toEqual(PNG_MAGIC);
  });

  it("renderiza em escala 3× para o PDF", async () => {
    const response = await renderCertificate(certificateData(), { scale: 3 });
    const bytes = new Uint8Array(await response.arrayBuffer());

    // Dimensões no cabeçalho IHDR do PNG (big-endian, offsets 16 e 20).
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    expect(view.getUint32(16)).toBe(2400);
    expect(view.getUint32(20)).toBe(1500);
  });
});
