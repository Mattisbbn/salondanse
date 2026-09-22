import { Role } from '@prisma/client'
import { z } from 'zod'
import { getAuthenticatedUser } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

const toggleSchema = z.object({
  editionId: z.string().optional(),
  isRegistrationOpen: z.boolean(),
  registrationStartDate: z.string().datetime().nullable().optional(),
  registrationEndDate: z.string().datetime().nullable().optional()
})

export default defineEventHandler(async (event) => {
  const admin = await getAuthenticatedUser(event)

  if (admin.role !== Role.ADMIN) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Accès réservé aux administrateurs.'
    })
  }

  const rawBody = await readBody(event).catch(() => ({}))
  const parsed = toggleSchema.safeParse(rawBody)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Données invalides.'
    })
  }

  const { editionId, isRegistrationOpen, registrationStartDate, registrationEndDate } = parsed.data

  // Trouver l'édition ciblée (par ID ou édition courante par défaut)
  const targetEdition = editionId
    ? await prisma.edition.findUnique({ where: { id: editionId } })
    : await prisma.edition.findFirst({ where: { isCurrent: true } })

  if (!targetEdition) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Édition introuvable.'
    })
  }

  const startDate = registrationStartDate !== undefined
    ? (registrationStartDate ? new Date(registrationStartDate) : null)
    : targetEdition.registrationStartDate

  const endDate = registrationEndDate !== undefined
    ? (registrationEndDate ? new Date(registrationEndDate) : null)
    : targetEdition.registrationEndDate

  const updatedEdition = await prisma.$transaction(async (tx) => {
    const updated = await tx.edition.update({
      where: { id: targetEdition.id },
      data: {
        isRegistrationOpen,
        registrationStartDate: startDate,
        registrationEndDate: endDate
      }
    })

    await tx.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'TOGGLE_REGISTRATIONS',
        targetId: targetEdition.id,
        details: `Campagne d'inscriptions ${isRegistrationOpen ? 'ouverte' : 'fermée'} pour ${targetEdition.name}`,
        editionId: targetEdition.id
      }
    })

    return updated
  })

  return {
    success: true,
    message: updatedEdition.isRegistrationOpen
      ? 'La campagne d\'inscriptions est désormais ouverte.'
      : 'La campagne d\'inscriptions est désormais fermée (consultation seule).',
    edition: {
      id: updatedEdition.id,
      name: updatedEdition.name,
      isRegistrationOpen: updatedEdition.isRegistrationOpen,
      registrationStartDate: updatedEdition.registrationStartDate,
      registrationEndDate: updatedEdition.registrationEndDate
    }
  }
})
