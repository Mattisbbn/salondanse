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
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Tableau de bord Administrateur
        </h1>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          to="/api/admin/exports/volunteers?format=csv"
          external
          color="primary"
          variant="solid"
          size="sm"
          icon="i-lucide-download"
          label="Exporter la liste (CSV)"
          class="font-semibold shadow-xs cursor-pointer"
        />
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
      <div class="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bénévoles Inscrits</span>
          <div class="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-sm">
            <UIcon
              name="i-lucide-users"
              class="w-4 h-4"
            />
          </div>
        </div>
        <p class="text-3xl font-extrabold text-[#0F172A] mt-2">
          {{ stats.overview.totalVolunteers }}
        </p>
        <p class="text-xs text-slate-400 mt-1">
          {{ stats.overview.confirmedPlannings }} validés • {{ stats.overview.draftPlannings }} en brouillon
        </p>
      </div>

      <!-- KPI 2 : Plannings Validés -->
      <div class="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Plannings Validés</span>
          <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
            <UIcon
              name="i-lucide-badge-check"
              class="w-4 h-4"
            />
          </div>
        </div>
        <p class="text-3xl font-extrabold text-[#0F172A] mt-2">
          {{ stats.overview.confirmedPlannings }}
          <span class="text-sm font-normal text-slate-400">/ {{ stats.overview.totalVolunteers }}</span>
        </p>
        <p class="text-xs text-slate-400 mt-1">
          {{ stats.overview.totalVolunteers > 0 ? Math.round((stats.overview.confirmedPlannings / stats.overview.totalVolunteers) * 100) : 0 }}% de plannings verrouillés
        </p>
      </div>

      <!-- KPI 3 : Taux de Remplissage Global -->
      <div class="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Remplissage Global</span>
          <div class="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-sm">
            <UIcon
              name="i-lucide-pie-chart"
              class="w-4 h-4"
            />
          </div>
        </div>
        <p class="text-3xl font-extrabold text-violet-600 mt-2">
          {{ stats.overview.globalFillingRate }}%
        </p>
        <p class="text-xs text-slate-400 mt-1">
          {{ stats.overview.totalRegistrations }} / {{ stats.overview.totalCapacity }} créneaux pourvus
        </p>
      </div>

      <!-- KPI 4 : Codes Disponibles -->
      <div class="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Codes Disponibles</span>
          <div class="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center font-bold text-sm">
            <UIcon
              name="i-lucide-ticket"
              class="w-4 h-4"
            />
          </div>
        </div>
        <p class="text-3xl font-extrabold text-[#0F172A] mt-2">
          {{ stats.overview.availableInvitations }}
        </p>
        <p class="text-xs text-slate-400 mt-1">
          {{ stats.overview.usedInvitations }} utilisés sur {{ stats.overview.totalInvitations }} émis
        </p>
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
      <div class="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 sm:p-6 space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 class="text-sm sm:text-base font-bold text-slate-900">
              Remplissage par jour d'événement
            </h2>
          </div>
          <UIcon
            name="i-lucide-calendar-range"
            class="w-5 h-5 text-violet-600"
          />
        </div>

        <div class="space-y-4 pt-1">
          <div
            v-for="day in stats.days"
            :key="day.date"
            class="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200/60"
          >
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-slate-900">{{ day.fullDayLabel }}</span>
              <span class="font-semibold text-violet-700 font-mono">{{ day.fillingRate }}% ({{ day.totalRegistrations }}/{{ day.totalCapacity }})</span>
            </div>

            <!-- Barre de progression -->
            <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                class="bg-violet-600 h-full rounded-full transition-all duration-500"
                :style="{ width: `${day.fillingRate}%` }"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Colonne 2 : Ventilation par Mission -->
      <div class="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 sm:p-6 space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 class="text-sm sm:text-base font-bold text-slate-900">
              Taux d'occupation par mission
            </h2>
          </div>
          <UIcon
            name="i-lucide-clipboard-check"
            class="w-5 h-5 text-violet-600"
          />
        </div>

        <div class="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          <div
            v-for="m in stats.missions"
            :key="m.id"
            class="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 text-xs space-y-1.5"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5 min-w-0">
                <span class="font-semibold text-slate-900 truncate">{{ m.name }}</span>
                <UBadge
                  v-if="m.isSensitive"
                  color="warning"
                  variant="solid"
                  size="sm"
                  class="font-semibold text-[10px] px-2 py-0.5 rounded shadow-2xs shrink-0"
                >
                  Sensible
                </UBadge>
              </div>
              <span class="font-mono text-[11px] text-slate-600 shrink-0 ml-2">
                {{ m.totalRegistrations }} / {{ m.totalCapacity }}
              </span>
            </div>

            <!-- Barre de progression par mission -->
            <div class="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-300"
                :class="m.fillingRate >= 100 ? 'bg-emerald-600' : 'bg-violet-600'"
                :style="{ width: `${Math.min(100, m.fillingRate)}%` }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- ======================================================== -->
    <!-- 3. EXPORTS MULTI-FORMATS ET RAPPORTS                    -->
    <!-- ======================================================== -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-sm sm:text-base font-bold text-slate-900">
            Exports
          </h2>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <!-- Export 1 : Bénévoles complets -->
        <a
          href="/api/admin/exports/volunteers?format=csv"
          download="benevoles-salondanse-2027.csv"
          class="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs hover:border-violet-300 hover:shadow-sm transition-all block group cursor-pointer"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
              <UIcon
                name="i-lucide-users"
                class="w-5 h-5"
              />
            </div>
            <UIcon
              name="i-lucide-download"
              class="w-4 h-4 text-slate-400 group-hover:text-violet-600 transition-colors"
            />
          </div>
          <h3 class="text-sm font-bold text-slate-900">
            Bénévoles & Plannings
          </h3>
          <p class="text-xs text-slate-500 mt-0.5">
            Liste complète avec créneaux, coordonnées et statuts
          </p>
        </a>

        <!-- Export 2 : Planning par mission -->
        <a
          href="/api/admin/exports/missions"
          download="planning-missions-global.csv"
          class="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs hover:border-violet-300 hover:shadow-sm transition-all block group cursor-pointer"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <UIcon
                name="i-lucide-calendar-check"
                class="w-5 h-5"
              />
            </div>
            <UIcon
              name="i-lucide-download"
              class="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors"
            />
          </div>
          <h3 class="text-sm font-bold text-slate-900">
            Planning par mission
          </h3>
          <p class="text-xs text-slate-500 mt-0.5">
            Feuille de présence par poste et tranche horaire
          </p>
        </a>

        <!-- Export 3 : Fiches contacts d'urgence -->
        <a
          href="/api/admin/exports/contacts"
          download="contacts-urgence-salondanse-2027.csv"
          class="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs hover:border-violet-300 hover:shadow-sm transition-all block group cursor-pointer"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <UIcon
                name="i-lucide-phone"
                class="w-5 h-5"
              />
            </div>
            <UIcon
              name="i-lucide-download"
              class="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors"
            />
          </div>
          <h3 class="text-sm font-bold text-slate-900">
            Contacts d'urgence terrain
          </h3>
          <p class="text-xs text-slate-500 mt-0.5">
            Répertoire d'urgence (téléphone, mineurs, autorisations)
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
        class="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs hover:border-violet-300 hover:shadow-sm transition-all block group"
      >
        <div class="flex items-center justify-between mb-2">
          <div class="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
            <UIcon
              name="i-lucide-mail-plus"
              class="w-5 h-5"
            />
          </div>
          <UIcon
            name="i-lucide-arrow-right"
            class="w-4 h-4 text-slate-400 group-hover:text-violet-600 transition-colors"
          />
        </div>
        <h3 class="text-sm font-bold text-slate-900">
          Inviter des bénévoles
        </h3>
        <p class="text-xs text-slate-500 mt-0.5">
          Générez et expédiez des codes d'accès par e-mail
        </p>
      </NuxtLink>

      <NuxtLink
        to="/admin/volunteers"
        class="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs hover:border-violet-300 hover:shadow-sm transition-all block group"
      >
        <div class="flex items-center justify-between mb-2">
          <div class="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
            <UIcon
              name="i-lucide-sliders-horizontal"
              class="w-5 h-5"
            />
          </div>
          <UIcon
            name="i-lucide-arrow-right"
            class="w-4 h-4 text-slate-400 group-hover:text-violet-600 transition-colors"
          />
        </div>
        <h3 class="text-sm font-bold text-slate-900">
          Gérer les plannings
        </h3>
        <p class="text-xs text-slate-500 mt-0.5">
          Consultez et ajustez les attributions de missions
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
          class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          @click="closeToggleConfirm"
        >
          <div
            class="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4 my-8 text-left"
            @click.stop
          >
            <div class="flex items-start gap-3">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                :class="stats.edition.isRegistrationOpen ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'"
              >
                <UIcon
                  :name="stats.edition.isRegistrationOpen ? 'i-lucide-lock' : 'i-lucide-unlock'"
                  class="w-5 h-5"
                />
              </div>
              <div>
                <h3 class="text-base font-bold text-slate-900">
                  {{ stats.edition.isRegistrationOpen ? 'Fermer la campagne d\'inscriptions ?' : 'Ouvrir la campagne d\'inscriptions ?' }}
                </h3>
                <p class="text-xs text-slate-500 mt-1 leading-relaxed">
                  {{ stats.edition.isRegistrationOpen
                    ? 'Le planning des bénévoles passera immédiatement en consultation seule. Aucun bénévole ne pourra plus modifier ou soumettre de créneaux sans déverrouillage préalable par un administrateur.'
                    : 'Les bénévoles ayant accès à leur espace pourront à nouveau sélectionner, modifier et confirmer leurs créneaux de missions en direct.'
                  }}
                </p>
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                class="cursor-pointer"
                @click="closeToggleConfirm"
              >
                Annuler
              </UButton>
              <UButton
                :color="stats.edition.isRegistrationOpen ? 'warning' : 'success'"
                variant="solid"
                size="sm"
                :loading="isToggling"
                class="cursor-pointer font-semibold shadow-xs"
                @click="handleToggleRegistrations"
              >
                {{ stats.edition.isRegistrationOpen ? 'Confirmer la fermeture' : 'Confirmer l\'ouverture' }}
              </UButton>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
