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

  const query = getQuery(event)
  const missionId = query.missionId ? String(query.missionId).trim() : undefined
  const dayFilter = query.day ? String(query.day).trim() : undefined

  const currentEdition = await prisma.edition.findFirst({
    where: { isCurrent: true }
  })

  if (!currentEdition) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Aucune édition courante configurée.'
    })
  }

  // Filtrage des inscriptions par mission ou par jour
  const registrations = await prisma.registration.findMany({
    where: {
      user: {
        editionId: currentEdition.id,
        role: Role.BENEVOLE
      },
      slotMission: {
        timeSlot: {
          editionId: currentEdition.id,
          ...(dayFilter
            ? {
                date: {
                  gte: new Date(`${dayFilter}T00:00:00.000Z`),
                  lte: new Date(`${dayFilter}T23:59:59.999Z`)
                }
              }
            : {})
        },
        ...(missionId ? { missionId } : {})
      }
    },
    include: {
      user: true,
      slotMission: {
        include: {
          mission: true,
          timeSlot: true
        }
      }
    },
    orderBy: [
      { slotMission: { timeSlot: { date: 'asc' } } },
      { slotMission: { timeSlot: { orderIndex: 'asc' } } },
      { slotMission: { mission: { name: 'asc' } } },
      { user: { lastName: 'asc' } }
    ]
  })

  const headers = [
    'Date',
    'Tranche Horaire',
    'Mission',
    'Poste Sensible',
    'Nom',
    'Prénom',
    'Email',
    'Téléphone',
    'Statut Planning',
    'Mineur'
  ]

  const rows: string[] = []
  rows.push(headers.map(escapeCsvField).join(';'))

  for (const reg of registrations) {
    const ts = reg.slotMission.timeSlot
    const m = reg.slotMission.mission
    const u = reg.user

    const d = new Date(ts.date)
    const formattedDate = d.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    })

    const row = [
      formattedDate,
      `${ts.startTime} - ${ts.endTime}`,
      m.name,
      m.isSensitive ? 'OUI' : 'NON',
      u.lastName,
      u.firstName,
      u.email,
      u.phone || '',
      u.planningStatus === 'CONFIRMED' ? 'Validé' : 'Brouillon',
      u.isMinor ? 'Mineur' : 'Majeur'
    ]

    rows.push(row.map(escapeCsvField).join(';'))
  }

  // BOM UTF-8 (\uFEFF) pour compatibilité totale avec Excel
  const csvContent = `\uFEFF${rows.join('\r\n')}`

  const filename = missionId
    ? `planning-mission-${missionId.slice(0, 8)}.csv`
    : dayFilter
      ? `planning-jour-${dayFilter}.csv`
      : 'planning-missions-global.csv'

  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)

  return csvContent
})
