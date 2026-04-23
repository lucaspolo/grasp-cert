import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  const template = await prisma.template.findUnique({
    where: { id },
    select: { bgImage: true, bgMimeType: true },
  });

  if (!template?.bgImage) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(template.bgImage, {
    headers: {
      "Content-Type": template.bgMimeType ?? "image/png",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
