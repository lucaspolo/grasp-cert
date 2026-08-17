"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateTimeInput } from "@/components/datetime-input";
import type { EventFormState } from "@/app/actions/event";

type EventData = {
  name: string;
  groupId: string;
  startDate: string;
  endDate: string;
  bandIds: string[];
  modeIds: string[];
  observations: string | null;
  templateId: string | null;
};

type GroupOption = {
  id: string;
  name: string;
};

type TemplateOption = {
  id: string;
  name: string;
  /** Null = template global da plataforma, disponível para qualquer grupo. */
  groupId: string | null;
};

type BandOption = {
  id: string;
  name: string;
  label: string;
};

type ModeOption = {
  id: string;
  name: string;
  label: string;
};

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

export function EventForm({
  action,
  defaultValues,
  groups,
  templates,
  bands,
  modes,
}: {
  action: (
    prevState: EventFormState,
    formData: FormData
  ) => Promise<EventFormState>;
  defaultValues?: EventData;
  /** Grupos que quem está editando pode administrar. */
  groups: GroupOption[];
  templates?: TemplateOption[];
  bands: BandOption[];
  modes: ModeOption[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [groupId, setGroupId] = useState(
    defaultValues?.groupId ?? groups[0]?.id ?? ""
  );

  // Um evento só usa template do próprio grupo ou global — a mesma regra que o
  // servidor reconfere. Trocar de grupo, portanto, muda a lista.
  const availableTemplates = (templates ?? []).filter(
    (t) => t.groupId === null || t.groupId === groupId
  );

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

      <div className="space-y-2">
        <Label htmlFor="groupId">Grupo Organizador</Label>
        <select
          id="groupId"
          name="groupId"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          className={SELECT_CLASS}
          required
        >
          {groups.length === 0 && <option value="">Nenhum grupo disponível</option>}
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        {state.errors?.groupId && (
          <p className="text-sm text-destructive">{state.errors.groupId[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Data de Início <span className="text-xs text-muted-foreground font-normal">(horário local)</span></Label>
          <DateTimeInput
            id="startDate"
            name="startDate"
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
          <Label htmlFor="endDate">Data de Fim <span className="text-xs text-muted-foreground font-normal">(horário local)</span></Label>
          <DateTimeInput
            id="endDate"
            name="endDate"
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
      <input type="hidden" name="timezone" value={Intl.DateTimeFormat().resolvedOptions().timeZone} />

      <div className="space-y-2">
        <Label>Bandas</Label>
        <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
          {bands.map((band) => (
            <label key={band.id} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                name="bandIds"
                value={band.id}
                defaultChecked={defaultValues?.bandIds.includes(band.id)}
                className="rounded"
              />
              {band.label}
            </label>
          ))}
        </div>
        {state.errors?.bandIds && (
          <p className="text-sm text-destructive">{state.errors.bandIds[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Modos</Label>
        <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
          {modes.map((mode) => (
            <label key={mode.id} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                name="modeIds"
                value={mode.id}
                defaultChecked={defaultValues?.modeIds.includes(mode.id)}
                className="rounded"
              />
              {mode.label}
            </label>
          ))}
        </div>
        {state.errors?.modeIds && (
          <p className="text-sm text-destructive">{state.errors.modeIds[0]}</p>
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

      {availableTemplates.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="templateId">Template do Certificado</Label>
          <select
            key={groupId}
            id="templateId"
            name="templateId"
            defaultValue={
              availableTemplates.some((t) => t.id === defaultValues?.templateId)
                ? (defaultValues?.templateId ?? "")
                : ""
            }
            className={SELECT_CLASS}
          >
            <option value="">Padrão (sem template)</option>
            {availableTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.groupId === null ? " (global)" : ""}
              </option>
            ))}
          </select>
          {state.errors?.templateId && (
            <p className="text-sm text-destructive">
              {state.errors.templateId[0]}
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
