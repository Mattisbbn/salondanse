import type { Prisma, RegistrationStatus } from '@prisma/client'
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

  const query = getQuery(event)
  const q = typeof query.q === 'string' ? query.q.trim() : ''
  const statusFilter = typeof query.status === 'string' ? query.status.trim() : 'ALL'
  const missionId = typeof query.missionId === 'string' && query.missionId.trim() && query.missionId !== 'ALL'
    ? query.missionId.trim()
    : undefined
  const day = typeof query.day === 'string' && query.day.trim() && query.day !== 'ALL'
    ? query.day.trim()
    : undefined

  const whereClause: Prisma.UserWhereInput = {
    role: 'BENEVOLE',
    edition: {
      isCurrent: true
    }
  }

  if (statusFilter === 'DRAFT' || statusFilter === 'CONFIRMED') {
    whereClause.planningStatus = statusFilter as RegistrationStatus
  }

  if (q) {
    whereClause.OR = [
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } }
    ]
  }

  const registrationWhere: Prisma.RegistrationWhereInput = {}

  if (missionId) {
    registrationWhere.slotMission = {
      ...(registrationWhere.slotMission as Prisma.SlotMissionWhereInput || {}),
      missionId
    }
  }

  if (day) {
    const dayStart = new Date(`${day}T00:00:00.000Z`)
    const dayEnd = new Date(`${day}T23:59:59.999Z`)
    registrationWhere.slotMission = {
      ...(registrationWhere.slotMission as Prisma.SlotMissionWhereInput || {}),
      timeSlot: {
        date: {
          gte: dayStart,
          lte: dayEnd
        }
      }
    }
  }

  if (missionId || day) {
    whereClause.registrations = {
      some: registrationWhere
    }
  }

  const volunteers = await prisma.user.findMany({
    where: whereClause,
    orderBy: [
      { lastName: 'asc' },
      { firstName: 'asc' }
    ],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      photoUrl: true,
      isMinor: true,
      isApprovedMinor: true,
      isLocked: true,
      planningStatus: true,
      planningLockedAt: true,
      createdAt: true,
      registrations: {
        orderBy: [
          { slotMission: { timeSlot: { date: 'asc' } } },
          { slotMission: { timeSlot: { orderIndex: 'asc' } } }
        ],
        select: {
          id: true,
          createdAt: true,
          slotMission: {
            select: {
              id: true,
              capacityMax: true,
              mission: {
                select: {
                  id: true,
                  name: true,
                  isSensitive: true
                }
              },
              timeSlot: {
                select: {
                  id: true,
                  date: true,
                  startTime: true,
                  endTime: true,
                  orderIndex: true
                }
              }
            }
          }
        }
      }
    }
  })

  const formatted = volunteers.map((v) => {
    return {
      id: v.id,
      firstName: v.firstName,
      lastName: v.lastName,
      fullName: `${v.firstName} ${v.lastName}`.trim(),
      email: v.email,
      phone: v.phone,
      photoUrl: v.photoUrl,
      isMinor: v.isMinor,
      isApprovedMinor: v.isApprovedMinor,
      isLocked: v.isLocked,
      planningStatus: v.planningStatus,
      planningLockedAt: v.planningLockedAt,
      createdAt: v.createdAt,
      registrationsCount: v.registrations.length,
      registrations: v.registrations.map(r => ({
        id: r.id,
        slotMissionId: r.slotMission.id,
        missionId: r.slotMission.mission.id,
        missionName: r.slotMission.mission.name,
        isSensitive: r.slotMission.mission.isSensitive,
        date: r.slotMission.timeSlot.date.toISOString(),
        startTime: r.slotMission.timeSlot.startTime,
        endTime: r.slotMission.timeSlot.endTime,
        orderIndex: r.slotMission.timeSlot.orderIndex,
        timeSlotId: r.slotMission.timeSlot.id
      }))
    }
  })

  // Récupérer les options de filtres pour l'édition courante
  const currentEdition = await prisma.edition.findFirst({
    where: { isCurrent: true },
    include: {
      missions: {
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, isSensitive: true }
      },
      timeSlots: {
        orderBy: [
          { date: 'asc' },
          { orderIndex: 'asc' }
        ],
        select: { date: true }
      }
    }
  })

  const uniqueDaysMap = new Map<string, string>()
  if (currentEdition?.timeSlots) {
    for (const ts of currentEdition.timeSlots) {
      const iso = ts.date.toISOString().split('T')[0]!
      if (!uniqueDaysMap.has(iso)) {
        const d = new Date(ts.date)
        const label = d.toLocaleDateString('fr-FR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          timeZone: 'UTC'
        })
        uniqueDaysMap.set(iso, label.charAt(0).toUpperCase() + label.slice(1))
      }
    }
  }

  const daysOptions = Array.from(uniqueDaysMap.entries()).map(([value, label]) => ({
    value,
    label
  }))

  const missionsOptions = (currentEdition?.missions || []).map(m => ({
    id: m.id,
    name: m.name + (m.isSensitive ? ' (Sensible)' : '')
  }))

  return {
    volunteers: formatted,
    total: formatted.length,
    filterOptions: {
      missions: missionsOptions,
      days: daysOptions
    }
  }
})
