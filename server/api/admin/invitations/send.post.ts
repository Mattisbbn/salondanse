import { z } from 'zod'
import { getAuthenticatedUser } from '../../../utils/auth'
import { generateInvitationCode, sendInvitationEmail } from '../../../utils/email'
import { prisma } from '../../../utils/prisma'

const sendSchema = z.object({
  email: z.string().trim().email('Format d\'adresse e-mail invalide')
})

export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)

  if (user.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Accès réservé aux administrateurs.'
    })
  }

  const rawBody = await readBody(event)
  const parseResult = sendSchema.safeParse(rawBody)

  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]?.message || 'Données invalides.'
    throw createError({
      statusCode: 400,
      statusMessage: firstError
    })
  }

  const { email } = parseResult.data

  // Récupération de l'édition courante
  const currentEdition = await prisma.edition.findFirst({
    where: { isCurrent: true }
  })

  if (!currentEdition) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Aucune édition courante n\'est configurée.'
    })
  }

  // Génération d'un code unique
  let code = generateInvitationCode()
  let isUnique = false
  let attempts = 0

  while (!isUnique && attempts < 10) {
    const existing = await prisma.invitationCode.findUnique({
      where: { code }
    })
    if (!existing) {
      isUnique = true
    } else {
      code = generateInvitationCode()
      attempts++
    }
  }

  if (!isUnique) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Impossible de générer un code unique. Veuillez réessayer.'
    })
  }

  // Enregistrement en base de données
  const invitation = await prisma.invitationCode.create({
    data: {
      code,
      editionId: currentEdition.id,
      isUsed: false
    }
  })

  // Construction de l'URL d'inscription
  const config = useRuntimeConfig(event)
  const siteUrl = config.public.siteUrl || 'http://localhost:3000'
  const registrationUrl = `${siteUrl}/espace-benevole/register?code=${code}`

  // Envoi de l'e-mail (ou simulation en console si SMTP absent)
  await sendInvitationEmail({
    to: email,
    code,
    registrationUrl
  })

  return {
    success: true,
    message: `Invitation envoyée avec succès à ${email}`,
    invitation: {
      id: invitation.id,
      code: invitation.code,
      isUsed: invitation.isUsed,
      createdAt: invitation.createdAt,
      email,
      registrationUrl
    }
  }
})
