"use client";

import { useActionState } from "react";
import { createQSO, type QSOFormState } from "@/app/actions/qso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function QSOForm({
  eventId,
  eventModes,
  eventBands,
}: {
  eventId: string;
  eventModes: string[];
  eventBands: string[];
}) {
  const boundCreate = createQSO.bind(null, eventId);
  const [state, formAction, pending] = useActionState<QSOFormState, FormData>(
    boundCreate,
    {}
  );

  return (
    <form action={formAction} className="space-y-4 rounded-lg border p-4">
      <h3 className="font-semibold">Adicionar QSO</h3>

      {state.message && (
        <p className="text-sm text-green-600 dark:text-green-400">
          {state.message}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="participantCallsign">Indicativo</Label>
          <Input
            id="participantCallsign"
            name="participantCallsign"
            placeholder="PY2ABC"
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
          <Input
            id="dateTime"
            name="dateTime"
            type="text"
            placeholder="DD/MM/AAAA HH:mm"
            required
          />
          {state.errors?.dateTime && (
            <p className="text-xs text-destructive">
              {state.errors.dateTime[0]}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="frequency">Frequência</Label>
          <Input
            id="frequency"
            name="frequency"
            placeholder="14.250"
            list="freq-hints"
            required
          />
          <datalist id="freq-hints">
            {eventBands.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
          {state.errors?.frequency && (
            <p className="text-xs text-destructive">
              {state.errors.frequency[0]}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="mode">Modalidade</Label>
          <Input
            id="mode"
            name="mode"
            placeholder="SSB"
            list="mode-hints"
            required
          />
          <datalist id="mode-hints">
            {eventModes.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          {state.errors?.mode && (
            <p className="text-xs text-destructive">{state.errors.mode[0]}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="rstSent">RST Enviado</Label>
          <Input
            id="rstSent"
            name="rstSent"
            placeholder="59"
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
        <Textarea id="observations" name="observations" rows={2} />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Adicionar QSO"}
      </Button>
    </form>
  );
}
