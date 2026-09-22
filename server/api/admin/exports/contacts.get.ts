import { Role } from '@prisma/client'
import { getAuthenticatedUser } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

function escapeCsvField(field: string | number | boolean | null | undefined): string {
  if (field === null || field === undefined) return ''
  const str = String(field)
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

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

  if (!currentEdition) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Aucune édition courante configurée.'
    })
  }

  const volunteers = await prisma.user.findMany({
    where: {
      role: Role.BENEVOLE,
      editionId: currentEdition.id
    },
    orderBy: [
      { lastName: 'asc' },
      { firstName: 'asc' }
    ],
    include: {
      _count: {
        select: { registrations: true }
      }
    }
  })

  const headers = [
    'Nom',
    'Prénom',
    'Téléphone',
    'Email',
    'Statut Mineur',
    'Accord Parental Validé',
    'Statut Planning',
    'Nombre de créneaux',
    'Heures prévues'
  ]

  const rows: string[] = []
  rows.push(headers.map(escapeCsvField).join(';'))

  for (const v of volunteers) {
    const isMinorLabel = v.isMinor ? 'OUI (Mineur)' : 'NON (Majeur)'
    const parentalApproval = v.isMinor
      ? (v.isApprovedMinor ? 'VALIDÉ' : 'EN ATTENTE')
      : 'N/A'

    const row = [
      v.lastName,
      v.firstName,
      v.phone || '',
      v.email,
      isMinorLabel,
      parentalApproval,
      v.planningStatus === 'CONFIRMED' ? 'Validé' : 'Brouillon',
      v._count.registrations,
      v._count.registrations * 2
    ]

    rows.push(row.map(escapeCsvField).join(';'))
  }

  // BOM UTF-8 (\uFEFF) pour compatibilité Excel
  const csvContent = `\uFEFF${rows.join('\r\n')}`

  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', 'attachment; filename="contacts-urgence-salondanse-2027.csv"')

  return csvContent
})
