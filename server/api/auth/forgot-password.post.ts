import crypto from 'node:crypto'
import { z } from 'zod'
import { sendPasswordResetEmail } from '../../utils/email'
import { prisma } from '../../utils/prisma'

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Adresse e-mail invalide.').toLowerCase()
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parseResult = forgotPasswordSchema.safeParse(body)

  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parseResult.error.issues[0]?.message || 'Adresse e-mail invalide.'
    })
  }

  const { email } = parseResult.data

  const user = await prisma.user.findUnique({
    where: { email }
  })

  // Sécurité : message générique même si l'e-mail n'existe pas en base
  const genericResponse = {
    success: true,
    message: 'Si cette adresse e-mail correspond à un compte actif, un lien de réinitialisation vous a été envoyé par e-mail.'
  }

  if (!user) {
    return genericResponse
  }

  // Génération d'un token sécurisé de 32 octets (64 caractères hexadécimaux)
  const resetToken = crypto.randomBytes(32).toString('hex')
  const resetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 heure de validité

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetExpires
    }
  })

  // Construction de l'URL de réinitialisation
  const origin = getRequestHeader(event, 'origin') || getRequestHeader(event, 'host') || 'http://localhost:3000'
  const baseUrl = origin.startsWith('http') ? origin : `http://${origin}`
  const resetUrl = `${baseUrl}/espace-benevole/reset-password?token=${resetToken}`

  await sendPasswordResetEmail({
    to: user.email,
    name: `${user.firstName} ${user.lastName}`,
    resetUrl
  })

  return genericResponse
})
