import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/nova-senha?token=${token}`;

  await resend.emails.send({
    from: "suporte@blog.lucaspolo.dev",
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
