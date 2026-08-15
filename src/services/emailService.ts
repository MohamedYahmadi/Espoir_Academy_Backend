import nodemailer from 'nodemailer';

// Lazy transporter — created on first use, NOT at module load time.
// This fixes the ESM import hoisting issue where dotenv.config() runs
// AFTER all imports are loaded, causing process.env to be undefined.
let _transporter: nodemailer.Transporter | null = null;

const getTransporter = (): nodemailer.Transporter => {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('📧 Email transporter initialized:', process.env.SMTP_USER);
  }
  return _transporter;
};

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
              <p style="color:#9ca3af; font-size:14px; margin:0 0 20px 0;">Formez les champions de demain à Béja, Tunisie</p>
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
 * Convert a styled HTML email body into a readable plain-text version,
 * preserving link targets. Used so every email carries a text/plain
 * alternative (HTML-only emails are a common spam trigger).
 */
const toPlainText = (html: string): string =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>|<\/h[1-6]>|<\/div>|<\/tr>|<\/td>|<hr[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();

/**
 * Helper: Send email with the branded wrapper + spam-score-friendly headers
 */
const sendEmail = async (
  to: string,
  subject: string,
  htmlBody: string
): Promise<void> => {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || '';
  await transporter.sendMail({
    from: `"ESPOIRS ACADEMY" <${from}>`,
    to,
    subject,
    html: wrapHtml(htmlBody),
    text: toPlainText(htmlBody),
    headers: {
      'X-Mailer': 'ESPOIRS ACADEMY',
      'X-Priority': '3',
      'List-Unsubscribe': `<mailto:${from}?subject=unsubscribe>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });
  console.log(`📧 Email sent to: ${to} | Subject: ${subject}`);
};

// ============================================================
// EMAIL FUNCTIONS
// ============================================================

/**
 * 1. Email verification email — sent after registration
 */
export const sendVerificationEmail = async (
  to: string,
  fullName: string,
  verificationToken: string
): Promise<void> => {
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
  const html = `
    <h2 style="color:#dc2626; font-size:24px; margin:0 0 20px 0;">Vérifiez votre email</h2>
    <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 16px 0;">
      Cher(e) ${fullName},
    </p>
    <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 24px 0;">
      Merci d'avoir créé votre compte sur ESPOIRS ACADEMY. Pour activer votre compte et
      pouvoir vous connecter, veuillez confirmer votre adresse email en cliquant sur le bouton
      ci-dessous. Ce lien est valide pendant <strong>24 heures</strong>.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:30px 0;">
      <tr>
        <td align="center" style="background:#dc2626; color:#ffffff; padding:14px 32px; border-radius:8px; font-size:16px; font-weight:600;">
          <a href="${verifyUrl}" style="color:#ffffff; text-decoration:none;">
            Confirmer mon email
          </a>
        </td>
      </tr>
    </table>
    <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 16px 0;">
      Ou copiez ce lien dans votre navigateur :
    </p>
    <p style="color:#6b7280; font-size:13px; word-break:break-all; margin:0 0 24px 0;">
      ${verifyUrl}
    </p>
    <p style="color:#6b7280; font-size:14px; line-height:1.6; margin:0;">
      Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer cet email.
    </p>
  `;
  await sendEmail(to, 'Confirmez votre email — ESPOIRS ACADEMY', html);
};

/**
 * 1b. Welcome email — sent after registration
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
  await sendEmail(to, 'Bienvenue à ESPOIRS ACADEMY — Votre compte est créé !', html);
};

/**
 * 2. Password reset email — sent on forgot-password request
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
  await sendEmail(to, 'Réinitialisation de mot de passe — ESPOIRS ACADEMY', html);
};

/**
 * 3. Profile update email — sent when user updates their profile
 */
export const sendProfileUpdateEmail = async (
  to: string,
  fullName: string
): Promise<void> => {
  const html = `
    <h2 style="color:#dc2626; font-size:24px; margin:0 0 20px 0;">Profil mis à jour</h2>
    <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 16px 0;">
      Cher(e) ${fullName},
    </p>
    <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 24px 0;">
      Vos informations personnelles ont été modifiées avec succès. Si vous n'êtes pas à l'origine 
      de cette modification, veuillez contacter l'administration immédiatement.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:30px 0;">
      <tr>
        <td align="center" style="background:#dc2626; color:#ffffff; padding:14px 32px; border-radius:8px; font-size:16px; font-weight:600;">
          <a href="${process.env.CLIENT_URL}/profile" style="color:#ffffff; text-decoration:none;">
            Voir mon profil
          </a>
        </td>
      </tr>
    </table>
    <p style="color:#6b7280; font-size:14px; line-height:1.6; margin:0;">
      Merci de votre confiance.
    </p>
  `;
  await sendEmail(to, 'Votre profil a été mis à jour — ESPOIRS ACADEMY', html);
};

/**
 * 4. Enrollment created email — sent when parent enrolls child in a sport
 */
export const sendEnrollmentCreatedEmail = async (
  to: string,
  parentName: string,
  childName: string,
  sportName: string
): Promise<void> => {
  const html = `
    <h2 style="color:#dc2626; font-size:24px; margin:0 0 20px 0;">Inscription enregistrée</h2>
    <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 16px 0;">
      Cher(e) ${parentName},
    </p>
    <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 24px 0;">
      L'inscription de votre enfant <strong>${childName}</strong> au programme 
      <strong>${sportName}</strong> a été enregistrée avec succès. Elle est actuellement 
      <span style="color:#f59e0b; font-weight:600;">en attente de validation</span> par l'administration.
    </p>
    <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 24px 0;">
      Vous recevrez un email dès que l'inscription sera approuvée ou rejetée.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:30px 0;">
      <tr>
        <td align="center" style="background:#dc2626; color:#ffffff; padding:14px 32px; border-radius:8px; font-size:16px; font-weight:600;">
          <a href="${process.env.CLIENT_URL}/dashboard" style="color:#ffffff; text-decoration:none;">
            Suivre l'inscription
          </a>
        </td>
      </tr>
    </table>
    <p style="color:#6b7280; font-size:14px; line-height:1.6; margin:0;">
      Merci de votre confiance.
    </p>
  `;
  await sendEmail(to, `Inscription de ${childName} à ${sportName} — ESPOIRS ACADEMY`, html);
};

/**
 * 5. Enrollment status email — sent when admin approves/rejects enrollment
 */
export const sendEnrollmentStatusEmail = async (
  to: string,
  parentName: string,
  childName: string,
  sportName: string,
  status: string
): Promise<void> => {
  const isApproved = status === 'APPROVED';
  const statusColor = isApproved ? '#16a34a' : '#dc2626';
  const statusText = isApproved ? 'approuvée' : 'refusée';
  const statusIcon = isApproved ? '✅' : '❌';

  const html = `
    <h2 style="color:${statusColor}; font-size:24px; margin:0 0 20px 0;">
      Inscription ${statusText} ${statusIcon}
    </h2>
    <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 16px 0;">
      Cher(e) ${parentName},
    </p>
    <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 24px 0;">
      L'inscription de votre enfant <strong>${childName}</strong> au programme 
      <strong>${sportName}</strong> a été <strong style="color:${statusColor};">${statusText}</strong> 
      par l'administration.
    </p>
    ${isApproved ? `
    <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 24px 0;">
      Vous pouvez maintenant consulter les horaires d'entraînement et préparer la rentrée de votre enfant.
    </p>
    ` : `
    <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 24px 0;">
      Pour plus d'informations, veuillez contacter l'administration de l'académie.
    </p>
    `}
    <table cellpadding="0" cellspacing="0" style="margin:30px 0;">
      <tr>
        <td align="center" style="background:#dc2626; color:#ffffff; padding:14px 32px; border-radius:8px; font-size:16px; font-weight:600;">
          <a href="${process.env.CLIENT_URL}/dashboard" style="color:#ffffff; text-decoration:none;">
            Voir mon espace
          </a>
        </td>
      </tr>
    </table>
    <p style="color:#6b7280; font-size:14px; line-height:1.6; margin:0;">
      ${isApproved ? 'Félicitations et bienvenue dans la famille ESPOIRS ACADEMY !' : 'Cordialement, l\'équipe ESPOIRS ACADEMY.'}
    </p>
  `;
  await sendEmail(
    to,
    `Inscription ${statusText} — ${sportName} — ESPOIRS ACADEMY`,
    html
  );
};

/**
 * 6. Schedule update email — sent when admin updates a schedule
 */
export const sendScheduleUpdateEmail = async (
  to: string,
  parentName: string,
  childName: string,
  sportName: string,
  scheduleInfo: string
): Promise<void> => {
  const html = `
    <h2 style="color:#dc2626; font-size:24px; margin:0 0 20px 0;">Planning modifié</h2>
    <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 16px 0;">
      Cher(e) ${parentName},
    </p>
    <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 24px 0;">
      Le planning du programme <strong>${sportName}</strong> auquel votre enfant 
      <strong>${childName}</strong> est inscrit a été modifié.
    </p>
    <div style="background:#f3f4f6; border-left:4px solid #dc2626; padding:16px 20px; margin:0 0 24px 0; border-radius:4px;">
      <p style="color:#374151; font-size:15px; margin:0;">
        <strong>Nouveau planning :</strong><br>
        ${scheduleInfo}
      </p>
    </div>
    <table cellpadding="0" cellspacing="0" style="margin:30px 0;">
      <tr>
        <td align="center" style="background:#dc2626; color:#ffffff; padding:14px 32px; border-radius:8px; font-size:16px; font-weight:600;">
          <a href="${process.env.CLIENT_URL}/schedule" style="color:#ffffff; text-decoration:none;">
            Voir le planning
          </a>
        </td>
      </tr>
    </table>
    <p style="color:#6b7280; font-size:14px; line-height:1.6; margin:0;">
      Merci de prendre note de ces changements.
    </p>
  `;
  await sendEmail(to, `Planning modifié — ${sportName} — ESPOIRS ACADEMY`, html);
};

/**
 * 7. Admin password reset email — sent when admin resets a user's password
 */
export const sendAdminPasswordResetEmail = async (
  to: string,
  fullName: string,
  newPassword: string
): Promise<void> => {
  const html = `
    <h2 style="color:#dc2626; font-size:24px; margin:0 0 20px 0;">Mot de passe réinitialisé</h2>
    <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 16px 0;">
      Cher(e) ${fullName},
    </p>
    <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 24px 0;">
      Votre mot de passe a été réinitialisé par l'administration de l'académie. 
      Veuillez utiliser le mot de passe temporaire ci-dessous pour vous connecter, 
      puis le changer dès que possible.
    </p>
    <div style="background:#f3f4f6; border-left:4px solid #dc2626; padding:16px 20px; margin:0 0 24px 0; border-radius:4px;">
      <p style="color:#374151; font-size:18px; margin:0; font-family:monospace;">
        <strong>Mot de passe temporaire :</strong> ${newPassword}
      </p>
    </div>
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
      ⚠️ Pour votre sécurité, veuillez changer ce mot de passe dès votre prochaine connexion.
    </p>
  `;
  await sendEmail(to, 'Votre mot de passe a été réinitialisé — ESPOIRS ACADEMY', html);
};

/**
 * 8. Password changed email — sent when user changes their password from their profile
 */
export const sendPasswordChangedEmail = async (
  to: string,
  fullName: string
): Promise<void> => {
  const html = `
    <h2 style="color:#dc2626; font-size:24px; margin:0 0 20px 0;">Mot de passe modifié</h2>
    <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 16px 0;">
      Cher(e) ${fullName},
    </p>
    <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 24px 0;">
      Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter 
      à votre espace avec votre nouveau mot de passe.
    </p>
    <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 24px 0;">
      Si vous n'êtes pas à l'origine de cette modification, veuillez contacter 
      l'administration de l'académie immédiatement.
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
      ⚠️ Pour votre sécurité, ne partagez jamais votre mot de passe avec personne.
    </p>
  `;
  await sendEmail(to, 'Votre mot de passe a été modifié — ESPOIRS ACADEMY', html);
};

/**
 * 9. Admin user update email — sent when an admin updates a user's account information
 */
export const sendAdminUserUpdatedEmail = async (
  to: string,
  fullName: string
): Promise<void> => {
  const html = `
    <h2 style="color:#dc2626; font-size:24px; margin:0 0 20px 0;">Informations du compte mises à jour</h2>
    <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 16px 0;">
      Cher(e) ${fullName},
    </p>
    <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 24px 0;">
      L'administration de l'académie a mis à jour les informations de votre compte 
      (nom, coordonnées, rôle ou statut). Vous pouvez vous connecter pour consulter 
      vos informations à jour.
    </p>
    <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 24px 0;">
      Si vous n'êtes pas à l'origine de cette modification ou si elle vous semble erronée, 
      veuillez contacter l'administration immédiatement.
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
      Cordialement, l'équipe ESPOIRS ACADEMY.
    </p>
  `;
  await sendEmail(to, 'Vos informations ont été mises à jour — ESPOIRS ACADEMY', html);
};

/**
 * 10. Contact message email — sent when a logged-in user submits the contact form.
 * The message is delivered to the academy's inbox (the same SMTP account used
 * for all outgoing emails) so the admin can reply to the sender's email.
 */
export const sendContactMessageEmail = async (options: {
  senderEmail: string;
  senderName: string;
  phone: string;
  sport: string;
  message: string;
}): Promise<void> => {
  const { senderEmail, senderName, phone, sport, message } = options;
  const adminInbox = process.env.SMTP_FROM || process.env.SMTP_USER || '';

  const html = `
    <h2 style="color:#dc2626; font-size:24px; margin:0 0 20px 0;">Nouveau message de contact</h2>
    <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 16px 0;">
      Un membre de l'académie a envoyé un message depuis la page contact.
    </p>
    <div style="background:#f3f4f6; border-left:4px solid #dc2626; padding:16px 20px; margin:0 0 24px 0; border-radius:4px;">
      <p style="color:#374151; font-size:15px; margin:0 0 6px 0;">
        <strong>Nom :</strong> ${senderName}
      </p>
      <p style="color:#374151; font-size:15px; margin:0 0 6px 0;">
        <strong>Email :</strong> <a href="mailto:${senderEmail}" style="color:#dc2626;">${senderEmail}</a>
      </p>
      <p style="color:#374151; font-size:15px; margin:0 0 6px 0;">
        <strong>Téléphone :</strong> ${phone}
      </p>
      ${sport ? `<p style="color:#374151; font-size:15px; margin:0 0 6px 0;"><strong>Sport :</strong> ${sport}</p>` : ''}
      <hr style="border:none; border-top:1px solid #e5e7eb; margin:16px 0;">
      <p style="color:#374151; font-size:15px; margin:0;">
        <strong>Message :</strong><br>
        ${message.replace(/\n/g, '<br>')}
      </p>
    </div>
    <p style="color:#6b7280; font-size:14px; line-height:1.6; margin:0 0 16px 0;">
      Répondez directement à cet email pour aider ce membre.
    </p>
  `;

  await sendEmail(
    adminInbox,
    `Nouveau message de ${senderName} — ESPOIRS ACADEMY`,
    html
  );
};

/**
 * 11. Contact reply email — sent to the user when the admin responds to their message.
 * The reply is also delivered in-app via the notification center.
 */
export const sendContactReplyEmail = async (options: {
  to: string;
  fullName: string;
  originalMessage: string;
  reply: string;
}): Promise<void> => {
  const { to, fullName, originalMessage, reply } = options;

  const html = `
    <h2 style="color:#dc2626; font-size:24px; margin:0 0 20px 0;">Réponse de l'académie</h2>
    <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 16px 0;">
      Cher(e) ${fullName},
    </p>
    <p style="color:#374151; font-size:16px; line-height:1.7; margin:0 0 24px 0;">
      L'académie a répondu à votre message. Vous pouvez également consulter la réponse
      dans votre <strong>centre de notifications</strong> sur votre espace.
    </p>
    <div style="background:#f3f4f6; border-left:4px solid #9ca3af; padding:16px 20px; margin:0 0 16px 0; border-radius:4px;">
      <p style="color:#374151; font-size:14px; margin:0 0 4px 0;">
        <strong style="color:#6b7280;">Votre message :</strong>
      </p>
      <p style="color:#374151; font-size:15px; margin:0;">
        ${originalMessage.replace(/\n/g, '<br>')}
      </p>
    </div>
    <div style="background:#f3f4f6; border-left:4px solid #dc2626; padding:16px 20px; margin:0 0 24px 0; border-radius:4px;">
      <p style="color:#374151; font-size:14px; margin:0 0 4px 0;">
        <strong style="color:#dc2626;">Réponse de l'académie :</strong>
      </p>
      <p style="color:#374151; font-size:15px; margin:0;">
        ${reply.replace(/\n/g, '<br>')}
      </p>
    </div>
    <table cellpadding="0" cellspacing="0" style="margin:30px 0;">
      <tr>
        <td align="center" style="background:#dc2626; color:#ffffff; padding:14px 32px; border-radius:8px; font-size:16px; font-weight:600;">
          <a href="${process.env.CLIENT_URL}/dashboard" style="color:#ffffff; text-decoration:none;">
            Voir ma réponse
          </a>
        </td>
      </tr>
    </table>
    <p style="color:#6b7280; font-size:14px; line-height:1.6; margin:0;">
      Cordialement, l'équipe ESPOIRS ACADEMY.
    </p>
  `;

  await sendEmail(to, 'Réponse à votre message — ESPOIRS ACADEMY', html);
};

export default getTransporter;