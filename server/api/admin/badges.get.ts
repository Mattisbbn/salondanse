import { Role, RegistrationStatus } from '@prisma/client'
import { getAuthenticatedUser } from '../../utils/auth'
import { generateBadgeQrCode } from '../../utils/badge'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const admin = await getAuthenticatedUser(event)

  if (admin.role !== Role.ADMIN) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Accès réservé aux administrateurs.'
    })
  }

  // Récupérer l'édition courante
  const currentEdition = await prisma.edition.findFirst({
    where: { isCurrent: true }
  })

  if (!currentEdition) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Aucune édition courante active trouvée.'
    })
  }

  // Récupérer tous les bénévoles ayant leur planning confirmé
  const volunteers = await prisma.user.findMany({
    where: {
      role: Role.BENEVOLE,
      editionId: currentEdition.id,
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
    },
    orderBy: [
      { lastName: 'asc' },
      { firstName: 'asc' }
    ]
  })

  // Génération des QR codes en Data URL avec URL absolue complète
  const badges = await Promise.all(
    volunteers.map(async (v) => {
      const { verifyUrl, qrCodeUrl } = await generateBadgeQrCode(v.id, event, { width: 160 })

      const missionsSummary = v.registrations.map(r => ({
        id: r.id,
        missionName: r.slotMission.mission.name,
        isSensitive: r.slotMission.mission.isSensitive,
        date: r.slotMission.timeSlot.date.toISOString(),
        timeSlot: `${r.slotMission.timeSlot.startTime} - ${r.slotMission.timeSlot.endTime}`
      }))

      return {
        id: v.id,
        firstName: v.firstName,
        lastName: v.lastName,
        email: v.email,
        phone: v.phone,
        photoUrl: v.photoUrl,
        isMinor: v.isMinor,
        isApprovedMinor: v.isApprovedMinor,
        planningLockedAt: v.planningLockedAt,
        qrCodeUrl,
        verifyUrl,
        editionName: currentEdition.name,
        editionYear: currentEdition.year,
        missions: missionsSummary
      }
    })
  )

  return {
    total: badges.length,
    edition: {
      id: currentEdition.id,
      name: currentEdition.name,
      year: currentEdition.year
    },
    badges
  }
})
