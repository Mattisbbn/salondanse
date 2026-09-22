import { z } from 'zod'
import { prisma } from '../../utils/prisma'

const verifyCodeSchema = z.object({
  code: z.string().trim().min(1, 'Veuillez saisir un code d\'invitation.')
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parseResult = verifyCodeSchema.safeParse(body)

  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parseResult.error.issues[0]?.message || 'Code d\'invitation invalide.'
    })
  }

  const normalizedCode = parseResult.data.code.toUpperCase()

  const invitation = await prisma.invitationCode.findUnique({
    where: { code: normalizedCode },
    include: { edition: true }
  })

  if (!invitation) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Ce code d\'invitation n\'existe pas.'
    })
  }

  if (invitation.isUsed) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Ce code d\'invitation a déjà été utilisé pour créer un compte.'
    })
  }

  if (!invitation.edition.isCurrent) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Ce code d\'invitation appartient à une édition passée ou archivée.'
    })
  }

  if (!invitation.edition.isRegistrationOpen) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Les inscriptions pour cette édition sont actuellement fermées.'
    })
  }

  return {
    valid: true,
    code: invitation.code,
    edition: {
      id: invitation.edition.id,
      name: invitation.edition.name,
      year: invitation.edition.year
    }
  }
})
