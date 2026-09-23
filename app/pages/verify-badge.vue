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
</script>

<template>
  <div class="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4">
    <div class="w-full max-w-sm bg-white rounded-3xl border border-[#E2E8F0] shadow-lg p-6 text-center space-y-5">
      <!-- Logo festival -->
      <div class="space-y-1">
        <span class="text-xs uppercase font-extrabold tracking-wider text-violet-600 block">
          Contrôle d'accès officiel
        </span>
        <h1 class="text-xl font-extrabold text-[#0F172A]">
          Salon de la Danse 2027
        </h1>
      </div>

      <!-- Chargement -->
      <div
        v-if="status === 'pending'"
        class="py-12 text-center text-slate-400"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="w-8 h-8 animate-spin mx-auto text-violet-600 mb-2"
        />
        <p class="text-xs">
          Vérification de l'accréditation en cours...
        </p>
      </div>

      <!-- Badge valide -->
      <div
        v-else-if="data?.valid && data.volunteer"
        class="space-y-4 transition-opacity duration-300"
      >
        <!-- Pastille de statut -->
        <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold shadow-xs">
          <UIcon
            name="i-lucide-shield-check"
            class="w-4 h-4 text-emerald-600"
          />
          <span>Badge valide</span>
        </div>

        <!-- Photo et nom -->
        <div class="space-y-3">
          <div class="relative w-28 h-28 mx-auto">
            <img
              v-if="data.volunteer.photoUrl"
              :src="data.volunteer.photoUrl"
              :alt="`${data.volunteer.firstName} ${data.volunteer.lastName}`"
              class="w-full h-full rounded-2xl object-cover border-4 border-violet-500 shadow-md"
            >
            <div
              v-else
              class="w-full h-full rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center font-black text-2xl border-4 border-violet-500 shadow-md"
            >
              {{ data.volunteer.firstName.charAt(0) }}{{ data.volunteer.lastName.charAt(0) }}
            </div>
            <div class="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
              <UIcon
                name="i-lucide-check"
                class="w-4 h-4 font-bold"
              />
            </div>
          </div>

          <div>
            <h2 class="text-xl font-bold text-[#0F172A]">
              {{ data.volunteer.firstName }} {{ data.volunteer.lastName }}
            </h2>
            <div class="flex items-center justify-center gap-2 mt-1">
            
              <UBadge
                v-if="data.volunteer.isMinor"
                :color="data.volunteer.isApprovedMinor ? 'success' : 'warning'"
                variant="solid"
                size="sm"
                class="font-semibold text-xs px-2.5 py-1 shadow-2xs"
              >
                {{ data.volunteer.isApprovedMinor ? 'Mineur (Autorisé)' : 'Mineur (En attente)' }}
              </UBadge>
            </div>
          </div>
        </div>

        <!-- Récapitulatif missions -->
        <div class="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-2">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Missions  ({{ data.volunteer.missions.length }})
          </span>
          <div class="space-y-1.5">
            <div
              v-for="m in data.volunteer.missions"
              :key="m.id"
              class="text-xs flex items-center justify-between py-1 border-b border-slate-200/60 last:border-0"
            >
              <span class="font-bold text-slate-800 truncate mr-2">{{ m.missionName }}</span>
              <span class="text-violet-700 font-mono text-[11px] shrink-0">{{ m.timeSlot }}</span>
            </div>
          </div>
        </div>

        <p class="text-[11px] text-slate-400">
          ID Accréditation : {{ data.volunteer.id.slice(0, 8).toUpperCase() }} • Angers 2027
        </p>
      </div>

      <!-- Badge invalide -->
      <div
        v-else
        class="space-y-4 py-4 transition-opacity duration-300"
      >
        <div class="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <UIcon
            name="i-lucide-shield-x"
            class="w-8 h-8"
          />
        </div>
        <div class="space-y-1">
          <h2 class="text-lg font-bold text-red-600">
            Accréditation Invalide
          </h2>
          <p class="text-xs text-slate-500">
            {{ data?.message || 'Ce badge n\'est pas actif ou le planning du bénévole n\'est pas encore validé.' }}
          </p>
        </div>
      </div>

      <!-- Bouton retour -->
      <div class="pt-2 border-t border-slate-100">
        <NuxtLink
          to="/"
          class="text-xs text-slate-400 hover:text-slate-600 font-medium"
        >
          Retour à l'accueil
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
