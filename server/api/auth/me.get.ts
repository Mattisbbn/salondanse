import jwt from 'jsonwebtoken'
import { prisma } from '../../utils/prisma'

interface JwtPayload {
  id: string
  email: string
  role: string
}

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'auth_token')

  if (!token) {
    return { user: null }
  }

  const config = useRuntimeConfig(event)
  const secret = config.jwtSecret || process.env.JWT_SECRET || 'salon_de_la_danse_angers_secret_key_2027'

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true
      }
    })

    if (!user) {
      deleteCookie(event, 'auth_token')
      return { user: null }
    }

    return { user }
  } catch {
    deleteCookie(event, 'auth_token')
    return { user: null }
  }
})
