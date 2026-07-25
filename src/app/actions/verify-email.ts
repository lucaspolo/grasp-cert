"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { generateEmailVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/mail";

export type VerifyEmailState = {
  success?: string;
  error?: string;
};

export async function verifyEmail(
  _prevState: VerifyEmailState,
  formData: FormData
): Promise<VerifyEmailState> {
  const token = formData.get("token") as string | null;

  if (!token) {
    return { error: "Token não fornecido." };
  }

  const existingToken = await prisma.emailVerificationToken.findUnique({
    where: { token },
  });

  if (!existingToken) {
    return { error: "Token inválido." };
  }

  if (new Date() > existingToken.expires) {
    await prisma.emailVerificationToken.delete({
      where: { id: existingToken.id },
    });
    return {
      error:
        "Token expirado. Faça login e clique em “Reenviar e-mail de verificação”.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: existingToken.email },
  });

  if (!user) {
    return { error: "Usuário não encontrado." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date() },
  });

  await prisma.emailVerificationToken.delete({
    where: { id: existingToken.id },
  });

  return { success: "E-mail verificado com sucesso! Você já pode fazer login." };
}

export type ResendVerificationState = {
  success?: string;
  error?: string;
};

const resendSchema = z.object({
  callsign: z
    .string()
    .min(3, "Indicativo inválido")
    .max(10, "Indicativo inválido")
    .transform((v) => v.toUpperCase().trim()),
});

// Resposta idêntica em todos os desfechos válidos: não revela se a conta
// existe nem se já está verificada (anti-enumeração, como em `reset`).
const GENERIC_SUCCESS =
  "Se a conta existir e ainda não estiver verificada, enviamos um novo e-mail de confirmação.";

export async function resendVerificationEmail(
  _prevState: ResendVerificationState,
  formData: FormData
): Promise<ResendVerificationState> {
  const parsed = resendSchema.safeParse({ callsign: formData.get("callsign") });
  if (!parsed.success) {
    return { error: "Indicativo inválido." };
  }
  const { callsign } = parsed.data;

  // Freia disparo abusivo de e-mails via Resend, por conta e por IP. As
  // chaves não dependem de a conta existir, então a resposta não vira oráculo.
  const ip = await getClientIp();
  const [byAccount, byIp] = await Promise.all([
    consumeRateLimit({
      key: `email:verify:${callsign}`,
      limit: 3,
      windowSeconds: 60 * 60,
    }),
    consumeRateLimit({
      key: `email:verify:ip:${ip}`,
      limit: 10,
      windowSeconds: 60 * 60,
    }),
  ]);
  if (!byAccount.allowed || !byIp.allowed) {
    return { error: "Muitas solicitações. Aguarde antes de pedir outro e-mail." };
  }

  const user = await prisma.user.findUnique({ where: { callsign } });

  // Só envia para conta existente e ainda não verificada; qualquer outro
  // caso cai no mesmo sucesso genérico.
  if (user && !user.emailVerified) {
    const verificationToken = await generateEmailVerificationToken(user.email);
    await sendVerificationEmail(user.email, verificationToken.token);
  }

  return { success: GENERIC_SUCCESS };
}
