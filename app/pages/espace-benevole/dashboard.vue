<script setup lang="ts">
useHead({
  title: 'Mon Profil & Planning · Espace Bénévole'
})

interface VolunteerSummarySlot {
  registrationId: string
  missionId: string
  missionName: string
  isSensitive: boolean
  date: string
  dayLabel: string
  shortDayLabel: string
  startTime: string
  endTime: string
  orderIndex: number
  location: string
  instructions: string
}

interface VolunteerSummaryResponse {
  volunteer: {
    id: string
    firstName: string
    lastName: string
    fullName: string
    email: string
    phone: string
    photoUrl: string | null
    isMinor: boolean
    minorValidationStatus?: string
    isApprovedMinor?: boolean
    planningStatus: 'DRAFT' | 'CONFIRMED'
    planningLockedAt: string | null
    isLocked: boolean
    editionName: string
    editionYear: number
    qrCodeUrl?: string
    verifyUrl?: string
  }
  emergencyContact: {
    organization: string
    coordinator: string
    email: string
    phone: string
    qgLocation: string
  }
  slots: VolunteerSummarySlot[]
  totalSlots: number
  totalHours: number
}

const { user: authUser } = useAuth()

const { data, status } = await useFetch<VolunteerSummaryResponse>('/api/volunteer/me/summary', {
  lazy: false
})

const summary = computed(() => data.value)
const isConfirmed = computed(() => {
  if (!summary.value) return false
  const vol = summary.value.volunteer
  if (vol.isMinor && !vol.isApprovedMinor) return false
  return vol.planningStatus === 'CONFIRMED'
})

// Modale plein écran QR code
const isQrModalOpen = ref(false)

function handlePrint() {
  if (typeof window !== 'undefined') {
    window.print()
  }
}
</script>

