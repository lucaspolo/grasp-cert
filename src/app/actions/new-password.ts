"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashSync } from "bcryptjs";

const NewPasswordSchema = z.object({
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export type NewPasswordState = {
  error?: string;
  success?: string;
};

export async function newPassword(
  _prevState: NewPasswordState,
  formData: FormData
): Promise<NewPasswordState> {
  const token = formData.get("token") as string | null;

  if (!token) {
    return { error: "Token não fornecido." };
  }

  const parsed = NewPasswordSchema.safeParse({
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors.password?.[0] ?? "Dados inválidos." };
  }

  const { password } = parsed.data;

  const existingToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!existingToken) {
    return { error: "Token inválido ou expirado." };
  }

  if (new Date() > existingToken.expires) {
    await prisma.passwordResetToken.delete({
      where: { id: existingToken.id },
    });
    return { error: "Token inválido ou expirado." };
  }

  const user = await prisma.user.findUnique({
    where: { email: existingToken.email },
  });

  if (!user) {
    return { error: "Token inválido ou expirado." };
  }

  const passwordHash = hashSync(password, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  await prisma.passwordResetToken.delete({
    where: { id: existingToken.id },
  });

  return { success: "Senha redefinida com sucesso!" };
}
