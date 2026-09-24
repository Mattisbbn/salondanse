import { Role } from '@prisma/client'
import { z } from 'zod'
import { getAuthenticatedUser } from '../../../../utils/auth'
import { prisma } from '../../../../utils/prisma'

const updateSlotMissionSchema = z.object({
  capacity: z.number().int().min(1, 'La capacité minimale est de 1').max(50, 'La capacité maximale est de 50'),
  locationNotes: z.string().trim().optional().nullable()
})

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
      statusMessage: 'Identifiant de créneau manquant.'
    })
  }

  const body = await readBody(event)
  const parseResult = updateSlotMissionSchema.safeParse(body)

  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parseResult.error.issues[0]?.message || 'Données invalides.'
    })
  }

  const { capacity, locationNotes } = parseResult.data

  const slotMission = await prisma.slotMission.findUnique({
    where: { id },
    include: {
      mission: true,
      timeSlot: true,
      _count: {
        select: { registrations: true }
      }
    }
  })

  if (!slotMission) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Créneau introuvable.'
    })
  }

  const registeredCount = slotMission._count.registrations
  if (capacity < registeredCount) {
    throw createError({
      statusCode: 400,
      statusMessage: `La capacité (${capacity}) ne peut pas être inférieure au nombre de bénévoles déjà inscrits (${registeredCount}).`
    })
  }

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.slotMission.update({
      where: { id },
      data: {
        capacityMax: capacity,
        locationNotes: locationNotes !== undefined ? (locationNotes ? locationNotes.trim() : null) : slotMission.locationNotes
      }
    })

    const d = new Date(slotMission.timeSlot.date).toISOString().split('T')[0]
    await tx.auditLog.create({
      data: {
        action: 'SLOT_MISSION_UPDATE',
        details: `Ajustement du créneau "${slotMission.mission.name}" (${slotMission.timeSlot.startTime}-${slotMission.timeSlot.endTime} le ${d}) : Capacité fixée à ${capacity} pers., Lieu: ${res.locationNotes || 'Non précisé'}`,
        adminId: admin.id,
        editionId: slotMission.mission.editionId
      }
    })

    return res
  })

  return {
    success: true,
    message: 'Créneau mis à jour avec succès.',
    slotMission: updated
  }
})
