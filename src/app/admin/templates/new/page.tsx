"use client";

import { useActionState } from "react";
import { createTemplate, type TemplateFormState } from "@/app/actions/template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewTemplatePage() {
  const [state, formAction, pending] = useActionState<TemplateFormState, FormData>(
    createTemplate,
    {}
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Novo Template</h1>
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
        <Button type="submit" disabled={pending}>
          {pending ? "Criando..." : "Criar e Configurar"}
        </Button>
      </form>
    </div>
  );
}
