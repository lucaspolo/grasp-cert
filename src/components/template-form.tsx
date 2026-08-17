"use client";

import { useActionState } from "react";
import { createTemplate, type TemplateFormState } from "@/app/actions/template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type GroupOption = { id: string; name: string };

export function TemplateForm({
  groups,
  /** Só quem administra a plataforma pode criar template global. */
  allowGlobal,
}: {
  groups: GroupOption[];
  allowGlobal: boolean;
}) {
  const [state, formAction, pending] = useActionState<TemplateFormState, FormData>(
    createTemplate,
    {}
  );

  return (
    <form action={formAction} className="space-y-4 max-w-md">
      {state.message && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Nome do Template</Label>
        <Input id="name" name="name" required placeholder="Ex: Azul Gradiente 2024" />
        {state.errors?.name && (
          <p className="text-sm text-destructive">{state.errors.name[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="groupId">Grupo Dono</Label>
        <select
          id="groupId"
          name="groupId"
          defaultValue={groups[0]?.id ?? ""}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        >
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
          {allowGlobal && <option value="">Global (todos os grupos)</option>}
        </select>
        <p className="text-xs text-muted-foreground">
          Um template do grupo só pode ser usado pelos eventos dele. O template
          global fica disponível para todos.
        </p>
        {state.errors?.groupId && (
          <p className="text-sm text-destructive">{state.errors.groupId[0]}</p>
        )}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Criando..." : "Criar e Configurar"}
      </Button>
    </form>
  );
}
