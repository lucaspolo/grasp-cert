"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EventFormState } from "@/app/actions/event";

type EventData = {
  name: string;
  startDate: string;
  endDate: string;
  modes: string[];
  bands: string[];
  observations: string | null;
  templateId: string | null;
};

type TemplateOption = {
  id: string;
  name: string;
};

export function EventForm({
  action,
  defaultValues,
  templates,
}: {
  action: (
    prevState: EventFormState,
    formData: FormData
  ) => Promise<EventFormState>;
  defaultValues?: EventData;
  templates?: TemplateOption[];
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-4 max-w-xl">
      {state.message && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Nome do Evento</Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaultValues?.name}
          required
        />
        {state.errors?.name && (
          <p className="text-sm text-destructive">{state.errors.name[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Data de Início</Label>
          <Input
            id="startDate"
            name="startDate"
            type="datetime-local"
            defaultValue={defaultValues?.startDate}
            required
          />
          {state.errors?.startDate && (
            <p className="text-sm text-destructive">
              {state.errors.startDate[0]}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">Data de Fim</Label>
          <Input
            id="endDate"
            name="endDate"
            type="datetime-local"
            defaultValue={defaultValues?.endDate}
            required
          />
          {state.errors?.endDate && (
            <p className="text-sm text-destructive">
              {state.errors.endDate[0]}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="modes">Modalidades (separadas por vírgula)</Label>
        <Input
          id="modes"
          name="modes"
          placeholder="SSB, CW, FT8"
          defaultValue={defaultValues?.modes.join(", ")}
          required
        />
        {state.errors?.modes && (
          <p className="text-sm text-destructive">{state.errors.modes[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="bands">Faixas (separadas por vírgula)</Label>
        <Input
          id="bands"
          name="bands"
          placeholder="10m, 40m, 80m"
          defaultValue={defaultValues?.bands.join(", ")}
          required
        />
        {state.errors?.bands && (
          <p className="text-sm text-destructive">{state.errors.bands[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="observations">Observações</Label>
        <Textarea
          id="observations"
          name="observations"
          defaultValue={defaultValues?.observations ?? ""}
          rows={3}
        />
      </div>

      {templates && templates.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="templateId">Template do Certificado</Label>
          <select
            id="templateId"
            name="templateId"
            defaultValue={defaultValues?.templateId ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          >
            <option value="">Padrão (sem template)</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
