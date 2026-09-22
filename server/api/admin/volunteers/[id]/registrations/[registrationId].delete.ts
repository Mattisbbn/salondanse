import { getAuthenticatedUser } from '../../../../../utils/auth'
import { prisma } from '../../../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const admin = await getAuthenticatedUser(event)

  if (admin.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Accès réservé aux administrateurs.'
    })
  }

  const volunteerId = getRouterParam(event, 'id')
  const registrationId = getRouterParam(event, 'registrationId')

  if (!volunteerId || !registrationId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Paramètres manquants.'
    })
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: volunteerId }
  })

  if (!targetUser) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Bénévole introuvable.'
    })
  }

  const registration = await prisma.registration.findFirst({
    where: {
      id: registrationId,
      userId: volunteerId
    },
    include: {
      slotMission: {
        include: {
          mission: true,
          timeSlot: true
        }
      }
    }
  })

  if (!registration) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Affectation introuvable pour ce bénévole.'
    })
  }

  await prisma.$transaction(async (tx) => {
    await tx.registration.delete({
      where: { id: registrationId }
    })

    const dateFormatted = registration.slotMission.timeSlot.date.toISOString().split('T')[0]

    await tx.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'ADMIN_REMOVE_MISSION',
        targetId: targetUser.id,
        details: `Suppression d'affectation : mission "${registration.slotMission.mission.name}" (${registration.slotMission.timeSlot.startTime}-${registration.slotMission.timeSlot.endTime} du ${dateFormatted})`,
        editionId: targetUser.editionId
      }
    })
  })

  return {
    success: true,
    message: 'Affectation supprimée avec succès.'
  }
})
