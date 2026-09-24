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
    <div class="pb-5 border-b border-[#E6D9CB] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <span class="text-[11px] font-bold tracking-[0.16em] uppercase text-[#7A291E] block mb-1">
          Extractions & Données
        </span>
        <h1 class="text-2xl sm:text-3xl font-serif italic font-semibold tracking-tight text-[#2A1512]">
          Exports & Reporting
        </h1>
        <p class="text-xs sm:text-sm text-[#6E5A52] mt-0.5">
          Téléchargement des feuilles d'émargement, plannings généraux et annuaires au format Excel (.xlsx) et CSV
        </p>
      </div>

      <NuxtLink to="/admin/badges">
        <button
          type="button"
          class="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-[#FFFCF8] hover:bg-[#F6EFE6] text-[#2A1512] border border-[#D8C6B4] font-semibold text-xs transition-colors shadow-xs cursor-pointer"
        >
          <UIcon name="i-lucide-id-card" class="w-4 h-4 text-[#7A291E]" />
          <span>Planche Badges & QR Codes</span>
        </button>
      </NuxtLink>
    </div>

    <!-- Grille des 3 Cartes d'Exports -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      <!-- 1. Carte Export Bénévoles & Plannings Généraux -->
      <div class="bg-[#FFFCF8] p-6 rounded-2xl border border-[#E6D9CB] shadow-xs flex flex-col justify-between space-y-4">
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-[#F3DCD5] text-[#7A291E] flex items-center justify-center font-bold shrink-0">
              <UIcon
                name="i-lucide-users"
                class="w-5 h-5"
              />
            </div>
            <div>
              <h2 class="text-base font-serif italic font-semibold text-[#2A1512] leading-tight">
                Plannings & Bénévoles
              </h2>
              <span class="text-[11px] text-[#6E5A52] font-medium">Export exhaustif de l'équipe</span>
            </div>
          </div>

          <p class="text-xs text-[#6E5A52] leading-relaxed">
            Liste complète de tous les bénévoles avec identité, e-mail, téléphone, statut de verrouillage, nombre d'heures et détail chronologique de l'ensemble des créneaux affectés.
          </p>
        </div>

        <div class="pt-4 border-t border-[#E6D9CB] mt-auto">
          <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8C7A70] mb-2.5">
            Format de téléchargement
          </p>
          <div class="grid grid-cols-2 gap-2.5">
            <a
              href="/api/admin/exports/volunteers?format=xlsx"
              download
              class="inline-flex items-center justify-center gap-2 h-10 px-3 rounded-xl bg-[#7A291E] hover:bg-[#5E1F16] !text-white text-xs font-semibold shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <UIcon
                name="i-lucide-file-spreadsheet"
                class="w-4 h-4 !text-[#D9B777] shrink-0"
              />
              <span class="truncate">Excel (.xlsx)</span>
            </a>

            <a
              href="/api/admin/exports/volunteers?format=csv"
              download
              class="inline-flex items-center justify-center gap-2 h-10 px-3 rounded-xl bg-[#FFFCF8] hover:bg-[#FAF4F2] !text-[#2A1512] hover:!text-[#7A291E] border border-[#D8C6B4] hover:border-[#DFACA1] text-xs font-semibold shadow-2xs transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <UIcon
                name="i-lucide-file-text"
                class="w-4 h-4 !text-[#7A291E] shrink-0"
              />
              <span class="truncate">CSV (UTF-8)</span>
            </a>
          </div>
        </div>
      </div>

      <!-- 2. Carte Export Feuilles d'émargement par Mission -->
      <div class="bg-[#FFFCF8] p-6 rounded-2xl border border-[#E6D9CB] shadow-xs flex flex-col justify-between space-y-4">
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-[#E1E9DC] text-[#2F5238] flex items-center justify-center font-bold shrink-0">
              <UIcon
                name="i-lucide-clipboard-check"
                class="w-5 h-5"
              />
            </div>
            <div>
              <h2 class="text-base font-serif italic font-semibold text-[#2A1512] leading-tight">
                Émargement par Mission
              </h2>
              <span class="text-[11px] text-[#6E5A52] font-medium">Affectations par poste & horaire</span>
            </div>
          </div>

          <p class="text-xs text-[#6E5A52] leading-relaxed">
            Feuille de présence nominative par mission et tranche horaire pour les responsables de zone (Accueil, Vestiaires, Loges, Postes sensibles).
          </p>

          <!-- Filtres optionnels -->
          <div class="space-y-2 pt-1">
            <div>
              <label class="block text-[11px] font-semibold text-[#2A1512] mb-1">Filtrer par mission</label>
              <select
                v-model="selectedMissionId"
                class="w-full bg-[#FFFCF8] border border-[#D8C6B4] rounded-xl px-3 py-2 text-xs text-[#2A1512] font-medium focus:outline-none focus:ring-2 focus:ring-[#7A291E]"
              >
                <option value="ALL">
                  Toutes les missions (Global)
                </option>
                <option
                  v-for="m in missions"
                  :key="m.id"
                  :value="m.id"
                >
                  {{ m.name }} {{ m.isSensitive ? '(🔒 Sensible)' : '' }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-[11px] font-semibold text-[#2A1512] mb-1">Filtrer par jour</label>
              <select
                v-model="selectedDay"
                class="w-full bg-[#FFFCF8] border border-[#D8C6B4] rounded-xl px-3 py-2 text-xs text-[#2A1512] font-medium focus:outline-none focus:ring-2 focus:ring-[#7A291E]"
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

        <div class="pt-4 border-t border-[#E6D9CB] mt-auto">
          <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8C7A70] mb-2.5">
            Format de téléchargement
          </p>
          <div class="grid grid-cols-2 gap-2.5">
            <a
              :href="`${missionsExportUrl}&format=xlsx`"
              download
              class="inline-flex items-center justify-center gap-2 h-10 px-3 rounded-xl bg-[#7A291E] hover:bg-[#5E1F16] !text-white text-xs font-semibold shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <UIcon
                name="i-lucide-file-spreadsheet"
                class="w-4 h-4 !text-[#D9B777] shrink-0"
              />
              <span class="truncate">Excel (.xlsx)</span>
            </a>

            <a
              :href="`${missionsExportUrl}&format=csv`"
              download
              class="inline-flex items-center justify-center gap-2 h-10 px-3 rounded-xl bg-[#FFFCF8] hover:bg-[#FAF4F2] !text-[#2A1512] hover:!text-[#7A291E] border border-[#D8C6B4] hover:border-[#DFACA1] text-xs font-semibold shadow-2xs transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <UIcon
                name="i-lucide-file-text"
                class="w-4 h-4 !text-[#7A291E] shrink-0"
              />
              <span class="truncate">CSV (UTF-8)</span>
            </a>
          </div>
        </div>
      </div>

      <!-- 3. Carte Export Fiches Contacts & Urgence -->
      <div class="bg-[#FFFCF8] p-6 rounded-2xl border border-[#E6D9CB] shadow-xs flex flex-col justify-between space-y-4">
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-[#F7E4C6] text-[#8A4B0F] flex items-center justify-center font-bold shrink-0">
              <UIcon
                name="i-lucide-phone-call"
                class="w-5 h-5"
              />
            </div>
            <div>
              <h2 class="text-base font-serif italic font-semibold text-[#2A1512] leading-tight">
                Contacts & Urgences
              </h2>
              <span class="text-[11px] text-[#6E5A52] font-medium">Répertoire opérationnel & mineurs</span>
            </div>
          </div>

          <p class="text-xs text-[#6E5A52] leading-relaxed">
            Annuaire opérationnel d'urgence destiné aux régisseurs et coordinateurs. Inclut téléphones directs, e-mails, détection des mineurs et statut de l'accord parental.
          </p>
        </div>

        <div class="pt-4 border-t border-[#E6D9CB] mt-auto">
          <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8C7A70] mb-2.5">
            Format de téléchargement
          </p>
          <div class="grid grid-cols-2 gap-2.5">
            <a
              href="/api/admin/exports/contacts?format=xlsx"
              download
              class="inline-flex items-center justify-center gap-2 h-10 px-3 rounded-xl bg-[#7A291E] hover:bg-[#5E1F16] !text-white text-xs font-semibold shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <UIcon
                name="i-lucide-file-spreadsheet"
                class="w-4 h-4 !text-[#D9B777] shrink-0"
              />
              <span class="truncate">Excel (.xlsx)</span>
            </a>

            <a
              href="/api/admin/exports/contacts?format=csv"
              download
              class="inline-flex items-center justify-center gap-2 h-10 px-3 rounded-xl bg-[#FFFCF8] hover:bg-[#FAF4F2] !text-[#2A1512] hover:!text-[#7A291E] border border-[#D8C6B4] hover:border-[#DFACA1] text-xs font-semibold shadow-2xs transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <UIcon
                name="i-lucide-file-text"
                class="w-4 h-4 !text-[#7A291E] shrink-0"
              />
              <span class="truncate">CSV (UTF-8)</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
