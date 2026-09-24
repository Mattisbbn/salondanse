import { Role } from '@prisma/client'
import { getAuthenticatedUser } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const admin = await getAuthenticatedUser(event)

  if (admin.role !== Role.ADMIN) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Accès réservé aux administrateurs.'
    })
  }

  const query = getQuery(event)
  let editionId = typeof query.editionId === 'string' ? query.editionId : undefined

  if (!editionId) {
    const currentEdition = await prisma.edition.findFirst({
      where: { isCurrent: true }
    })
    if (!currentEdition) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Aucune édition active trouvée.'
      })
    }
    editionId = currentEdition.id
  }

  const edition = await prisma.edition.findUnique({
    where: { id: editionId }
  })

  if (!edition) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Édition introuvable.'
    })
  }

  // 1. Récupérer toutes les missions du catalogue pour cette édition
  const catalogMissions = await prisma.mission.findMany({
    where: { editionId },
    orderBy: [
      { isSensitive: 'asc' },
      { name: 'asc' }
    ]
  })

  // 2. Récupérer tous les créneaux horaires avec leurs missions planifiées (SlotMission)
  const timeSlots = await prisma.timeSlot.findMany({
    where: { editionId },
    orderBy: [
      { date: 'asc' },
      { orderIndex: 'asc' }
    ],
    include: {
      slotMissions: {
        include: {
          mission: true,
          registrations: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                  photoUrl: true
                }
              }
            },
            orderBy: { createdAt: 'asc' }
          },
          _count: {
            select: { registrations: true }
          }
        },
        orderBy: [
          { mission: { isSensitive: 'asc' } },
          { mission: { name: 'asc' } }
        ]
      }
    }
  })

  // 3. Structuration par jour
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
      label: string
      slotMissions: Array<{
        id: string
        missionId: string
        timeSlotId: string
        capacity: number
        capacityMax: number
        locationNotes: string | null
        mission: {
          id: string
          name: string
          description: string | null
          color: string | null
          isSensitive: boolean
          isActive: boolean
        }
        registeredCount: number
        availablePlaces: number
        registrations: Array<{
          id: string
          user: {
            id: string
            firstName: string
            lastName: string
            email: string
            phone: string
            photoUrl: string | null
          }
        }>
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

    const formattedSlotMissions = ts.slotMissions.map((sm) => {
      const registeredCount = sm._count.registrations
      const availablePlaces = Math.max(0, sm.capacityMax - registeredCount)

      return {
        id: sm.id,
        missionId: sm.mission.id,
        timeSlotId: ts.id,
        capacity: sm.capacityMax,
        capacityMax: sm.capacityMax,
        locationNotes: sm.locationNotes,
        mission: {
          id: sm.mission.id,
          name: sm.mission.name,
          description: sm.mission.description,
          color: sm.mission.color,
          isSensitive: sm.mission.isSensitive,
          isActive: sm.mission.isActive
        },
        registeredCount,
        availablePlaces,
        registrations: sm.registrations.map(r => ({
          id: r.id,
          user: {
            id: r.user.id,
            firstName: r.user.firstName,
            lastName: r.user.lastName,
            email: r.user.email,
            phone: r.user.phone,
            photoUrl: r.user.photoUrl
          }
        }))
      }
    })

    currentDay.slots.push({
      id: ts.id,
      date: isoDate,
      startTime: ts.startTime,
      endTime: ts.endTime,
      orderIndex: ts.orderIndex,
      label: `${ts.startTime} - ${ts.endTime}`,
      slotMissions: formattedSlotMissions
    })
  }

  return {
    edition: {
      id: edition.id,
      name: edition.name,
      year: edition.year
    },
    catalogMissions: catalogMissions.map(m => ({
      id: m.id,
      name: m.name,
      description: m.description,
      color: m.color,
      isSensitive: m.isSensitive,
      isActive: m.isActive
    })),
    days: Array.from(daysMap.values())
  }
})
