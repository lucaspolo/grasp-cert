import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: { findUnique: vi.fn() },
    qSO: { createMany: vi.fn() },
    eventOperator: { findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { importQSOs } from "./qso-import";

const authMock = auth as unknown as Mock;
const eventFindMock = prisma.event.findUnique as unknown as Mock;
const createManyMock = prisma.qSO.createMany as unknown as Mock;
const auditMock = prisma.auditLog.create as unknown as Mock;

const EVENT = {
  id: "evt-1",
  name: "Concurso Teste",
  eventBands: [
    { bandId: "band-40m", band: { name: "40m" } },
    { bandId: "band-20m", band: { name: "20m" } },
  ],
  eventModes: [
    { modeId: "mode-ssb", mode: { name: "SSB" } },
    { modeId: "mode-ft8", mode: { name: "FT8" } },
  ],
};

function fileForm(adif: string): FormData {
  const fd = new FormData();
  fd.set("file", new File([adif], "log.adi", { type: "text/plain" }));
  return fd;
}

const TWO_VALID = `<adif_ver:5>3.1.4
<EOH>
<CALL:6>PY2ABC <QSO_DATE:8>20260725 <TIME_ON:4>1430 <BAND:3>40m <MODE:3>SSB <RST_SENT:2>59 <RST_RCVD:2>59 <EOR>
<CALL:6>PY3XYZ <QSO_DATE:8>20260725 <TIME_ON:4>1445 <BAND:3>20m <MODE:3>FT8 <EOR>`;

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({
    user: { id: "u1", role: "ADMIN", callsign: "PY2ADM" },
  });
  eventFindMock.mockResolvedValue(EVENT);
});

describe("importQSOs", () => {
  it("rejeita quando nenhum arquivo é enviado", async () => {
    const result = await importQSOs("evt-1", {}, new FormData());
    expect(result.error).toBe("Nenhum arquivo enviado.");
    expect(createManyMock).not.toHaveBeenCalled();
  });

  it("rejeita ADIF sem QSOs", async () => {
    const result = await importQSOs("evt-1", {}, fileForm("<adif_ver:5>3.1.4\n<EOH>\n"));
    expect(result.error).toContain("Nenhum QSO");
  });

  it("importa QSOs válidos e registra auditoria", async () => {
    createManyMock.mockResolvedValue({ count: 2 });

    const result = await importQSOs("evt-1", {}, fileForm(TWO_VALID));

    expect(createManyMock).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          eventId: "evt-1",
          participantCallsign: "PY2ABC",
          bandId: "band-40m",
          modeId: "mode-ssb",
          operatorCallsign: "PY2ADM",
        }),
      ]),
      skipDuplicates: true,
    });
    expect(result.summary).toEqual({
      total: 2,
      imported: 2,
      duplicates: 0,
      rejected: [],
    });
    expect(auditMock).toHaveBeenCalledTimes(1);
    expect(auditMock.mock.calls[0][0].data.action).toBe("qso.imported");
  });

  it("conta duplicatas quando o banco ignora (skipDuplicates)", async () => {
    createManyMock.mockResolvedValue({ count: 1 }); // 2 enviados, 1 novo

    const result = await importQSOs("evt-1", {}, fileForm(TWO_VALID));

    expect(result.summary).toMatchObject({ imported: 1, duplicates: 1 });
  });

  it("reporta linhas rejeitadas (banda fora do evento) sem barrar as válidas", async () => {
    createManyMock.mockResolvedValue({ count: 1 });
    const mixed = `<EOH>
<CALL:6>PY2ABC <QSO_DATE:8>20260725 <TIME_ON:4>1430 <BAND:3>40m <MODE:3>SSB <EOR>
<CALL:6>PY9ZZZ <QSO_DATE:8>20260725 <TIME_ON:4>1450 <BAND:3>10m <MODE:3>SSB <EOR>`;

    const result = await importQSOs("evt-1", {}, fileForm(mixed));

    expect(result.summary?.imported).toBe(1);
    expect(result.summary?.rejected).toHaveLength(1);
    expect(result.summary?.rejected[0]).toMatchObject({ line: 2 });
    expect(result.summary?.rejected[0].reason).toContain("10m");
  });

  it("OPERATOR não atribuído ao evento é barrado", async () => {
    authMock.mockResolvedValue({
      user: { id: "op1", role: "OPERATOR", callsign: "PY2OP" },
    });
    (prisma.eventOperator.findUnique as unknown as Mock).mockResolvedValue(null);

    await expect(
      importQSOs("evt-1", {}, fileForm(TWO_VALID))
    ).rejects.toThrow("Forbidden");
  });
});
