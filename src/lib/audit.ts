import "server-only";

import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type AuditActor = {
  id?: string | null;
  callsign?: string | null;
};

export type AuditEntry = {
  /** Ação em notação entidade.verbo, ex.: "user.role_updated" */
  action: string;
  entityType: "user" | "event" | "qso" | "template";
  entityId?: string | null;
  /** Descrição legível do que aconteceu, para exibição na tela de auditoria */
  summary: string;
  details?: Prisma.InputJsonValue;
};

/**
 * Registra uma entrada na trilha de auditoria. Best-effort: uma falha ao
 * gravar o log não pode quebrar a ação administrativa que a originou.
 */
export async function recordAudit(
  actor: AuditActor,
  entry: AuditEntry
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actor.id ?? null,
        actorCallsign: actor.callsign ?? "desconhecido",
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        summary: entry.summary,
        details: entry.details,
      },
    });
  } catch (error) {
    // Engolida de propósito (best-effort), mas reportada: perder trilha de
    // auditoria silenciosamente esconderia um problema real de banco.
    console.error("[audit] Falha ao registrar auditoria:", error);
    Sentry.captureException(error);
  }
}
