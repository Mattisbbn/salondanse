import crypto from 'node:crypto'
import nodemailer from 'nodemailer'

/**
 * Génère un code d'invitation cryptographiquement sûr et lisible
 * Exemple : DANSE-A8F3K9X2 (sans caractères ambigus 0, O, 1, I)
 */
export function generateInvitationCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  const bytes = crypto.randomBytes(8)
  let code = 'DANSE-'
  for (let i = 0; i < 8; i++) {
    const byte = bytes[i] ?? 0
    code += chars[byte % chars.length]
  }
  return code
}

export interface SendInvitationOptions {
  to: string
  code: string
  registrationUrl: string
}

export async function sendInvitationEmail(options: SendInvitationOptions) {
  const config = useRuntimeConfig()

  const host = process.env.SMTP_HOST || config.smtpHost
  const port = Number(process.env.SMTP_PORT || config.smtpPort) || 587
  const user = process.env.SMTP_USER || config.smtpUser
  const pass = process.env.SMTP_PASS || config.smtpPass
  const from = process.env.SMTP_FROM || config.smtpFrom || 'Salon de la Danse <no-reply@salondeladanse.fr>'

  const isSmtpConfigured = Boolean(host && user && pass)

  const emailHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation Bénévolat - Salon de la Danse 2027</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #0F172A;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden;">
    <tr>
      <td style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #F1F5F9;">
        <div style="display: inline-block; background-color: #7C3AED; color: #FFFFFF; font-weight: 700; font-size: 13px; padding: 6px 12px; border-radius: 8px; margin-bottom: 16px;">
          SD 2027
        </div>
        <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #0F172A; line-height: 1.3;">
          Salon de la Danse d'Angers 2027
        </h1>
        <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748B;">
          Invitation officielle pour l'équipe bénévole
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #334155;">
          Bonjour,<br><br>
          Votre candidature a été retenue pour rejoindre l'équipe des bénévoles du <strong>Salon de la Danse</strong> qui se tiendra du 14 au 16 mai 2027 à Angers.
        </p>

        <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #334155;">
          Pour finaliser votre compte et accéder au choix de vos créneaux de mission, veuillez cliquer sur le bouton ci-dessous :
        </p>

        <!-- Bouton CTA -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="${options.registrationUrl}" target="_blank" style="display: inline-block; background-color: #7C3AED; color: #FFFFFF; font-weight: 600; font-size: 15px; text-decoration: none; padding: 14px 28px; border-radius: 10px; box-shadow: 0 2px 4px rgba(124, 58, 237, 0.2);">
            Finaliser mon inscription
          </a>
        </div>

        <!-- Encadré Code de secours -->
        <div style="background-color: #F1F5F9; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin: 28px 0; text-align: center;">
          <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
            Ou utilisez directement ce code :
          </p>
          <div style="font-family: monospace, Consolas, Monaco; font-size: 20px; font-weight: 700; letter-spacing: 2px; color: #7C3AED;">
            ${options.code}
          </div>
        </div>

        <p style="margin: 0; font-size: 13px; color: #64748B; line-height: 1.5;">
          Ce code est strictement personnel et à usage unique.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 32px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #94A3B8;">
          Salon de la Danse Angers • 14, 15 et 16 Mai 2027<br>
          Ce message a été envoyé automatiquement, merci de ne pas y répondre.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`

  if (!isSmtpConfigured) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📧 [DEV EMAIL SIMULATOR - Salon de la Danse 2027]')
    console.log(`➡️  Destinataire       : ${options.to}`)
    console.log(`🔑  Code d'invitation : ${options.code}`)
    console.log(`🔗  Lien direct       : ${options.registrationUrl}`)
    console.log('ℹ️  SMTP non configuré. Envoi simulé avec succès en local.')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    return {
      success: true,
      simulated: true,
      code: options.code,
      url: options.registrationUrl
    }
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  })

  await transporter.sendMail({
    from,
    to: options.to,
    subject: 'Salon de la Danse 2027 • Votre invitation à rejoindre l\'équipe bénévole',
    html: emailHtml
  })

  return {
    success: true,
    simulated: false,
    code: options.code,
    url: options.registrationUrl
  }
}

