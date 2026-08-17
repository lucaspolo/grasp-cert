import { listAdminGroups } from "@/app/actions/group";
import { TemplateForm } from "@/components/template-form";
import { auth } from "@/auth";
import { isPlatformAdmin } from "@/lib/group-access";

export default async function NewTemplatePage() {
  const [session, groups] = await Promise.all([auth(), listAdminGroups()]);
  const allowGlobal = isPlatformAdmin(session?.user?.role);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Novo Template</h1>
      <TemplateForm groups={groups} allowGlobal={allowGlobal} />
    </div>
  );
}
