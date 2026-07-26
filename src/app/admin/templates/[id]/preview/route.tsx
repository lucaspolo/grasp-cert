import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { renderCertificate } from "@/lib/certificate";
import { sampleCertificateData } from "@/lib/certificate-sample";
import { mergeTemplateConfig } from "@/lib/template-config";
import type { CertificateKind } from "@/lib/certificate-kind";

export const runtime = "nodejs";

/**
 * Escotilha do editor: renderiza o certificado de exemplo pelo caminho REAL
 * (Satori → PNG), com a config em rascunho vinda da querystring. Serve para
 * conferir o resultado final sem precisar salvar.
 *
 * Usa `auth()` em vez de `requireRole`: aquele lança, e exceção em route
 * handler vira 500 e evento no Sentry — as rotas de certificado já fazem assim.
 * O caminho também não leva sufixo .png de propósito, senão escaparia do
 * matcher do proxy que protege /admin.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "OWNER" && role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const template = await prisma.template.findUnique({
    where: { id },
    select: { config: true, bgImage: true, bgMimeType: true },
  });
  if (!template) {
    return new Response("Template não encontrado", { status: 404 });
  }

  const kind: CertificateKind =
    req.nextUrl.searchParams.get("kind") === "operator"
      ? "operator"
      : "participant";

  // Config em rascunho quando o editor a envia; senão, a que está salva.
  const draft = req.nextUrl.searchParams.get("config");
  let config;
  try {
    config = mergeTemplateConfig(draft ? JSON.parse(draft) : template.config);
  } catch {
    return new Response("Configuração inválida", { status: 400 });
  }

  const data = sampleCertificateData(kind, config);
  if (template.bgImage && template.bgMimeType) {
    const b64 = Buffer.from(template.bgImage).toString("base64");
    data.bgDataUri = `data:${template.bgMimeType};base64,${b64}`;
  }

  return renderCertificate(data, {
    // Rascunho muda a cada clique e é específico deste admin.
    headers: { "Cache-Control": "no-store" },
  });
}
