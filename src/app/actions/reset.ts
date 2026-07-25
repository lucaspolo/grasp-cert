"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generatePasswordResetToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/mail";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";

const ResetSchema = z.object({
  email: z.string().email("E-mail inválido"),
});

export type ResetState = {
  error?: string;
  success?: string;
};

export async function reset(
  _prevState: ResetState,
  formData: FormData
): Promise<ResetState> {
  const parsed = ResetSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: "E-mail inválido." };
  }

  const { email } = parsed.data;

  // Freia disparo abusivo de e-mails via Resend. As chaves não dependem de o
  // endereço existir, então a resposta não vira oráculo de enumeração.
  const ip = await getClientIp();
  const [byEmail, byIp] = await Promise.all([
    consumeRateLimit({
      key: `email:reset:${email.toLowerCase()}`,
      limit: 3,
      windowSeconds: 60 * 60,
    }),
    consumeRateLimit({
      key: `email:reset:ip:${ip}`,
      limit: 10,
      windowSeconds: 60 * 60,
    }),
  ]);
  if (!byEmail.allowed || !byIp.allowed) {
    return {
      error: "Muitas solicitações. Aguarde antes de pedir outro link.",
    };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const resetToken = await generatePasswordResetToken(email);
    await sendPasswordResetEmail(email, resetToken.token);
  }

  // Always return the same message to prevent user enumeration
  return {
    success: "Se o e-mail estiver cadastrado, um link de recuperação foi enviado.",
  };
}
