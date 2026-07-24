"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-utils";

const PAGE_SIZE = 50;

export async function listAuditLogs(page = 1) {
  await requireRole(["OWNER"]);

  const safePage = Math.max(1, Math.floor(page) || 1);

  const [logs, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count(),
  ]);

  return { logs, total, page: safePage, pageSize: PAGE_SIZE };
}
