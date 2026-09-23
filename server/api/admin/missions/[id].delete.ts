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

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Identifiant de mission manquant.'
    })
  }

  const mission = await prisma.mission.findUnique({
    where: { id },
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

  if (!mission) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Mission introuvable.'
    })
  }

  // Vérifier s'il y a des réservations bénévoles existantes
  const totalRegistrations = mission.slotMissions.reduce(
    (acc, sm) => acc + sm._count.registrations,
    0
  )

  if (totalRegistrations > 0) {
    // Des bénévoles sont déjà inscrits : archivage (soft-delete) pour préserver l'historique
    const updated = await prisma.mission.update({
      where: { id },
      data: { isActive: false }
    })

    await prisma.auditLog.create({
      data: {
        action: 'MISSION_ARCHIVE',
        details: `Archivage de la mission "${mission.name}" (${totalRegistrations} bénévole(s) inscrit(s))`,
        adminId: admin.id,
        editionId: mission.editionId
      }
    })

    return {
      success: true,
      archived: true,
      deleted: false,
      message: `La mission "${mission.name}" a été archivée car elle compte ${totalRegistrations} inscription(s) bénévole(s). Elle ne sera plus proposée aux futurs bénévoles.`,
      mission: updated
    }
  }

  // Aucune inscription : suppression définitive et cascade sur SlotMission
  await prisma.$transaction(async (tx) => {
    await tx.mission.delete({
      where: { id }
    })

    await tx.auditLog.create({
      data: {
        action: 'MISSION_DELETE',
        details: `Suppression définitive de la mission "${mission.name}"`,
        adminId: admin.id,
        editionId: mission.editionId
      }
    })
  })

  return {
    success: true,
    archived: false,
    deleted: true,
    message: `Mission "${mission.name}" définitivement supprimée.`
  }
})
