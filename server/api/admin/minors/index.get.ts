import { Role } from '@prisma/client'
import { getAuthenticatedUser } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const admin = await getAuthenticatedUser(event)

  if (admin.role !== Role.ADMIN) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Accès réservé aux administrateurs.'
    })
  }

  const currentEdition = await prisma.edition.findFirst({
    where: { isCurrent: true }
  })

  const minors = await prisma.user.findMany({
    where: {
      isMinor: true,
      ...(currentEdition ? { editionId: currentEdition.id } : {})
    },
    include: {
      edition: {
        select: {
          id: true,
          name: true,
          year: true
        }
      }
    },
    orderBy: [
      { createdAt: 'desc' }
    ]
  })

  const formattedMinors = minors.map((u) => {
    // Calcul de l'âge au 14 mai de l'année d'édition ou date de référence
    let age: number | null = null
    if (u.birthDate) {
      const refDate = new Date(`${u.edition.year || 2027}-05-14T00:00:00Z`)
      const birth = new Date(u.birthDate)
      age = refDate.getFullYear() - birth.getFullYear()
      const m = refDate.getMonth() - birth.getMonth()
      if (m < 0 || (m === 0 && refDate.getDate() < birth.getDate())) {
        age--
      }
    }

    return {
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      fullName: `${u.firstName} ${u.lastName}`.trim(),
      email: u.email,
      phone: u.phone,
      photoUrl: u.photoUrl,
      birthDate: u.birthDate ? u.birthDate.toISOString() : null,
      age,
      parentalAuthorizationUrl: u.parentalAuthorizationUrl,
      minorValidationStatus: u.minorValidationStatus || 'PENDING',
      isApprovedMinor: u.isApprovedMinor,
      planningStatus: u.planningStatus,
      createdAt: u.createdAt.toISOString(),
      edition: u.edition
    }
  })

  return {
    total: formattedMinors.length,
    minors: formattedMinors
  }
})
