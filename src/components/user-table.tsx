"use client";

import { updateUserRole, deleteUser } from "@/app/actions/user";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type UserRow = {
  id: string;
  callsign: string;
  email: string;
  name: string;
  city: string;
  state: string;
  role: string;
  createdAt: Date;
};

const ROLES = ["OWNER", "ADMIN", "OPERATOR", "USER"] as const;

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  OPERATOR: "Operador",
  USER: "Usuário",
};

const ROLE_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  OWNER: "destructive",
  ADMIN: "default",
  OPERATOR: "secondary",
  USER: "outline",
};

export function UserTable({ users }: { users: UserRow[] }) {
  async function handleRoleChange(userId: string, newRole: string) {
    const result = await updateUserRole(userId, newRole);
    if ("error" in result) {
      toast.error(String(result.error));
    } else {
      toast.success("Cargo atualizado com sucesso.");
    }
  }

  async function handleDelete(userId: string, callsign: string) {
    if (!confirm(`Tem certeza que deseja excluir o usuário ${callsign}?`)) return;

    const result = await deleteUser(userId);
    if ("error" in result) {
      toast.error(String(result.error));
    } else {
      toast.success("Usuário excluído com sucesso.");
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Indicativo</TableHead>
          <TableHead>Nome</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Cidade/UF</TableHead>
          <TableHead>Cargo</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              Nenhum usuário cadastrado.
            </TableCell>
          </TableRow>
        )}
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">{user.callsign}</TableCell>
            <TableCell>{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              {user.city}/{user.state}
            </TableCell>
            <TableCell>
              <Select
                defaultValue={user.role}
                onValueChange={(value) => value && handleRoleChange(user.id, value)}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(user.id, user.callsign)}
              >
                Excluir
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
