import { getAuthenticatedUser } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

function escapeCsvField(field: string | number | null | undefined): string {
  if (field === null || field === undefined) return ''
  const str = String(field)
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export default defineEventHandler(async (event) => {
  const admin = await getAuthenticatedUser(event)

  if (admin.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Accès réservé aux administrateurs.'
    })
  }

  const volunteers = await prisma.user.findMany({
    where: {
      role: 'BENEVOLE',
      edition: { isCurrent: true }
    },
    orderBy: [
      { lastName: 'asc' },
      { firstName: 'asc' }
    ],
    include: {
      registrations: {
        include: {
          slotMission: {
            include: {
              mission: true,
              timeSlot: true
            }
          }
        },
        orderBy: [
          { slotMission: { timeSlot: { date: 'asc' } } },
          { slotMission: { timeSlot: { orderIndex: 'asc' } } }
        ]
      }
    }
  })

  // En-têtes CSV
  const headers = [
    'Nom',
    'Prénom',
    'Email',
    'Téléphone',
    'Statut Planning',
    'Date Verrouillage',
    'Nombre de créneaux',
    'Heures totales',
    'Détail des créneaux'
  ]

  const rows: string[] = []
  rows.push(headers.map(escapeCsvField).join(';'))

  for (const v of volunteers) {
    const statusLabel = v.planningStatus === 'CONFIRMED' ? 'Validé et Verrouillé' : 'Brouillon'
    const lockedDateFormatted = v.planningLockedAt
      ? new Date(v.planningLockedAt).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : ''

    const slotsDetails = v.registrations.map((r) => {
      const ts = r.slotMission.timeSlot
      const m = r.slotMission.mission
      const d = new Date(ts.date)
      const dayShort = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
      const sensitiveNotice = m.isSensitive ? ' [Sensible]' : ''
      return `${dayShort} ${ts.startTime}-${ts.endTime} (${m.name}${sensitiveNotice})`
    }).join(' | ')

    const row = [
      v.lastName,
      v.firstName,
      v.email,
      v.phone || '',
      statusLabel,
      lockedDateFormatted,
      v.registrations.length,
      v.registrations.length * 2,
      slotsDetails
    ]

    rows.push(row.map(escapeCsvField).join(';'))
  }

  // BOM UTF-8 (\uFEFF) pour compatibilité Excel
  const csvContent = `\uFEFF${rows.join('\r\n')}`

  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', 'attachment; filename="benevoles-salondanse-2027.csv"')

  return csvContent
})
