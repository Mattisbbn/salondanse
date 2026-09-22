import { Role } from '@prisma/client'
import { getAuthenticatedUser } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)

  if (user.role !== Role.ADMIN) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Accès réservé aux administrateurs.'
    })
  }

  const editions = await prisma.edition.findMany({
    orderBy: {
      year: 'desc'
    },
    include: {
      _count: {
        select: {
          users: true,
          timeSlots: true,
          invitationCodes: true
        }
      }
    }
  })

  return {
    total: editions.length,
    editions: editions.map(e => ({
      id: e.id,
      year: e.year,
      name: e.name,
      isCurrent: e.isCurrent,
      isRegistrationOpen: e.isRegistrationOpen,
      createdAt: e.createdAt.toISOString(),
      stats: {
        volunteersCount: e._count.users,
        timeSlotsCount: e._count.timeSlots,
        invitationsCount: e._count.invitationCodes
      }
    }))
  }
})
