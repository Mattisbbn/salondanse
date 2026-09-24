<script setup lang="ts">
definePageMeta({
  layout: false
})

const route = useRoute()
const userId = computed(() => (typeof route.query.userId === 'string' ? route.query.userId : ''))

interface VerifyResponse {
  valid: boolean
  message?: string
  status?: string
  volunteer?: {
    id: string
    firstName: string
    lastName: string
    role: string
    photoUrl: string | null
    isMinor: boolean
    isApprovedMinor: boolean
    planningLockedAt: string | null
    editionName: string
    editionYear: number
    missions: Array<{
      id: string
      missionName: string
      isSensitive: boolean
      date: string
      timeSlot: string
    }>
  }
}

const { data, status } = await useFetch<VerifyResponse>(() => `/api/verify-badge?userId=${userId.value}`, {
  lazy: false,
  watch: [userId]
})

// ========================================================
</script>

<template>
  <div class="h-dvh min-h-dvh max-h-dvh w-full overflow-hidden flex flex-col justify-center items-center p-3 sm:p-4 bg-[#F6EFE6] text-[#2A1512] relative select-none">
    <!-- Scène badge centrée -->
    <div class="relative z-10 w-full flex justify-center">
      <!-- Carte physique du badge (Papier #FFFCF8) -->
      <div
        class="relative w-full max-w-[340px] aspect-[9/14] min-h-[500px] bg-[#FFFCF8] rounded-3xl border border-[#E6D9CB] shadow-sm p-5 sm:p-6 flex flex-col justify-between overflow-hidden select-none"
      >
        <!-- HAUT : En-tête -->
        <div class="relative z-10 flex items-center justify-between pb-3 border-b border-[#E6D9CB]">
          <div class="flex flex-col">
            <span class="font-serif italic font-semibold text-base tracking-tight text-[#2A1512]">
              Salon de la Danse
            </span>
            <span class="text-[9px] font-bold uppercase tracking-[0.16em] text-[#7A291E]">
              Vérification d'accès
            </span>
          </div>
          <span class="px-2.5 py-0.5 rounded-full bg-[#F3DCD5] text-[#7A291E] font-bold text-[10px] tracking-wide border border-[#ECCBC4]">
            Édition {{ data?.volunteer?.editionYear || 2027 }}
          </span>
        </div>

        <!-- Chargement -->
        <div
          v-if="status === 'pending'"
          class="relative z-10 py-12 text-center text-[#6E5A52] space-y-2 my-auto"
        >
          <UIcon
            name="i-lucide-loader-2"
            class="w-8 h-8 animate-spin mx-auto text-[#7A291E]"
          />
          <p class="text-xs font-medium">
            Vérification de l'accréditation en cours...
          </p>
        </div>

        <!-- Badge valide -->
        <div
          v-else-if="data?.valid && data.volunteer"
          class="relative z-10 flex flex-col justify-between flex-1 my-auto space-y-4 pt-2 transition-opacity duration-300"
        >
          <!-- Photo + Identité + Statut -->
          <div class="flex flex-col items-center my-auto py-1">
            <!-- Photo ronde avec contour Brique -->
            <div class="relative w-24 h-24 sm:w-26 sm:h-26">
              <img
                v-if="data.volunteer.photoUrl"
                :src="data.volunteer.photoUrl"
                :alt="`${data.volunteer.firstName} ${data.volunteer.lastName}`"
                class="w-full h-full rounded-full object-cover border-2 border-[#7A291E] shadow-sm ring-4 ring-[#FAF4F2]"
              >
              <div
                v-else
                class="w-full h-full rounded-full bg-[#7A291E] text-white flex items-center justify-center font-bold text-2xl border-2 border-[#5E1F16] shadow-sm ring-4 ring-[#FAF4F2]"
              >
                {{ data.volunteer.firstName.charAt(0) }}{{ data.volunteer.lastName.charAt(0) }}
              </div>
            </div>

            <!-- Pastille statut mineur si applicable -->
            <div
              v-if="data.volunteer.isMinor"
              class="mt-2"
            >
              <span
                class="text-[10px] font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1"
                :class="data.volunteer.isApprovedMinor
                  ? 'bg-[#E1E9DC] text-[#2F5238] border border-[#9DB79F]'
                  : 'bg-[#F7E4C6] text-[#8A4B0F] border border-[#D9A660]'"
              >
                <UIcon
                  :name="data.volunteer.isApprovedMinor ? 'i-lucide-check' : 'i-lucide-clock'"
                  class="w-3 h-3"
                />
                {{ data.volunteer.isApprovedMinor ? 'Mineur Autorisé' : 'Mineur En attente' }}
              </span>
            </div>

            <!-- Nom et Prénom -->
            <div class="text-center px-2 mt-2.5 space-y-0.5">
              <h2 class="font-serif italic font-semibold text-2xl sm:text-3xl text-[#2A1512] leading-tight truncate max-w-[280px]">
                {{ data.volunteer.firstName }} {{ data.volunteer.lastName }}
              </h2>
            </div>

            <!-- Pastille Statut Validé (DA #E1E9DC / #2F5238) -->
            <div class="mt-2.5">
              <div class="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#E1E9DC] text-[#2F5238] border border-[#9DB79F] text-xs font-bold shadow-2xs">
                <UIcon
                  name="i-lucide-badge-check"
                  class="w-4 h-4 text-[#2F5238]"
                />
                <span>Badge Accrédité</span>
              </div>
            </div>
          </div>

          <!-- Récapitulatif missions -->
          <div class="bg-[#FFFCF8] border border-[#E6D9CB] rounded-2xl p-3 shadow-2xs space-y-1.5">
            <div class="flex items-center justify-between px-0.5">
              <span class="text-[10px] font-bold text-[#7A291E] uppercase tracking-wider flex items-center gap-1.5">
                <UIcon
                  name="i-lucide-calendar-days"
                  class="w-3.5 h-3.5 text-[#7A291E]"
                />
                Missions assignées ({{ data.volunteer.missions.length }})
              </span>
              <span class="text-[10px] font-semibold text-[#6E5A52]">
                Édition {{ data.volunteer.editionYear || 2027 }}
              </span>
            </div>
            <div class="divide-y divide-[#E6D9CB]/60 max-h-24 overflow-y-auto pr-0.5">
              <div
                v-for="m in data.volunteer.missions"
                :key="m.id"
                class="text-xs flex items-center justify-between py-1.5 first:pt-0.5 last:pb-0.5 gap-2"
              >
                <span class="font-medium text-[#2A1512] truncate text-[11px] sm:text-xs">{{ m.missionName }}</span>
                <span class="text-[#7A291E] font-mono text-[11px] shrink-0 font-semibold bg-[#FAF2EF] px-2 py-0.5 rounded-full border border-[#ECCBC4]">{{ m.timeSlot }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Bénévole trouvé mais en attente de validation -->
        <div
          v-else-if="data?.volunteer"
          class="relative z-10 flex flex-col justify-between flex-1 my-auto space-y-3 pt-2 transition-opacity duration-300"
        >
          <!-- Photo + Identité + Statut En attente -->
          <div class="flex flex-col items-center my-auto py-1">
            <div class="relative w-24 h-24 sm:w-26 sm:h-26">
              <img
                v-if="data.volunteer.photoUrl"
                :src="data.volunteer.photoUrl"
                :alt="`${data.volunteer.firstName} ${data.volunteer.lastName}`"
                class="w-full h-full rounded-full object-cover border-2 border-[#D9A660] shadow-sm ring-4 ring-[#FAF4F2]"
              >
              <div
                v-else
                class="w-full h-full rounded-full bg-[#7A291E] text-white flex items-center justify-center font-bold text-2xl border-2 border-[#5E1F16] shadow-sm ring-4 ring-[#FAF4F2]"
              >
                {{ data.volunteer.firstName.charAt(0) }}{{ data.volunteer.lastName.charAt(0) }}
              </div>
            </div>

            <!-- Nom et Prénom -->
            <div class="text-center px-2 mt-3 space-y-0.5">
              <h2 class="font-serif italic font-semibold text-2xl sm:text-3xl text-[#2A1512] leading-tight truncate max-w-[280px]">
                {{ data.volunteer.firstName }} {{ data.volunteer.lastName }}
              </h2>
            </div>

            <!-- Pastille En attente (DA #F7E4C6 / #8A4B0F) -->
            <div class="mt-3">
              <div class="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#F7E4C6] border border-[#D9A660] text-[#8A4B0F] text-xs font-semibold shadow-2xs">
                <UIcon
                  name="i-lucide-clock"
                  class="w-4 h-4 text-[#8A4B0F]"
                />
                <span>En attente de validation</span>
              </div>
            </div>
          </div>

          <!-- Message explicatif -->
          <div class="bg-[#FAF2EF] border border-[#ECCBC4] rounded-2xl p-3 text-center space-y-1">
            <p class="text-xs font-bold text-[#7A291E]">
              Planning non finalisé
            </p>
            <p class="text-[11px] text-[#6E5A52] leading-relaxed">
              Le bénévole n'a pas encore validé définitivement ses créneaux d'engagement.
            </p>
          </div>
        </div>

        <!-- Badge invalide / non trouvé (Statut DA Refusé #F4D8D3 / #9A2A22) -->
        <div
          v-else
          class="relative z-10 space-y-4 py-8 my-auto text-center transition-opacity duration-300"
        >
          <div class="w-16 h-16 rounded-full bg-[#F4D8D3] border border-[#D9A79F] text-[#9A2A22] flex items-center justify-center mx-auto shadow-2xs">
            <UIcon
              name="i-lucide-shield-x"
              class="w-8 h-8"
            />
          </div>
          <div class="space-y-1.5">
            <div class="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#F4D8D3] text-[#9A2A22] border border-[#D9A79F] text-xs font-bold shadow-2xs">
              <UIcon
                name="i-lucide-alert-triangle"
                class="w-3.5 h-3.5"
              />
              <span>Accréditation Invalide</span>
            </div>
            <p class="text-xs text-[#6E5A52] max-w-xs mx-auto leading-relaxed pt-1">
              {{ data?.message || 'Ce badge n\'est pas actif ou est inconnu de l\'organisation.' }}
            </p>
          </div>
        </div>

        <!-- BAS : Identifiant unique discret et élégant -->
        <div class="relative z-10 pt-2 flex items-center justify-between text-[10px] font-mono text-[#6E5A52] tracking-wider border-t border-[#E6D9CB]">
          <span>ID: {{ (data?.volunteer?.id || userId || '').slice(0, 8).toUpperCase() }}</span>
          <span class="font-sans font-semibold text-[9px] uppercase tracking-wider text-[#7A291E]">Salon de la Danse</span>
        </div>
      </div>
    </div>
  </div>
</template>
