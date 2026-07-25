import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { Prisma } from "@prisma/client";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    eventBand: { findUnique: vi.fn() },
    eventMode: { findUnique: vi.fn() },
    qSO: { create: vi.fn() },
    eventOperator: { findUnique: vi.fn() },
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createQSO } from "./qso";

const authMock = auth as unknown as Mock;
const eventBandMock = prisma.eventBand.findUnique as unknown as Mock;
const eventModeMock = prisma.eventMode.findUnique as unknown as Mock;
const createMock = prisma.qSO.create as unknown as Mock;

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

const validQso = {
  participantCallsign: "PY2ABC",
  dateTime: "25/07/2026 14:30",
  bandId: "band-40m",
  modeId: "mode-ssb",
  rstSent: "59",
  rstReceived: "59",
  frequency: "",
  observations: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({
    user: { id: "u1", role: "ADMIN", callsign: "PY2ADM" },
  });
  eventBandMock.mockResolvedValue({ eventId: "evt-1", bandId: "band-40m" });
  eventModeMock.mockResolvedValue({ eventId: "evt-1", modeId: "mode-ssb" });
});

describe("createQSO — constraint de unicidade", () => {
  it("QSO duplicado (P2002) retorna erro amigável, sem stack trace", async () => {
    createMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "7.7.0",
      })
    );

    const result = await createQSO("evt-1", {}, form(validQso));

    expect(result.errors?.participantCallsign?.[0]).toContain("QSO duplicado");
    expect(result.message).toBeUndefined();
  });

  it("QSO novo é criado normalmente", async () => {
    createMock.mockResolvedValue({ id: "qso-1" });

    const result = await createQSO("evt-1", {}, form(validQso));

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(result.message).toContain("adicionado");
  });

  it("erro não-P2002 é propagado (não engolido como duplicata)", async () => {
    createMock.mockRejectedValue(new Error("db offline"));
    await expect(createQSO("evt-1", {}, form(validQso))).rejects.toThrow(
      "db offline"
    );
  });
});
