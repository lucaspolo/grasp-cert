import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/nova-senha?token=${token}`;

  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  await resend.emails.send({
    from,
    to: email,
    subject: "Redefinição de senha — GRASP Cert",
    html: `
      <h2>Redefinição de senha</h2>
      <p>Você solicitou a redefinição de sua senha no GRASP Cert.</p>
      <p>Clique no link abaixo para criar uma nova senha:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>Este link expira em 1 hora.</p>
      <p>Se você não solicitou esta alteração, ignore este e-mail.</p>
    `,
  });
}

export async function sendVerificationEmail(email: string, token: string) {
  const verifyLink = `${process.env.NEXT_PUBLIC_APP_URL}/verificar-email?token=${token}`;

  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  await resend.emails.send({
    from,
    to: email,
    subject: "Confirme seu e-mail — GRASP Cert",
    html: `
      <h2>Confirmação de e-mail</h2>
      <p>Obrigado por se cadastrar no GRASP Cert!</p>
      <p>Clique no link abaixo para confirmar seu e-mail e ativar sua conta:</p>
      <p><a href="${verifyLink}">${verifyLink}</a></p>
      <p>Este link expira em 24 horas.</p>
      <p>Se você não criou esta conta, ignore este e-mail.</p>
    `,
  });
}
