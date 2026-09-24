<script setup lang="ts">
useHead({
  title: 'Tableau de bord Admin'
})

interface StatsOverview {
  totalVolunteers: number
  confirmedPlannings: number
  draftPlannings: number
  totalInvitations: number
  usedInvitations: number
  availableInvitations: number
  totalCapacity: number
  totalRegistrations: number
  globalFillingRate: number
}

interface DayStat {
  date: string
  dayLabel: string
  fullDayLabel: string
  totalCapacity: number
  totalRegistrations: number
  fillingRate: number
}

interface MissionStat {
  id: string
  name: string
  isSensitive: boolean
  totalCapacity: number
  totalRegistrations: number
  fillingRate: number
}

interface EditionInfo {
  id: string
  name: string
  year: number
  isRegistrationOpen: boolean
  registrationStartDate: string | null
  registrationEndDate: string | null
}

interface AdminStatsResponse {
  overview: StatsOverview
  days: DayStat[]
  missions: MissionStat[]
  edition: EditionInfo
}

const toast = useToast()

const { data, refresh } = await useFetch<AdminStatsResponse>('/api/admin/stats', {
  lazy: false
})

const stats = computed(() => data.value)

// Gestion du basculement d'ouverture des inscriptions
const isConfirmToggleOpen = ref(false)
const isToggling = ref(false)

function _openToggleConfirm() {
  isConfirmToggleOpen.value = true
}

function closeToggleConfirm() {
  isConfirmToggleOpen.value = false
}

