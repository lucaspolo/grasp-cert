"use client";

import { useState } from "react";
import {
  addGroupMember,
  removeGroupMember,
  updateGroupMemberRole,
} from "@/app/actions/group";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";

export type GroupMemberRow = {
  role: "ADMIN" | "MEMBER";
  user: { id: string; callsign: string; name: string };
};

const ROLE_LABELS: Record<GroupMemberRow["role"], string> = {
  ADMIN: "Admin do grupo",
  MEMBER: "Membro",
};

export function GroupMembers({
  groupId,
  members,
}: {
  groupId: string;
  members: GroupMemberRow[];
}) {
  const [callsign, setCallsign] = useState("");
  const [role, setRole] = useState<GroupMemberRow["role"]>("MEMBER");
  const [pending, setPending] = useState(false);

  async function handleAdd() {
    if (!callsign.trim()) return;
    setPending(true);
    try {
      const result = await addGroupMember(groupId, callsign, role);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${callsign.toUpperCase()} entrou no grupo.`);
        setCallsign("");
        setRole("MEMBER");
      }
    } finally {
      setPending(false);
    }
  }

  async function handleRoleChange(
    userId: string,
    nextRole: GroupMemberRow["role"]
  ) {
    const result = await updateGroupMemberRole(groupId, userId, nextRole);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Cargo atualizado.");
    }
  }

  async function handleRemove(userId: string, memberCallsign: string) {
    const result = await removeGroupMember(groupId, userId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`${memberCallsign} saiu do grupo.`);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Membros</h2>
      <p className="text-sm text-muted-foreground mb-4">
        O membro é adicionado pelo indicativo — ele precisa já ter conta no
        sistema. Admins do grupo cadastram templates, criam eventos e chamam
        outros membros.
      </p>

      <div className="flex flex-wrap items-end gap-2 mb-6">
        <div className="space-y-2">
          <Label htmlFor="memberCallsign">Indicativo</Label>
          <Input
            id="memberCallsign"
            value={callsign}
            onChange={(e) => setCallsign(e.target.value.toUpperCase())}
            placeholder="PY2ABC"
            maxLength={10}
            className="w-[160px]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="memberRole">Cargo no grupo</Label>
          <Select
            value={role}
            onValueChange={(v) => setRole((v as GroupMemberRow["role"]) ?? "MEMBER")}
          >
            <SelectTrigger id="memberRole" className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MEMBER">Membro</SelectItem>
              <SelectItem value="ADMIN">Admin do grupo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleAdd} disabled={pending || !callsign.trim()}>
          {pending ? "Adicionando..." : "Adicionar"}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Indicativo</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Nenhum membro ainda.
                </TableCell>
              </TableRow>
            )}
            {members.map((member) => (
              <TableRow key={member.user.id}>
                <TableCell className="font-medium">
                  {member.user.callsign}
                </TableCell>
                <TableCell>{member.user.name}</TableCell>
                <TableCell>
                  <Badge variant={member.role === "ADMIN" ? "default" : "secondary"}>
                    {ROLE_LABELS[member.role]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleRoleChange(
                          member.user.id,
                          member.role === "ADMIN" ? "MEMBER" : "ADMIN"
                        )
                      }
                    >
                      {member.role === "ADMIN" ? "Rebaixar" : "Promover a admin"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        handleRemove(member.user.id, member.user.callsign)
                      }
                    >
                      Remover
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
