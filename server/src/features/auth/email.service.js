import { Resend } from 'resend';

let resend = null;
const testEmails = [];

function getResend() {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY env var is required for password reset');
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export function getTestEmails() {
  return testEmails;
}

export function clearTestEmails() {
  testEmails.length = 0;
}

export async function sendPasswordResetEmail(email, resetToken) {
  const resetUrl = `${process.env.APP_URL || 'https://gastar.app'}/reset-password?token=${resetToken}`;

  if (process.env.NODE_ENV === 'test') {
    testEmails.push({ email, resetToken, resetUrl });
    return;
  }

  const client = getResend();

  await client.emails.send({
    from: process.env.EMAIL_FROM || 'Gastar <noreply@gastar.app>',
    to: email,
    subject: 'Recuperá tu contraseña - Gastar',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #059669;">Gastar</h2>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p>Hacé clic en el siguiente enlace para crear una nueva contraseña:</p>
        <a href="${resetUrl}" style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">
          Restablecer contraseña
        </a>
        <p style="color: #6b7280; font-size: 14px;">Este enlace expira en 1 hora.</p>
        <p style="color: #6b7280; font-size: 14px;">Si no solicitaste esto, ignora este correo.</p>
      </div>
    `,
  });
}
