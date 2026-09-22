import { RegistrationStatus } from '@prisma/client'
import { prisma } from '../utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const userId = typeof query.userId === 'string' ? query.userId.trim() : ''

  if (!userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Identifiant de badge manquant.'
    })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      edition: true,
      registrations: {
        include: {
          slotMission: {
            include: {
              mission: true,
              timeSlot: true
            }
          }
        },
        orderBy: [
          { slotMission: { timeSlot: { date: 'asc' } } },
          { slotMission: { timeSlot: { orderIndex: 'asc' } } }
        ]
      }
    }
  })

  if (!user) {
    return {
      valid: false,
      message: 'Badge introuvable dans la base de données.'
    }
  }

  const isConfirmed = user.planningStatus === RegistrationStatus.CONFIRMED

  return {
    valid: isConfirmed,
    status: user.planningStatus,
    volunteer: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      photoUrl: user.photoUrl,
      isMinor: user.isMinor,
      isApprovedMinor: user.isApprovedMinor,
      planningLockedAt: user.planningLockedAt,
      editionName: user.edition.name,
      editionYear: user.edition.year,
      missions: user.registrations.map(r => ({
        id: r.id,
        missionName: r.slotMission.mission.name,
        isSensitive: r.slotMission.mission.isSensitive,
        date: r.slotMission.timeSlot.date.toISOString(),
        timeSlot: `${r.slotMission.timeSlot.startTime} - ${r.slotMission.timeSlot.endTime}`
      }))
    }
  }
})
