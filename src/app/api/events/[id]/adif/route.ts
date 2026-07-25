import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, requireEventOperator } from "@/lib/auth-utils";
import { buildAdif } from "@/lib/adif";

export const runtime = "nodejs";

function slugify(name: string): string {
  // NFD decompõe acentos (é → e + marca combinante); o filtro de
  // não-alfanuméricos abaixo remove as marcas e mantém a letra base.
  return (
    name
      .normalize("NFD")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "evento"
  );
}

/** Exporta os QSOs de um evento em ADIF (.adi). Requer OWNER/ADMIN/OPERATOR. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await requireRole(["OWNER", "ADMIN", "OPERATOR"]);
    if (session.user.role === "OPERATOR") {
      await requireEventOperator(id, session.user.id);
    }
  } catch {
    return new Response("Não autorizado.", { status: 403 });
  }

  const event = await prisma.event.findUnique({
    where: { id },
    select: { name: true },
  });
  if (!event) {
    return new Response("Evento não encontrado.", { status: 404 });
  }

  const qsos = await prisma.qSO.findMany({
    where: { eventId: id },
    orderBy: { dateTime: "asc" },
    include: { band: true, modeRef: true },
  });

  const adif = buildAdif(qsos, new Date());

  return new Response(adif, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${slugify(event.name)}.adi"`,
    },
  });
}
