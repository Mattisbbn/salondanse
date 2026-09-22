import { Role } from '@prisma/client'
import { z } from 'zod'
import { getAuthenticatedUser } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

const createEditionSchema = z.object({
  year: z.number().int().min(2020, 'Année invalide.').max(2100, 'Année invalide.'),
  name: z.string().trim().min(2, 'Le nom doit comporter au moins 2 caractères.'),
  isCurrent: z.boolean().default(false),
  isRegistrationOpen: z.boolean().default(true)
})

export default defineEventHandler(async (event) => {
  const admin = await getAuthenticatedUser(event)

  if (admin.role !== Role.ADMIN) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Accès réservé aux administrateurs.'
    })
  }

  const body = await readBody(event)
  const parseResult = createEditionSchema.safeParse(body)

  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parseResult.error.issues[0]?.message || 'Données invalides.'
    })
  }

  const { year, name, isCurrent, isRegistrationOpen } = parseResult.data

  const existingEdition = await prisma.edition.findUnique({
    where: { year }
  })

  if (existingEdition) {
    throw createError({
      statusCode: 409,
      statusMessage: `Une édition pour l'année ${year} existe déjà (${existingEdition.name}).`
    })
  }

  const newEdition = await prisma.$transaction(async (tx) => {
    // Si la nouvelle édition devient courante, basculer les autres
    if (isCurrent) {
      await tx.edition.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false }
      })
    }

    const created = await tx.edition.create({
      data: {
        year,
        name,
        isCurrent,
        isRegistrationOpen
      }
    })

    await tx.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'CREATE_EDITION',
        targetId: created.id,
        details: `Initialisation de la nouvelle édition "${name}" (${year})${isCurrent ? ' définie comme édition active' : ''}`,
        editionId: created.id
      }
    })

    return created
  })

  return {
    success: true,
    message: `L'édition "${newEdition.name}" (${newEdition.year}) a été initialisée avec succès.`,
    edition: newEdition
  }
})
