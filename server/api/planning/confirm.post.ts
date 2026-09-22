import { Prisma, RegistrationStatus } from '@prisma/client'
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

  // Vérifier si le planning est déjà verrouillé
  if (user.planningStatus === RegistrationStatus.CONFIRMED || user.isLocked) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Votre planning est déjà validé et verrouillé. Aucune modification n\'est possible sans l\'intervention d\'un administrateur.'
    })
  }

  const body = await readBody(event)
  const rawIds: unknown[] = Array.isArray(body?.slotMissionIds) ? body.slotMissionIds : []
  const requestedIds: string[] = Array.from(new Set(rawIds.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)))

  // Récupérer les créneaux sensibles déjà affectés par l'administration à ce bénévole
  const userSensitiveSlotMissionIds: string[] = user.registrations
    .filter(r => r.slotMission?.mission?.isSensitive)
    .map(r => r.slotMissionId)

  // VÉRIFICATION STRICTE DE SÉCURITÉ :
  // Si le payload contient le moindre créneau sensible, rejet immédiat avec HTTP 403
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
  }

  // Les missions sensibles déjà attribuées par l'organisation sont impérativement conservées
  const slotMissionIds: string[] = Array.from(new Set([...requestedIds, ...userSensitiveSlotMissionIds]))

  // RÈGLE MÉTIER 1 : Quota global de 1 à 3 créneaux max
  if (slotMissionIds.length < 1 || slotMissionIds.length > 3) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Le planning doit comporter entre 1 et 3 créneaux (2h à 6h au total sur le week-end).'
    })
  }

  // TRANSACTION PRISMA : Verrouillage strict de concurrence et réservation atomique
  const result = await prisma.$transaction(async (tx) => {
    // Verrouillage pessimiste de ligne (FOR UPDATE) pour empêcher tout accès concurrent simultané sur les jauges
    await tx.$executeRaw(
      Prisma.sql`SELECT id FROM "SlotMission" WHERE id IN (${Prisma.join(slotMissionIds)}) FOR UPDATE`
    )

    // Récupération des missions avec créneaux et inscriptions actuelles
    const selectedSlotMissions = await tx.slotMission.findMany({
      where: {
        id: { in: slotMissionIds }
      },
      include: {
        timeSlot: true,
        mission: true,
        registrations: {
          select: { userId: true }
        }
      }
    })

    if (selectedSlotMissions.length !== slotMissionIds.length) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Un ou plusieurs créneaux sélectionnés sont introuvables ou non autorisés.'
      })
    }

    // RÈGLE MÉTIER 2 : Non-chevauchement (1 mission max par créneau horaire)
    const timeSlotIds = selectedSlotMissions.map(sm => sm.timeSlotId)
    const uniqueTimeSlotIds = new Set(timeSlotIds)
    if (uniqueTimeSlotIds.size !== timeSlotIds.length) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Conflit d\'horaires : vous ne pouvez pas vous inscrire à deux missions sur le même créneau horaire.'
      })
    }

    // RÈGLE MÉTIER 3 : Pause obligatoire (interdiction d'enchaîner 3 créneaux consécutifs le même jour)
    const slotsByDay = new Map<string, number[]>()
    for (const sm of selectedSlotMissions) {
      const dayKey = sm.timeSlot.date.toISOString().split('T')[0] ?? ''
      if (!slotsByDay.has(dayKey)) {
        slotsByDay.set(dayKey, [])
      }
      slotsByDay.get(dayKey)!.push(sm.timeSlot.orderIndex)
    }

    for (const [, orderIndices] of slotsByDay.entries()) {
      if (orderIndices.length >= 3) {
        orderIndices.sort((a, b) => a - b)
        for (let i = 0; i <= orderIndices.length - 3; i++) {
          const o1 = orderIndices[i]!
          const o2 = orderIndices[i + 1]!
          const o3 = orderIndices[i + 2]!
          if (o2 === o1 + 1 && o3 === o2 + 1) {
            throw createError({
              statusCode: 400,
              statusMessage: 'Pause obligatoire : vous ne pouvez pas enchaîner 3 créneaux consécutifs le même jour (6h sans interruption).'
            })
          }
        }
      }
    }

    // RÈGLE MÉTIER 4 : Jauge maximale (vérifiée au moment précis de l'écriture en transaction)
    for (const sm of selectedSlotMissions) {
      const otherRegistrationsCount = sm.registrations.filter(r => r.userId !== user.id).length
      if (otherRegistrationsCount >= sm.capacityMax) {
        throw createError({
          statusCode: 409,
          statusMessage: `Le créneau "${sm.mission.name}" (${sm.timeSlot.startTime} - ${sm.timeSlot.endTime}) est désormais complet (${sm.capacityMax}/${sm.capacityMax} places). Veuillez choisir un autre créneau.`
        })
      }
    }

    // 1. Suppression des inscriptions non sensibles existantes de l'utilisateur (les affectations admin sensibles sont préservées)
    await tx.registration.deleteMany({
      where: {
        userId: user.id,
        slotMissionId: { notIn: userSensitiveSlotMissionIds }
      }
    })

    // 2. Création des nouvelles inscriptions standard
    if (requestedIds.length > 0) {
      await tx.registration.createMany({
        data: requestedIds.map(slotMissionId => ({
          userId: user.id,
          slotMissionId
        }))
      })
    }

    // 3. Verrouillage du statut utilisateur
    const lockedAt = new Date()
    await tx.user.update({
      where: { id: user.id },
      data: {
        planningStatus: RegistrationStatus.CONFIRMED,
        planningLockedAt: lockedAt
      }
    })

    return {
      lockedAt,
      confirmedSlots: selectedSlotMissions.map((sm) => {
        const d = new Date(sm.timeSlot.date)
        const dayLabel = d.toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          timeZone: 'UTC'
        })
        return {
          date: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1),
          startTime: sm.timeSlot.startTime,
          endTime: sm.timeSlot.endTime,
          missionName: sm.mission.name
        }
      })
    }
  })

  // Envoi de l'e-mail de confirmation récapitulatif
  const config = useRuntimeConfig()
  const siteUrl = (config.public.siteUrl as string) || 'http://localhost:3000'
  const dashboardUrl = `${siteUrl}/espace-benevole/dashboard`

  await sendPlanningConfirmationEmail({
    to: user.email,
    name: `${user.firstName} ${user.lastName}`.trim(),
    slots: result.confirmedSlots,
    dashboardUrl
  }).catch((err) => {
    console.error('Erreur lors de l\'envoi de l\'email de confirmation de planning:', err)
  })

  return {
    success: true,
    message: 'Votre planning a été validé et verrouillé avec succès !',
    planningLockedAt: result.lockedAt
  }
})
