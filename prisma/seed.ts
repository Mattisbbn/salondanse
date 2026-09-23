import { PrismaClient, RegistrationStatus, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Démarrage du réensemencement (Seed)...')

  // 1. Nettoyage préalable pour garantir un état propre
  await prisma.auditLog.deleteMany()
  await prisma.registration.deleteMany()
  await prisma.slotMission.deleteMany()
  await prisma.timeSlot.deleteMany()
  await prisma.mission.deleteMany()
  await prisma.invitationCode.deleteMany()
  await prisma.user.deleteMany()
  await prisma.edition.deleteMany()

  // 2. Création de l'édition 2027 avec dates flexibles
  const edition = await prisma.edition.create({
    data: {
      year: 2027,
      name: 'Salon de la Danse 2027',
      isCurrent: true,
      isRegistrationOpen: true,
      eventStartDate: new Date('2027-05-14T00:00:00.000Z'),
      eventEndDate: new Date('2027-05-16T00:00:00.000Z'),
      eventDays: ['2027-05-14', '2027-05-15', '2027-05-16']
    }
  })

  // 3. Mot de passe commun pour tous les comptes de test
  const commonPassword = 'Password123!'
  const commonPasswordHash = await bcrypt.hash(commonPassword, 10)

  // 4. Création des comptes de démonstration (Profils épurés sans créneaux réservés)
  // 4a. Administrateur
  await prisma.user.create({
    data: {
      email: 'admin@salondeladanse.fr',
      firstName: 'Admin',
      lastName: 'JayDance',
      phone: '0600000000',
      passwordHash: commonPasswordHash,
      role: Role.ADMIN,
      birthDate: new Date('1990-01-01'),
      isMinor: false,
      minorValidationStatus: 'NONE',
      isApprovedMinor: false,
      editionId: edition.id
    }
  })

  // 4b. Bénévole majeur (Planning vierge)
  await prisma.user.create({
    data: {
      email: 'benevole@salondeladanse.fr',
      firstName: 'Camille',
      lastName: 'Moreau',
      phone: '0612345678',
      passwordHash: commonPasswordHash,
      role: Role.BENEVOLE,
      birthDate: new Date('1998-04-12'),
      isMinor: false,
      minorValidationStatus: 'NONE',
      isApprovedMinor: false,
      planningStatus: RegistrationStatus.DRAFT,
      planningLockedAt: null,
      editionId: edition.id
    }
  })

  // 4c. Bénévole mineur - En attente de validation (PENDING)
  await prisma.user.create({
    data: {
      email: 'mineur.attente@salondeladanse.fr',
      firstName: 'Léo',
      lastName: 'Petit',
      phone: '0622334455',
      passwordHash: commonPasswordHash,
      role: Role.BENEVOLE,
      birthDate: new Date('2010-06-15'), // 16 ans en mai 2027
      isMinor: true,
      parentalAuthorizationUrl: '/uploads/parental-authorizations/sample-test.pdf',
      minorValidationStatus: 'PENDING',
      isApprovedMinor: false,
      planningStatus: RegistrationStatus.DRAFT,
      planningLockedAt: null,
      editionId: edition.id
    }
  })

  // 4d. Bénévole mineur - Validé par l'admin (VALIDATED)
  await prisma.user.create({
    data: {
      email: 'mineur.valide@salondeladanse.fr',
      firstName: 'Manon',
      lastName: 'Dubois',
      phone: '0633445566',
      passwordHash: commonPasswordHash,
      role: Role.BENEVOLE,
      birthDate: new Date('2009-11-20'), // 17 ans en mai 2027
      isMinor: true,
      parentalAuthorizationUrl: '/uploads/parental-authorizations/sample-test.pdf',
      minorValidationStatus: 'VALIDATED',
      isApprovedMinor: true,
      planningStatus: RegistrationStatus.DRAFT,
      planningLockedAt: null,
      editionId: edition.id
    }
  })

  // 4e. Bénévole mineur - Rejeté par l'admin (REJECTED)
  await prisma.user.create({
    data: {
      email: 'mineur.refuse@salondeladanse.fr',
      firstName: 'Lucas',
      lastName: 'Roux',
      phone: '0644556677',
      passwordHash: commonPasswordHash,
      role: Role.BENEVOLE,
      birthDate: new Date('2011-02-10'), // 16 ans en mai 2027
      isMinor: true,
      parentalAuthorizationUrl: '/uploads/parental-authorizations/sample-test.pdf',
      minorValidationStatus: 'REJECTED',
      isApprovedMinor: false,
      planningStatus: RegistrationStatus.DRAFT,
      planningLockedAt: null,
      editionId: edition.id
    }
  })

  // 5. Invitations d'exemple
  // 5a. Code non utilisé pour tester le formulaire /register
  await prisma.invitationCode.create({
    data: {
      code: 'SD2027-NOUVEAU',
      email: 'nouveau.benevole@test.fr',
      editionId: edition.id,
      isUsed: false
    }
  })

  // 5b. Code actif existant lié à un e-mail pour tester le renvoi / régénération depuis l'admin
  await prisma.invitationCode.create({
    data: {
      code: 'SD2027-ACTIF',
      email: 'invitation.active@test.fr',
      editionId: edition.id,
      isUsed: false
    }
  })

  // 5c. Codes génériques supplémentaires
  const extraCodes = ['SD2027-DEMO-1', 'SD2027-DEMO-2']
  for (const code of extraCodes) {
    await prisma.invitationCode.create({
      data: { code, editionId: edition.id, isUsed: false }
    })
  }

  // 6. Missions clés représentatives (5 missions au lieu de 11)
  const missionsData = [
    { name: 'Accueil exposants', isSensitive: false, capacity: 2 },
    { name: 'Point Info', isSensitive: false, capacity: 1 },
    { name: 'Masterclass / Conférences', isSensitive: false, capacity: 2 },
    { name: 'Loges danseurs', isSensitive: false, capacity: 1 },
    { name: 'Billetterie / Caisse', isSensitive: true, capacity: 1 }
  ]

  const createdMissions = await Promise.all(
    missionsData.map(m => prisma.mission.create({
      data: {
        name: m.name,
        isSensitive: m.isSensitive,
        editionId: edition.id,
        defaultCapacity: m.capacity,
        isActive: true
      }
    }))
  )

  // 7. Tranches horaires (14, 15 et 16 mai 2027 - 5 créneaux de 2h)
  const eventDays = [
    new Date('2027-05-14T00:00:00.000Z'),
    new Date('2027-05-15T00:00:00.000Z'),
    new Date('2027-05-16T00:00:00.000Z')
  ]

  const slots = [
    { start: '08:30', end: '10:00', order: 1 },
    { start: '10:00', end: '12:00', order: 2 },
    { start: '12:00', end: '14:00', order: 3 },
    { start: '14:00', end: '16:00', order: 4 },
    { start: '16:00', end: '18:00', order: 5 }
  ]

  for (const date of eventDays) {
    for (const slot of slots) {
      const createdSlot = await prisma.timeSlot.create({
        data: {
          date,
          startTime: slot.start,
          endTime: slot.end,
          orderIndex: slot.order,
          editionId: edition.id
        }
      })

      // Création des jauges très réduites (1 ou 2 personnes max) pour saturer facilement lors de la démo
      for (const mission of createdMissions) {
        await prisma.slotMission.create({
          data: {
            missionId: mission.id,
            timeSlotId: createdSlot.id,
            capacityMax: mission.defaultCapacity
          }
        })
      }
    }
  }

  console.log('✅ Seed terminé avec succès !')
  console.log('--- Identifiants Démonstration ---')
  console.log('Mot de passe commun :', commonPassword)
  console.log('1. Admin : admin@salondeladanse.fr')
  console.log('2. Bénévole majeur : benevole@salondeladanse.fr')
  console.log('3. Mineur en attente (PENDING) : mineur.attente@salondeladanse.fr')
  console.log('4. Mineur validé (VALIDATED) : mineur.valide@salondeladanse.fr')
  console.log('5. Mineur refusé (REJECTED) : mineur.refuse@salondeladanse.fr')
  console.log('--- Invitations Démonstration ---')
  console.log('Code non utilisé : SD2027-NOUVEAU')
  console.log('Invitation active : SD2027-ACTIF (invitation.active@test.fr)')
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
