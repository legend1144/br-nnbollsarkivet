import { Resend } from "resend";
import { env } from "@/lib/env";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function sendOtpEmail(to: string, code: string) {
  const subject = "Din verifieringskod för Brännbollsarkivet";
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.4">
      <h2>Brännbollsarkivet</h2>
      <p>Din verifieringskod är:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p>
      <p>Koden gäller i 10 minuter.</p>
      <p>Om du inte försökte logga in kan du ignorera detta mejl.</p>
    </div>
  `;

  if (!resend || !env.RESEND_FROM_EMAIL) {
    // För lokal utveckling utan e-postleverantör.
    console.info(`[DEV OTP] ${to}: ${code}`);
    return;
  }

  await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to,
    subject,
    html,
  });
}
