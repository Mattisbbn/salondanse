import { getAuthenticatedUser } from '../../utils/auth'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)

  const mySelectedSlotMissionIds = new Set(
    user.registrations.map(r => r.slotMissionId)
  )

  const timeSlots = await prisma.timeSlot.findMany({
    where: {
      edition: {
        isCurrent: true
      }
    },
    orderBy: [
      { date: 'asc' },
      { orderIndex: 'asc' }
    ],
    include: {
      slotMissions: {
        include: {
          mission: {
            select: {
              id: true,
              name: true,
              description: true,
              isSensitive: true
            }
          },
          _count: {
            select: {
              registrations: true
            }
          }
        }
      }
    }
  })

  // Regroupement par jour
  const daysMap = new Map<string, {
    date: string
    dayKey: string
    dayLabel: string
    fullDayLabel: string
    slots: Array<{
      id: string
      date: string
      startTime: string
      endTime: string
      orderIndex: number
      missions: Array<{
        id: string
        missionId: string
        name: string
        description: string | null
        capacityMax: number
        registeredCount: number
        availablePlaces: number
        isSelectedByMe: boolean
      }>
    }>
  }>()

  for (const ts of timeSlots) {
    const isoDate = ts.date.toISOString()
    const dayKey = isoDate.split('T')[0] || ''

    if (!daysMap.has(dayKey)) {
      const d = new Date(ts.date)
      const dayNameShort = d.toLocaleDateString('fr-FR', { weekday: 'short', timeZone: 'UTC' })
      const dayNum = d.getUTCDate()
      const monthNameShort = d.toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' })
      const fullDayLabel = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

      const dayLabel = `${dayNameShort.charAt(0).toUpperCase() + dayNameShort.slice(1)}. ${dayNum} ${monthNameShort.charAt(0).toUpperCase() + monthNameShort.slice(1)}`

      daysMap.set(dayKey, {
        date: isoDate,
        dayKey,
        dayLabel,
        fullDayLabel: fullDayLabel.charAt(0).toUpperCase() + fullDayLabel.slice(1),
        slots: []
      })
    }

    const currentDay = daysMap.get(dayKey)!

    const missions = ts.slotMissions
      .map((sm) => {
        const registeredCount = sm._count.registrations
        const availablePlaces = Math.max(0, sm.capacityMax - registeredCount)
        const isSelectedByMe = mySelectedSlotMissionIds.has(sm.id)
        const isAssignedByAdmin = sm.mission.isSensitive && isSelectedByMe

        return {
          id: sm.id,
          missionId: sm.mission.id,
          name: sm.mission.name,
          description: sm.mission.description,
          capacityMax: sm.capacityMax,
          registeredCount,
          availablePlaces,
          isSelectedByMe,
          isSensitive: sm.mission.isSensitive,
          isAssignedByAdmin
        }
      })
      .sort((a, b) => {
        if (a.isSensitive !== b.isSensitive) {
          return a.isSensitive ? 1 : -1
        }
        return a.name.localeCompare(b.name, 'fr')
      })

    currentDay.slots.push({
      id: ts.id,
      date: isoDate,
      startTime: ts.startTime,
      endTime: ts.endTime,
      orderIndex: ts.orderIndex,
      missions
    })
  }

  const edition = await prisma.edition.findUnique({
    where: { id: user.editionId }
  })

  const now = new Date()
  const isRegistrationOpen = Boolean(
    edition?.isRegistrationOpen
    && (!edition.registrationStartDate || now >= edition.registrationStartDate)
    && (!edition.registrationEndDate || now <= edition.registrationEndDate)
  )

  return {
    planningStatus: user.planningStatus,
    planningLockedAt: user.planningLockedAt,
    isLocked: user.isLocked || user.planningStatus === 'CONFIRMED',
    isRegistrationOpen,
    registrationStartDate: edition?.registrationStartDate?.toISOString() || null,
    registrationEndDate: edition?.registrationEndDate?.toISOString() || null,
    mySelectedSlotMissionIds: Array.from(mySelectedSlotMissionIds),
    days: Array.from(daysMap.values())
  }
})
