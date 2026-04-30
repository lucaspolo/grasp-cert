"use client";

import { deleteTemplate } from "@/app/actions/template";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

type TemplateRow = {
  id: string;
  name: string;
  bgMimeType: string | null;
  createdAt: Date;
  _count: { events: number };
};

export function TemplateTable({ templates }: { templates: TemplateRow[] }) {
  return (
    <div className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead className="hidden md:table-cell">Imagem</TableHead>
          <TableHead>Eventos</TableHead>
          <TableHead className="hidden md:table-cell">Criado em</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {templates.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">
              Nenhum template cadastrado.
            </TableCell>
          </TableRow>
        )}
        {templates.map((t) => (
          <TableRow key={t.id}>
            <TableCell className="font-medium">{t.name}</TableCell>
            <TableCell className="hidden md:table-cell">
              {t.bgMimeType ? (
                <Badge variant="secondary">Sim</Badge>
              ) : (
                <Badge variant="outline">Padrão</Badge>
              )}
            </TableCell>
            <TableCell>{t._count.events}</TableCell>
            <TableCell className="hidden md:table-cell">
              {new Date(t.createdAt).toLocaleDateString("pt-BR")}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Link href={`/admin/templates/${t.id}/edit`}>
                  <Button variant="outline" size="sm">
                    Editar
                  </Button>
                </Link>
                <form
                  action={async () => {
                    const result = await deleteTemplate(t.id);
                    if (result.error) {
                      toast.error(result.error);
                    }
                  }}
                >
                  <Button variant="destructive" size="sm" type="submit">
                    Excluir
                  </Button>
                </form>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>
  );
}
