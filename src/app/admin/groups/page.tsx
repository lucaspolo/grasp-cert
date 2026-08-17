import { listGroups } from "@/app/actions/group";
import { GroupTable } from "@/components/group-table";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { isPlatformAdmin } from "@/lib/group-access";
import Link from "next/link";

export default async function GroupsPage() {
  const [session, groups] = await Promise.all([auth(), listGroups()]);

  const platformAdmin = isPlatformAdmin(session?.user?.role);
  const isOwner = session?.user?.role === "OWNER";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Grupos</h1>
          <p className="text-sm text-muted-foreground">
            Cada grupo tem seus admins, seus templates e seus eventos.
          </p>
        </div>
        {platformAdmin && (
          <Link href="/admin/groups/new">
            <Button>Novo Grupo</Button>
          </Link>
        )}
      </div>
      <GroupTable groups={groups} canDelete={isOwner} />
    </div>
  );
}
