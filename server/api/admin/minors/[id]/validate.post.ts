import { Role } from '@prisma/client'
import { z } from 'zod'
import { getAuthenticatedUser } from '../../../../utils/auth'
import { prisma } from '../../../../utils/prisma'

const validateSchema = z.object({
  status: z.enum(['VALIDATED', 'REJECTED'])
})

export default defineEventHandler(async (event) => {
  const admin = await getAuthenticatedUser(event)

  if (admin.role !== Role.ADMIN) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Accès réservé aux administrateurs.'
    })
  }

  const minorId = getRouterParam(event, 'id')
  if (!minorId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Identifiant du bénévole manquant.'
    })
  }

  const body = await readBody(event)
  const parseResult = validateSchema.safeParse(body)

  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Statut invalide. Utilisez VALIDATED ou REJECTED.'
    })
  }

  const { status } = parseResult.data

  const targetUser = await prisma.user.findUnique({
    where: { id: minorId }
  })

  if (!targetUser) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Bénévole introuvable.'
    })
  }

  if (!targetUser.isMinor) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Ce compte n\'est pas enregistré comme mineur.'
    })
  }

  const isApproved = status === 'VALIDATED'

  const updatedUser = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: minorId },
      data: {
        minorValidationStatus: status,
        isApprovedMinor: isApproved
      }
    })

    await tx.auditLog.create({
      data: {
        adminId: admin.id,
        action: isApproved ? 'VALIDATE_MINOR' : 'REJECT_MINOR',
        targetId: u.id,
        details: isApproved
          ? `Validation de l'autorisation parentale pour ${u.firstName} ${u.lastName} (${u.email})`
          : `Refus de l'autorisation parentale pour ${u.firstName} ${u.lastName} (${u.email})`,
        editionId: u.editionId
      }
    })

    return u
  })

  return {
    success: true,
    message: isApproved
      ? `Le profil de ${updatedUser.firstName} ${updatedUser.lastName} a été validé avec succès.`
      : `Le profil de ${updatedUser.firstName} ${updatedUser.lastName} a été refusé.`,
    user: {
      id: updatedUser.id,
      minorValidationStatus: updatedUser.minorValidationStatus,
      isApprovedMinor: updatedUser.isApprovedMinor
    }
  }
})
