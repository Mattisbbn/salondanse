import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../../utils/prisma'

const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, 'Token de réinitialisation requis.'),
  newPassword: z.string().min(8, 'Le nouveau mot de passe doit comporter au moins 8 caractères.')
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parseResult = resetPasswordSchema.safeParse(body)

  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parseResult.error.issues[0]?.message || 'Données invalides.'
    })
  }

  const { token, newPassword } = parseResult.data

  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: token,
      resetPasswordExpires: {
        gt: new Date()
      }
    }
  })

  if (!user) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Le lien de réinitialisation est invalide ou a expiré. Veuillez refaire une demande.'
    })
  }

  const passwordHash = await bcrypt.hash(newPassword, 10)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetPasswordToken: null,
      resetPasswordExpires: null
    }
  })

  return {
    success: true,
    message: 'Votre mot de passe a été mis à jour avec succès ! Vous pouvez à présent vous connecter.'
  }
})
