"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, requireEventOperator } from "@/lib/auth-utils";
import { recordAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { mapAdifRecord, parseAdif } from "@/lib/adif";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export type ImportSummary = {
  total: number;
  imported: number;
  duplicates: number;
  rejected: { line: number; reason: string }[];
};

export type ImportState = {
  error?: string;
  summary?: ImportSummary;
};

/**
 * Importa QSOs de um arquivo ADIF para um evento. Cada registro é validado
 * contra as bandas/modos do evento; linhas inválidas são reportadas. A
 * deduplicação vem da constraint de unicidade do QSO (#10) via
 * `createMany({ skipDuplicates })`, então re-importar não gera duplicatas.
 */
export async function importQSOs(
  eventId: string,
  _prevState: ImportState,
  formData: FormData
): Promise<ImportState> {
  const session = await requireRole(["OWNER", "ADMIN", "OPERATOR"]);
  if (session.user.role === "OPERATOR") {
    await requireEventOperator(eventId, session.user.id);
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { error: "Nenhum arquivo enviado." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: "Arquivo muito grande. Máximo 5MB." };
  }

  const records = parseAdif(await file.text());
  if (records.length === 0) {
    return { error: "Nenhum QSO encontrado no arquivo ADIF." };
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      eventBands: { include: { band: true } },
      eventModes: { include: { mode: true } },
    },
  });
  if (!event) {
    return { error: "Evento não encontrado." };
  }

  // Bandas/modos permitidos = os do evento, indexados por nome (maiúsculo).
  const bandIdByName = new Map(
    event.eventBands.map((eb) => [eb.band.name.toUpperCase(), eb.bandId])
  );
  const modeIdByName = new Map(
    event.eventModes.map((em) => [em.mode.name.toUpperCase(), em.modeId])
  );

  const rejected: { line: number; reason: string }[] = [];
  const rows: Prisma.QSOCreateManyInput[] = [];

  records.forEach((record, index) => {
    const result = mapAdifRecord(record, bandIdByName, modeIdByName);
    if (!result.ok) {
      rejected.push({ line: index + 1, reason: result.reason });
      return;
    }
    rows.push({
      eventId,
      operatorCallsign: session.user.callsign ?? null,
      ...result.qso,
    });
  });

  let imported = 0;
  if (rows.length > 0) {
    const created = await prisma.qSO.createMany({
      data: rows,
      skipDuplicates: true,
    });
    imported = created.count;
  }
  const duplicates = rows.length - imported;

  await recordAudit(session.user, {
    action: "qso.imported",
    entityType: "event",
    entityId: eventId,
    summary: `Importação ADIF em ${event.name}: ${imported} novo(s), ${duplicates} duplicado(s), ${rejected.length} rejeitado(s)`,
    details: {
      total: records.length,
      imported,
      duplicates,
      rejected: rejected.length,
    },
  });

  revalidatePath(`/admin/events/${eventId}/qsos`);
  return {
    summary: { total: records.length, imported, duplicates, rejected },
  };
}
