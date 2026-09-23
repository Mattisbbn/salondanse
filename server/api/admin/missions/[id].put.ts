import { Role } from '@prisma/client'
import { z } from 'zod'
import { getAuthenticatedUser } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

const updateMissionSchema = z.object({
  name: z.string().trim().min(1, 'Le nom de la mission ne peut pas être vide').optional(),
  description: z.string().trim().optional().nullable(),
  color: z.string().trim().optional().nullable(),
  isSensitive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  defaultCapacity: z.number().int().min(1, 'La capacité minimale est de 1').max(50, 'La capacité maximale est de 50').optional(),
  updateExistingSlots: z.boolean().default(false)
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
      statusMessage: 'Identifiant de mission manquant.'
    })
  }

  const existingMission = await prisma.mission.findUnique({
    where: { id }
  })

  if (!existingMission) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Mission introuvable.'
    })
  }

  const body = await readBody(event)
  const parseResult = updateMissionSchema.safeParse(body)

  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parseResult.error.issues[0]?.message || 'Données invalides.'
    })
  }

  const data = parseResult.data

  // Si le nom change, vérifier les doublons sur la même édition
  if (data.name && data.name.toLowerCase() !== existingMission.name.toLowerCase()) {
    const duplicate = await prisma.mission.findFirst({
      where: {
        id: { not: id },
        editionId: existingMission.editionId,
        name: { equals: data.name, mode: 'insensitive' }
      }
    })
    if (duplicate) {
      throw createError({
        statusCode: 409,
        statusMessage: `Une mission nommée "${data.name}" existe déjà sur cette édition.`
      })
    }
  }

  const updatedMission = await prisma.$transaction(async (tx) => {
    const updated = await tx.mission.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.color !== undefined ? { color: data.color } : {}),
        ...(data.isSensitive !== undefined ? { isSensitive: data.isSensitive } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.defaultCapacity !== undefined ? { defaultCapacity: data.defaultCapacity } : {})
      }
    })

    // Répercuter la capacité par défaut sur les SlotMissions existantes si demandé
    if (data.updateExistingSlots && data.defaultCapacity) {
      const slotMissions = await tx.slotMission.findMany({
        where: { missionId: id },
        include: {
          _count: {
            select: { registrations: true }
          }
        }
      })

      for (const sm of slotMissions) {
        // Préserver au minimum le nombre d'inscrits actuels pour ne pas corrompre les quotas
        const newCap = Math.max(sm._count.registrations, data.defaultCapacity)
        if (newCap !== sm.capacityMax) {
          await tx.slotMission.update({
            where: { id: sm.id },
            data: { capacityMax: newCap }
          })
        }
      }
    }

    await tx.auditLog.create({
      data: {
        action: 'MISSION_UPDATE',
        details: `Modification de la mission "${updated.name}" (Active: ${updated.isActive ? 'Oui' : 'Non'}, Sensible: ${updated.isSensitive ? 'Oui' : 'Non'})`,
        adminId: admin.id,
        editionId: updated.editionId
      }
    })

    return updated
  })

  return {
    success: true,
    message: `Mission "${updatedMission.name}" mise à jour avec succès.`,
    mission: updatedMission
  }
})
