import { Role } from '@prisma/client'
import { z } from 'zod'
import { getAuthenticatedUser } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

const createMissionSchema = z.object({
  name: z.string().trim().min(1, 'Le nom de la mission est obligatoire'),
  description: z.string().trim().optional().nullable(),
  color: z.string().trim().optional().nullable(),
  isSensitive: z.boolean().default(false),
  defaultCapacity: z.number().int().min(1, 'La capacité minimale est de 1').max(50, 'La capacité maximale est de 50').default(2),
  editionId: z.string().optional()
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
  const parseResult = createMissionSchema.safeParse(body)

  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parseResult.error.issues[0]?.message || 'Données invalides.'
    })
  }

  const data = parseResult.data

  let targetEditionId = data.editionId
  if (!targetEditionId) {
    const currentEdition = await prisma.edition.findFirst({
      where: { isCurrent: true }
    })
    if (!currentEdition) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Aucune édition active trouvée.'
      })
    }
    targetEditionId = currentEdition.id
  }

  // Vérifier qu'une mission du même nom n'existe pas déjà sur cette édition
  const existing = await prisma.mission.findFirst({
    where: {
      name: { equals: data.name, mode: 'insensitive' },
      editionId: targetEditionId
    }
  })

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: `Une mission nommée "${data.name}" existe déjà pour cette édition.`
    })
  }

  // Création de la mission et génération automatique des SlotMission pour tous les TimeSlot existants
  const newMission = await prisma.$transaction(async (tx) => {
    const created = await tx.mission.create({
      data: {
        name: data.name,
        description: data.description || null,
        color: data.color || null,
        isSensitive: data.isSensitive,
        isActive: true,
        defaultCapacity: data.defaultCapacity,
        editionId: targetEditionId
      }
    })

    // Récupération de tous les créneaux existants de l'édition
    const timeSlots = await tx.timeSlot.findMany({
      where: { editionId: targetEditionId }
    })

    if (timeSlots.length > 0) {
      await tx.slotMission.createMany({
        data: timeSlots.map(ts => ({
          missionId: created.id,
          timeSlotId: ts.id,
          capacityMax: created.defaultCapacity
        })),
        skipDuplicates: true
      })
    }

    await tx.auditLog.create({
      data: {
        action: 'MISSION_CREATE',
        details: `Création de la mission "${created.name}" (Sensible: ${created.isSensitive ? 'Oui' : 'Non'}, Capacité: ${created.defaultCapacity}) rattachée à ${timeSlots.length} créneau(x)`,
        adminId: admin.id,
        editionId: targetEditionId
      }
    })

    return created
  })

  return {
    success: true,
    message: `Mission "${newMission.name}" créée et rattachée aux créneaux de l'édition.`,
    mission: newMission
  }
})
