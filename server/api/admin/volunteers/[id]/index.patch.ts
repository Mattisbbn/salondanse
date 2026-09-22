import { Role } from '@prisma/client'
import { z } from 'zod'
import { getAuthenticatedUser } from '../../../../utils/auth'
import { prisma } from '../../../../utils/prisma'

const updateVolunteerSchema = z.object({
  firstName: z.string().trim().min(1, 'Le prénom est requis.').optional(),
  lastName: z.string().trim().min(1, 'Le nom est requis.').optional(),
  email: z.string().trim().email('Format d\'e-mail invalide.').optional(),
  phone: z.string().trim().min(6, 'Numéro de téléphone trop court.').optional(),
  photoUrl: z.string().nullable().optional(),
  isMinor: z.boolean().optional()
})

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
      statusMessage: 'Identifiant bénévole manquant.'
    })
  }

  const volunteer = await prisma.user.findUnique({
    where: { id }
  })

  if (!volunteer) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Bénévole introuvable.'
    })
  }

  const rawBody = await readBody(event).catch(() => ({}))
  const parsed = updateVolunteerSchema.safeParse(rawBody)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Données invalides.'
    })
  }

  const data = parsed.data

  // Si l'e-mail change, vérifier l'unicité
  if (data.email && data.email !== volunteer.email) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email }
    })
    if (existing && existing.id !== volunteer.id) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Cette adresse e-mail est déjà utilisée par un autre compte.'
      })
    }
  }

  const updatedVolunteer = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: volunteer.id },
      data: {
        ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
        ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.photoUrl !== undefined ? { photoUrl: data.photoUrl } : {}),
        ...(data.isMinor !== undefined ? { isMinor: data.isMinor } : {})
      }
    })

    const changes = Object.keys(data).join(', ')

    await tx.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'ADMIN_UPDATE_VOLUNTEER',
        targetId: volunteer.id,
        details: `Modification des données personnelles (${changes}) de ${volunteer.firstName} ${volunteer.lastName}`,
        editionId: volunteer.editionId
      }
    })

    return updated
  })

  return {
    success: true,
    message: `Les informations personnelles de ${updatedVolunteer.firstName} ${updatedVolunteer.lastName} ont été mises à jour.`,
    volunteer: {
      id: updatedVolunteer.id,
      firstName: updatedVolunteer.firstName,
      lastName: updatedVolunteer.lastName,
      email: updatedVolunteer.email,
      phone: updatedVolunteer.phone,
      photoUrl: updatedVolunteer.photoUrl,
      isMinor: updatedVolunteer.isMinor
    }
  }
})
