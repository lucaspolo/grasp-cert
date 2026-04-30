"use client";

import { useState } from "react";
import { updateUserRole, deleteUser, updateUser, verifyUserEmail } from "@/app/actions/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  emailVerified: Date | null;
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
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);

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

  async function handleVerifyEmail(userId: string) {
    const result = await verifyUserEmail(userId);
    if ("error" in result) {
      toast.error(String(result.error));
    } else {
      toast.success("E-mail verificado com sucesso.");
    }
  }

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingUser) return;

    const formData = new FormData(e.currentTarget);
    const data = {
      callsign: formData.get("callsign") as string,
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      city: formData.get("city") as string,
      state: formData.get("state") as string,
    };

    const result = await updateUser(editingUser.id, data);
    if ("error" in result) {
      toast.error(String(result.error));
    } else {
      toast.success("Usuário atualizado com sucesso.");
      setEditOpen(false);
      setEditingUser(null);
    }
  }

  return (
    <>
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Indicativo</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead className="hidden md:table-cell">Email</TableHead>
            <TableHead className="hidden lg:table-cell">Cidade/UF</TableHead>
            <TableHead>Cargo</TableHead>
            <TableHead className="hidden md:table-cell">E-mail verificado</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Nenhum usuário cadastrado.
              </TableCell>
            </TableRow>
          )}
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.callsign}</TableCell>
              <TableCell>{user.name}</TableCell>
              <TableCell className="hidden md:table-cell">{user.email}</TableCell>
              <TableCell className="hidden lg:table-cell">
                {user.city}/{user.state}
              </TableCell>
              <TableCell>
                <Select
                  value={user.role}
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
              <TableCell className="hidden md:table-cell">
                {user.emailVerified ? (
                  <Badge variant="default">Verificado</Badge>
                ) : (
                  <Badge variant="outline">Pendente</Badge>
                )}
              </TableCell>
              <TableCell className="text-right space-x-2">
                {!user.emailVerified && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleVerifyEmail(user.id)}
                  >
                    Verificar e-mail
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditingUser(user);
                    setEditOpen(true);
                  }}
                >
                  Editar
                </Button>
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
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
            <DialogDescription>
              Altere os dados cadastrais do usuário.
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-callsign">Indicativo</Label>
                <Input
                  id="edit-callsign"
                  name="callsign"
                  defaultValue={editingUser.callsign}
                  required
                  minLength={3}
                  maxLength={10}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome</Label>
                <Input
                  id="edit-name"
                  name="name"
                  defaultValue={editingUser.name}
                  required
                  minLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">E-mail</Label>
                <Input
                  id="edit-email"
                  name="email"
                  type="email"
                  defaultValue={editingUser.email}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-city">Cidade</Label>
                  <Input
                    id="edit-city"
                    name="city"
                    defaultValue={editingUser.city}
                    required
                    minLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-state">Estado (UF)</Label>
                  <Input
                    id="edit-state"
                    name="state"
                    defaultValue={editingUser.state}
                    required
                    maxLength={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
