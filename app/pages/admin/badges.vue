<script setup lang="ts">
const { isAdmin } = useAuth()

// Redirection si non admin
if (!isAdmin.value) {
  await navigateTo('/espace-benevole/login')
}

interface VolunteerBadge {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  photoUrl: string | null
  isMinor: boolean
  isApprovedMinor: boolean
  planningLockedAt: string | null
  qrCodeUrl: string
  verifyUrl: string
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

interface BadgesResponse {
  total: number
  edition: {
    id: string
    name: string
    year: number
  }
  badges: VolunteerBadge[]
}

const { data, status } = await useFetch<BadgesResponse>('/api/admin/badges')

const searchQuery = ref('')

const filteredBadges = computed(() => {
  if (!data.value?.badges) return []
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return data.value.badges

  return data.value.badges.filter((b) => {
    return (
      b.firstName.toLowerCase().includes(q)
      || b.lastName.toLowerCase().includes(q)
      || b.email.toLowerCase().includes(q)
      || b.id.toLowerCase().includes(q)
    )
  })
})

function printAllBadges() {
  window.print()
}
</script>

<template>
  <div class="space-y-6">
    <!-- En-tête (masqué à l'impression) -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[#E6D9CB] print:hidden">
      <div>
        <span class="text-[11px] font-bold tracking-[0.16em] uppercase text-[#7A291E] block mb-1">
          Accréditations & Émargement
        </span>
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-[#2A1512]">
          Badges & Accréditations
        </h1>
        <p class="text-xs sm:text-sm text-[#6E5A52] mt-0.5">
          Génération et impression des badges officiels avec QR Code pour les bénévoles validés
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <button
          type="button"
          class="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!data?.badges || data.badges.length === 0"
          @click="printAllBadges"
        >
          <UIcon name="i-lucide-printer" class="w-4 h-4" />
          <span>Imprimer tous les badges</span>
        </button>
      </div>
    </div>

    <!-- Barre d'outils et recherche (masquée à l'impression) -->
    <div
      v-if="data?.badges && data.badges.length > 0"
      class="bg-[#FFFCF8] rounded-2xl border border-[#E6D9CB] p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden"
    >
      <div class="flex items-center gap-2 w-full sm:w-80">
        <UInput
          v-model="searchQuery"
          placeholder="Rechercher un bénévole..."
          icon="i-lucide-search"
          size="sm"
          class="w-full"
        />
      </div>

      <div class="flex items-center gap-2 text-xs text-[#6E5A52] self-end sm:self-auto">
        <span class="font-serif italic font-semibold text-sm text-[#2A1512]">{{ filteredBadges.length }}</span>
        <span>badge(s) prêt(s) à être imprimé(s)</span>
      </div>
    </div>

    <!-- Chargement -->
    <div
      v-if="status === 'pending'"
      class="py-16 text-center text-[#6E5A52] print:hidden"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="w-6 h-6 animate-spin mx-auto text-[#7A291E] mb-2"
      />
      <p class="text-xs">
        Chargement des badges et génération des QR Codes...
      </p>
    </div>

    <!-- Aucun bénévole validé -->
    <div
      v-else-if="!data?.badges || data.badges.length === 0"
      class="bg-[#FFFCF8] rounded-2xl border border-[#E6D9CB] p-12 text-center space-y-3 print:hidden"
    >
      <div class="w-12 h-12 rounded-2xl bg-[#F3DCD5] text-[#7A291E] flex items-center justify-center mx-auto">
        <UIcon
          name="i-lucide-id-card"
          class="w-6 h-6"
        />
      </div>
      <h3 class="text-base font-serif italic font-semibold text-[#2A1512]">
        Aucun badge à imprimer pour le moment
      </h3>
      <p class="text-xs text-[#6E5A52] max-w-sm mx-auto">
        Les badges sont automatiquement générés dès que les bénévoles ont validé et verrouillé leur planning.
      </p>
      <div class="pt-2">
        <NuxtLink to="/admin/volunteers">
          <button
            type="button"
            class="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-[#FFFCF8] hover:bg-[#F6EFE6] text-[#2A1512] border border-[#D8C6B4] font-semibold text-xs transition-colors cursor-pointer"
          >
            <UIcon name="i-lucide-users" class="w-4 h-4 text-[#7A291E]" />
            <span>Gérer les bénévoles</span>
          </button>
        </NuxtLink>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- GRILLE DES BADGES (VISIBLE ÉCRAN & FORMATÉE PRINT)       -->
    <!-- ======================================================== -->
    <div
      v-else
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 print:grid-cols-2 print:gap-4 print:p-0"
    >
      <div
        v-for="badge in filteredBadges"
        :key="badge.id"
        class="bg-[#FFFCF8] rounded-2xl border border-[#E6D9CB] shadow-xs overflow-hidden flex flex-col justify-between print:border-slate-400 print:shadow-none print:break-inside-avoid print:rounded-xl"
        style="min-height: 380px; max-width: 320px; margin: 0 auto; width: 100%;"
      >
        <!-- En-tête Badge Coulisses sombre -->
        <div>
          <div class="bg-[#2E1411] text-[#FFF7EE] p-3.5 text-center space-y-1 print:bg-[#2E1411]">
            <span class="text-[9px] uppercase tracking-[0.2em] font-bold text-[#D9B777] block">
              Accréditation Officielle
            </span>
            <h2 class="text-sm font-serif italic font-semibold text-[#FFF7EE]">
              Salon de la Danse 2027
            </h2>
            <span class="text-[9px] text-[#D8C6B4] block uppercase tracking-wider">
              Angers • 14-16 Mai 2027
            </span>
          </div>

          <!-- Corps du Badge -->
          <div class="p-4 text-center space-y-3">
            <!-- Photo d'identité -->
            <div class="relative w-24 h-24 mx-auto">
              <img
                v-if="badge.photoUrl"
                :src="badge.photoUrl"
                :alt="`${badge.firstName} ${badge.lastName}`"
                class="w-full h-full rounded-2xl object-cover border-2 border-[#D8C6B4] shadow-xs mx-auto"
              >
              <div
                v-else
                class="w-full h-full rounded-2xl bg-[#F3DCD5] text-[#7A291E] flex items-center justify-center font-bold text-xl border-2 border-[#D9A79F] shadow-xs mx-auto"
              >
                {{ badge.firstName.charAt(0) }}{{ badge.lastName.charAt(0) }}
              </div>
            </div>

            <!-- Nom et rôle -->
            <div class="space-y-1.5">
              <h3 class="text-base font-serif italic font-semibold text-[#2A1512] tracking-tight leading-tight">
                {{ badge.firstName }} {{ badge.lastName }}
              </h3>

              <div class="flex items-center justify-center gap-1.5 flex-wrap">
                <span class="px-3 py-0.5 rounded-full bg-[#7A291E] text-white text-[10px] font-bold tracking-wider uppercase">
                  Bénévole
                </span>
                <span
                  v-if="badge.isMinor"
                  class="px-2.5 py-0.5 rounded-full text-[9px] font-semibold"
                  :class="badge.isApprovedMinor ? 'bg-[#E1E9DC] text-[#2F5238] border border-[#9DB79F]' : 'bg-[#F7E4C6] text-[#8A4B0F] border border-[#D9A660]'"
                >
                  {{ badge.isApprovedMinor ? 'Mineur Autorisé' : 'Mineur' }}
                </span>
              </div>
            </div>

            <!-- QR Code -->
            <div class="pt-1">
              <img
                v-if="badge.qrCodeUrl"
                :src="badge.qrCodeUrl"
                alt="QR Code de contrôle"
                class="w-24 h-24 mx-auto border border-[#E6D9CB] rounded-xl p-1 bg-white"
              >
              <span class="text-[9px] text-[#6E5A52] font-mono block mt-1">
                Scan contrôle accès
              </span>
            </div>
          </div>
        </div>

        <!-- Pied de Badge -->
        <div class="bg-[#F6EFE6] border-t border-[#E6D9CB] px-3 py-2 text-center">
          <span class="text-[9px] font-mono text-[#6E5A52] tracking-wider">
            ID: {{ badge.id.slice(0, 8).toUpperCase() }} • Salon de la Danse
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  body {
    background-color: white !important;
  }
}
</style>
