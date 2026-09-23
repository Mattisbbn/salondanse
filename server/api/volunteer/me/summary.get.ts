import { getAuthenticatedUser } from '../../../utils/auth'
import { generateBadgeQrCode } from '../../../utils/badge'
import { prisma } from '../../../utils/prisma'

const MISSION_GUIDELINES: Record<string, { location: string, instructions: string }> = {
  'Accueil exposants': {
    location: 'Hall Principal • Entrée Exposants (Niveau 0)',
    instructions: 'Badgeage et remise des packs exposants. Se présenter 15 minutes avant le début du créneau.'
  },
  'Vestiaires': {
    location: 'Espace Vestiaires • Hall B (Niveau -1)',
    instructions: 'Gestion des vestiaires sécurisés et distribution des cintres/jetons numérotés.'
  },
  'Point Info': {
    location: 'Kiosque Central • Niveau 0',
    instructions: 'Renseignement des visiteurs, distribution des programmes officiels et orientation générale.'
  },
  'Masterclass / Conférences': {
    location: 'Salles A & B (Niveau 1)',
    instructions: 'Contrôle des accès aux cours, vérification des billets et assistance logistique aux professeurs.'
  },
  'Loges danseurs': {
    location: 'Zone Backstage • Accès réservé aux artistes',
    instructions: 'Accueil des compagnies de danse, contrôle des bracelets d\'accès et approvisionnement des loges.'
  },
  'Logistique (Niveau 0 + -2)': {
    location: 'Quai de déchargement & Réserve technique',
    instructions: 'Manutention légère, réapprovisionnement des points d\'eau et assistance à la signalétique.'
  },
  'Scène principale': {
    location: 'Grande Scène Aréna • Hall A',
    instructions: 'Gestion des flux de spectateurs en salle et assistance technique régie / plateau.'
  },
  'Stand JayDance': {
    location: 'Stand Officiel JayDance Animation • Hall A',
    instructions: 'Animation, vente de textiles/goodies et renseignement sur les stages et formations.'
  },
  'Village Danses du Monde': {
    location: 'Espace Culturel • Hall C',
    instructions: 'Accueil des troupes régionales et internationales, coordination des répétitions scéniques.'
  },
  'Billetterie': {
    location: 'Guichet Sud • Entrée principale',
    instructions: 'Poste sensible : contrôle des billets, scan des e-tickets et gestion des accès prioritaires.'
  },
  'Caisse': {
    location: 'Bureau Régie Centrale (Sécurisé)',
    instructions: 'Poste sensible : gestion sécurisée des fonds de caisse, comptage et remise aux trésoriers.'
  }
}

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: {
      edition: true,
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

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Utilisateur introuvable.'
    })
  }

  const slots = user.registrations.map((reg) => {
    const ts = reg.slotMission.timeSlot
    const mission = reg.slotMission.mission
    const custom = MISSION_GUIDELINES[mission.name] || {
      location: 'QG Bénévoles JayDance (Parc des Expositions)',
      instructions: 'Se présenter au point info bénévoles 15 minutes avant le début du créneau.'
    }

    const d = new Date(ts.date)
    const dayLabel = d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    })

    const shortDay = d.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC'
    })

    return {
      registrationId: reg.id,
      missionId: mission.id,
      missionName: mission.name,
      isSensitive: mission.isSensitive,
      date: ts.date.toISOString(),
      dayLabel: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1),
      shortDayLabel: shortDay.charAt(0).toUpperCase() + shortDay.slice(1),
      startTime: ts.startTime,
      endTime: ts.endTime,
      orderIndex: ts.orderIndex,
      location: custom.location,
      instructions: custom.instructions
    }
  })

  // Génération du QR code officiel pour le badge du bénévole avec URL absolue
  const { verifyUrl, qrCodeUrl } = await generateBadgeQrCode(user.id, event, { width: 400 })

  return {
    volunteer: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      phone: user.phone,
      photoUrl: user.photoUrl,
      isMinor: user.isMinor,
      minorValidationStatus: user.minorValidationStatus,
      isApprovedMinor: user.isApprovedMinor,
      planningStatus: user.planningStatus,
      planningLockedAt: user.planningLockedAt,
      isLocked: user.isLocked || user.planningStatus === 'CONFIRMED',
      editionName: user.edition.name,
      editionYear: user.edition.year,
      qrCodeUrl,
      verifyUrl
    },
    emergencyContact: {
      organization: 'JayDance Animation • Salon de la Danse d\'Angers 2027',
      coordinator: 'Équipe JayDance Fam & Coordination Bénévoles',
      email: 'benevoles@salondeladanse.fr',
      phone: '06 12 34 56 78',
      qgLocation: 'Salle Bénévoles / Backstage • Parc des Expositions d\'Angers'
    },
    slots,
    totalSlots: slots.length,
    totalHours: slots.length * 2
  }
})
