import { Resend } from "resend";

export async function sendPasswordResetEmail(to: string, url: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error('Email not configured: RESEND_API_KEY or EMAIL_FROM missing');

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to,
    subject: "Reset your Cerulea password",
    html: `<p>Click to reset your password:</p><p><a href="${url}">${url}</a></p>`,
  });
}
