import { Role } from '@prisma/client'
import { getAuthenticatedUser } from '../../../../utils/auth'
import { prisma } from '../../../../utils/prisma'

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

  const body = await readBody(event).catch(() => ({}))
  const isApproved = typeof body?.isApprovedMinor === 'boolean' ? body.isApprovedMinor : true

  const volunteer = await prisma.user.findUnique({
    where: { id }
  })

  if (!volunteer) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Bénévole introuvable.'
    })
  }

  if (!volunteer.isMinor) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Ce bénévole n\'est pas déclaré mineur.'
    })
  }

  const updatedVolunteer = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: {
        isApprovedMinor: isApproved
      }
    })

    await tx.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'APPROVE_MINOR',
        targetId: volunteer.id,
        details: isApproved
          ? `Validation de l'autorisation parentale pour ${volunteer.firstName} ${volunteer.lastName} (${volunteer.email})`
          : `Révocation de l'autorisation parentale pour ${volunteer.firstName} ${volunteer.lastName} (${volunteer.email})`,
        editionId: volunteer.editionId
      }
    })

    return updated
  })

  return {
    success: true,
    message: isApproved
      ? 'Autorisation parentale validée avec succès.'
      : 'Autorisation parentale révoquée.',
    isApprovedMinor: updatedVolunteer.isApprovedMinor
  }
})
