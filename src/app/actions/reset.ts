"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generatePasswordResetToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/mail";

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
