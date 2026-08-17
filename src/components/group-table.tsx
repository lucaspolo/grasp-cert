"use client";

import { deleteGroup } from "@/app/actions/group";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { toast } from "sonner";
import type { GroupListItem } from "@/app/actions/group";

export function GroupTable({
  groups,
  canDelete,
}: {
  groups: GroupListItem[];
  /** Excluir grupo é do Owner — os demais nem veem o botão. */
  canDelete: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead className="hidden md:table-cell">Indicativo</TableHead>
            <TableHead>Membros</TableHead>
            <TableHead>Eventos</TableHead>
            <TableHead className="hidden md:table-cell">Templates</TableHead>
            <TableHead className="hidden lg:table-cell">Seu cargo</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Nenhum grupo por aqui.
              </TableCell>
            </TableRow>
          )}
          {groups.map((group) => (
            <TableRow key={group.id}>
              <TableCell className="font-medium">{group.name}</TableCell>
              <TableCell className="hidden md:table-cell">
                {group.callsign ?? (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </TableCell>
              <TableCell>{group.counts.members}</TableCell>
              <TableCell>{group.counts.events}</TableCell>
              <TableCell className="hidden md:table-cell">
                {group.counts.templates}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {group.myRole === "ADMIN" && <Badge>Admin do grupo</Badge>}
                {group.myRole === "MEMBER" && (
                  <Badge variant="secondary">Membro</Badge>
                )}
                {group.myRole === null && (
                  <span className="text-muted-foreground text-sm">
                    Não é membro
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {group.canAdmin && (
                    <Link href={`/admin/groups/${group.id}`}>
                      <Button variant="outline" size="sm">
                        Gerenciar
                      </Button>
                    </Link>
                  )}
                  {canDelete && (
                    <form
                      action={async () => {
                        const result = await deleteGroup(group.id);
                        if (result.error) toast.error(result.error);
                      }}
                    >
                      <Button variant="destructive" size="sm" type="submit">
                        Excluir
                      </Button>
                    </form>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
