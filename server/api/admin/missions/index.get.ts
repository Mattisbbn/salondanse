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

  // Si editionId n'est pas fourni, cibler l'édition active en cours
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

  const missions = await prisma.mission.findMany({
    where: { editionId },
    orderBy: [
      { isSensitive: 'asc' },
      { name: 'asc' }
    ],
    include: {
      slotMissions: {
        select: {
          id: true,
          capacityMax: true,
          _count: {
            select: { registrations: true }
          }
        }
      }
    }
  })

  const formattedMissions = missions.map((m) => {
    const slotsCount = m.slotMissions.length
    const registrationsCount = m.slotMissions.reduce((acc, sm) => acc + sm._count.registrations, 0)
    const totalCapacity = m.slotMissions.reduce((acc, sm) => acc + sm.capacityMax, 0)

    return {
      id: m.id,
      name: m.name,
      description: m.description,
      color: m.color,
      isSensitive: m.isSensitive,
      isActive: m.isActive,
      defaultCapacity: m.defaultCapacity,
      editionId: m.editionId,
      stats: {
        slotsCount,
        registrationsCount,
        totalCapacity
      }
    }
  })

  return {
    total: formattedMissions.length,
    edition: {
      id: edition.id,
      name: edition.name,
      year: edition.year
    },
    missions: formattedMissions
  }
})
