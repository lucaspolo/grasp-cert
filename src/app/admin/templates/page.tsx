import { listTemplates } from "@/app/actions/template";
import { TemplateTable } from "@/components/template-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function TemplatesPage() {
  const templates = await listTemplates();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Templates</h1>
        <Link href="/admin/templates/new">
          <Button>Novo Template</Button>
        </Link>
      </div>
      <TemplateTable templates={templates} />
    </div>
  );
}
