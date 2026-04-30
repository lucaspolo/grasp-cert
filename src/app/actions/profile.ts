"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { compare, hashSync } from "bcryptjs";
import { z } from "zod";
import { generateEmailVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/mail";

export type ProfileState = {
  errors?: Record<string, string[]>;
  success?: string;
  error?: string;
};

const profileSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  city: z.string().min(2, "Cidade deve ter no mínimo 2 caracteres"),
  state: z
    .string()
    .length(2, "Estado deve ter 2 caracteres (UF)")
    .transform((v) => v.toUpperCase().trim()),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Senha atual é obrigatória"),
    newPassword: z.string().min(6, "Nova senha deve ter no mínimo 6 caracteres"),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Senhas não conferem",
    path: ["confirmNewPassword"],
  });

export async function getProfile() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      callsign: true,
      name: true,
      email: true,
      city: true,
      state: true,
    },
  });

  return user;
}

export async function updateProfile(
  _prevState: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Não autenticado." };
  }

  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    city: formData.get("city"),
    state: formData.get("state"),
  };

  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { name, email, city, state } = parsed.data;

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!currentUser) {
    return { error: "Usuário não encontrado." };
  }

  // Check email uniqueness if changed
  const emailChanged = email !== currentUser.email;
  if (emailChanged) {
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return { errors: { email: ["E-mail já cadastrado por outro usuário"] } };
    }
  }

  // Handle optional password change
  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmNewPassword = formData.get("confirmNewPassword") as string;

  let newPasswordHash: string | undefined;

  if (currentPassword || newPassword || confirmNewPassword) {
    const passwordParsed = passwordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmNewPassword,
    });

    if (!passwordParsed.success) {
      return { errors: passwordParsed.error.flatten().fieldErrors };
    }

    const isCurrentValid = await compare(
      passwordParsed.data.currentPassword,
      currentUser.passwordHash
    );
    if (!isCurrentValid) {
      return { errors: { currentPassword: ["Senha atual incorreta"] } };
    }

    newPasswordHash = hashSync(passwordParsed.data.newPassword, 10);
  }

  // Update user
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name,
      email,
      city,
      state,
      ...(newPasswordHash && { passwordHash: newPasswordHash }),
      ...(emailChanged && { emailVerified: null }),
    },
  });

  // If email changed, send new verification
  if (emailChanged) {
    const verificationToken = await generateEmailVerificationToken(email);
    await sendVerificationEmail(email, verificationToken.token);
    return {
      success:
        "Dados atualizados! Um e-mail de verificação foi enviado para o novo endereço. Você precisará verificá-lo para continuar acessando sua conta.",
    };
  }

  return { success: "Dados atualizados com sucesso!" };
}
