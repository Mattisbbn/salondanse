import { Role } from '@prisma/client'
import { z } from 'zod'
import { getAuthenticatedUser } from '../../../../utils/auth'
import { prisma } from '../../../../utils/prisma'

const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('ADD_DAY'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date requis : AAAA-MM-JJ')
  }),
  z.object({
    action: z.literal('TOGGLE_DAY'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date requis : AAAA-MM-JJ'),
    active: z.boolean()
  })
])

const STANDARD_SLOTS = [
  { start: '08:30', end: '10:00', order: 1 },
  { start: '10:00', end: '12:00', order: 2 },
  { start: '12:00', end: '14:00', order: 3 },
  { start: '14:00', end: '16:00', order: 4 },
  { start: '16:00', end: '18:00', order: 5 }
]

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

  const body = await readBody(event)
  const parseResult = actionSchema.safeParse(body)

  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parseResult.error.issues[0]?.message || 'Action invalide.'
    })
  }

  const payload = parseResult.data
  const dateObj = new Date(`${payload.date}T00:00:00.000Z`)

  if (payload.action === 'ADD_DAY' || (payload.action === 'TOGGLE_DAY' && payload.active)) {
    // 1. Ajouter la date si elle n'est pas déjà présente dans eventDays
    const currentDays = new Set(edition.eventDays || [])
    currentDays.add(payload.date)
    const sortedDays = Array.from(currentDays).sort()

    // 2. Vérifier si les TimeSlots existent déjà pour cette date
    const existingSlots = await prisma.timeSlot.findMany({
      where: {
        editionId,
        date: dateObj
      }
    })

    // S'ils n'existent pas, les générer avec toutes les missions actives
    if (existingSlots.length === 0) {
      const missions = await prisma.mission.findMany()

      await prisma.$transaction(async (tx) => {
        for (const slotDef of STANDARD_SLOTS) {
          const createdSlot = await tx.timeSlot.create({
            data: {
              date: dateObj,
              startTime: slotDef.start,
              endTime: slotDef.end,
              orderIndex: slotDef.order,
              editionId
            }
          })

          for (const m of missions) {
            await tx.slotMission.create({
              data: {
                missionId: m.id,
                timeSlotId: createdSlot.id,
                capacityMax: m.isSensitive ? 2 : 4
              }
            })
          }
        }

        // Mettre à jour l'édition
        await tx.edition.update({
          where: { id: editionId },
          data: {
            eventDays: sortedDays,
            eventStartDate: sortedDays[0] ? new Date(`${sortedDays[0]}T00:00:00.000Z`) : null,
            eventEndDate: sortedDays[sortedDays.length - 1] ? new Date(`${sortedDays[sortedDays.length - 1]}T00:00:00.000Z`) : null
          }
        })

        await tx.auditLog.create({
          data: {
            adminId: admin.id,
            action: 'ADD_EDITION_DAY',
            targetId: edition.id,
            details: `Ajout du jour ${payload.date} et génération des créneaux pour l'édition "${edition.name}"`,
            editionId: edition.id
          }
        })
      })
    } else {
      // Les slots existent déjà, on met juste à jour eventDays
      await prisma.edition.update({
        where: { id: editionId },
        data: {
          eventDays: sortedDays,
          eventStartDate: sortedDays[0] ? new Date(`${sortedDays[0]}T00:00:00.000Z`) : null,
          eventEndDate: sortedDays[sortedDays.length - 1] ? new Date(`${sortedDays[sortedDays.length - 1]}T00:00:00.000Z`) : null
        }
      })
    }

    return {
      success: true,
      message: `La date du ${payload.date} a été activée avec succès pour l'édition "${edition.name}".`
    }
  }

  if (payload.action === 'TOGGLE_DAY' && !payload.active) {
    // Désactiver / Retirer le jour
    // Vérifier si des inscriptions existent déjà sur les créneaux de cette date
    const slots = await prisma.timeSlot.findMany({
      where: {
        editionId,
        date: dateObj
      },
      include: {
        slotMissions: {
          include: {
            _count: {
              select: { registrations: true }
            }
          }
        }
      }
    })

    const totalRegistrations = slots.reduce((acc, s) => {
      return acc + s.slotMissions.reduce((smAcc, sm) => smAcc + sm._count.registrations, 0)
    }, 0)

    if (totalRegistrations > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: `Impossible de désactiver le ${payload.date} : ${totalRegistrations} inscription(s) bénévole(s) sont déjà enregistrées sur cette journée.`
      })
    }

    const currentDays = new Set(edition.eventDays || [])
    currentDays.delete(payload.date)
    const sortedDays = Array.from(currentDays).sort()

    await prisma.$transaction(async (tx) => {
      // Supprimer les TimeSlots (en cascade les SlotMission)
      for (const s of slots) {
        await tx.timeSlot.delete({
          where: { id: s.id }
        })
      }

      await tx.edition.update({
        where: { id: editionId },
        data: {
          eventDays: sortedDays,
          eventStartDate: sortedDays[0] ? new Date(`${sortedDays[0]}T00:00:00.000Z`) : null,
          eventEndDate: sortedDays[sortedDays.length - 1] ? new Date(`${sortedDays[sortedDays.length - 1]}T00:00:00.000Z`) : null
        }
      })

      await tx.auditLog.create({
        data: {
          adminId: admin.id,
          action: 'REMOVE_EDITION_DAY',
          targetId: edition.id,
          details: `Désactivation de la date ${payload.date} pour l'édition "${edition.name}"`,
          editionId: edition.id
        }
      })
    })

    return {
      success: true,
      message: `La date du ${payload.date} a été désactivée avec succès.`
    }
  }

  return { success: true }
})
