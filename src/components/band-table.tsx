"use client";

import { deleteBand, createBand, updateBand } from "@/app/actions/band";
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

type BandRow = {
  id: string;
  name: string;
  label: string;
  sortOrder: number;
};

export function BandTable({ bands }: { bands: BandRow[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <form
        action={async (formData) => {
          const result = await createBand(formData);
          if (result.error) {
            toast.error(result.error);
          } else {
            toast.success("Banda criada com sucesso.");
          }
        }}
        className="flex gap-2 items-end"
      >
        <div>
          <label className="text-sm font-medium">Nome</label>
          <Input name="name" placeholder="Ex: 40m" required className="w-32" />
        </div>
        <div>
          <label className="text-sm font-medium">Rótulo</label>
          <Input name="label" placeholder="Ex: 40 m" required className="w-32" />
        </div>
        <div>
          <label className="text-sm font-medium">Ordem</label>
          <Input name="sortOrder" type="number" defaultValue={bands.length} className="w-20" />
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
          {bands.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Nenhuma banda cadastrada.
              </TableCell>
            </TableRow>
          )}
          {bands.map((band) => (
            <TableRow key={band.id}>
              {editingId === band.id ? (
                <EditRow band={band} onCancel={() => setEditingId(null)} />
              ) : (
                <>
                  <TableCell className="font-medium">{band.name}</TableCell>
                  <TableCell>{band.label}</TableCell>
                  <TableCell>{band.sortOrder}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingId(band.id)}
                      >
                        Editar
                      </Button>
                      <form
                        action={async () => {
                          const result = await deleteBand(band.id);
                          if (result.error) {
                            toast.error(result.error);
                          } else {
                            toast.success("Banda excluída.");
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

function EditRow({ band, onCancel }: { band: BandRow; onCancel: () => void }) {
  return (
    <>
      <TableCell colSpan={4}>
        <form
          action={async (formData) => {
            const result = await updateBand(band.id, formData);
            if (result.error) {
              toast.error(result.error);
            } else {
              toast.success("Banda atualizada.");
              onCancel();
            }
          }}
          className="flex gap-2 items-center"
        >
          <Input name="name" defaultValue={band.name} className="w-32" required />
          <Input name="label" defaultValue={band.label} className="w-32" required />
          <Input name="sortOrder" type="number" defaultValue={band.sortOrder} className="w-20" />
          <Button type="submit" size="sm">Salvar</Button>
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        </form>
      </TableCell>
    </>
  );
}
