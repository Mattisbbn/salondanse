import { Role } from '@prisma/client'
import { z } from 'zod'
import { getAuthenticatedUser } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

const scheduleSchema = z.object({
  missionId: z.string().min(1, 'La mission est obligatoire'),
  timeSlotId: z.string().optional(),
  timeSlotIds: z.array(z.string()).optional(),
  capacity: z.number().int().min(1, 'La capacité doit être d\'au moins 1 personne').max(50, 'Capacité max 50'),
  locationNotes: z.string().trim().optional().nullable()
}).refine(data => data.timeSlotId || (data.timeSlotIds && data.timeSlotIds.length > 0), {
  message: 'Au moins un créneau horaire doit être sélectionné.'
})

export default defineEventHandler(async (event) => {
  const admin = await getAuthenticatedUser(event)

  if (admin.role !== Role.ADMIN) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Accès réservé aux administrateurs.'
    })
  }

  const body = await readBody(event)
  const parseResult = scheduleSchema.safeParse(body)

  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parseResult.error.issues[0]?.message || 'Données invalides.'
    })
  }

  const { missionId, timeSlotId, timeSlotIds, capacity, locationNotes } = parseResult.data
  const targetSlotIds = Array.from(new Set(timeSlotIds && timeSlotIds.length > 0 ? timeSlotIds : [timeSlotId!]))

  const mission = await prisma.mission.findUnique({
    where: { id: missionId }
  })

  if (!mission) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Mission introuvable.'
    })
  }

  const slots = await prisma.timeSlot.findMany({
    where: {
      id: { in: targetSlotIds },
      editionId: mission.editionId
    }
  })

  if (slots.length !== targetSlotIds.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Certains créneaux horaires sélectionnés sont invalides ou n\'appartiennent pas à cette édition.'
    })
  }

  // Effectuer les créations ou mises à jour
  const result = await prisma.$transaction(async (tx) => {
    let createdCount = 0
    let updatedCount = 0

    for (const ts of slots) {
      const existing = await tx.slotMission.findUnique({
        where: {
          missionId_timeSlotId: {
            missionId: mission.id,
            timeSlotId: ts.id
          }
        },
        include: {
          _count: {
            select: { registrations: true }
          }
        }
      })

      if (existing) {
        // Si déjà existant, vérifier qu'on ne réduit pas la capacité sous les inscrits
        const safeCapacity = Math.max(capacity, existing._count.registrations)
        await tx.slotMission.update({
          where: { id: existing.id },
          data: {
            capacityMax: safeCapacity,
            locationNotes: locationNotes !== undefined ? locationNotes : existing.locationNotes
          }
        })
        updatedCount++
      } else {
        await tx.slotMission.create({
          data: {
            missionId: mission.id,
            timeSlotId: ts.id,
            capacityMax: capacity,
            locationNotes: locationNotes || null
          }
        })
        createdCount++
      }
    }

    await tx.auditLog.create({
      data: {
        action: 'SLOT_MISSION_SCHEDULE',
        details: `Planification de la mission "${mission.name}" sur ${targetSlotIds.length} créneau(x) (Capacité: ${capacity} pers., Lieu: ${locationNotes || 'Non précisé'})`,
        adminId: admin.id,
        editionId: mission.editionId
      }
    })

    return { createdCount, updatedCount }
  })

  return {
    success: true,
    message: `Mission "${mission.name}" planifiée avec succès sur ${targetSlotIds.length} créneau(x) (${result.createdCount} ajouté(s), ${result.updatedCount} actualisé(s)).`
  }
})