export interface SendResetPasswordOptions {
  to: string
  name: string
  resetUrl: string
}

export async function sendPasswordResetEmail(options: SendResetPasswordOptions) {
  const config = useRuntimeConfig()

  const host = process.env.SMTP_HOST || config.smtpHost
  const port = Number(process.env.SMTP_PORT || config.smtpPort) || 587
  const user = process.env.SMTP_USER || config.smtpUser
  const pass = process.env.SMTP_PASS || config.smtpPass
  const from = process.env.SMTP_FROM || config.smtpFrom || 'Salon de la Danse <no-reply@salondeladanse.fr>'

  const isSmtpConfigured = Boolean(host && user && pass)

  const emailHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialisation de mot de passe - Salon de la Danse 2027</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #0F172A;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden;">
    <tr>
      <td style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #F1F5F9;">
        <div style="display: inline-block; background-color: #7C3AED; color: #FFFFFF; font-weight: 700; font-size: 13px; padding: 6px 12px; border-radius: 8px; margin-bottom: 16px;">
          SD 2027
        </div>
        <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #0F172A; line-height: 1.3;">
          Salon de la Danse d'Angers 2027
        </h1>
        <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748B;">
          Réinitialisation sécurisée de votre mot de passe
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #334155;">
          Bonjour ${options.name || ''},<br><br>
          Nous avons reçu une demande de réinitialisation du mot de passe associé à votre compte bénévole ou administrateur.
        </p>

        <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #334155;">
          Pour définir votre nouveau mot de passe, cliquez sur le bouton ci-dessous (ce lien est valable pendant 1 heure) :
        </p>

        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
          <tr>
            <td align="center">
              <a href="${options.resetUrl}" style="display: inline-block; background-color: #7C3AED; color: #FFFFFF; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(124, 58, 237, 0.2);">
                Réinitialiser mon mot de passe →
              </a>
            </td>
          </tr>
        </table>

        <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #64748B;">
          Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité. Votre mot de passe actuel reste inchangé.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px 32px; background-color: #F8FAFC; border-top: 1px solid #F1F5F9; font-size: 12px; color: #94A3B8; text-align: center;">
        Association JayDance Fam • Salon de la Danse d'Angers 2027<br>
        14-16 mai 2027 • Parc des Expositions d'Angers
      </td>
    </tr>
  </table>
</body>
</html>
`

  if (!isSmtpConfigured) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔐 [DEV RESET PASSWORD SIMULATOR - Salon de la Danse 2027]')
    console.log(`➡️  Destinataire : ${options.to}`)
    console.log(`🔗  Lien direct  : ${options.resetUrl}`)
    console.log('ℹ️  SMTP non configuré. Envoi simulé avec succès en local.')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    return {
      success: true,
      simulated: true,
      url: options.resetUrl
    }
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  })

  await transporter.sendMail({
    from,
    to: options.to,
    subject: 'Salon de la Danse 2027 • Réinitialisation de votre mot de passe',
    html: emailHtml
  })

  return {
    success: true,
    simulated: false,
    url: options.resetUrl
  }
}

export interface PlanningSlotSummary {
  date: string
  startTime: string
  endTime: string
  missionName: string
}

export interface SendPlanningConfirmationOptions {
  to: string
  name: string
  slots: PlanningSlotSummary[]
  dashboardUrl: string
}

export async function sendPlanningConfirmationEmail(options: SendPlanningConfirmationOptions) {
  const config = useRuntimeConfig()

  const host = process.env.SMTP_HOST || config.smtpHost
  const port = Number(process.env.SMTP_PORT || config.smtpPort) || 587
  const user = process.env.SMTP_USER || config.smtpUser
  const pass = process.env.SMTP_PASS || config.smtpPass
  const from = process.env.SMTP_FROM || config.smtpFrom || 'Salon de la Danse <no-reply@salondeladanse.fr>'

  const isSmtpConfigured = Boolean(host && user && pass)

  const slotsListHtml = options.slots.map((s) => {
    return `
      <tr style="border-bottom: 1px solid #F1F5F9;">
        <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #0F172A;">
          ${s.date}
        </td>
        <td style="padding: 12px 16px; font-size: 14px; color: #64748B; font-family: monospace;">
          ${s.startTime} - ${s.endTime}
        </td>
        <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #7C3AED;">
          ${s.missionName}
        </td>
      </tr>
    `
  }).join('')

  const emailHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmation de votre planning - Salon de la Danse 2027</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #0F172A;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden;">
    <tr>
      <td style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #F1F5F9;">
        <div style="display: inline-block; background-color: #10B981; color: #FFFFFF; font-weight: 700; font-size: 13px; padding: 6px 12px; border-radius: 8px; margin-bottom: 16px;">
          Planning Confirmé ✓
        </div>
        <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #0F172A; line-height: 1.3;">
          Salon de la Danse d'Angers 2027
        </h1>
        <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748B;">
          Confirmation officielle de vos créneaux de bénévolat
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #334155;">
          Bonjour <strong>${options.name || ''}</strong>,<br><br>
          Votre planning pour le Salon de la Danse 2027 a été <strong>validé et verrouillé</strong> avec succès. Nous vous remercions chaleureusement pour votre engagement !
        </p>

        <h3 style="margin: 24px 0 12px 0; font-size: 15px; font-weight: 700; color: #0F172A;">
          Récapitulatif de vos missions :
        </h3>

        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; margin-bottom: 24px; overflow: hidden; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #F1F5F9; border-bottom: 1px solid #E2E8F0;">
              <th style="padding: 10px 16px; font-size: 12px; font-weight: 700; text-align: left; color: #64748B; text-transform: uppercase;">Jour</th>
              <th style="padding: 10px 16px; font-size: 12px; font-weight: 700; text-align: left; color: #64748B; text-transform: uppercase;">Horaire</th>
              <th style="padding: 10px 16px; font-size: 12px; font-weight: 700; text-align: left; color: #64748B; text-transform: uppercase;">Mission</th>
            </tr>
          </thead>
          <tbody>
            ${slotsListHtml}
          </tbody>
        </table>

        <!-- Consignes d'arrivée -->
        <div style="background-color: #EDE9FE; border: 1px solid #DDD6FE; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
          <h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #6D28D9;">
            📍 Consignes importantes d'arrivée :
          </h4>
          <p style="margin: 0; font-size: 13px; color: #5B21B6; line-height: 1.5;">
            Présentez-vous au <strong>QG Bénévoles</strong> (Parc des Expositions d'Angers) <strong>15 minutes avant</strong> le début de votre premier créneau. Une pièce d'identité sera demandée pour récupérer votre badge d'accès et votre t-shirt officiel.
          </p>
        </div>

        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
          <tr>
            <td align="center">
              <a href="${options.dashboardUrl}" style="display: inline-block; background-color: #7C3AED; color: #FFFFFF; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(124, 58, 237, 0.2);">
                Consulter mon espace bénévole →
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px 32px; background-color: #F8FAFC; border-top: 1px solid #F1F5F9; font-size: 12px; color: #94A3B8; text-align: center;">
        Association JayDance Fam • Salon de la Danse d'Angers 2027<br>
        14-16 mai 2027 • Parc des Expositions d'Angers
      </td>
    </tr>
  </table>
</body>
</html>
`

  if (!isSmtpConfigured) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📧 [DEV PLANNING CONFIRMATION SIMULATOR - Salon de la Danse 2027]')
    console.log(`➡️  Destinataire : ${options.to} (${options.name})`)
    console.log(`📋  Missions     : ${options.slots.length} créneau(x) confirmé(s)`)
    options.slots.forEach((s) => {
      console.log(`    - ${s.date} ${s.startTime}-${s.endTime} : ${s.missionName}`)
    })
    console.log(`🔗  Espace       : ${options.dashboardUrl}`)
    console.log('ℹ️  SMTP non configuré. Envoi simulé avec succès en local.')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    return {
      success: true,
      simulated: true
    }
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  })

  await transporter.sendMail({
    from,
    to: options.to,
    subject: 'Confirmation de votre planning - Salon de la Danse 2027',
    html: emailHtml
  })

  return {
    success: true,
    simulated: false
  }
}
