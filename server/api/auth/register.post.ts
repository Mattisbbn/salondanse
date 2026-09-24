import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Role, RegistrationStatus } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../../utils/prisma'

const registerSchema = z.object({
  code: z.string().trim().min(1, 'Le code d\'invitation est requis.'),
  firstName: z.string().trim().min(2, 'Le prénom doit comporter au moins 2 caractères.'),
  lastName: z.string().trim().min(2, 'Le nom doit comporter au moins 2 caractères.'),
  email: z.string().trim().email('Adresse e-mail invalide.').toLowerCase(),
  phone: z.string().trim().min(8, 'Le numéro de téléphone doit comporter au moins 8 caractères.'),
  password: z.string().min(8, 'Le mot de passe doit comporter au moins 8 caractères.'),
  birthDate: z.string().min(1, 'La date de naissance est obligatoire.').refine(v => !isNaN(Date.parse(v)), 'Date de naissance invalide.'),
  isMinor: z.boolean().default(false),
  parentalAuthorizationUrl: z.string().trim().optional().nullable(),
  photoUrl: z.string().min(10, 'La photo d\'identité est obligatoire pour générer votre accréditation.')
}).refine((data) => {
  if (data.isMinor && !data.parentalAuthorizationUrl) {
    return false
  }
  return true
}, {
  message: 'L\'autorisation parentale au format PDF est obligatoire pour les bénévoles mineurs.',
  path: ['parentalAuthorizationUrl']
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parseResult = registerSchema.safeParse(body)

  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parseResult.error.issues[0]?.message || 'Données d\'inscription invalides.'
    })
  }

  const {
    code,
    firstName,
    lastName,
    email,
    phone,
    password,
    birthDate,
    isMinor,
    parentalAuthorizationUrl,
    photoUrl
  } = parseResult.data

  const normalizedCode = code.toUpperCase()

  // 1. Vérification du code d'invitation
  const invitation = await prisma.invitationCode.findUnique({
    where: { code: normalizedCode },
    include: { edition: true }
  })

  if (!invitation) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Code d\'invitation introuvable.'
    })
  }

  if (invitation.isUsed) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Ce code d\'invitation a déjà été consommé.'
    })
  }

  if (!invitation.edition.isCurrent) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Ce code d\'invitation n\'est pas valide pour l\'édition courante.'
    })
  }

  if (!invitation.edition.isRegistrationOpen) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Les inscriptions pour cette édition sont closes.'
    })
  }

  // 2. Unicité de l'email
  const existingUser = await prisma.user.findUnique({
    where: { email }
  })

  if (existingUser) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Un compte existe déjà avec cette adresse e-mail. Veuillez vous connecter.'
    })
  }

  // 3. Hachage du mot de passe
  const passwordHash = await bcrypt.hash(password, 10)

  // 4. Transaction de création du compte et consommation du code
  const newUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        passwordHash,
        photoUrl,
        birthDate: new Date(birthDate),
        isMinor,
        parentalAuthorizationUrl: isMinor ? parentalAuthorizationUrl : null,
        minorValidationStatus: isMinor ? 'PENDING' : 'NONE',
        isApprovedMinor: false,
        role: Role.BENEVOLE,
        planningStatus: RegistrationStatus.DRAFT,
        editionId: invitation.editionId
      }
    })

    await tx.invitationCode.update({
      where: { id: invitation.id },
      data: {
        isUsed: true,
        usedById: user.id
      }
    })

    return user
  })

  // 5. Génération du JWT et cookie de session
  const config = useRuntimeConfig(event)
  const secret = config.jwtSecret || process.env.JWT_SECRET || 'salon_de_la_danse_angers_secret_key_2027'

  const token = jwt.sign(
    {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role
    },
    secret,
    { expiresIn: '7d' }
  )

  setCookie(event, 'auth_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    path: '/'
  })

  return {
    success: true,
    message: 'Inscription réussie ! Bienvenue dans l\'équipe.',
    user: {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      role: newUser.role,
      isMinor: newUser.isMinor,
      planningStatus: newUser.planningStatus
    }
  }
})
