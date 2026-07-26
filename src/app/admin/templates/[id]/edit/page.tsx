import { getTemplate, updateTemplateName } from "@/app/actions/template";
import { TemplateEditor } from "@/components/template-editor";
import { TemplateNameForm } from "./template-name-form";
import { mergeTemplateConfig } from "@/lib/template-config";
import { SAMPLE_VERIFY_URL } from "@/lib/certificate-sample";
import { notFound } from "next/navigation";
import QRCode from "qrcode";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await getTemplate(id);

  if (!template) notFound();

  const boundUpdate = updateTemplateName.bind(null, id);

  // QR de exemplo gerado aqui: manter o `qrcode` fora do bundle do cliente.
  const qrSvg = await QRCode.toString(SAMPLE_VERIFY_URL, {
    type: "svg",
    width: 100,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Editar Template — {template.name}</h1>

      <TemplateNameForm
        action={boundUpdate}
        defaultName={template.name}
      />

      {/* merge: templates salvos antes de um campo novo existir precisam
          recebê-lo com os defaults, senão ele nunca aparece no editor */}
      <TemplateEditor
        templateId={template.id}
        hasBgImage={!!template.bgMimeType}
        initialConfig={mergeTemplateConfig(template.config)}
        qrSrc={`data:image/svg+xml,${encodeURIComponent(qrSvg)}`}
      />
    </div>
  );
}
