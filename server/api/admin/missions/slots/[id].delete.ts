import { Role } from '@prisma/client'
import { getAuthenticatedUser } from '../../../../utils/auth'
import { prisma } from '../../../../utils/prisma'

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

  const registrationsCount = slotMission._count.registrations
  if (registrationsCount > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `Impossible de retirer cette mission du créneau : ${registrationsCount} bénévole(s) y sont déjà inscrit(s). Désaffectez d'abord les bénévoles concernés.`
    })
  }

  const d = new Date(slotMission.timeSlot.date).toISOString().split('T')[0]
  const missionName = slotMission.mission.name
  const timeSlotLabel = `${slotMission.timeSlot.startTime}-${slotMission.timeSlot.endTime}`

  await prisma.$transaction(async (tx) => {
    await tx.slotMission.delete({
      where: { id }
    })

    await tx.auditLog.create({
      data: {
        action: 'SLOT_MISSION_DELETE',
        details: `Déprogrammation de la mission "${missionName}" sur le créneau ${timeSlotLabel} du ${d}`,
        adminId: admin.id,
        editionId: slotMission.mission.editionId
      }
    })
  })

  return {
    success: true,
    message: `La mission "${missionName}" a été retirée du créneau ${timeSlotLabel}.`
  }
})
