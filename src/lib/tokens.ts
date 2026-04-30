import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/prisma";

export async function generatePasswordResetToken(email: string) {
  const token = uuidv4();
  const expires = new Date(Date.now() + 3600 * 1000); // 1 hour

  const existingToken = await prisma.passwordResetToken.findFirst({
    where: { email },
  });

  if (existingToken) {
    await prisma.passwordResetToken.delete({
      where: { id: existingToken.id },
    });
  }

  const passwordResetToken = await prisma.passwordResetToken.create({
    data: { email, token, expires },
  });

  return passwordResetToken;
}

export async function generateEmailVerificationToken(email: string) {
  const token = uuidv4();
  const expires = new Date(Date.now() + 24 * 3600 * 1000); // 24 hours

  const existingToken = await prisma.emailVerificationToken.findFirst({
    where: { email },
  });

  if (existingToken) {
    await prisma.emailVerificationToken.delete({
      where: { id: existingToken.id },
    });
  }

  const verificationToken = await prisma.emailVerificationToken.create({
    data: { email, token, expires },
  });

  return verificationToken;
}
