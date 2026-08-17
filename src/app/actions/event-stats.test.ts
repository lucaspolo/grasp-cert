import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: { findUnique: vi.fn() },
    qSO: { count: vi.fn(), groupBy: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { getPublicEventStats } from "./event";

const eventFindMock = prisma.event.findUnique as unknown as Mock;
const countMock = prisma.qSO.count as unknown as Mock;
const groupByMock = prisma.qSO.groupBy as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPublicEventStats", () => {
  it("evento inexistente retorna null sem agregar", async () => {
    eventFindMock.mockResolvedValue(null);
    const result = await getPublicEventStats("nao-existe");
    expect(result).toBeNull();
    expect(countMock).not.toHaveBeenCalled();
    expect(groupByMock).not.toHaveBeenCalled();
  });

  it("agrega total, participantes distintos e ranking ordenado", async () => {
    eventFindMock.mockResolvedValue({
      id: "evt-1",
      name: "Concurso Teste",
      startDate: new Date("2026-07-25T00:00:00Z"),
      endDate: new Date("2026-07-26T00:00:00Z"),
      observations: "Observação pública do evento",
      group: { name: "GRASP" },
      eventBands: [{ band: { label: "40 m" } }],
      eventModes: [{ mode: { label: "SSB" } }],
    });
    countMock.mockResolvedValue(5);
    groupByMock.mockResolvedValue([
      { participantCallsign: "PY2ABC", _count: { participantCallsign: 3 } },
      { participantCallsign: "PY3XYZ", _count: { participantCallsign: 2 } },
    ]);

    const result = await getPublicEventStats("evt-1");

    expect(result).toEqual({
      id: "evt-1",
      name: "Concurso Teste",
      groupName: "GRASP",
      startDate: new Date("2026-07-25T00:00:00Z"),
      endDate: new Date("2026-07-26T00:00:00Z"),
      observations: "Observação pública do evento",
      bands: ["40 m"],
      modes: ["SSB"],
      totalQsos: 5,
      participants: 2,
      ranking: [
        { callsign: "PY2ABC", qsos: 3 },
        { callsign: "PY3XYZ", qsos: 2 },
      ],
    });
  });

  it("agrega via count/groupBy (sem N+1) e usa o índice do evento", async () => {
    eventFindMock.mockResolvedValue({
      id: "evt-1",
      name: "E",
      startDate: new Date(),
      endDate: new Date(),
      observations: null,
      group: { name: "GRASP" },
      eventBands: [],
      eventModes: [],
    });
    countMock.mockResolvedValue(0);
    groupByMock.mockResolvedValue([]);

    await getPublicEventStats("evt-1");

    // Uma contagem + uma agregação, ambas escopadas ao evento.
    expect(countMock).toHaveBeenCalledWith({ where: { eventId: "evt-1" } });
    expect(groupByMock).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["participantCallsign"],
        where: { eventId: "evt-1" },
        orderBy: { _count: { participantCallsign: "desc" } },
      })
    );
  });

  it("não seleciona campos sensíveis (observações de QSO, e-mail/cidade)", async () => {
    eventFindMock.mockResolvedValue({
      id: "evt-1",
      name: "E",
      startDate: new Date(),
      endDate: new Date(),
      observations: null,
      group: { name: "GRASP" },
      eventBands: [],
      eventModes: [],
    });
    countMock.mockResolvedValue(0);
    groupByMock.mockResolvedValue([]);

    await getPublicEventStats("evt-1");

    // O select do evento não pede relação de qsos nem dados de usuário.
    const select = eventFindMock.mock.calls[0][0].select;
    expect(select.qsos).toBeUndefined();
    // groupBy expõe só o indicativo (público) e a contagem.
    expect(groupByMock.mock.calls[0][0].by).toEqual(["participantCallsign"]);
  });
});
