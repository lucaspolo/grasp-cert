"use client";

import { deleteMode, createMode, updateMode } from "@/app/actions/mode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type ModeRow = {
  id: string;
  name: string;
  label: string;
  sortOrder: number;
};

export function ModeTable({ modes }: { modes: ModeRow[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <form
        action={async (formData) => {
          const result = await createMode(formData);
          if (result.error) {
            toast.error(result.error);
          } else {
            toast.success("Modo criado com sucesso.");
          }
        }}
        className="flex gap-2 items-end"
      >
        <div>
          <label className="text-sm font-medium">Nome</label>
          <Input name="name" placeholder="Ex: FT8" required className="w-32" />
        </div>
        <div>
          <label className="text-sm font-medium">Rótulo</label>
          <Input name="label" placeholder="Ex: FT8" required className="w-32" />
        </div>
        <div>
          <label className="text-sm font-medium">Ordem</label>
          <Input name="sortOrder" type="number" defaultValue={modes.length} className="w-20" />
        </div>
        <Button type="submit" size="sm">Adicionar</Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Rótulo</TableHead>
            <TableHead>Ordem</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {modes.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Nenhum modo cadastrado.
              </TableCell>
            </TableRow>
          )}
          {modes.map((mode) => (
            <TableRow key={mode.id}>
              {editingId === mode.id ? (
                <EditRow mode={mode} onCancel={() => setEditingId(null)} />
              ) : (
                <>
                  <TableCell className="font-medium">{mode.name}</TableCell>
                  <TableCell>{mode.label}</TableCell>
                  <TableCell>{mode.sortOrder}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingId(mode.id)}
                      >
                        Editar
                      </Button>
                      <form
                        action={async () => {
                          const result = await deleteMode(mode.id);
                          if (result.error) {
                            toast.error(result.error);
                          } else {
                            toast.success("Modo excluído.");
                          }
                        }}
                      >
                        <Button variant="destructive" size="sm" type="submit">
                          Excluir
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function EditRow({ mode, onCancel }: { mode: ModeRow; onCancel: () => void }) {
  return (
    <>
      <TableCell colSpan={4}>
        <form
          action={async (formData) => {
            const result = await updateMode(mode.id, formData);
            if (result.error) {
              toast.error(result.error);
            } else {
              toast.success("Modo atualizado.");
              onCancel();
            }
          }}
          className="flex gap-2 items-center"
        >
          <Input name="name" defaultValue={mode.name} className="w-32" required />
          <Input name="label" defaultValue={mode.label} className="w-32" required />
          <Input name="sortOrder" type="number" defaultValue={mode.sortOrder} className="w-20" />
          <Button type="submit" size="sm">Salvar</Button>
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        </form>
      </TableCell>
    </>
  );
}
