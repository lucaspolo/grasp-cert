import { listUsers } from "@/app/actions/user";
import { UserTable } from "@/components/user-table";

export default async function UsersPage() {
  const users = await listUsers();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Usuários</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie os cargos dos usuários do sistema.
        </p>
      </div>
      <UserTable users={users} />
    </div>
  );
}
