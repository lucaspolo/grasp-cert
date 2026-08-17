"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { GroupFormState } from "@/app/actions/group";

type GroupData = {
  name: string;
  callsign: string | null;
  description: string | null;
};

export function GroupForm({
  action,
  defaultValues,
  /** Só na criação: nomeia o primeiro admin do grupo. */
  askForFirstAdmin = false,
}: {
  action: (
    prevState: GroupFormState,
    formData: FormData
  ) => Promise<GroupFormState>;
  defaultValues?: GroupData;
  askForFirstAdmin?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-4 max-w-xl">
      {state.message && (
        <p className="text-sm text-muted-foreground">{state.message}</p>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Nome do Grupo</Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaultValues?.name}
          placeholder="Ex: GRASP — Grupo de Radioamadores"
          required
        />
        {state.errors?.name && (
          <p className="text-sm text-destructive">{state.errors.name[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="callsign">
          Indicativo do Grupo{" "}
          <span className="text-xs text-muted-foreground font-normal">
            (opcional)
          </span>
        </Label>
        <Input
          id="callsign"
          name="callsign"
          defaultValue={defaultValues?.callsign ?? ""}
          placeholder="Ex: PY2AA"
          maxLength={10}
        />
        {state.errors?.callsign && (
          <p className="text-sm text-destructive">{state.errors.callsign[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={defaultValues?.description ?? ""}
          rows={3}
        />
        {state.errors?.description && (
          <p className="text-sm text-destructive">
            {state.errors.description[0]}
          </p>
        )}
      </div>

      {askForFirstAdmin && (
        <div className="space-y-2">
          <Label htmlFor="adminCallsign">
            Indicativo do primeiro admin{" "}
            <span className="text-xs text-muted-foreground font-normal">
              (opcional)
            </span>
          </Label>
          <Input
            id="adminCallsign"
            name="adminCallsign"
            placeholder="Ex: PY2ABC"
            maxLength={10}
          />
          <p className="text-xs text-muted-foreground">
            O admin do grupo cadastra templates, cria eventos e chama membros.
            Sem ninguém aqui, só quem administra a plataforma gerencia o grupo —
            dá para nomear depois na página do grupo.
          </p>
          {state.errors?.adminCallsign && (
            <p className="text-sm text-destructive">
              {state.errors.adminCallsign[0]}
            </p>
          )}
        </div>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
