"use client";

import { useActionState } from "react";
import { importQSOs, type ImportState } from "@/app/actions/qso-import";
import { Button } from "@/components/ui/button";

export function QSOImport({ eventId }: { eventId: string }) {
  const boundImport = importQSOs.bind(null, eventId);
  const [state, formAction, pending] = useActionState<ImportState, FormData>(
    boundImport,
    {}
  );

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div>
        <h3 className="font-semibold">Importar ADIF</h3>
        <p className="text-sm text-muted-foreground">
          Envie um arquivo .adi exportado do seu logger (WSJT-X, N1MM, etc.).
          Contatos repetidos são ignorados automaticamente.
        </p>
      </div>

      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          name="file"
          accept=".adi,.adif,text/plain"
          required
          className="text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-transparent file:px-3 file:py-1 file:text-sm"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Importando..." : "Importar"}
        </Button>
      </form>

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      {state.summary && (
        <div className="space-y-2 rounded-md bg-muted p-3 text-sm">
          <p>
            <span className="font-medium text-green-600 dark:text-green-400">
              {state.summary.imported} importado(s)
            </span>
            {" · "}
            {state.summary.duplicates} duplicado(s) ignorado(s)
            {" · "}
            {state.summary.rejected.length} rejeitado(s)
            {" · "}
            {state.summary.total} no arquivo
          </p>

          {state.summary.rejected.length > 0 && (
            <details>
              <summary className="cursor-pointer text-muted-foreground">
                Ver linhas rejeitadas
              </summary>
              <ul className="mt-2 space-y-1">
                {state.summary.rejected.map((r) => (
                  <li key={r.line} className="text-destructive">
                    Linha {r.line}: {r.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
