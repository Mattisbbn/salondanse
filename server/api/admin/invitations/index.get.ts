import { getAuthenticatedUser } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)

  if (user.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Accès réservé aux administrateurs.'
    })
  }

  const invitations = await prisma.invitationCode.findMany({
    where: {
      edition: { isCurrent: true }
    },
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      usedBy: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true
        }
      }
    }
  })

  const config = useRuntimeConfig(event)
  const siteUrl = config.public.siteUrl || 'http://localhost:3000'

  const formattedInvitations = invitations.map(inv => ({
    id: inv.id,
    code: inv.code,
    isUsed: inv.isUsed,
    createdAt: inv.createdAt,
    usedBy: inv.usedBy
      ? {
          id: inv.usedBy.id,
          email: inv.usedBy.email,
          name: `${inv.usedBy.firstName} ${inv.usedBy.lastName}`.trim()
        }
      : null,
    registrationUrl: `${siteUrl}/espace-benevole/register?code=${inv.code}`
  }))

  return {
    invitations: formattedInvitations
  }
})
