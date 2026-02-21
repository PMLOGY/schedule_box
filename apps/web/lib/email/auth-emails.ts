/**
 * Auth email sending functions
 *
 * Sends transactional auth emails (password reset, email verification) via
 * SMTP using nodemailer. Uses direct SMTP (not RabbitMQ) because auth emails
 * are synchronous security flows where latency matters.
 *
 * Required environment variables:
 *   SMTP_HOST  — SMTP relay hostname
 *   SMTP_PORT  — SMTP port (default: 587, STARTTLS)
 *   SMTP_USER  — SMTP authentication username
 *   SMTP_PASS  — SMTP authentication password
 *   SMTP_FROM  — Sender address (default: no-reply@schedulebox.cz)
 */

import nodemailer from 'nodemailer';

// Module-level transporter — created once on import for connection reuse
const smtpPort = Number(process.env.SMTP_PORT) || 465;
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpPort === 465, // true for implicit TLS (465), false for STARTTLS (587)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const DEFAULT_FROM = 'no-reply@schedulebox.cz';

/**
 * Send password reset email
 *
 * @param to    Recipient email address
 * @param token Raw (unhashed) reset token
 */
export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
  const from = process.env.SMTP_FROM || DEFAULT_FROM;

  const html = `
<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Obnovení hesla</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #2563eb; padding: 32px 40px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
    .body { padding: 40px; color: #374151; line-height: 1.6; }
    .button { display: inline-block; margin: 24px 0; padding: 14px 32px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; }
    .footer { padding: 24px 40px; background: #f9fafb; color: #9ca3af; font-size: 12px; text-align: center; }
    .url-fallback { word-break: break-all; color: #6b7280; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ScheduleBox</h1>
    </div>
    <div class="body">
      <h2>Obnovení hesla</h2>
      <p>Obdrželi jsme žádost o obnovení hesla k vašemu účtu. Klikněte na tlačítko níže pro nastavení nového hesla.</p>
      <p><a href="${resetUrl}" class="button">Obnovit heslo</a></p>
      <p>Odkaz je platný <strong>1 hodinu</strong>. Po vypršení platnosti bude nutné požádat o nový odkaz.</p>
      <p>Pokud jste o obnovení hesla nepožádali, tento e-mail ignorujte. Vaše heslo zůstane nezměněno.</p>
      <p class="url-fallback">Pokud tlačítko nefunguje, zkopírujte tento odkaz do prohlížeče:<br>${resetUrl}</p>
    </div>
    <div class="footer">
      ScheduleBox s.r.o. &mdash; rezervační systém pro firmy
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = [
    'Obnovení hesla - ScheduleBox',
    '',
    'Obdrželi jsme žádost o obnovení hesla k vašemu účtu.',
    '',
    `Klikněte na tento odkaz pro nastavení nového hesla: ${resetUrl}`,
    '',
    'Odkaz je platný 1 hodinu.',
    '',
    'Pokud jste o obnovení hesla nepožádali, tento e-mail ignorujte.',
  ].join('\n');

  await transporter.sendMail({
    from,
    to,
    replyTo: from,
    subject: 'Obnovení hesla - ScheduleBox',
    html,
    text,
  });
}

/**
 * Send email verification email
 *
 * @param to    Recipient email address
 * @param token Raw (unhashed) verification token
 */
export async function sendEmailVerificationEmail(to: string, token: string): Promise<void> {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;
  const from = process.env.SMTP_FROM || DEFAULT_FROM;

  const html = `
<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ověření e-mailu</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #2563eb; padding: 32px 40px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
    .body { padding: 40px; color: #374151; line-height: 1.6; }
    .button { display: inline-block; margin: 24px 0; padding: 14px 32px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; }
    .footer { padding: 24px 40px; background: #f9fafb; color: #9ca3af; font-size: 12px; text-align: center; }
    .url-fallback { word-break: break-all; color: #6b7280; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ScheduleBox</h1>
    </div>
    <div class="body">
      <h2>Ověření e-mailové adresy</h2>
      <p>Vítejte v ScheduleBox! Pro dokončení registrace prosím ověřte svou e-mailovou adresu kliknutím na tlačítko níže.</p>
      <p><a href="${verifyUrl}" class="button">Ověřit e-mail</a></p>
      <p>Odkaz je platný <strong>24 hodin</strong>. Po vypršení platnosti bude nutné požádat o nový ověřovací odkaz.</p>
      <p>Pokud jste se nezaregistrovali na ScheduleBox, tento e-mail ignorujte.</p>
      <p class="url-fallback">Pokud tlačítko nefunguje, zkopírujte tento odkaz do prohlížeče:<br>${verifyUrl}</p>
    </div>
    <div class="footer">
      ScheduleBox s.r.o. &mdash; rezervační systém pro firmy
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = [
    'Ověření e-mailu - ScheduleBox',
    '',
    'Vítejte v ScheduleBox! Pro dokončení registrace prosím ověřte svou e-mailovou adresu.',
    '',
    `Klikněte na tento odkaz pro ověření: ${verifyUrl}`,
    '',
    'Odkaz je platný 24 hodin.',
    '',
    'Pokud jste se nezaregistrovali na ScheduleBox, tento e-mail ignorujte.',
  ].join('\n');

  await transporter.sendMail({
    from,
    to,
    replyTo: from,
    subject: 'Ověření e-mailu - ScheduleBox',
    html,
    text,
  });
}
