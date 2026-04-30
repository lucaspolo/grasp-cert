"use server";

import { prisma } from "@/lib/prisma";

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
    return { error: "Token expirado. Faça login para reenviar o e-mail de verificação." };
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