async function handleToggleRegistrations() {
  if (!stats.value?.edition) return

  isToggling.value = true
  try {
    const nextState = !stats.value.edition.isRegistrationOpen
    const res = await $fetch<{ success: boolean, message: string }>('/api/admin/edition/toggle-registrations', {
      method: 'POST',
      body: {
        editionId: stats.value.edition.id,
        isRegistrationOpen: nextState
      }
    })

    toast.add({
      title: nextState ? 'Inscriptions ouvertes' : 'Inscriptions fermées',
      description: res.message,
      color: nextState ? 'success' : 'warning'
    })

    await refresh()
    closeToggleConfirm()
  } catch (err: unknown) {
    const errorObj = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    toast.add({
      title: 'Erreur',
      description: errorObj?.data?.statusMessage || errorObj?.statusMessage || errorObj?.message || 'Impossible de modifier le statut.',
      color: 'error'
    })
  } finally {
    isToggling.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- En-tête du Dashboard -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E6D9CB]">
      <div>
        <span class="text-[11px] font-bold tracking-[0.16em] uppercase text-[#7A291E] block mb-1">
          Direction artistique · Plateforme bénévoles
        </span>
        <h1 class="text-2xl sm:text-3xl font-serif italic font-semibold tracking-tight text-[#2A1512]">
          Tableau de bord Administrateur
        </h1>
        <p class="text-xs sm:text-sm text-[#6E5A52] mt-0.5">
          Pilotage centralisé des effectifs, plannings et disponibilités du Salon.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <a
          href="/api/admin/exports/volunteers?format=csv"
          download="benevoles-salondanse-2027.csv"
          class="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <UIcon
            name="i-lucide-download"
            class="w-4 h-4 text-white"
          />
          <span>Exporter la liste (CSV)</span>
        </a>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 1. CARTES D'INDICATEURS CLÉS (KPIs)                      -->
    <!-- ======================================================== -->
    <div
      v-if="stats"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      <!-- KPI 1 : Bénévoles Inscrits -->
      <div class="bg-[#FFFCF8] p-5 rounded-2xl border border-[#E6D9CB] shadow-xs flex flex-col justify-between">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold tracking-[0.12em] uppercase text-[#6E5A52]">Bénévoles Inscrits</span>
          <div class="w-8 h-8 rounded-full bg-[#F3DCD5] text-[#7A291E] flex items-center justify-center font-bold text-sm">
            <UIcon
              name="i-lucide-users"
              class="w-4 h-4"
            />
          </div>
        </div>
        <div class="mt-3">
          <p class="text-3xl sm:text-4xl font-serif italic font-semibold text-[#2A1512]">
            {{ stats.overview.totalVolunteers }}
          </p>
          <p class="text-xs text-[#6E5A52] mt-1">
            <span class="font-semibold text-[#2F5238]">{{ stats.overview.confirmedPlannings }}</span> validés •
            <span class="font-semibold text-[#8A4B0F]">{{ stats.overview.draftPlannings }}</span> en brouillon
          </p>
        </div>
      </div>

      <!-- KPI 2 : Plannings Validés -->
      <div class="bg-[#FFFCF8] p-5 rounded-2xl border border-[#E6D9CB] shadow-xs flex flex-col justify-between">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold tracking-[0.12em] uppercase text-[#6E5A52]">Plannings Validés</span>
          <div class="w-8 h-8 rounded-full bg-[#E1E9DC] text-[#2F5238] flex items-center justify-center font-bold text-sm">
            <UIcon
              name="i-lucide-badge-check"
              class="w-4 h-4"
            />
          </div>
        </div>
        <div class="mt-3">
          <p class="text-3xl sm:text-4xl font-serif italic font-semibold text-[#2A1512]">
            {{ stats.overview.confirmedPlannings }}
            <span class="text-base sm:text-lg font-sans font-normal text-[#6E5A52]">/ {{ stats.overview.totalVolunteers }}</span>
          </p>
          <p class="text-xs text-[#6E5A52] mt-1">
            <span class="font-semibold text-[#2A1512]">
              {{ stats.overview.totalVolunteers > 0 ? Math.round((stats.overview.confirmedPlannings / stats.overview.totalVolunteers) * 100) : 0 }}%
            </span> de plannings verrouillés
          </p>
        </div>
      </div>

      <!-- KPI 3 : Taux de Remplissage Global -->
      <div class="bg-[#FFFCF8] p-5 rounded-2xl border border-[#E6D9CB] shadow-xs flex flex-col justify-between">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold tracking-[0.12em] uppercase text-[#6E5A52]">Remplissage Global</span>
          <div class="w-8 h-8 rounded-full bg-[#2E1411] text-[#D9B777] flex items-center justify-center font-bold text-sm">
            <UIcon
              name="i-lucide-pie-chart"
              class="w-4 h-4"
            />
          </div>
        </div>
        <div class="mt-3">
          <p class="text-3xl sm:text-4xl font-serif italic font-semibold text-[#7A291E]">
            {{ stats.overview.globalFillingRate }}%
          </p>
          <p class="text-xs text-[#6E5A52] mt-1">
            <span class="font-semibold text-[#2A1512]">{{ stats.overview.totalRegistrations }}</span> / {{ stats.overview.totalCapacity }} créneaux pourvus
          </p>
        </div>
      </div>

      <!-- KPI 4 : Codes Disponibles -->
      <div class="bg-[#FFFCF8] p-5 rounded-2xl border border-[#E6D9CB] shadow-xs flex flex-col justify-between">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold tracking-[0.12em] uppercase text-[#6E5A52]">Codes Disponibles</span>
          <div class="w-8 h-8 rounded-full bg-[#F6EFE6] text-[#2A1512] border border-[#E6D9CB] flex items-center justify-center font-bold text-sm">
            <UIcon
              name="i-lucide-ticket"
              class="w-4 h-4"
            />
          </div>
        </div>
        <div class="mt-3">
          <p class="text-3xl sm:text-4xl font-serif italic font-semibold text-[#2A1512]">
            {{ stats.overview.availableInvitations }}
          </p>
          <p class="text-xs text-[#6E5A52] mt-1">
            <span class="font-semibold text-[#2A1512]">{{ stats.overview.usedInvitations }}</span> utilisés sur {{ stats.overview.totalInvitations }} émis
          </p>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 2. VENTILATION PAR JOUR & PAR MISSION                     -->
    <!-- ======================================================== -->
    <div
      v-if="stats"
      class="grid grid-cols-1 lg:grid-cols-2 gap-6"
    >
      <!-- Colonne 1 : Ventilation par Jour d'événement -->
      <div class="bg-[#FFFCF8] rounded-2xl border border-[#E6D9CB] shadow-xs p-5 sm:p-6 space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-[#E6D9CB]">
          <div>
            <span class="text-[10px] font-bold tracking-[0.16em] uppercase text-[#7A291E] block mb-0.5">Calendrier</span>
            <h2 class="text-sm sm:text-base font-bold text-[#2A1512]">
              Remplissage par jour d'événement
            </h2>
          </div>
          <div class="w-8 h-8 rounded-full bg-[#F6EFE6] flex items-center justify-center text-[#7A291E]">
            <UIcon
              name="i-lucide-calendar-range"
              class="w-4 h-4"
            />
          </div>
        </div>

        <div class="space-y-3 pt-1">
          <div
            v-for="day in stats.days"
            :key="day.date"
            class="space-y-1.5 p-3.5 rounded-xl bg-[#F6EFE6]/60 border border-[#E6D9CB]"
          >
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-[#2A1512]">{{ day.fullDayLabel }}</span>
              <span class="font-semibold text-[#7A291E] font-mono">
                {{ day.fillingRate }}% ({{ day.totalRegistrations }}/{{ day.totalCapacity }})
              </span>
            </div>

            <!-- Barre de progression DA -->
            <div class="w-full bg-[#E6D9CB] rounded-full h-2 overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="day.fillingRate >= 100 ? 'bg-[#2F5238]' : 'bg-[#7A291E]'"
                :style="{ width: `${Math.min(100, day.fillingRate)}%` }"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Colonne 2 : Ventilation par Mission -->
      <div class="bg-[#FFFCF8] rounded-2xl border border-[#E6D9CB] shadow-xs p-5 sm:p-6 space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-[#E6D9CB]">
          <div>
            <span class="text-[10px] font-bold tracking-[0.16em] uppercase text-[#7A291E] block mb-0.5">Postes</span>
            <h2 class="text-sm sm:text-base font-bold text-[#2A1512]">
              Taux d'occupation par mission
            </h2>
          </div>
          <div class="w-8 h-8 rounded-full bg-[#F6EFE6] flex items-center justify-center text-[#7A291E]">
            <UIcon
              name="i-lucide-clipboard-check"
              class="w-4 h-4"
            />
          </div>
        </div>

        <div class="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          <div
            v-for="m in stats.missions"
            :key="m.id"
            class="p-3 rounded-xl border border-[#E6D9CB] bg-[#F6EFE6]/40 text-xs space-y-1.5"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 min-w-0">
                <span class="font-bold text-[#2A1512] truncate">{{ m.name }}</span>
                <span
                  v-if="m.isSensitive"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F3DCD5] text-[#7A291E] shrink-0 border border-[#D9A79F]"
                >
                  <UIcon name="i-lucide-shield-alert" class="w-3 h-3" />
                  Sensible
                </span>
              </div>
              <span class="font-mono text-[11px] text-[#6E5A52] shrink-0 ml-2 font-semibold">
                {{ m.totalRegistrations }} / {{ m.totalCapacity }}
              </span>
            </div>

            <!-- Barre de progression par mission DA -->
            <div class="w-full bg-[#E6D9CB] rounded-full h-1.5 overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-300"
                :class="m.fillingRate >= 100 ? 'bg-[#2F5238]' : m.fillingRate >= 75 ? 'bg-[#D9A660]' : 'bg-[#7A291E]'"
                :style="{ width: `${Math.min(100, m.fillingRate)}%` }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 3. EXPORTS MULTI-FORMATS ET RAPPORTS                    -->
    <!-- ======================================================== -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div>
          <span class="text-[10px] font-bold tracking-[0.16em] uppercase text-[#7A291E] block mb-0.5">Données &amp; Terrain</span>
          <h2 class="text-sm sm:text-base font-bold text-[#2A1512]">
            Exports et listes d'émargement
          </h2>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <!-- Export 1 : Bénévoles complets -->
        <a
          href="/api/admin/exports/volunteers?format=csv"
          download="benevoles-salondanse-2027.csv"
          class="bg-[#FFFCF8] p-5 rounded-2xl border border-[#E6D9CB] shadow-xs hover:border-[#7A291E] transition-all block group cursor-pointer"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="w-9 h-9 rounded-full bg-[#F3DCD5] text-[#7A291E] flex items-center justify-center font-bold">
              <UIcon
                name="i-lucide-users"
                class="w-5 h-5"
              />
            </div>
            <UIcon
              name="i-lucide-download"
              class="w-4 h-4 text-[#6E5A52] group-hover:text-[#7A291E] transition-colors"
            />
          </div>
          <h3 class="text-sm font-bold text-[#2A1512]">
            Bénévoles &amp; Plannings
          </h3>
          <p class="text-xs text-[#6E5A52] mt-0.5">
            Liste complète avec créneaux, coordonnées et statuts.
          </p>
        </a>

        <!-- Export 2 : Planning par mission -->
        <a
          href="/api/admin/exports/missions"
          download="planning-missions-global.csv"
          class="bg-[#FFFCF8] p-5 rounded-2xl border border-[#E6D9CB] shadow-xs hover:border-[#7A291E] transition-all block group cursor-pointer"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="w-9 h-9 rounded-full bg-[#E1E9DC] text-[#2F5238] flex items-center justify-center font-bold">
              <UIcon
                name="i-lucide-calendar-check"
                class="w-5 h-5"
              />
            </div>
            <UIcon
              name="i-lucide-download"
              class="w-4 h-4 text-[#6E5A52] group-hover:text-[#7A291E] transition-colors"
            />
          </div>
          <h3 class="text-sm font-bold text-[#2A1512]">
            Planning par mission
          </h3>
          <p class="text-xs text-[#6E5A52] mt-0.5">
            Feuille de présence par poste et tranche horaire.
          </p>
        </a>

        <!-- Export 3 : Fiches contacts d'urgence -->
        <a
          href="/api/admin/exports/contacts"
          download="contacts-urgence-salondanse-2027.csv"
          class="bg-[#FFFCF8] p-5 rounded-2xl border border-[#E6D9CB] shadow-xs hover:border-[#7A291E] transition-all block group cursor-pointer"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="w-9 h-9 rounded-full bg-[#F7E4C6] text-[#8A4B0F] flex items-center justify-center font-bold">
              <UIcon
                name="i-lucide-phone"
                class="w-5 h-5"
              />
            </div>
            <UIcon
              name="i-lucide-download"
              class="w-4 h-4 text-[#6E5A52] group-hover:text-[#7A291E] transition-colors"
            />
          </div>
          <h3 class="text-sm font-bold text-[#2A1512]">
            Contacts d'urgence terrain
          </h3>
          <p class="text-xs text-[#6E5A52] mt-0.5">
            Répertoire d'urgence (téléphone, mineurs, autorisations).
          </p>
        </a>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 4. RACCOURCIS RAPIDES D'ADMINISTRATION                    -->
    <!-- ======================================================== -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <NuxtLink
        to="/admin/invitations"
        class="bg-[#FFFCF8] p-5 rounded-2xl border border-[#E6D9CB] shadow-xs hover:border-[#7A291E] transition-all block group"
      >
        <div class="flex items-center justify-between mb-3">
          <div class="w-9 h-9 rounded-full bg-[#F6EFE6] border border-[#E6D9CB] text-[#7A291E] flex items-center justify-center font-bold">
            <UIcon
              name="i-lucide-mail-plus"
              class="w-5 h-5"
            />
          </div>
          <UIcon
            name="i-lucide-arrow-right"
            class="w-4 h-4 text-[#6E5A52] group-hover:text-[#7A291E] group-hover:translate-x-0.5 transition-all"
          />
        </div>
        <h3 class="text-sm font-bold text-[#2A1512]">
          Inviter des bénévoles
        </h3>
        <p class="text-xs text-[#6E5A52] mt-0.5">
          Générez et expédiez des codes d'accès par e-mail.
        </p>
      </NuxtLink>

      <NuxtLink
        to="/admin/volunteers"
        class="bg-[#FFFCF8] p-5 rounded-2xl border border-[#E6D9CB] shadow-xs hover:border-[#7A291E] transition-all block group"
      >
        <div class="flex items-center justify-between mb-3">
          <div class="w-9 h-9 rounded-full bg-[#F6EFE6] border border-[#E6D9CB] text-[#7A291E] flex items-center justify-center font-bold">
            <UIcon
              name="i-lucide-sliders-horizontal"
              class="w-5 h-5"
            />
          </div>
          <UIcon
            name="i-lucide-arrow-right"
            class="w-4 h-4 text-[#6E5A52] group-hover:text-[#7A291E] group-hover:translate-x-0.5 transition-all"
          />
        </div>
        <h3 class="text-sm font-bold text-[#2A1512]">
          Gérer les plannings
        </h3>
        <p class="text-xs text-[#6E5A52] mt-0.5">
          Consultez et ajustez les attributions de missions.
        </p>
      </NuxtLink>
    </div>

    <!-- ======================================================== -->
    <!-- MODALE DE CONFIRMATION BASCULEMENT INSCRIPTIONS          -->
    <!-- ======================================================== -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isConfirmToggleOpen && stats?.edition"
          class="fixed inset-0 z-50 bg-[#2A1512]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          @click="closeToggleConfirm"
        >
          <div
            class="w-full max-w-md bg-[#FFFCF8] rounded-2xl border border-[#E6D9CB] shadow-2xl p-6 space-y-4 my-8 text-left"
            @click.stop
          >
            <div class="flex items-start gap-3">
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                :class="stats.edition.isRegistrationOpen ? 'bg-[#F7E4C6] text-[#8A4B0F]' : 'bg-[#E1E9DC] text-[#2F5238]'"
              >
                <UIcon
                  :name="stats.edition.isRegistrationOpen ? 'i-lucide-lock' : 'i-lucide-unlock'"
                  class="w-5 h-5"
                />
              </div>
              <div>
                <h3 class="text-base font-bold text-[#2A1512]">
                  {{ stats.edition.isRegistrationOpen ? 'Fermer la campagne d\'inscriptions ?' : 'Ouvrir la campagne d\'inscriptions ?' }}
                </h3>
                <p class="text-xs text-[#6E5A52] mt-1 leading-relaxed">
                  {{ stats.edition.isRegistrationOpen
                    ? 'Le planning des bénévoles passera immédiatement en consultation seule. Aucun bénévole ne pourra plus modifier ou soumettre de créneaux sans déverrouillage préalable par un administrateur.'
                    : 'Les bénévoles ayant accès à leur espace pourront à nouveau sélectionner, modifier et confirmer leurs créneaux de missions en direct.'
                  }}
                </p>
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-3 border-t border-[#E6D9CB]">
              <button
                type="button"
                class="h-9 px-4 rounded-full bg-[#FFFCF8] border border-[#D8C6B4] text-[#2A1512] hover:bg-[#F6EFE6] text-xs font-semibold cursor-pointer transition-colors"
                @click="closeToggleConfirm"
              >
                Annuler
              </button>
              <button
                type="button"
                :disabled="isToggling"
                class="h-9 px-4 rounded-full text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                :class="stats.edition.isRegistrationOpen ? 'bg-[#8A4B0F] hover:bg-[#703b0a] text-white' : 'bg-[#2F5238] hover:bg-[#233f2a] text-white'"
                @click="handleToggleRegistrations"
              >
                {{ stats.edition.isRegistrationOpen ? 'Confirmer la fermeture' : 'Confirmer l\'ouverture' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
