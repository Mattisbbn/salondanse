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
  <div class="w-full max-w-6xl xl:max-w-7xl mx-auto space-y-6">
    <!-- EN-TÊTE ÉCRAN (Masqué à l'impression) -->
    <div class="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Espace Bénévole • Mon Profil
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-0.5">
          {{ summary?.volunteer.fullName }} • Salon de la Danse 2027 (Angers)
        </p>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-lucide-printer"
          label="Imprimer / Télécharger (PDF)"
          class="font-medium cursor-pointer shadow-xs"
          @click="handlePrint"
        />
        <UButton
          to="/espace-benevole/planning"
          color="primary"
          variant="solid"
          size="sm"
          icon="i-lucide-calendar"
          label="Modifier mes créneaux"
          class="font-semibold shadow-xs"
        />
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- ======================================================== -->
    <!-- SECTION PRINCIPALE : BADGE À GAUCHE & INFOS + MISSIONS   -->
    <!-- ======================================================== -->
    <div
      v-if="summary || status === 'pending'"
      class="print:hidden flex flex-col lg:flex-row gap-5 xl:gap-6 items-start"
    >
      <!-- Badge bénévole rangé à gauche (largeur ajustée, collé au contenu) -->
      <div class="w-full lg:w-[320px] shrink-0 flex justify-center lg:justify-start lg:sticky lg:top-6">
        <!-- Badge officiel activé si planning validé -->
        <VolunteerBadge
          v-if="isConfirmed && summary"
          :volunteer="summary.volunteer"
          @open-qr="isQrModalOpen = true"
        />

        <!-- Carte "En attente de validation" si bénévole non validé ou avant chargement complet -->
        <div
          v-else
          class="relative w-full max-w-[320px] aspect-[9/14] min-h-[480px] bg-white/95 backdrop-blur-md rounded-3xl border-2 border-dashed border-amber-300 shadow-xl shadow-amber-950/5 p-5 flex flex-col justify-between overflow-hidden select-none text-center"
        >
          <!-- HAUT : En-tête -->
          <div class="space-y-2">
            <div class="flex items-center justify-between px-0.5">
              <span class="font-extrabold text-sm tracking-tight text-slate-800">
                Salon de la Danse
              </span>
              <span class="px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 font-bold text-[10px] tracking-wide border border-violet-100 shadow-2xs">
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
                class="w-full h-full rounded-full object-cover border-2 border-amber-400 shadow-md ring-4 ring-amber-50"
              >
              <div
                v-else
                class="w-full h-full rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-2xl border-2 border-amber-400 shadow-md ring-4 ring-amber-50"
              >
                {{ (summary?.volunteer.firstName || authUser?.firstName || 'B').charAt(0) }}{{ (summary?.volunteer.lastName || authUser?.lastName || 'B').charAt(0) }}
              </div>
            </div>

            <!-- Nom -->
            <div class="text-center px-2">
              <h3 class="text-slate-900 font-bold text-lg sm:text-xl tracking-tight leading-snug truncate max-w-[260px]">
                {{ summary?.volunteer.firstName || authUser?.firstName }} {{ summary?.volunteer.lastName || authUser?.lastName }}
              </h3>
            </div>

            <!-- Pastille de statut : En attente de validation -->
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold shadow-2xs">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <UIcon
                name="i-lucide-clock"
                class="w-3.5 h-3.5 text-amber-600"
              />
              <span>En attente de validation</span>
            </div>

            <!-- Zone explicative badge inactif -->
            <div class="w-full p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-center space-y-1.5 mt-2">
              <div class="flex items-center justify-center gap-1.5 text-amber-900 font-semibold text-xs">
                <UIcon
                  name="i-lucide-qr-code"
                  class="w-4 h-4 text-amber-600 opacity-70"
                />
                <span>QR Code inactif</span>
              </div>
              <p class="text-[11px] text-amber-800/90 leading-relaxed">
                Votre badge et votre QR Code d'accès seront générés dès la validation de votre planning.
              </p>
            </div>

            <!-- Bouton rapide vers le planning -->
            <NuxtLink
              to="/espace-benevole/planning"
              class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <UIcon
                name="i-lucide-calendar"
                class="w-3.5 h-3.5"
              />
              <span>Voir mon planning</span>
            </NuxtLink>
          </div>

          <!-- BAS : Identifiant unique -->
          <div class="pt-2 flex items-center justify-center text-[10px] font-mono text-slate-400 px-0.5">
            <span class="tracking-wider">ID: {{ (summary?.volunteer.id || authUser?.id || '').slice(0, 8).toUpperCase() }}</span>
          </div>
        </div>
      </div>

      <!-- COLONNE DROITE : Informations personnelles, Missions et Urgences -->
      <div class="flex-1 min-w-0 w-full space-y-5">
        <!-- 1. Informations personnelles -->
        <div class="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 sm:p-6 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div class="flex items-center gap-2.5">
              <UIcon
                name="i-lucide-user-check"
                class="w-5 h-5 text-violet-600"
              />
              <h2 class="text-base font-bold text-slate-900">
                Mes informations personnelles
              </h2>
            </div>
            <div class="flex items-center gap-2">
              <UBadge
                v-if="isConfirmed"
                color="success"
                variant="solid"
                size="sm"
                class="font-semibold text-xs px-2.5 py-0.5 inline-flex items-center gap-1 shadow-2xs"
              >
                <UIcon
                  name="i-lucide-check-circle-2"
                  class="w-3.5 h-3.5"
                />
                <span>Planning validé</span>
              </UBadge>
              <NuxtLink
                v-else
                to="/espace-benevole/planning"
                class="inline-block"
              >
                <UBadge
                  color="warning"
                  variant="solid"
                  size="sm"
                  class="font-semibold text-xs px-2.5 py-0.5 inline-flex items-center gap-1 hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
                >
                  <UIcon
                    name="i-lucide-clock"
                    class="w-3.5 h-3.5"
                  />
                  <span>Planning en attente</span>
                </UBadge>
              </NuxtLink>
              <UBadge
                color="neutral"
                variant="solid"
                size="sm"
                class="font-semibold text-xs px-2.5 py-0.5 shadow-2xs"
              >
                Données vérifiées
              </UBadge>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <!-- Photo d'identité ou Avatar avec initiales -->
            <div class="shrink-0">
              <img
                v-if="summary?.volunteer.photoUrl"
                :src="summary.volunteer.photoUrl"
                alt="Photo d'identité bénévole"
                class="w-20 h-20 rounded-2xl object-cover border border-slate-200 shadow-xs"
              >
              <div
                v-else
                class="w-20 h-20 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xl border border-violet-200/60"
              >
                {{ (summary?.volunteer.firstName || authUser?.firstName || 'B').charAt(0) }}{{ (summary?.volunteer.lastName || authUser?.lastName || 'B').charAt(0) }}
              </div>
            </div>

            <!-- Données en lecture seule -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-xs">
              <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span class="text-slate-400 font-semibold uppercase text-[10px] block mb-0.5">Identité</span>
                <p class="font-bold text-slate-900 text-sm">
                  {{ summary?.volunteer.firstName || authUser?.firstName }} {{ summary?.volunteer.lastName || authUser?.lastName }}
                </p>
              </div>

              <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span class="text-slate-400 font-semibold uppercase text-[10px] block mb-0.5">Adresse e-mail</span>
                <p class="font-medium text-slate-900 truncate">
                  {{ summary?.volunteer.email || authUser?.email }}
                </p>
              </div>

              <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span class="text-slate-400 font-semibold uppercase text-[10px] block mb-0.5">Numéro de téléphone</span>
                <p class="font-medium text-slate-900">
                  {{ summary?.volunteer.phone || 'Non renseigné' }}
                </p>
              </div>

              <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span class="text-slate-400 font-semibold uppercase text-[10px] block mb-0.5">Statut légal</span>
                <p class="font-medium text-slate-900">
                  {{ summary?.volunteer.isMinor ? 'Mineur (accord parental requis)' : 'Majeur' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Mention explicite obligatoire de verrouillage -->
          <div class="flex items-center gap-2 text-xs text-slate-500 bg-slate-50/80 p-3 rounded-xl border border-slate-200/70">
            <UIcon
              name="i-lucide-shield-alert"
              class="w-4 h-4 text-violet-600 shrink-0"
            />
            <span>Pour modifier vos informations personnelles, veuillez contacter l'administration du Salon.</span>
          </div>
        </div>

        <!-- 2. Récapitulatif chronologique des créneaux réservés (Missions à droite) -->
        <div
          v-if="summary"
          class="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 sm:p-6 space-y-4"
        >
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 class="text-base font-bold text-slate-900">
                Mes créneaux de mission ({{ summary.totalSlots }})
              </h3>
              <p class="text-xs text-slate-500">
                Total : {{ summary.totalHours }} heures de bénévolat
              </p>
            </div>

            <UBadge
              v-if="summary.totalSlots > 0"
              color="primary"
              variant="solid"
              size="sm"
              class="font-semibold text-xs px-2.5 py-0.5 shadow-2xs"
            >
              {{ summary.totalSlots }} créneau(x)
            </UBadge>
          </div>

          <!-- Liste des créneaux -->
          <div
            v-if="summary.slots.length > 0"
            class="space-y-3"
          >
            <div
              v-for="slot in summary.slots"
              :key="slot.registrationId"
              class="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC] flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:border-violet-300 transition-all"
            >
              <div class="space-y-1.5">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-bold text-sm text-slate-900">{{ slot.missionName }}</span>
                  <UBadge
                    v-if="slot.isSensitive"
                    color="warning"
                    variant="solid"
                    size="sm"
                    class="font-semibold text-[10px] px-2 py-0.5 rounded shadow-2xs"
                  >
                    Poste sensible
                  </UBadge>
                  <span class="text-xs font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-200/60 font-mono">
                    {{ slot.startTime }} - {{ slot.endTime }}
                  </span>
                </div>

                <p class="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                  <UIcon
                    name="i-lucide-calendar"
                    class="w-3.5 h-3.5 text-slate-400"
                  />
                  <span>{{ slot.dayLabel }}</span>
                </p>

                <!-- Lieu / Rendez-vous -->
                <div class="pt-1 text-xs text-slate-500 space-y-0.5">
                  <p class="flex items-center gap-1.5">
                    <UIcon
                      name="i-lucide-map-pin"
                      class="w-3.5 h-3.5 text-violet-600 shrink-0"
                    />
                    <span class="font-medium text-slate-700">{{ slot.location }}</span>
                  </p>
                  <p class="text-[11px] text-slate-500 italic pl-5">
                    Consignes : {{ slot.instructions }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Aucun créneau réservé -->
          <div
            v-else
            class="py-8 text-center text-slate-400 space-y-2"
          >
            <UIcon
              name="i-lucide-calendar-x"
              class="w-8 h-8 mx-auto text-slate-300"
            />
            <p class="text-xs font-medium">
              Vous n'avez pas encore choisi de créneau de bénévolat.
            </p>
            <div class="print:hidden pt-1">
              <UButton
                to="/espace-benevole/planning"
                color="primary"
                variant="subtle"
                size="sm"
                label="Accéder au planning"
              />
            </div>
          </div>
        </div>

        <!-- 3. Contacts d'urgence & Assistance Bénévoles -->
        <div
          v-if="summary"
          class="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 sm:p-6 space-y-3"
        >
          <div class="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <UIcon
              name="i-lucide-phone-call"
              class="w-4 h-4 text-violet-600"
            />
            <h3>Contacts d'urgence & Assistance Bénévoles</h3>
          </div>
          <p class="text-xs text-slate-500">
            En cas de retard, d'empêchement ou pour toute question sur place, contactez immédiatement la régie :
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
              <span class="text-slate-400 font-semibold uppercase text-[10px]">Permanence téléphonique</span>
              <p class="font-bold text-slate-900 text-sm">
                <a
                  :href="'tel:' + summary.emergencyContact.phone.replace(/\s/g, '')"
                  class="text-violet-700 hover:underline"
                >
                  {{ summary.emergencyContact.phone }}
                </a>
              </p>
              <p class="text-slate-500 text-[11px]">
                {{ summary.emergencyContact.coordinator }}
              </p>
            </div>

            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
              <span class="text-slate-400 font-semibold uppercase text-[10px]">Point de ralliement / QG</span>
              <p class="font-bold text-slate-900 text-xs">
                {{ summary.emergencyContact.qgLocation }}
              </p>
              <p class="text-slate-500 text-[11px]">
                E-mail : {{ summary.emergencyContact.email }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- SECTION D'IMPRESSION PRINT A4 DÉDIÉE (Visible via @media print) -->
    <!-- ======================================================== -->
    <div
      v-if="summary"
      id="printable-schedule"
      class="hidden print:block"
    >
      <div style="border-bottom: 2px solid #7C3AED; padding-bottom: 12px; margin-bottom: 16px;">
        <h1 style="font-size: 20px; font-weight: bold; margin: 0; color: #0F172A;">
          SALON DE LA DANSE D'ANGERS 2027
        </h1>
        <p style="font-size: 12px; color: #64748B; margin: 4px 0 0 0;">
          Fiche individuelle de mission bénévole • Parc des Expositions d'Angers (14-16 Mai 2027)
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
          <tr style="background-color: #F1F5F9; border-bottom: 1px solid #CBD5E1;">
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
            style="border-bottom: 1px solid #E2E8F0;"
          >
            <td style="padding: 8px; font-weight: bold;">
              {{ s.shortDayLabel }}<br>{{ s.startTime }} - {{ s.endTime }}
            </td>
            <td style="padding: 8px; font-weight: bold; color: #7C3AED;">
              {{ s.missionName }} {{ s.isSensitive ? '(Poste sensible)' : '' }}
            </td>
            <td style="padding: 8px;">
              {{ s.location }}
            </td>
            <td style="padding: 8px; color: #475569;">
              {{ s.instructions }}
            </td>
          </tr>
        </tbody>
      </table>

      <div style="border-top: 1px solid #E2E8F0; padding-top: 10px; font-size: 10px; color: #64748B;">
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
          class="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-8"
          @click="isQrModalOpen = false"
        >
          <!-- Barre supérieure avec bouton Fermer -->
          <div
            class="w-full max-w-md flex items-center justify-between"
            @click.stop
          >
            <button
              type="button"
              class="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              aria-label="Fermer"
              @click="isQrModalOpen = false"
            >
              <UIcon
                name="i-lucide-x"
                class="w-6 h-6"
              />
            </button>
          </div>

          <!-- Carte Centrale Plein Écran -->
          <div
            class="w-full max-w-sm bg-white rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl my-auto border border-white/20"
            @click.stop
          >
            <!-- En-tête avec identité -->
            <div class="flex flex-col items-center space-y-2">
              <img
                v-if="summary.volunteer.photoUrl"
                :src="summary.volunteer.photoUrl"
                alt="Photo bénévole"
                class="w-20 h-20 rounded-2xl object-cover border-2 border-violet-500 shadow-xs"
              >
              <div
                v-else
                class="w-20 h-20 rounded-2xl bg-violet-600 text-white flex items-center justify-center font-bold text-xl shadow-xs"
              >
                {{ summary.volunteer.firstName.charAt(0) }}{{ summary.volunteer.lastName.charAt(0) }}
              </div>

              <div>
                <h3 class="text-xl font-black text-slate-900 tracking-tight">
                  {{ summary.volunteer.firstName }} {{ summary.volunteer.lastName }}
                </h3>
                <span class="inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold bg-violet-100 text-violet-700">
                  BÉNÉVOLE • {{ summary.volunteer.editionYear || 2027 }}
                </span>
              </div>
            </div>

            <!-- Grand QR Code Haute Résolution -->
            <div class="p-4 bg-slate-50 border-2 border-slate-200/80 rounded-2xl inline-block shadow-inner">
              <img
                v-if="summary.volunteer.qrCodeUrl"
                :src="summary.volunteer.qrCodeUrl"
                alt="QR Code haute résolution"
                class="w-60 h-60 sm:w-64 sm:h-64 mx-auto"
              >
            </div>

            <div class="space-y-1">
              <p class="text-xs font-bold text-slate-900">
                Présentez ce QR Code à l'accueil du Salon
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
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-50 text-violet-700 hover:bg-violet-100 text-xs font-medium transition-colors border border-violet-200/60 max-w-full"
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
