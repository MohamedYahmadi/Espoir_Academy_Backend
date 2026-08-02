import nodemailer from 'nodemailer';

// Create transporter from SMTP config
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Base HTML wrapper matching frontend design (black bg, red accent)
const wrapHtml = (inner: string): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ESPOIRS ACADEMY</title>
</head>
<body style="margin:0; padding:0; background:#000000; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000000; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 20px 40px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding:50px 40px;">
              <h1 style="color:#000000; font-size:32px; font-weight:700; margin:0 0 4px 0; letter-spacing:-0.5px;">
                ESPOIRS <span style="color:#dc2626;">ACADEMY</span>
              </h1>
              <p style="color:#9ca3af; font-size:14px; margin:0 0:20px 0;">Formez les champions de demain à Béja, Tunisie</p>
              <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;">
              ${inner}
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb; padding:20px 40px; text-align:center;">
              <p style="color:#6b7280; font-size:12px; margin:0;">
                © ${new Date().getFullYear()} ESPOIRS ACADEMY — Tous droits réservés
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

/**
 * Send welcome email after successful registration
 */
export const sendWelcomeEmail = async (
  to: string,
  fullName: string
): Promise<void> => {
  const html = `
    <h2 style="color:#dc2626; font-size:24px; margin:0 0 20px 0;">Bienvenue !</h2>
    <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 16px 0;">
      Cher(e) ${fullName},
    </p>
    <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 24px 0;">
      Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter 
      à votre espace et commencer à inscrire vos enfants aux programmes sportifs de l'académie.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:30px 0;">
      <tr>
        <td align="center" style="background:#dc2626; color:#ffffff; padding:14px 32px; border-radius:8px; font-size:16px; font-weight:600;">
          <a href="${process.env.CLIENT_URL}/login" style="color:#ffffff; text-decoration:none;">
            Se Connecter
          </a>
        </td>
      </tr>
    </table>
    <p style="color:#6b7280; font-size:14px; line-height:1.6; margin:0;">
      Si vous avez des questions, n'hésitez pas à nous contacter.
    </p>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'Bienvenue à ESPOIRS ACADEMY — Votre compte est créé !',
    html: wrapHtml(html),
  });
};

/**
 * Send password reset email with token
 */
export const sendPasswordResetEmail = async (
  to: string,
  fullName: string,
  resetToken: string
): Promise<void> => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  const html = `
    <h2 style="color:#dc2626; font-size:24px; margin:0 0 20px 0;">Réinitialisation de mot de passe</h2>
    <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 16px 0;">
      Cher(e) ${fullName},
    </p>
    <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 24px 0;">
      Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous 
      pour choisir un nouveau mot de passe. Ce lien est valide pendant <strong>1 heure</strong>.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:30px 0;">
      <tr>
        <td align="center" style="background:#dc2626; color:#ffffff; padding:14px 32px; border-radius:8px; font-size:16px; font-weight:600;">
          <a href="${resetUrl}" style="color:#ffffff; text-decoration:none;">
            Réinitialiser le mot de passe
          </a>
        </td>
      </tr>
    </table>
    <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 16px 0;">
      Ou copiez ce lien dans votre navigateur :
    </p>
    <p style="color:#6b7280; font-size:13px; word-break:break-all; margin:0 0 24px 0;">
      ${resetUrl}
    </p>
    <p style="color:#6b7280; font-size:14px; line-height:1.6; margin:0;">
      Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.
    </p>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'Réinitialisation de mot de passe — ESPOIRS ACADEMY',
    html: wrapHtml(html),
  });
};

export default transporter;
