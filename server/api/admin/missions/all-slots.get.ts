import { getAuthenticatedUser } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const admin = await getAuthenticatedUser(event)

  if (admin.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Accès réservé aux administrateurs.'
    })
  }

  const timeSlots = await prisma.timeSlot.findMany({
    where: {
      edition: { isCurrent: true }
    },
    orderBy: [
      { date: 'asc' },
      { orderIndex: 'asc' }
    ],
    include: {
      slotMissions: {
        include: {
          mission: true,
          _count: {
            select: { registrations: true }
          }
        }
      }
    }
  })

  // Formatage structuré
  const slotsList = timeSlots.map((ts) => {
    const d = new Date(ts.date)
    const dayLabel = d.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC'
    })

    return {
      id: ts.id,
      date: ts.date.toISOString(),
      startTime: ts.startTime,
      endTime: ts.endTime,
      orderIndex: ts.orderIndex,
      label: `${dayLabel} • ${ts.startTime} - ${ts.endTime}`,
      missions: ts.slotMissions.map(sm => ({
        slotMissionId: sm.id,
        missionId: sm.mission.id,
        name: sm.mission.name,
        description: sm.mission.description,
        isSensitive: sm.mission.isSensitive,
        capacityMax: sm.capacityMax,
        registeredCount: sm._count.registrations,
        availablePlaces: Math.max(0, sm.capacityMax - sm._count.registrations)
      }))
    }
  })

  return {
    slots: slotsList
  }
})
