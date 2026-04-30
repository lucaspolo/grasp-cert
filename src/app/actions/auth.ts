"use server";

import { prisma } from "@/lib/prisma";
import { hashSync } from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { generateEmailVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/mail";

const registerSchema = z
  .object({
    callsign: z
      .string()
      .min(3, "Indicativo deve ter no mínimo 3 caracteres")
      .max(10, "Indicativo deve ter no máximo 10 caracteres")
      .transform((v) => v.toUpperCase().trim()),
    name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
    email: z.string().email("E-mail inválido"),
    city: z.string().min(2, "Cidade deve ter no mínimo 2 caracteres"),
    state: z
      .string()
      .length(2, "Estado deve ter 2 caracteres (UF)")
      .transform((v) => v.toUpperCase().trim()),
    password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Senhas não conferem",
    path: ["confirmPassword"],
  });

export type RegisterState = {
  errors?: Record<string, string[]>;
  message?: string;
};

export async function registerUser(
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const raw = {
    callsign: formData.get("callsign"),
    name: formData.get("name"),
    email: formData.get("email"),
    city: formData.get("city"),
    state: formData.get("state"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = registerSchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { callsign, name, email, city, state, password } = parsed.data;

  const existingCallsign = await prisma.user.findUnique({
    where: { callsign },
  });
  if (existingCallsign) {
    return { errors: { callsign: ["Indicativo já cadastrado"] } };
  }

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    return { errors: { email: ["E-mail já cadastrado"] } };
  }

  const passwordHash = hashSync(password, 10);

  await prisma.user.create({
    data: { callsign, name, email, city, state, passwordHash },
  });

  const verificationToken = await generateEmailVerificationToken(email);
  await sendVerificationEmail(email, verificationToken.token);

  redirect("/login?registered=true");
}
