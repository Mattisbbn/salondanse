import { Role, RegistrationStatus } from '@prisma/client'
import { z } from 'zod'
import { getAuthenticatedUser } from '../../../utils/auth'
import { sendPlanningReminderEmail } from '../../../utils/email'
import { prisma } from '../../../utils/prisma'

const remindSchema = z.object({
  volunteerId: z.string().optional(),
  all: z.boolean().optional()
}).refine(data => data.volunteerId || data.all, {
  message: 'Veuillez spécifier un bénévole précis (volunteerId) ou l\'option d\'envoi global (all: true).'
})

export default defineEventHandler(async (event) => {
  const admin = await getAuthenticatedUser(event)

  if (admin.role !== Role.ADMIN) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Accès réservé aux administrateurs.'
    })
  }

  const body = await readBody(event).catch(() => ({}))
  const parsed = remindSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Paramètres invalides.'
    })
  }

  const { volunteerId, all } = parsed.data

  const currentEdition = await prisma.edition.findFirst({
    where: { isCurrent: true }
  })

  if (!currentEdition) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Aucune édition courante active.'
    })
  }

  const origin = getRequestHeader(event, 'origin') || getRequestHeader(event, 'host') || 'http://localhost:3000'
  const baseUrl = origin.startsWith('http') ? origin : `http://${origin}`
  const dashboardUrl = `${baseUrl}/espace-benevole/dashboard`

  // Cas 1 : Envoi à un bénévole unique
  if (volunteerId) {
    const volunteer = await prisma.user.findFirst({
      where: {
        id: volunteerId,
        editionId: currentEdition.id,
        role: Role.BENEVOLE
      },
      include: {
        registrations: {
          include: {
            slotMission: {
              include: {
                mission: true,
                timeSlot: true
              }
            }
          },
          orderBy: [
            { slotMission: { timeSlot: { date: 'asc' } } },
            { slotMission: { timeSlot: { orderIndex: 'asc' } } }
          ]
        }
      }
    })

    if (!volunteer) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Bénévole introuvable.'
      })
    }

    if (volunteer.planningStatus !== RegistrationStatus.CONFIRMED) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Le planning de ce bénévole n\'est pas encore validé.'
      })
    }

    const slotsSummary = volunteer.registrations.map((r) => {
      const d = new Date(r.slotMission.timeSlot.date)
      const dateStr = d.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC'
      })

      return {
        date: dateStr.charAt(0).toUpperCase() + dateStr.slice(1),
        startTime: r.slotMission.timeSlot.startTime,
        endTime: r.slotMission.timeSlot.endTime,
        missionName: r.slotMission.mission.name
      }
    })

    await sendPlanningReminderEmail({
      to: volunteer.email,
      name: `${volunteer.firstName} ${volunteer.lastName}`,
      slots: slotsSummary,
      dashboardUrl
    })

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'ADMIN_SEND_REMINDER',
        targetId: volunteer.id,
        details: `Rappel de convocation envoyé à ${volunteer.firstName} ${volunteer.lastName} (${volunteer.email})`,
        editionId: currentEdition.id
      }
    })

    return {
      success: true,
      count: 1,
      message: `Rappel de convocation envoyé avec succès à ${volunteer.firstName} ${volunteer.lastName}.`
    }
  }

  // Cas 2 : Envoi groupé à tous les bénévoles validés
  if (all) {
    const confirmedVolunteers = await prisma.user.findMany({
      where: {
        editionId: currentEdition.id,
        role: Role.BENEVOLE,
        planningStatus: RegistrationStatus.CONFIRMED
      },
      include: {
        registrations: {
          include: {
            slotMission: {
              include: {
                mission: true,
                timeSlot: true
              }
            }
          },
          orderBy: [
            { slotMission: { timeSlot: { date: 'asc' } } },
            { slotMission: { timeSlot: { orderIndex: 'asc' } } }
          ]
        }
      }
    })

    if (confirmedVolunteers.length === 0) {
      return {
        success: true,
        count: 0,
        message: 'Aucun bénévole validé à relancer pour le moment.'
      }
    }

    // Envoi des rappels
    for (const v of confirmedVolunteers) {
      const slotsSummary = v.registrations.map((r) => {
        const d = new Date(r.slotMission.timeSlot.date)
        const dateStr = d.toLocaleDateString('fr-FR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          timeZone: 'UTC'
        })

        return {
          date: dateStr.charAt(0).toUpperCase() + dateStr.slice(1),
          startTime: r.slotMission.timeSlot.startTime,
          endTime: r.slotMission.timeSlot.endTime,
          missionName: r.slotMission.mission.name
        }
      })

      await sendPlanningReminderEmail({
        to: v.email,
        name: `${v.firstName} ${v.lastName}`,
        slots: slotsSummary,
        dashboardUrl
      })
    }

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'ADMIN_BULK_SEND_REMINDERS',
        details: `Rappel de convocation groupé envoyé à ${confirmedVolunteers.length} bénévole(s) validé(s).`,
        editionId: currentEdition.id
      }
    })

    return {
      success: true,
      count: confirmedVolunteers.length,
      message: `Rappels de convocation envoyés avec succès à ${confirmedVolunteers.length} bénévole(s) validé(s).`
    }
  }

  return {
    success: false,
    count: 0,
    message: 'Aucune action effectuée.'
  }
})
