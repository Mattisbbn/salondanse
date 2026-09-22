import type { H3Event } from 'h3'
import jwt from 'jsonwebtoken'
import { prisma } from './prisma'

interface JwtPayload {
  id: string
  email: string
  role: string
}

export async function getAuthenticatedUser(event: H3Event) {
  const token = getCookie(event, 'auth_token')
  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Non authentifié. Veuillez vous connecter.'
    })
  }

  const config = useRuntimeConfig(event)
  const secret = config.jwtSecret || process.env.JWT_SECRET || 'salon_de_la_danse_angers_secret_key_2027'

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        registrations: {
          include: {
            slotMission: {
              include: {
                mission: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      deleteCookie(event, 'auth_token')
      throw createError({
        statusCode: 401,
        statusMessage: 'Utilisateur introuvable.'
      })
    }

    return user
  } catch (err: unknown) {
    const errorObj = err as { statusCode?: number }
    if (errorObj?.statusCode === 401) {
      throw err
    }
    deleteCookie(event, 'auth_token')
    throw createError({
      statusCode: 401,
      statusMessage: 'Session expirée ou invalide. Veuillez vous reconnecter.'
    })
  }
}
