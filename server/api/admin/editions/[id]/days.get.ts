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

  const editionId = getRouterParam(event, 'id')
  if (!editionId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Identifiant d\'édition manquant.'
    })
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

  // Récupérer tous les créneaux horaires de l'édition avec le décompte des inscriptions
  const timeSlots = await prisma.timeSlot.findMany({
    where: { editionId },
    orderBy: [
      { date: 'asc' },
      { orderIndex: 'asc' }
    ],
    include: {
      slotMissions: {
        select: {
          id: true,
          _count: {
            select: { registrations: true }
          }
        }
      }
    }
  })

  // Regroupement des dates par jour
  const daysMap = new Map<string, {
    date: string
    dayKey: string
    dayLabel: string
    slotsCount: number
    registrationsCount: number
    isActive: boolean
  }>()

  // 1. Initialiser avec les dates présentes dans timeSlots
  for (const ts of timeSlots) {
    const dayKey = ts.date.toISOString().split('T')[0] ?? ''
    const regCount = ts.slotMissions.reduce((acc, sm) => acc + sm._count.registrations, 0)

    if (!daysMap.has(dayKey)) {
      const d = new Date(ts.date)
      const dayLabel = d.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
      })

      daysMap.set(dayKey, {
        date: ts.date.toISOString(),
        dayKey,
        dayLabel: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1),
        slotsCount: 1,
        registrationsCount: regCount,
        isActive: true
      })
    } else {
      const entry = daysMap.get(dayKey)!
      entry.slotsCount += 1
      entry.registrationsCount += regCount
    }
  }

  // 2. Ajouter les eventDays déclarés dans edition qui n'auraient pas encore de slots
  for (const dayKey of edition.eventDays || []) {
    if (!daysMap.has(dayKey)) {
      const d = new Date(`${dayKey}T00:00:00Z`)
      const dayLabel = d.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
      })

      daysMap.set(dayKey, {
        date: `${dayKey}T00:00:00.000Z`,
        dayKey,
        dayLabel: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1),
        slotsCount: 0,
        registrationsCount: 0,
        isActive: true
      })
    }
  }

  const daysList = Array.from(daysMap.values()).sort((a, b) => a.dayKey.localeCompare(b.dayKey))

  return {
    edition: {
      id: edition.id,
      name: edition.name,
      year: edition.year,
      eventStartDate: edition.eventStartDate?.toISOString() || null,
      eventEndDate: edition.eventEndDate?.toISOString() || null,
      eventDays: edition.eventDays || []
    },
    days: daysList
  }
})
