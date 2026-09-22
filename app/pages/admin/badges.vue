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

const { data, status, refresh } = await useFetch<BadgesResponse>('/api/admin/badges')

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
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Badges & Accréditations Bénévoles
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-0.5">
          Génération et impression des badges officiels avec QR Code pour les bénévoles validés
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <UButton
          color="neutral"
          variant="subtle"
          size="sm"
          icon="i-lucide-refresh-cw"
          :loading="status === 'pending'"
          @click="() => refresh()"
        />

        <UButton
          color="primary"
          variant="solid"
          size="md"
          icon="i-lucide-printer"
          label="Imprimer tous les badges"
          class="font-semibold shadow-xs cursor-pointer"
          :disabled="!data?.badges || data.badges.length === 0"
          @click="printAllBadges"
        />
      </div>
    </div>

    <!-- Barre d'outils et recherche (masquée à l'impression) -->
    <div
      v-if="data?.badges && data.badges.length > 0"
      class="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden"
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

      <div class="flex items-center gap-2 text-xs text-slate-500 self-end sm:self-auto">
        <span class="font-semibold text-slate-800">{{ filteredBadges.length }}</span>
        <span>badge(s) prêt(s) à être imprimé(s)</span>
      </div>
    </div>

    <!-- Chargement -->
    <div
      v-if="status === 'pending'"
      class="py-16 text-center text-slate-400 print:hidden"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="w-6 h-6 animate-spin mx-auto text-violet-600 mb-2"
      />
      <p class="text-xs">
        Chargement des badges et génération des QR Codes...
      </p>
    </div>

    <!-- Aucun bénévole validé -->
    <div
      v-else-if="!data?.badges || data.badges.length === 0"
      class="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 print:hidden"
    >
      <div class="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto">
        <UIcon
          name="i-lucide-id-card"
          class="w-6 h-6"
        />
      </div>
      <h3 class="text-base font-bold text-slate-900">
        Aucun badge à imprimer pour le moment
      </h3>
      <p class="text-xs text-slate-500 max-w-sm mx-auto">
        Les badges sont automatiquement générés dès que les bénévoles ont validé et verrouillé leur planning.
      </p>
      <div class="pt-2">
        <NuxtLink to="/admin/volunteers">
          <UButton
            color="primary"
            variant="subtle"
            size="sm"
            icon="i-lucide-users"
            label="Gérer les bénévoles"
          />
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
        class="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between print:border-slate-400 print:shadow-none print:break-inside-avoid print:rounded-xl"
        style="min-height: 380px; max-width: 320px; margin: 0 auto; width: 100%;"
      >
        <!-- En-tête Badge -->
        <div>
          <div class="bg-violet-700 text-white p-3 text-center space-y-0.5 print:bg-violet-800">
            <span class="text-[9px] uppercase tracking-widest font-extrabold text-violet-200 block">
              Accréditation Officielle
            </span>
            <h2 class="text-xs font-black tracking-wider uppercase">
              Salon de la Danse 2027
            </h2>
            <span class="text-[9px] text-violet-200 block">
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
                class="w-full h-full rounded-2xl object-cover border-2 border-violet-600 shadow-sm mx-auto"
              >
              <div
                v-else
                class="w-full h-full rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xl border-2 border-violet-600 shadow-sm mx-auto"
              >
                {{ badge.firstName.charAt(0) }}{{ badge.lastName.charAt(0) }}
              </div>
            </div>

            <!-- Nom et rôle -->
            <div class="space-y-1">
              <h3 class="text-base font-black text-[#0F172A] tracking-tight leading-tight">
                {{ badge.firstName }} {{ badge.lastName }}
              </h3>

              <div class="flex items-center justify-center gap-1.5 flex-wrap">
                <span class="px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[10px] font-extrabold tracking-wider uppercase">
                  Bénévole
                </span>
                <span
                  v-if="badge.isMinor"
                  class="px-2 py-0.5 rounded-full text-[9px] font-bold"
                  :class="badge.isApprovedMinor ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'"
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
                class="w-24 h-24 mx-auto border border-slate-200 rounded-lg p-1 bg-white"
              >
              <span class="text-[9px] text-slate-400 font-mono block mt-1">
                Scan contrôle accès
              </span>
            </div>
          </div>
        </div>

        <!-- Pied de Badge -->
        <div class="bg-slate-50 border-t border-slate-200 px-3 py-2 text-center">
          <span class="text-[9px] font-mono text-slate-400 tracking-wider">
            ID: {{ badge.id.slice(0, 8).toUpperCase() }} • JayDance Fam
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
