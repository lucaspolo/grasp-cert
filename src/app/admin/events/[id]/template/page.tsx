import { getEventTemplate } from "@/app/actions/template";
import { TemplateEditor } from "@/components/template-editor";
import type { TemplateConfig } from "@/lib/template-config";
import { notFound } from "next/navigation";

export default async function TemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEventTemplate(id);

  if (!event) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        Template — {event.name}
      </h1>
      <TemplateEditor
        eventId={event.id}
        eventName={event.name}
        initialBgUrl={event.templateBgUrl}
        initialConfig={event.templateConfig as TemplateConfig | null}
      />
    </div>
  );
}
