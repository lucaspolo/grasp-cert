import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: vi.fn() } }));

import { prisma } from "@/lib/prisma";
import { GET } from "./route";

const queryRawMock = prisma.$queryRaw as unknown as Mock;

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("200 com banco respondendo", async () => {
    queryRawMock.mockResolvedValue([{ "?column?": 1 }]);
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ status: "ok", db: "up" });
  });

  it("503 com banco fora, sem vazar detalhes", async () => {
    queryRawMock.mockRejectedValue(new Error("ECONNREFUSED 10.0.0.5"));
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toEqual({ status: "degraded", db: "down" });
  });
});
