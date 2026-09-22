import { getAuthenticatedUser } from '../../../../utils/auth'
import { prisma } from '../../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const admin = await getAuthenticatedUser(event)

  if (admin.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Accès réservé aux administrateurs.'
    })
  }

  const volunteerId = getRouterParam(event, 'id')
  if (!volunteerId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID du bénévole requis.'
    })
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: volunteerId }
  })

  if (!targetUser || targetUser.role !== 'BENEVOLE') {
    throw createError({
      statusCode: 404,
      statusMessage: 'Bénévole introuvable.'
    })
  }

  const body = await readBody(event)
  const slotMissionId = body?.slotMissionId

  if (!slotMissionId || typeof slotMissionId !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'slotMissionId est requis.'
    })
  }

  const slotMission = await prisma.slotMission.findUnique({
    where: { id: slotMissionId },
    include: {
      mission: true,
      timeSlot: true
    }
  })

  if (!slotMission) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Créneau / mission introuvable.'
    })
  }

  // Vérification si déjà inscrit à cette mission exacte
  const existingSame = await prisma.registration.findUnique({
    where: {
      userId_slotMissionId: {
        userId: targetUser.id,
        slotMissionId: slotMission.id
      }
    }
  })

  if (existingSame) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Le bénévole est déjà affecté à cette mission sur ce créneau.'
    })
  }

  // Création de l'inscription et de l'AuditLog dans une transaction
  const result = await prisma.$transaction(async (tx) => {
    const registration = await tx.registration.create({
      data: {
        userId: targetUser.id,
        slotMissionId: slotMission.id
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

    const missionTypeLabel = slotMission.mission.isSensitive ? 'Poste sensible' : 'Mission standard'
    const dateFormatted = slotMission.timeSlot.date.toISOString().split('T')[0]

    await tx.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'ADMIN_ASSIGN_MISSION',
        targetId: targetUser.id,
        details: `Assignation manuelle : "${slotMission.mission.name}" (${missionTypeLabel}) sur le créneau ${slotMission.timeSlot.startTime}-${slotMission.timeSlot.endTime} du ${dateFormatted}`,
        editionId: targetUser.editionId
      }
    })

    return registration
  })

  return {
    success: true,
    message: `Mission "${slotMission.mission.name}" assignée avec succès à ${targetUser.firstName} ${targetUser.lastName}.`,
    registration: result
  }
})
