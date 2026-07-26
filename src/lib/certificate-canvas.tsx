import type {
  TemplateConfig,
  TemplateFieldAlign,
} from "@/lib/template-config";
import {
  CERTIFICATE_HEIGHT,
  CERTIFICATE_WIDTH,
} from "@/lib/certificate-dimensions";

/**
 * DESENHO ÚNICO DO CERTIFICADO — renderizado nos dois lados:
 *   • servidor, pelo Satori (`renderCertificate` → PNG/PDF)
 *   • navegador, pelo React DOM (preview do editor de templates)
 *
 * Contrato para não voltarem a divergir:
 *   1. Só `style` inline. O Satori ignora `className` em silêncio — uma classe
 *      Tailwind aparece no editor e some do certificado, sem erro nenhum.
 *   2. Nada de hook, estado, contexto ou import de servidor (fs, prisma,
 *      next/og, qrcode). Imagens chegam prontas por prop.
 *   3. `lineHeight: "normal"` explícito: o preflight do Tailwind aplica 1.5 no
 *      navegador; "normal" é o default do Satori (verificado: byte-idêntico),
 *      então fixá-lo alinha os dois lados sem mexer nos certificados.
 *   4. Campo novo entra em DEFAULT_TEMPLATE_CONFIG e ganha texto em `values`;
 *      o desenho vem por iteração, então aparece nos dois lados de uma vez.
 */

export const CERTIFICATE_FONT_FAMILY = "GraspCertSans";

/** Altura de linha do Satori; fixada para o DOM não herdar a do Tailwind. */
const LINE_HEIGHT = "normal";

/**
 * Deslocamento por âncora. A chave `transform` precisa genuinamente não existir
 * para o alinhamento à esquerda: `transform: "none"` e `transform: undefined`
 * fazem o Satori lançar.
 */
const ALIGN_TRANSFORM: Partial<Record<TemplateFieldAlign, string>> = {
  center: "translateX(-50%)",
  right: "translateX(-100%)",
};

export type CertificateCanvasProps = {
  config: TemplateConfig;
  /** Texto de cada campo, na mesma chave usada em `config.fields`. */
  values: Record<string, string>;
  /** Selo do topo, exibido apenas quando não há imagem de fundo. */
  badge: string;
  verifyUrl: string;
  bgSrc: string | null;
  qrSrc: string | null;
  watermarkSrc: string | null;
  /** Amplia o raster de saída sem mexer no layout (o PDF usa 3×). */
  scale?: number;
};

export function CertificateCanvas({
  config,
  values,
  badge,
  verifyUrl,
  bgSrc,
  qrSrc,
  watermarkSrc,
  scale = 1,
}: CertificateCanvasProps) {
  const hasCustomBg = !!bgSrc;

  return (
    <div
      style={{
        width: CERTIFICATE_WIDTH,
        height: CERTIFICATE_HEIGHT,
        display: "flex",
        position: "relative",
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        // Longhand obrigatório: o Satori não parseia o shorthand `background`
        // com data URI — lança InvalidCharacterError e aborta o stream.
        ...(bgSrc
          ? {
              backgroundImage: `url(${bgSrc})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {
              backgroundImage:
                "linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)",
            }),
        fontFamily: CERTIFICATE_FONT_FAMILY,
        lineHeight: LINE_HEIGHT,
      }}
    >
      {/* Marca d'água — só sem imagem de fundo própria */}
      {!hasCustomBg && watermarkSrc && (
        <img
          src={watermarkSrc}
          alt=""
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 300,
            height: 300,
            objectFit: "contain",
            opacity: 0.15,
          }}
        />
      )}

      {/* Borda decorativa — só sem imagem de fundo própria */}
      {!hasCustomBg && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            right: 12,
            bottom: 12,
            border: "2px solid rgba(146, 64, 14, 0.3)",
            borderRadius: 12,
            display: "flex",
          }}
        />
      )}

      {/* Selo do topo — só sem imagem de fundo própria */}
      {!hasCustomBg && (
        <div
          style={{
            position: "absolute",
            top: 24,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: 14,
              color: "#92400e",
              letterSpacing: 4,
              textTransform: "uppercase",
              lineHeight: LINE_HEIGHT,
            }}
          >
            {badge}
          </span>
        </div>
      )}

      {/* Campos posicionáveis */}
      {Object.entries(config.fields).map(([key, field]) => {
        const text = values[key];
        if (!text || field.visible === false) return null;

        const transform = ALIGN_TRANSFORM[field.align ?? "center"];

        return (
          <span
            key={key}
            data-field={key}
            style={{
              position: "absolute",
              left: field.x,
              top: field.y,
              fontSize: field.fontSize,
              color: field.color,
              lineHeight: LINE_HEIGHT,
              display: "flex",
              ...(transform ? { transform } : {}),
            }}
          >
            {text}
          </span>
        );
      })}

      {/* QR Code — sempre presente, é o mecanismo de verificação */}
      {qrSrc && (
        <img
          src={qrSrc}
          alt=""
          style={{
            position: "absolute",
            bottom: 12,
            right: 12,
            width: 100,
            height: 100,
          }}
        />
      )}

      {/* Rodapé com a URL de verificação — sempre presente */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: hasCustomBg ? "#666" : "#78716c",
            lineHeight: LINE_HEIGHT,
          }}
        >
          {verifyUrl}
        </span>
      </div>
    </div>
  );
}
