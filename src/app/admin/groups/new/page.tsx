import { createGroup } from "@/app/actions/group";
import { GroupForm } from "@/components/group-form";

export default function NewGroupPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Novo Grupo</h1>
      <GroupForm action={createGroup} askForFirstAdmin />
    </div>
  );
}
