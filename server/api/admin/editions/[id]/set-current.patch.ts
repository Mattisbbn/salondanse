import { Role } from '@prisma/client'
import { getAuthenticatedUser } from '../../../../utils/auth'
import { prisma } from '../../../../utils/prisma'

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
      statusMessage: 'Identifiant d\'édition manquant.'
    })
  }

  const edition = await prisma.edition.findUnique({
    where: { id }
  })

  if (!edition) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Édition introuvable.'
    })
  }

  const updatedEdition = await prisma.$transaction(async (tx) => {
    // 1. Désactiver toutes les autres
    await tx.edition.updateMany({
      where: { isCurrent: true },
      data: { isCurrent: false }
    })

    // 2. Activer celle-ci
    const active = await tx.edition.update({
      where: { id },
      data: { isCurrent: true }
    })

    // 3. Audit log
    await tx.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'SWITCH_CURRENT_EDITION',
        targetId: edition.id,
        details: `Bascule de l'édition courante vers "${edition.name}" (${edition.year})`,
        editionId: edition.id
      }
    })

    return active
  })

  return {
    success: true,
    message: `L'édition "${updatedEdition.name}" est désormais l'édition active du festival.`,
    edition: updatedEdition
  }
})
