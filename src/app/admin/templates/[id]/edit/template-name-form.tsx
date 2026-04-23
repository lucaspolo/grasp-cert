"use client";

import { useActionState } from "react";
import type { TemplateFormState } from "@/app/actions/template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TemplateNameForm({
  action,
  defaultName,
}: {
  action: (
    prevState: TemplateFormState,
    formData: FormData
  ) => Promise<TemplateFormState>;
  defaultName: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nome do Template</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex items-end gap-4">
          <div className="space-y-2 flex-1">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" defaultValue={defaultName} required />
            {state.errors?.name && (
              <p className="text-sm text-destructive">{state.errors.name[0]}</p>
            )}
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Salvar Nome"}
          </Button>
        </form>
        {state.message && (
          <p className="mt-2 text-sm text-muted-foreground">{state.message}</p>
        )}
      </CardContent>
    </Card>
  );
}
