"use client";

import { assignOperatorToEvent, removeOperatorFromEvent } from "@/app/actions/user";
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
import { toast } from "sonner";
import { useState } from "react";

type Operator = {
  userId: string;
  callsign: string;
  name: string;
};

type AvailableOperator = {
  id: string;
  callsign: string;
  name: string;
};

interface OperatorAssignmentProps {
  eventId: string;
  assignedOperators: Operator[];
  availableOperators: AvailableOperator[];
}

export function OperatorAssignment({
  eventId,
  assignedOperators,
  availableOperators,
}: OperatorAssignmentProps) {
  const [selectedUserId, setSelectedUserId] = useState("");

  const assignedIds = new Set(assignedOperators.map((o) => o.userId));
  const unassigned = availableOperators.filter((o) => !assignedIds.has(o.id));

  async function handleAssign() {
    if (!selectedUserId) return;
    const result = await assignOperatorToEvent(selectedUserId, eventId);
    if ("error" in result) {
      toast.error(String(result.error));
    } else {
      toast.success("Operador designado com sucesso.");
      setSelectedUserId("");
    }
  }

  async function handleRemove(userId: string) {
    const result = await removeOperatorFromEvent(userId, eventId);
    if ("error" in result) {
      toast.error(String(result.error));
    } else {
      toast.success("Operador removido do evento.");
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Operadores Designados</h2>

      {unassigned.length > 0 ? (
        <div className="flex items-center gap-2 mb-4">
          <Select value={selectedUserId} onValueChange={(v) => setSelectedUserId(v ?? "")}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Selecione um operador..." />
            </SelectTrigger>
            <SelectContent>
              {unassigned.map((op) => (
                <SelectItem key={op.id} value={op.id}>
                  {op.callsign} — {op.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAssign} disabled={!selectedUserId}>
            Designar
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mb-4">
          Nenhum operador disponível. Promova usuários ao cargo de Operador na página de{" "}
          <a href="/admin/users" className="underline hover:text-foreground">Usuários</a>.
        </p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Indicativo</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignedOperators.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                Nenhum operador designado para este evento.
              </TableCell>
            </TableRow>
          )}
          {assignedOperators.map((op) => (
            <TableRow key={op.userId}>
              <TableCell className="font-medium">{op.callsign}</TableCell>
              <TableCell>{op.name}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemove(op.userId)}
                >
                  Remover
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
