"use client";

import { useActionState } from "react";
import { createQSO, type QSOFormState } from "@/app/actions/qso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateTimeInput } from "@/components/datetime-input";
import { cn } from "@/lib/utils";

type BandOption = { id: string; name: string; label: string };
type ModeOption = { id: string; name: string; label: string };

export type QSOFormValues = {
  participantCallsign: string;
  /** "DD/MM/AAAA HH:mm" em UTC. */
  dateTime: string;
  bandId: string;
  modeId: string;
  rstSent: string;
  rstReceived: string;
  observations: string;
};

type QSOFormAction = (
  prevState: QSOFormState,
  formData: FormData
) => Promise<QSOFormState>;

export function QSOForm({
  eventId,
  eventBands,
  eventModes,
  action,
  defaultValues,
  title = "Adicionar QSO",
  submitLabel = "Adicionar QSO",
  className,
}: {
  eventId: string;
  eventBands: BandOption[];
  eventModes: ModeOption[];
  /** Por padrão cria um QSO; a edição injeta `updateQSO` já com os ids. */
  action?: QSOFormAction;
  defaultValues?: QSOFormValues;
  title?: string;
  submitLabel?: string;
  className?: string;
}) {
  const boundAction = action ?? createQSO.bind(null, eventId);
  const [state, formAction, pending] = useActionState<QSOFormState, FormData>(
    boundAction,
    {}
  );

  return (
    <form
      action={formAction}
      className={cn("space-y-4 rounded-lg border p-4", className)}
    >
      {title && <h3 className="font-semibold">{title}</h3>}

      {state.message && (
        <p className="text-sm text-green-600 dark:text-green-400">
          {state.message}
        </p>
      )}

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="participantCallsign">Indicativo</Label>
          <Input
            id="participantCallsign"
            name="participantCallsign"
            placeholder="PY2ABC"
            defaultValue={defaultValues?.participantCallsign}
            required
          />
          {state.errors?.participantCallsign && (
            <p className="text-xs text-destructive">
              {state.errors.participantCallsign[0]}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="dateTime">Data/Hora (UTC)</Label>
          <DateTimeInput
            id="dateTime"
            name="dateTime"
            defaultValue={defaultValues?.dateTime}
            required
          />
          {state.errors?.dateTime && (
            <p className="text-xs text-destructive">
              {state.errors.dateTime[0]}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="bandId">Banda</Label>
          <select
            id="bandId"
            name="bandId"
            defaultValue={defaultValues?.bandId ?? ""}
            required
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
          >
            <option value="">Selecione...</option>
            {eventBands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
          {state.errors?.bandId && (
            <p className="text-xs text-destructive">
              {state.errors.bandId[0]}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="modeId">Modo</Label>
          <select
            id="modeId"
            name="modeId"
            defaultValue={defaultValues?.modeId ?? ""}
            required
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
          >
            <option value="">Selecione...</option>
            {eventModes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          {state.errors?.modeId && (
            <p className="text-xs text-destructive">{state.errors.modeId[0]}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="rstSent">RST Enviado</Label>
          <Input
            id="rstSent"
            name="rstSent"
            placeholder="59"
            defaultValue={defaultValues?.rstSent}
            required
          />
          {state.errors?.rstSent && (
            <p className="text-xs text-destructive">
              {state.errors.rstSent[0]}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="rstReceived">RST Recebido</Label>
          <Input
            id="rstReceived"
            name="rstReceived"
            placeholder="59"
            defaultValue={defaultValues?.rstReceived}
            required
          />
          {state.errors?.rstReceived && (
            <p className="text-xs text-destructive">
              {state.errors.rstReceived[0]}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="observations">Observações</Label>
        <Textarea
          id="observations"
          name="observations"
          rows={2}
          defaultValue={defaultValues?.observations}
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : submitLabel}
      </Button>
    </form>
  );
}
