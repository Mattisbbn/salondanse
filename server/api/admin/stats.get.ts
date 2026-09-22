import { getAuthenticatedUser } from '../../utils/auth'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const admin = await getAuthenticatedUser(event)

  if (admin.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Accès réservé aux administrateurs.'
    })
  }

  const currentEdition = await prisma.edition.findFirst({
    where: { isCurrent: true }
  })

  if (!currentEdition) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Aucune édition courante configurée.'
    })
  }

  // 1. Statistiques Bénévoles
  const totalVolunteers = await prisma.user.count({
    where: {
      editionId: currentEdition.id,
      role: 'BENEVOLE'
    }
  })

  const confirmedPlannings = await prisma.user.count({
    where: {
      editionId: currentEdition.id,
      role: 'BENEVOLE',
      planningStatus: 'CONFIRMED'
    }
  })

  const draftPlannings = await prisma.user.count({
    where: {
      editionId: currentEdition.id,
      role: 'BENEVOLE',
      planningStatus: 'DRAFT'
    }
  })

  // 2. Statistiques Invitations
  const totalInvitations = await prisma.invitationCode.count({
    where: { editionId: currentEdition.id }
  })

  const usedInvitations = await prisma.invitationCode.count({
    where: {
      editionId: currentEdition.id,
      isUsed: true
    }
  })

  const availableInvitations = Math.max(0, totalInvitations - usedInvitations)

  // 3. Capacités et Inscriptions globales
  const slotMissions = await prisma.slotMission.findMany({
    where: {
      timeSlot: { editionId: currentEdition.id }
    },
    include: {
      mission: true,
      timeSlot: true,
      _count: {
        select: { registrations: true }
      }
    }
  })

  let totalCapacity = 0
  let totalRegistrations = 0

  for (const sm of slotMissions) {
    totalCapacity += sm.capacityMax
    totalRegistrations += sm._count.registrations
  }

  const globalFillingRate = totalCapacity > 0
    ? Math.round((totalRegistrations / totalCapacity) * 100)
    : 0

  // 4. Ventilation par Jour
  const daysMap = new Map<string, {
    date: string
    dayLabel: string
    fullDayLabel: string
    totalCapacity: number
    totalRegistrations: number
    fillingRate: number
  }>()

  for (const sm of slotMissions) {
    const isoDate = sm.timeSlot.date.toISOString()
    const dayKey = isoDate.split('T')[0] || ''

    if (!daysMap.has(dayKey)) {
      const d = new Date(sm.timeSlot.date)
      const dayShort = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
      const dayFull = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })

      daysMap.set(dayKey, {
        date: isoDate,
        dayLabel: dayShort.charAt(0).toUpperCase() + dayShort.slice(1),
        fullDayLabel: dayFull.charAt(0).toUpperCase() + dayFull.slice(1),
        totalCapacity: 0,
        totalRegistrations: 0,
        fillingRate: 0
      })
    }

    const dayObj = daysMap.get(dayKey)!
    dayObj.totalCapacity += sm.capacityMax
    dayObj.totalRegistrations += sm._count.registrations
  }

  const daysBreakdown = Array.from(daysMap.values()).map(d => ({
    ...d,
    fillingRate: d.totalCapacity > 0 ? Math.round((d.totalRegistrations / d.totalCapacity) * 100) : 0
  }))

  // 5. Ventilation par Mission
  const missionsMap = new Map<string, {
    id: string
    name: string
    isSensitive: boolean
    totalCapacity: number
    totalRegistrations: number
    fillingRate: number
  }>()

  for (const sm of slotMissions) {
    const mId = sm.mission.id
    if (!missionsMap.has(mId)) {
      missionsMap.set(mId, {
        id: mId,
        name: sm.mission.name,
        isSensitive: sm.mission.isSensitive,
        totalCapacity: 0,
        totalRegistrations: 0,
        fillingRate: 0
      })
    }

    const mObj = missionsMap.get(mId)!
    mObj.totalCapacity += sm.capacityMax
    mObj.totalRegistrations += sm._count.registrations
  }

  const missionsBreakdown = Array.from(missionsMap.values())
    .map(m => ({
      ...m,
      fillingRate: m.totalCapacity > 0 ? Math.round((m.totalRegistrations / m.totalCapacity) * 100) : 0
    }))
    .sort((a, b) => b.fillingRate - a.fillingRate)

  return {
    overview: {
      totalVolunteers,
      confirmedPlannings,
      draftPlannings,
      totalInvitations,
      usedInvitations,
      availableInvitations,
      totalCapacity,
      totalRegistrations,
      globalFillingRate
    },
    days: daysBreakdown,
    missions: missionsBreakdown,
    edition: {
      id: currentEdition.id,
      name: currentEdition.name,
      year: currentEdition.year,
      isRegistrationOpen: currentEdition.isRegistrationOpen,
      registrationStartDate: currentEdition.registrationStartDate?.toISOString() || null,
      registrationEndDate: currentEdition.registrationEndDate?.toISOString() || null
    }
  }
})
