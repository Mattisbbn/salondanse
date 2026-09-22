import type { RegistrationStatus } from '@prisma/client'
import { getAuthenticatedUser } from '../../../../utils/auth'
import { prisma } from '../../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const admin = await getAuthenticatedUser(event)

  if (admin.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Accès réservé aux administrateurs.'
    })
  }

  const volunteerId = getRouterParam(event, 'id')
  if (!volunteerId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID du bénévole requis.'
    })
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: volunteerId }
  })

  if (!targetUser) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Bénévole introuvable.'
    })
  }

  const body = await readBody(event)
  const { planningStatus, isLocked, isApprovedMinor } = body || {}

  const updateData: {
    planningStatus?: RegistrationStatus
    planningLockedAt?: Date | null
    isLocked?: boolean
    isApprovedMinor?: boolean
  } = {}

  const logChanges: string[] = []

  if (planningStatus === 'DRAFT' || planningStatus === 'CONFIRMED') {
    updateData.planningStatus = planningStatus
    if (planningStatus === 'CONFIRMED') {
      updateData.planningLockedAt = new Date()
    } else {
      updateData.planningLockedAt = null
    }
    logChanges.push(`planningStatus=${planningStatus}`)
  }

  if (typeof isLocked === 'boolean') {
    updateData.isLocked = isLocked
    logChanges.push(`isLocked=${isLocked}`)
  }

  if (typeof isApprovedMinor === 'boolean') {
    updateData.isApprovedMinor = isApprovedMinor
    logChanges.push(`isApprovedMinor=${isApprovedMinor}`)
  }

  if (Object.keys(updateData).length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Aucune donnée valide à mettre à jour.'
    })
  }

  const updatedUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: targetUser.id },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        planningStatus: true,
        planningLockedAt: true,
        isLocked: true,
        isApprovedMinor: true
      }
    })

    await tx.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'ADMIN_UPDATE_STATUS',
        targetId: targetUser.id,
        details: `Modification statut bénévole : ${logChanges.join(', ')}`,
        editionId: targetUser.editionId
      }
    })

    return user
  })

  return {
    success: true,
    message: 'Statut mis à jour avec succès.',
    user: updatedUser
  }
})
