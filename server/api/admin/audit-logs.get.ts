import { Role } from '@prisma/client'
import { getAuthenticatedUser } from '../../utils/auth'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)

  if (user.role !== Role.ADMIN) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Accès réservé aux administrateurs.'
    })
  }

  const logs = await prisma.auditLog.findMany({
    take: 100,
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      admin: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      edition: {
        select: {
          id: true,
          name: true,
          year: true
        }
      }
    }
  })

  return {
    total: logs.length,
    logs: logs.map(l => ({
      id: l.id,
      action: l.action,
      details: l.details,
      targetId: l.targetId,
      createdAt: l.createdAt.toISOString(),
      adminName: `${l.admin.firstName} ${l.admin.lastName}`,
      adminEmail: l.admin.email,
      editionName: l.edition.name
    }))
  }
})
