import nodemailer from "nodemailer";

export const STUDIO_INBOX = "Contact@CyberAdSpace.com";

export function siteUrl() {
  return (process.env.SITE_URL || "https://cyberadspace.com").replace(/\/$/, "");
}

export async function sendMail({ fromName = "CyberAdSpace", ...opts }: { to: string; subject: string; text: string; replyTo?: string; fromName?: string }) {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    console.warn("mail: SMTP not configured; skipped:", opts.subject);
    return false;
  }
  const port = Number(process.env.SMTP_PORT || 465);
  const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST || "smtp.gmail.com", port, secure: port === 465, auth: { user, pass } });
  try {
    await transport.sendMail({ from: `"${fromName.replace(/"/g, "")}" <${user}>`, ...opts });
    return true;
  } catch (err) {
    console.error("mail: send failed", err);
    return false;
  }
}
