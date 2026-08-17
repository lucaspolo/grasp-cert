import { getGroup, listGroupMembers, updateGroup } from "@/app/actions/group";
import { GroupForm } from "@/components/group-form";
import { GroupMembers } from "@/components/group-members";
import { Button } from "@/components/ui/button";
import { pageRead } from "@/lib/group-access";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function EditGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Grupo que a sessão não administra dá 404, não erro.
  const [group, members] = await pageRead(() =>
    Promise.all([getGroup(id), listGroupMembers(id)])
  );

  if (!group) notFound();

  const boundUpdate = updateGroup.bind(null, id);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <p className="text-sm text-muted-foreground">
            {group._count.events} evento(s) · {group._count.templates}{" "}
            template(s)
          </p>
        </div>
        <Link href="/admin/groups">
          <Button variant="outline">Voltar</Button>
        </Link>
      </div>

      <GroupForm
        action={boundUpdate}
        defaultValues={{
          name: group.name,
          callsign: group.callsign,
          description: group.description,
        }}
      />

      <div className="mt-10">
        <GroupMembers groupId={id} members={members} />
      </div>
    </div>
  );
}
