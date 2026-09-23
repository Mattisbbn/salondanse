<script setup lang="ts">
useHead({
  title: 'Badges & Exports · Admin'
})

interface MissionItem {
  id: string
  name: string
  isSensitive: boolean
}

interface MissionsResponse {
  missions: MissionItem[]
}

const { data: missionsData } = await useFetch<MissionsResponse>('/api/admin/missions')

const missions = computed(() => missionsData.value?.missions || [])

// Filtres optionnels pour l'export par mission
const selectedMissionId = ref('ALL')
const selectedDay = ref('ALL')

// Jours du festival 2027
const daysOptions = [
  { value: 'ALL', label: 'Tous les jours' },
  { value: '2027-05-14', label: 'Vendredi 14 Mai 2027' },
  { value: '2027-05-15', label: 'Samedi 15 Mai 2027' },
  { value: '2027-05-16', label: 'Dimanche 16 Mai 2027' }
]

const missionsExportUrl = computed(() => {
  const params = new URLSearchParams()
  if (selectedMissionId.value && selectedMissionId.value !== 'ALL') {
    params.set('missionId', selectedMissionId.value)
  }
  if (selectedDay.value && selectedDay.value !== 'ALL') {
    params.set('day', selectedDay.value)
  }
  return `/api/admin/exports/missions?${params.toString()}`
})
</script>

<template>
  <div class="space-y-6 max-w-6xl">
    <div class="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Exports de données & Reporting
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-0.5">
          Téléchargement des feuilles d'émargement, plannings généraux et annuaires au format Excel (.xlsx) et CSV
        </p>
      </div>

      <UButton
        to="/admin/badges"
        color="primary"
        variant="soft"
        size="sm"
        icon="i-lucide-id-card"
        label="Planche Badges & QR Codes"
        class="font-semibold shadow-2xs"
      />
    </div>

    <!-- Grille des 3 Cartes d'Exports -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      <!-- 1. Carte Export Bénévoles & Plannings Généraux -->
      <div class="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col justify-between space-y-4">
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold shrink-0">
              <UIcon
                name="i-lucide-users"
                class="w-5 h-5"
              />
            </div>
            <div>
              <h2 class="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                Plannings généraux & Bénévoles
              </h2>
              <span class="text-[11px] text-slate-400 font-medium">Export exhaustif de l'équipe</span>
            </div>
          </div>

          <p class="text-xs text-slate-600 leading-relaxed">
            Liste complète de tous les bénévoles avec identité, e-mail, téléphone, statut de verrouillage, nombre d'heures et détail chronologique de l'ensemble des créneaux affectés.
          </p>
        </div>

        <div class="pt-4 border-t border-slate-100 space-y-2">
          <a
            href="/api/admin/exports/volunteers?format=xlsx"
            download
            class="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <UIcon
              name="i-lucide-file-spreadsheet"
              class="w-4 h-4"
            />
            <span>Télécharger Excel (.xlsx)</span>
          </a>

          <a
            href="/api/admin/exports/volunteers?format=csv"
            download
            class="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
          >
            <UIcon
              name="i-lucide-file-text"
              class="w-4 h-4 text-slate-500"
            />
            <span>Télécharger CSV (UTF-8)</span>
          </a>
        </div>
      </div>

      <!-- 2. Carte Export Feuilles d'émargement par Mission -->
      <div class="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col justify-between space-y-4">
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
              <UIcon
                name="i-lucide-clipboard-check"
                class="w-5 h-5"
              />
            </div>
            <div>
              <h2 class="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                Émargement par Mission
              </h2>
              <span class="text-[11px] text-slate-400 font-medium">Affectations par poste & horaire</span>
            </div>
          </div>

          <p class="text-xs text-slate-600 leading-relaxed">
            Feuille de présence nominative par mission et tranche horaire pour les responsables de zone (Accueil, Vestiaires, Loges, Postes sensibles).
          </p>

          <!-- Filtres optionnels -->
          <div class="space-y-2 pt-1">
            <div>
              <label class="block text-[11px] font-semibold text-slate-600 mb-1">Filtrer par mission</label>
              <select
                v-model="selectedMissionId"
                class="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              >
                <option value="ALL">
                  Toutes les missions (Global)
                </option>
                <option
                  v-for="m in missions"
                  :key="m.id"
                  :value="m.id"
                >
                  {{ m.name }} {{ m.isSensitive ? '(Sensible)' : '' }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-[11px] font-semibold text-slate-600 mb-1">Filtrer par jour</label>
              <select
                v-model="selectedDay"
                class="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              >
                <option
                  v-for="d in daysOptions"
                  :key="d.value"
                  :value="d.value"
                >
                  {{ d.label }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <div class="pt-4 border-t border-slate-100 space-y-2">
          <a
            :href="`${missionsExportUrl}&format=xlsx`"
            download
            class="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <UIcon
              name="i-lucide-file-spreadsheet"
              class="w-4 h-4"
            />
            <span>Télécharger Excel (.xlsx)</span>
          </a>

          <a
            :href="`${missionsExportUrl}&format=csv`"
            download
            class="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
          >
            <UIcon
              name="i-lucide-file-text"
              class="w-4 h-4 text-slate-500"
            />
            <span>Télécharger CSV (UTF-8)</span>
          </a>
        </div>
      </div>

      <!-- 3. Carte Export Fiches Contacts & Urgence -->
      <div class="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col justify-between space-y-4">
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
              <UIcon
                name="i-lucide-phone-call"
                class="w-5 h-5"
              />
            </div>
            <div>
              <h2 class="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                Fiches Contacts & Urgence
              </h2>
              <span class="text-[11px] text-slate-400 font-medium">Répertoire téléphonique & mineurs</span>
            </div>
          </div>

          <p class="text-xs text-slate-600 leading-relaxed">
            Annuaire opérationnel d'urgence destiné aux régisseurs et coordinateurs. Inclut téléphones directs, e-mails, détection des mineurs et statut de l'accord parental.
          </p>
        </div>

        <div class="pt-4 border-t border-slate-100 space-y-2">
          <a
            href="/api/admin/exports/contacts?format=xlsx"
            download
            class="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <UIcon
              name="i-lucide-file-spreadsheet"
              class="w-4 h-4"
            />
            <span>Télécharger Excel (.xlsx)</span>
          </a>

          <a
            href="/api/admin/exports/contacts?format=csv"
            download
            class="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
          >
            <UIcon
              name="i-lucide-file-text"
              class="w-4 h-4 text-slate-500"
            />
            <span>Télécharger CSV (UTF-8)</span>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