<template>
  <div class="w-full max-w-6xl xl:max-w-7xl mx-auto space-y-6 text-[#2A1512]">
    <!-- EN-TÊTE ÉCRAN (Masqué à l'impression) -->
    <div class="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E6D9CB]">
      <div class="space-y-1">
        <span class="text-[11px] font-bold tracking-[0.16em] uppercase text-[#7A291E] block">
          Espace Bénévoles · Mon Profil
        </span>
        <h1 class="font-bold tracking-tight text-2xl sm:text-3xl text-[#2A1512] leading-tight">
          {{ summary?.volunteer.fullName || 'Mon Compte' }}
        </h1>
        <p class="text-xs text-[#6E5A52]">
          Salon de la Danse Angers · Édition {{ summary?.volunteer.editionYear || 2027 }}
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="h-10 sm:h-9 px-4 rounded-full border border-[#D8C6B4] bg-[#FFFCF8] hover:bg-[#F6EFE6] text-[#2A1512] font-semibold text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
          @click="handlePrint"
        >
          <UIcon name="i-lucide-printer" class="w-3.5 h-3.5 text-[#7A291E]" />
          <span>Fiche mission</span>
        </button>

        <NuxtLink
          to="/espace-benevole/planning"
          class="h-10 sm:h-9 px-5 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] text-white font-semibold text-xs flex items-center gap-2 transition-colors shadow-2xs"
        >
          <UIcon name="i-lucide-calendar" class="w-3.5 h-3.5 text-[#D9B777]" />
          <span>Modifier mes créneaux</span>
        </NuxtLink>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- SECTION PRINCIPALE : BADGE À GAUCHE & INFOS + MISSIONS   -->
    <!-- ======================================================== -->
    <div
      v-if="summary || status === 'pending'"
      class="print:hidden flex flex-col lg:flex-row gap-6 items-start"
    >
      <!-- Badge bénévole rangé à gauche -->
      <div class="w-full lg:w-[320px] shrink-0 flex justify-center lg:justify-start lg:sticky lg:top-6">
        <!-- Badge officiel activé si planning validé -->
        <VolunteerBadge
          v-if="isConfirmed && summary"
          :volunteer="summary.volunteer"
          @open-qr="isQrModalOpen = true"
        />

        <!-- Carte "En attente de validation" si bénévole non validé -->
        <div
          v-else
          class="relative w-full max-w-[320px] aspect-[9/14] min-h-[480px] bg-[#FFFCF8] rounded-3xl border-2 border-dashed border-[#D9A660] shadow-sm p-5 flex flex-col justify-between overflow-hidden select-none text-center"
        >
          <!-- HAUT : En-tête -->
          <div class="space-y-2">
            <div class="flex items-center justify-between px-0.5">
              <span class="font-bold text-base text-[#2A1512]">
                Salon de la Danse
              </span>
              <span class="px-2.5 py-0.5 rounded-full bg-[#F3DCD5] text-[#7A291E] font-bold text-[10px] tracking-wide border border-[#ECCBC4]">
                Édition {{ summary?.volunteer.editionYear || 2027 }}
              </span>
            </div>
          </div>

          <!-- MILIEU : Photo + Statut en attente -->
          <div class="flex flex-col items-center my-auto space-y-3">
            <!-- Photo ronde -->
            <div class="relative w-20 h-20 sm:w-22 sm:h-22">
              <img
                v-if="summary?.volunteer.photoUrl"
                :src="summary.volunteer.photoUrl"
                :alt="`${summary?.volunteer.firstName || authUser?.firstName} ${summary?.volunteer.lastName || authUser?.lastName}`"
                class="w-full h-full rounded-full object-cover border-2 border-[#D9A660] shadow-sm ring-4 ring-[#FAF4F2]"
              >
              <div
                v-else
                class="w-full h-full rounded-full bg-[#7A291E] text-white flex items-center justify-center font-bold text-2xl border-2 border-[#5E1F16] shadow-sm ring-4 ring-[#FAF4F2]"
              >
                {{ (summary?.volunteer.firstName || authUser?.firstName || 'B').charAt(0) }}{{ (summary?.volunteer.lastName || authUser?.lastName || 'B').charAt(0) }}
              </div>
            </div>

            <!-- Nom -->
            <div class="text-center px-2">
              <h3 class="text-[#2A1512] font-bold text-lg sm:text-xl tracking-tight leading-snug truncate max-w-[260px]">
                {{ summary?.volunteer.firstName || authUser?.firstName }} {{ summary?.volunteer.lastName || authUser?.lastName }}
              </h3>
            </div>

            <!-- Pastille de statut : En attente de validation (Statut DA #F7E4C6 / #8A4B0F) -->
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F7E4C6] border border-[#D9A660] text-[#8A4B0F] text-xs font-semibold shadow-2xs">
              <UIcon
                name="i-lucide-clock"
                class="w-3.5 h-3.5 text-[#8A4B0F]"
              />
              <span>En attente de validation</span>
            </div>

            <!-- Zone explicative badge inactif -->
            <div class="w-full p-3 rounded-2xl bg-[#FAF2EF] border border-[#ECCBC4] text-center space-y-1 mt-2">
              <div class="flex items-center justify-center gap-1.5 text-[#7A291E] font-bold text-xs">
                <UIcon
                  name="i-lucide-qr-code"
                  class="w-4 h-4 text-[#7A291E]"
                />
                <span>QR Code inactif</span>
              </div>
              <p class="text-[11px] text-[#6E5A52] leading-relaxed">
                Votre badge et QR Code d'accès seront activés dès la validation finale de votre planning.
              </p>
            </div>

            <!-- Bouton rapide vers le planning -->
            <NuxtLink
              to="/espace-benevole/planning"
              class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] text-white text-xs font-semibold shadow-2xs transition-colors"
            >
              <UIcon
                name="i-lucide-calendar"
                class="w-3.5 h-3.5 text-[#D9B777]"
              />
              <span>Voir mon planning</span>
            </NuxtLink>
          </div>

          <!-- BAS : Identifiant unique -->
          <div class="pt-2 flex items-center justify-center text-[10px] font-mono text-[#6E5A52] px-0.5 border-t border-[#E6D9CB]">
            <span class="tracking-wider">ID: {{ (summary?.volunteer.id || authUser?.id || '').slice(0, 8).toUpperCase() }}</span>
          </div>
        </div>
      </div>

      <!-- COLONNE DROITE : Informations personnelles, Missions et Urgences -->
      <div class="flex-1 min-w-0 w-full space-y-5">
        <!-- 1. Informations personnelles -->
        <div class="bg-[#FFFCF8] rounded-3xl border border-[#E6D9CB] shadow-2xs p-5 sm:p-6 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E6D9CB]">
            <div class="flex items-center gap-2.5">
              <UIcon
                name="i-lucide-user-check"
                class="w-5 h-5 text-[#7A291E]"
              />
              <h2 class="text-base font-bold text-[#2A1512]">
                Mes informations personnelles
              </h2>
            </div>
            <div class="flex items-center gap-2">
              <span
                v-if="isConfirmed"
                class="font-semibold text-xs px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 bg-[#E1E9DC] text-[#2F5238] border border-[#9DB79F]"
              >
                <UIcon
                  name="i-lucide-check-circle-2"
                  class="w-3.5 h-3.5"
                />
                <span>Planning validé</span>
              </span>
              <NuxtLink
                v-else
                to="/espace-benevole/planning"
                class="inline-block"
              >
                <span
                  class="font-semibold text-xs px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 bg-[#F7E4C6] text-[#8A4B0F] border border-[#D9A660]"
                >
                  <UIcon
                    name="i-lucide-clock"
                    class="w-3.5 h-3.5"
                  />
                  <span>Planning en attente</span>
                </span>
              </NuxtLink>
              <span
                class="font-semibold text-xs px-2.5 py-0.5 rounded-full bg-[#EFE5DA] text-[#5B463E]"
              >
                Données vérifiées
              </span>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <!-- Photo d'identité ou Avatar avec initiales -->
            <div class="shrink-0">
              <img
                v-if="summary?.volunteer.photoUrl"
                :src="summary.volunteer.photoUrl"
                alt="Photo d'identité bénévole"
                class="w-20 h-20 rounded-2xl object-cover border border-[#E6D9CB] shadow-2xs"
              >
              <div
                v-else
                class="w-20 h-20 rounded-2xl bg-[#F3DCD5] text-[#7A291E] flex items-center justify-center font-bold text-xl border border-[#ECCBC4]"
              >
                {{ (summary?.volunteer.firstName || authUser?.firstName || 'B').charAt(0) }}{{ (summary?.volunteer.lastName || authUser?.lastName || 'B').charAt(0) }}
              </div>
            </div>

            <!-- Données en lecture seule -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-xs">
              <div class="p-3 rounded-2xl bg-[#FFFCF8] border border-[#E6D9CB]">
                <span class="text-[#6E5A52] font-bold uppercase text-[10px] block mb-0.5 tracking-wider">Identité</span>
                <p class="font-bold text-[#2A1512] text-sm">
                  {{ summary?.volunteer.firstName || authUser?.firstName }} {{ summary?.volunteer.lastName || authUser?.lastName }}
                </p>
              </div>

              <div class="p-3 rounded-2xl bg-[#FFFCF8] border border-[#E6D9CB]">
                <span class="text-[#6E5A52] font-bold uppercase text-[10px] block mb-0.5 tracking-wider">Adresse e-mail</span>
                <p class="font-medium text-[#2A1512] truncate">
                  {{ summary?.volunteer.email || authUser?.email }}
                </p>
              </div>

              <div class="p-3 rounded-2xl bg-[#FFFCF8] border border-[#E6D9CB]">
                <span class="text-[#6E5A52] font-bold uppercase text-[10px] block mb-0.5 tracking-wider">Numéro de téléphone</span>
                <p class="font-medium text-[#2A1512]">
                  {{ summary?.volunteer.phone || 'Non renseigné' }}
                </p>
              </div>

              <div class="p-3 rounded-2xl bg-[#FFFCF8] border border-[#E6D9CB]">
                <span class="text-[#6E5A52] font-bold uppercase text-[10px] block mb-0.5 tracking-wider">Statut légal</span>
                <p class="font-medium text-[#2A1512]">
                  {{ summary?.volunteer.isMinor ? 'Mineur (accord parental requis)' : 'Majeur' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Mention explicite obligatoire de verrouillage -->
          <div class="flex items-center gap-2 text-xs text-[#6E5A52] bg-[#FAF2EF] p-3 rounded-2xl border border-[#ECCBC4]">
            <UIcon
              name="i-lucide-shield-alert"
              class="w-4 h-4 text-[#7A291E] shrink-0"
            />
            <span>Pour modifier vos informations personnelles, veuillez contacter l'administration du Salon.</span>
          </div>
        </div>

        <!-- 2. Récapitulatif chronologique des créneaux réservés -->
        <div
          v-if="summary"
          class="bg-[#FFFCF8] rounded-3xl border border-[#E6D9CB] shadow-2xs p-5 sm:p-6 space-y-4"
        >
          <div class="flex items-center justify-between pb-3 border-b border-[#E6D9CB]">
            <div>
              <h3 class="text-base font-bold text-[#2A1512]">
                Mes créneaux
              </h3>
              <p class="text-xs text-[#6E5A52]">
                Total : {{ summary.totalHours }} heures de bénévolat
              </p>
            </div>

            <span
              v-if="summary.totalSlots > 0"
              class="font-semibold text-xs px-3 py-1 rounded-full bg-[#7A291E] text-white"
            >
              {{ summary.totalSlots }} créneau(x)
            </span>
          </div>

          <!-- Liste des créneaux -->
          <div
            v-if="summary.slots.length > 0"
            class="space-y-3"
          >
            <div
              v-for="slot in summary.slots"
              :key="slot.registrationId"
              class="p-4 rounded-2xl border border-[#E6D9CB] bg-[#FFFCF8] flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:border-[#7A291E] transition-all"
            >
              <div class="space-y-1.5">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-bold text-sm text-[#2A1512]">{{ slot.missionName }}</span>
                  <span
                    v-if="slot.isSensitive"
                    class="font-semibold text-[10px] px-2 py-0.5 rounded-full bg-[#F3DCD5] text-[#7A291E]"
                  >
                    Poste sensible
                  </span>
                  <span class="text-xs font-semibold text-[#7A291E] bg-[#FAF2EF] px-2 py-0.5 rounded-full border border-[#ECCBC4] font-mono">
                    {{ slot.startTime }} - {{ slot.endTime }}
                  </span>
                </div>

                <p class="text-xs text-[#6E5A52] font-medium flex items-center gap-1.5">
                  <UIcon
                    name="i-lucide-calendar"
                    class="w-3.5 h-3.5 text-[#7A291E]"
                  />
                  <span>{{ slot.dayLabel }}</span>
                </p>

                <!-- Lieu / Rendez-vous -->
                <div class="pt-1 text-xs text-[#6E5A52] space-y-0.5">
                  <p class="flex items-center gap-1.5">
                    <UIcon
                      name="i-lucide-map-pin"
                      class="w-3.5 h-3.5 text-[#7A291E] shrink-0"
                    />
                    <span class="font-medium text-[#2A1512]">{{ slot.location }}</span>
                  </p>
                  <p class="text-[11px] text-[#6E5A52] italic pl-5">
                    Consignes : {{ slot.instructions }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Aucun créneau réservé -->
          <div
            v-else
            class="py-8 text-center text-[#6E5A52] space-y-2"
          >
            <UIcon
              name="i-lucide-calendar-x"
              class="w-8 h-8 mx-auto text-[#D8C6B4]"
            />
            <p class="text-xs font-medium">
              Vous n'avez pas encore choisi de créneau de bénévolat.
            </p>
            <div class="print:hidden pt-1">
              <NuxtLink
                to="/espace-benevole/planning"
                class="h-9 px-4 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
              >
                <span>Accéder au planning</span>
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- 3. Contacts d'urgence & Assistance Bénévoles -->
        <div
          v-if="summary"
          class="bg-[#FFFCF8] rounded-3xl border border-[#E6D9CB] shadow-2xs p-5 sm:p-6 space-y-3"
        >
          <div class="flex items-center gap-2 text-[#2A1512] font-bold text-sm">
            <UIcon
              name="i-lucide-phone-call"
              class="w-4 h-4 text-[#7A291E]"
            />
            <h3>Contacts d'urgence & Assistance Bénévoles</h3>
          </div>
          <p class="text-xs text-[#6E5A52]">
            En cas de retard, d'empêchement ou pour toute question sur place, contactez immédiatement la régie :
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
            <div class="p-3 rounded-2xl bg-[#FFFCF8] border border-[#E6D9CB] space-y-1">
              <span class="text-[#6E5A52] font-bold uppercase text-[10px] tracking-wider">Permanence téléphonique</span>
              <p class="font-bold text-[#7A291E] text-sm">
                <a
                  :href="'tel:' + summary.emergencyContact.phone.replace(/\s/g, '')"
                  class="hover:underline"
                >
                  {{ summary.emergencyContact.phone }}
                </a>
              </p>
              <p class="text-[#6E5A52] text-[11px]">
                {{ summary.emergencyContact.coordinator }}
              </p>
            </div>

            <div class="p-3 rounded-2xl bg-[#FFFCF8] border border-[#E6D9CB] space-y-1">
              <span class="text-[#6E5A52] font-bold uppercase text-[10px] tracking-wider">Point de ralliement / QG</span>
              <p class="font-bold text-[#2A1512] text-xs">
                {{ summary.emergencyContact.qgLocation }}
              </p>
              <p class="text-[#6E5A52] text-[11px]">
                E-mail : {{ summary.emergencyContact.email }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- SECTION D'IMPRESSION PRINT A4 DÉDIÉE                      -->
    <!-- ======================================================== -->
    <div
      v-if="summary"
      id="printable-schedule"
      class="hidden print:block"
    >
      <div style="border-bottom: 2px solid #7A291E; padding-bottom: 12px; margin-bottom: 16px;">
        <h1 style="font-size: 20px; font-weight: bold; margin: 0; color: #2A1512; font-family: 'Playfair Display', serif;">
          SALON DE LA DANSE D'ANGERS 2027
        </h1>
        <p style="font-size: 12px; color: #6E5A52; margin: 4px 0 0 0;">
          Fiche individuelle de mission bénévole · Parc des Expositions d'Angers (14-16 Mai 2027)
        </p>
      </div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 12px;">
        <div>
          <strong>Bénévole :</strong> {{ summary.volunteer.fullName }}<br>
          <strong>Email :</strong> {{ summary.volunteer.email }} • <strong>Téléphone :</strong> {{ summary.volunteer.phone || 'Non renseigné' }}
        </div>
        <div style="text-align: right;">
          <strong>Statut :</strong> {{ isConfirmed ? 'Validé & Verrouillé' : 'Brouillon' }}<br>
          <strong>Total :</strong> {{ summary.totalSlots }} créneau(x) ({{ summary.totalHours }}h)
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px;">
        <thead>
          <tr style="background-color: #F6EFE6; border-bottom: 1px solid #E6D9CB;">
            <th style="padding: 8px; text-align: left;">
              Date & Tranche horaire
            </th>
            <th style="padding: 8px; text-align: left;">
              Mission
            </th>
            <th style="padding: 8px; text-align: left;">
              Point de rendez-vous
            </th>
            <th style="padding: 8px; text-align: left;">
              Consignes
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="s in summary.slots"
            :key="s.registrationId"
            style="border-bottom: 1px solid #E6D9CB;"
          >
            <td style="padding: 8px; font-weight: bold;">
              {{ s.shortDayLabel }}<br>{{ s.startTime }} - {{ s.endTime }}
            </td>
            <td style="padding: 8px; font-weight: bold; color: #7A291E;">
              {{ s.missionName }} {{ s.isSensitive ? '(Poste sensible)' : '' }}
            </td>
            <td style="padding: 8px;">
              {{ s.location }}
            </td>
            <td style="padding: 8px; color: #6E5A52;">
              {{ s.instructions }}
            </td>
          </tr>
        </tbody>
      </table>

      <div style="border-top: 1px solid #E6D9CB; padding-top: 10px; font-size: 10px; color: #6E5A52;">
        <strong>Numéro d'urgence régie bénévoles :</strong> {{ summary.emergencyContact.phone }} ({{ summary.emergencyContact.coordinator }})<br>
        Présentation obligatoire 15 minutes avant l'heure de début au QG Bénévoles.
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- MODALE FULLSCREEN QR CODE POUR SCAN FACILE               -->
    <!-- ======================================================== -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="isQrModalOpen && summary"
          class="fixed inset-0 z-50 bg-[#2A1512]/80 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-8"
          @click="isQrModalOpen = false"
        >
          <!-- Barre supérieure avec bouton Fermer -->
          <div
            class="w-full max-w-md flex items-center justify-between"
            @click.stop
          >
            <button
              type="button"
              class="p-2 rounded-full bg-white/10 hover:bg-white/20 text-[#FFF7EE] transition-colors cursor-pointer"
              aria-label="Fermer"
              @click="isQrModalOpen = false"
            >
              <UIcon
                name="i-lucide-x"
                class="w-6 h-6"
              />
            </button>
          </div>

          <!-- Carte Centrale Plein Écran (Papier #FFFCF8) -->
          <div
            class="w-full max-w-sm bg-[#FFFCF8] rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl my-auto border border-[#E6D9CB]"
            @click.stop
          >
            <!-- En-tête avec identité -->
            <div class="flex flex-col items-center space-y-2">
              <img
                v-if="summary.volunteer.photoUrl"
                :src="summary.volunteer.photoUrl"
                alt="Photo bénévole"
                class="w-20 h-20 rounded-full object-cover border-2 border-[#7A291E] shadow-2xs"
              >
              <div
                v-else
                class="w-20 h-20 rounded-full bg-[#7A291E] text-white flex items-center justify-center font-bold text-xl shadow-2xs"
              >
                {{ summary.volunteer.firstName.charAt(0) }}{{ summary.volunteer.lastName.charAt(0) }}
              </div>

              <div>
                <h3 class="font-bold text-2xl text-[#2A1512] leading-tight">
                  {{ summary.volunteer.firstName }} {{ summary.volunteer.lastName }}
                </h3>
                <span class="inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold bg-[#F3DCD5] text-[#7A291E]">
                  BÉNÉVOLE · {{ summary.volunteer.editionYear || 2027 }}
                </span>
              </div>
            </div>

            <!-- Grand QR Code Haute Résolution -->
            <div class="p-4 bg-white border border-[#D8C6B4] rounded-2xl inline-block shadow-2xs">
              <img
                v-if="summary.volunteer.qrCodeUrl"
                :src="summary.volunteer.qrCodeUrl"
                alt="QR Code haute résolution"
                class="w-60 h-60 sm:w-64 sm:h-64 mx-auto"
              >
            </div>

            <div class="space-y-1">
              <p class="text-xs font-bold text-[#2A1512]">
                Présentez ce QR Code aux postes de contrôle du Salon
              </p>
            </div>

            <!-- Affichage du lien d'accréditation officiel -->
            <div
              v-if="summary.volunteer.verifyUrl"
              class="pt-1"
            >
              <a
                :href="summary.volunteer.verifyUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FAF2EF] text-[#7A291E] hover:bg-[#F3DCD5] text-xs font-semibold transition-colors border border-[#ECCBC4] max-w-full"
                title="Lien officiel encodé dans le QR Code"
              >
                <UIcon
                  name="i-lucide-external-link"
                  class="w-3.5 h-3.5 shrink-0"
                />
                <span class="truncate max-w-[260px] sm:max-w-xs">{{ summary.volunteer.verifyUrl }}</span>
              </a>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
