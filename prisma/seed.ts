import { PrismaClient, RegistrationStatus, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // 1. Nettoyage préalable pour éviter les doublons
  await prisma.auditLog.deleteMany()
  await prisma.registration.deleteMany()
  await prisma.slotMission.deleteMany()
  await prisma.timeSlot.deleteMany()
  await prisma.mission.deleteMany()
  await prisma.invitationCode.deleteMany()
  await prisma.user.deleteMany()
  await prisma.edition.deleteMany()

  // 2. Création de l'édition 2027
  const edition = await prisma.edition.create({
    data: {
      year: 2027,
      name: 'Salon de la Danse 2027',
      isCurrent: true,
      isRegistrationOpen: true
    }
  })

  // 3. Compte Administrateur par défaut
  const passwordHash = await bcrypt.hash('Admin2027!', 10)
  await prisma.user.create({
    data: {
      email: 'admin@salondeladanse.fr',
      firstName: 'Admin',
      lastName: 'JayDance',
      phone: '0600000000',
      passwordHash,
      role: Role.ADMIN,
      editionId: edition.id
    }
  })

  // 3b. Compte Bénévole de test
  const benevolePasswordHash = await bcrypt.hash('Danse2027!', 10)
  await prisma.user.create({
    data: {
      email: 'benevole@salondeladanse.fr',
      firstName: 'Camille',
      lastName: 'Moreau',
      phone: '0612345678',
      passwordHash: benevolePasswordHash,
      role: Role.BENEVOLE,
      planningStatus: RegistrationStatus.DRAFT,
      editionId: edition.id
    }
  })

  // 4. Codes d'invitation de test
  const testCodes = ['DANSE-2027-01', 'DANSE-2027-02', 'DANSE-2027-03', 'TEST-CODE']
  for (const code of testCodes) {
    await prisma.invitationCode.create({
      data: { code, editionId: edition.id }
    })
  }

  // 5. Missions du cahier des charges
  const missionsData = [
    { name: 'Accueil exposants', isSensitive: false },
    { name: 'Vestiaires', isSensitive: false },
    { name: 'Point Info', isSensitive: false },
    { name: 'Masterclass / Conférences', isSensitive: false },
    { name: 'Loges danseurs', isSensitive: false },
    { name: 'Logistique (Niveau 0 + -2)', isSensitive: false },
    { name: 'Scène principale', isSensitive: false },
    { name: 'Stand JayDance', isSensitive: false },
    { name: 'Village Danses du Monde', isSensitive: false },
    // Postes sensibles hors-planning public
    { name: 'Billetterie', isSensitive: true },
    { name: 'Caisse', isSensitive: true }
  ]

  const createdMissions = await Promise.all(
    missionsData.map(m => prisma.mission.create({ data: m }))
  )

  // 6. Tranches horaires (14, 15 et 16 mai 2027 - 5 créneaux de 2h)
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

      // Création des jauges pour toutes les missions (capacité 4 pour publiques, 2 pour sensibles)
      for (const mission of createdMissions) {
        await prisma.slotMission.create({
          data: {
            missionId: mission.id,
            timeSlotId: createdSlot.id,
            capacityMax: mission.isSensitive ? 2 : 4
          }
        })
      }
    }
  }

  console.log('Seed terminé avec succès !')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
