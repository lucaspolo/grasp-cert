import { getTemplate, updateTemplateName } from "@/app/actions/template";
import { TemplateEditor } from "@/components/template-editor";
import { TemplateNameForm } from "./template-name-form";
import type { TemplateConfig } from "@/lib/template-config";
import { notFound } from "next/navigation";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await getTemplate(id);

  if (!template) notFound();

  const boundUpdate = updateTemplateName.bind(null, id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Editar Template — {template.name}</h1>

      <TemplateNameForm
        action={boundUpdate}
        defaultName={template.name}
      />

      <TemplateEditor
        templateId={template.id}
        templateName={template.name}
        hasBgImage={!!template.bgMimeType}
        initialConfig={template.config as TemplateConfig | null}
      />
    </div>
  );
}
