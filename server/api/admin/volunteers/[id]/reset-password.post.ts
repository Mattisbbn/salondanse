import crypto from 'node:crypto'
import { Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { getAuthenticatedUser } from '../../../../utils/auth'
import { sendPasswordResetEmail } from '../../../../utils/email'
import { prisma } from '../../../../utils/prisma'

const resetSchema = z.object({
  mode: z.enum(['temporary', 'link']).default('temporary'),
  temporaryPassword: z.string().min(8, 'Le mot de passe temporaire doit comporter au moins 8 caractères.').optional()
})

export default defineEventHandler(async (event) => {
  const admin = await getAuthenticatedUser(event)

  if (admin.role !== Role.ADMIN) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Accès réservé aux administrateurs.'
    })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Identifiant bénévole manquant.'
    })
  }

  const volunteer = await prisma.user.findUnique({
    where: { id }
  })

  if (!volunteer) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Bénévole introuvable.'
    })
  }

  const rawBody = await readBody(event).catch(() => ({}))
  const parsed = resetSchema.safeParse(rawBody || {})

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Données invalides.'
    })
  }

  const { mode } = parsed.data

  if (mode === 'link') {
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 3600000) // 1 heure

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: volunteer.id },
        data: {
          resetPasswordToken: token,
          resetPasswordExpires: expiresAt
        }
      })

      await tx.auditLog.create({
        data: {
          adminId: admin.id,
          action: 'ADMIN_RESET_PASSWORD',
          targetId: volunteer.id,
          details: `Envoi d'un lien de réinitialisation de mot de passe à ${volunteer.firstName} ${volunteer.lastName} (${volunteer.email})`,
          editionId: volunteer.editionId
        }
      })
    })

    const config = useRuntimeConfig()
    const baseUrl = (config.public.siteUrl as string) || 'http://localhost:3000'
    const resetUrl = `${baseUrl}/espace-benevole/reset-password?token=${token}`

    await sendPasswordResetEmail({
      to: volunteer.email,
      name: volunteer.firstName,
      resetUrl
    })

    return {
      success: true,
      mode: 'link',
      message: `Un lien direct de réinitialisation a été généré et envoyé à ${volunteer.email}.`,
      resetUrl
    }
  }

  // Mode 'temporary'
  const tempPassword = parsed.data.temporaryPassword || `Danse2027!${crypto.randomBytes(3).toString('hex').toUpperCase()}`
  const hashedPassword = await bcrypt.hash(tempPassword, 10)

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: volunteer.id },
      data: {
        passwordHash: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null
      }
    })

    await tx.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'ADMIN_RESET_PASSWORD',
        targetId: volunteer.id,
        details: `Définition d'un mot de passe temporaire pour ${volunteer.firstName} ${volunteer.lastName} (${volunteer.email})`,
        editionId: volunteer.editionId
      }
    })
  })

  return {
    success: true,
    mode: 'temporary',
    temporaryPassword: tempPassword,
    message: `Le mot de passe de ${volunteer.firstName} ${volunteer.lastName} a été mis à jour avec succès.`
  }
})
