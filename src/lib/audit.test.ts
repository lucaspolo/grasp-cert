import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { auditLog: { create: vi.fn() } },
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { captureException } from "@sentry/nextjs";
import { recordAudit } from "./audit";

const createMock = prisma.auditLog.create as unknown as Mock;

describe("recordAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("grava a entrada com autor e ação", async () => {
    await recordAudit(
      { id: "user-1", callsign: "PY2ADM" },
      {
        action: "user.role_updated",
        entityType: "user",
        entityId: "user-2",
        summary: "Cargo de PY2XYZ alterado de USER para ADMIN",
        details: { from: "USER", to: "ADMIN" },
      }
    );

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith({
      data: {
        actorId: "user-1",
        actorCallsign: "PY2ADM",
        action: "user.role_updated",
        entityType: "user",
        entityId: "user-2",
        summary: "Cargo de PY2XYZ alterado de USER para ADMIN",
        details: { from: "USER", to: "ADMIN" },
      },
    });
  });

  it("usa valores padrão quando o autor está incompleto", async () => {
    await recordAudit(
      {},
      { action: "event.deleted", entityType: "event", summary: "Evento X excluído" }
    );

    const arg = createMock.mock.calls[0][0];
    expect(arg.data.actorId).toBeNull();
    expect(arg.data.actorCallsign).toBe("desconhecido");
    expect(arg.data.entityId).toBeNull();
  });

  it("não propaga falha do banco (best-effort)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    createMock.mockRejectedValueOnce(new Error("db offline"));

    await expect(
      recordAudit(
        { id: "u", callsign: "PY2ADM" },
        { action: "user.deleted", entityType: "user", summary: "x" }
      )
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
    // Engolida, mas reportada ao Sentry.
    expect(captureException).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });
});
