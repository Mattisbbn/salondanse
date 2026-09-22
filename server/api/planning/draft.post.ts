import { RegistrationStatus } from '@prisma/client'
import { getAuthenticatedUser } from '../../utils/auth'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)

  // Vérifier la période d'inscription de l'édition
  const edition = await prisma.edition.findUnique({
    where: { id: user.editionId }
  })
  if (!edition) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Édition introuvable.'
    })
  }
  assertRegistrationOpen(edition)

  if (user.planningStatus === RegistrationStatus.CONFIRMED || user.isLocked) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Votre planning est déjà validé et verrouillé. Aucune modification n\'est possible sans l\'intervention d\'un administrateur.'
    })
  }

  const body = await readBody(event)
  const rawIds: unknown[] = Array.isArray(body?.slotMissionIds) ? body.slotMissionIds : []
  const requestedIds: string[] = Array.from(new Set(rawIds.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)))

  // Récupérer les créneaux sensibles déjà affectés par l'administration à ce bénévole pour les préserver
  const userSensitiveSlotMissionIds: string[] = user.registrations
    .filter(r => r.slotMission?.mission?.isSensitive)
    .map(r => r.slotMissionId)

  // VÉRIFICATION STRICTE DE SÉCURITÉ :
  // Si le payload contient le moindre créneau sensible, rejeter immédiatement avec HTTP 403
  if (requestedIds.length > 0) {
    const sensitiveAttempt = await prisma.slotMission.findFirst({
      where: {
        id: { in: requestedIds },
        mission: { isSensitive: true }
      },
      select: { id: true }
    })

    if (sensitiveAttempt) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Les postes sous restriction (Caisse, Billetterie) sont attribués uniquement par l\'administration.'
      })
    }

    // Vérifier que tous les créneaux standard existent
    const validMissions = await prisma.slotMission.findMany({
      where: {
        id: { in: requestedIds },
        mission: { isSensitive: false }
      },
      select: { id: true }
    })

    if (validMissions.length !== requestedIds.length) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Un ou plusieurs créneaux sélectionnés sont invalides.'
      })
    }
  }

  // Sauvegarde dans une transaction Prisma
  await prisma.$transaction(async (tx) => {
    // 1. Supprimer uniquement les réservations non sensibles de l'utilisateur (les affectations admin sensibles sont préservées)
    await tx.registration.deleteMany({
      where: {
        userId: user.id,
        slotMissionId: { notIn: userSensitiveSlotMissionIds }
      }
    })

    // 2. Insérer les nouvelles sélections standard en mode brouillon
    if (requestedIds.length > 0) {
      await tx.registration.createMany({
        data: requestedIds.map(slotMissionId => ({
          userId: user.id,
          slotMissionId
        }))
      })
    }

    // 3. Garantir le statut DRAFT
    await tx.user.update({
      where: { id: user.id },
      data: {
        planningStatus: RegistrationStatus.DRAFT
      }
    })
  })

  return {
    success: true,
    message: 'Brouillon enregistré avec succès.',
    count: requestedIds.length + userSensitiveSlotMissionIds.length
  }
})
