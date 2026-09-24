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
const filterType = ref<'all' | 'minors' | 'adults'>('all')
const selectedBadgeForPrint = ref<VolunteerBadge | null>(null)
const previewQrBadge = ref<VolunteerBadge | null>(null)
const isQrModalOpen = ref(false)

const totalCount = computed(() => data.value?.badges?.length || 0)
const minorCount = computed(() => data.value?.badges?.filter(b => b.isMinor).length || 0)
const adultCount = computed(() => data.value?.badges?.filter(b => !b.isMinor).length || 0)

const filteredBadges = computed(() => {
  if (!data.value?.badges) return []
  
  let list = data.value.badges

  // Filtre statut
  if (filterType.value === 'minors') {
    list = list.filter(b => b.isMinor)
  } else if (filterType.value === 'adults') {
    list = list.filter(b => !b.isMinor)
  }

  // Filtre recherche
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return list

  return list.filter((b) => {
    return (
      b.firstName.toLowerCase().includes(q)
      || b.lastName.toLowerCase().includes(q)
      || b.email.toLowerCase().includes(q)
      || b.id.toLowerCase().includes(q)
    )
  })
})

function printAllBadges() {
  selectedBadgeForPrint.value = null
  nextTick(() => {
    window.print()
  })
}

function printSingleBadge(badge: VolunteerBadge) {
  selectedBadgeForPrint.value = badge
  nextTick(() => {
    window.print()
    const handleAfterPrint = () => {
      selectedBadgeForPrint.value = null
      window.removeEventListener('afterprint', handleAfterPrint)
    }
    window.addEventListener('afterprint', handleAfterPrint, { once: true })
    // Timeout de secours au cas où afterprint ne déclenche pas
    setTimeout(() => {
      selectedBadgeForPrint.value = null
    }, 2000)
  })
}

function openQrModal(badge: VolunteerBadge) {
  previewQrBadge.value = badge
  isQrModalOpen.value = true
}
</script>

<template>
  <div
    class="space-y-6"
    :class="{ 'is-printing-single': !!selectedBadgeForPrint }"
  >
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
          <span>Imprimer tous les badges ({{ filteredBadges.length }})</span>
        </button>
      </div>
    </div>

    <!-- Barre d'outils et filtres (masquée à l'impression) -->
    <div
      v-if="data?.badges && data.badges.length > 0"
      class="bg-[#FFFCF8] rounded-2xl border border-[#E6D9CB] p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 print:hidden"
    >
      <div class="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
        <!-- Champ de recherche stylisé -->
        <div class="relative w-full sm:w-80">
          <UIcon
            name="i-lucide-search"
            class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E5A52]"
          />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Rechercher par nom, email, ID..."
            class="w-full text-xs font-medium bg-[#FFFCF8] border border-[#D8C6B4] text-[#2A1512] rounded-xl pl-9 pr-8 py-2.5 shadow-2xs focus:ring-2 focus:ring-[#7A291E] focus:outline-none placeholder:text-[#6E5A52]/60"
          >
          <button
            v-if="searchQuery"
            type="button"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6E5A52] hover:text-[#2A1512]"
            @click="searchQuery = ''"
          >
            <UIcon name="i-lucide-x" class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Filtres par statut -->
        <div class="inline-flex p-1 bg-[#EFE5DA] rounded-full border border-[#E6D9CB] shrink-0 self-start sm:self-auto">
          <button
            type="button"
            class="px-3 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer"
            :class="filterType === 'all' ? 'bg-[#FFFCF8] text-[#2A1512] shadow-xs' : 'text-[#6E5A52] hover:text-[#2A1512]'"
            @click="filterType = 'all'"
          >
            Tous ({{ totalCount }})
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer"
            :class="filterType === 'adults' ? 'bg-[#FFFCF8] text-[#2A1512] shadow-xs' : 'text-[#6E5A52] hover:text-[#2A1512]'"
            @click="filterType = 'adults'"
          >
            Majeurs ({{ adultCount }})
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer"
            :class="filterType === 'minors' ? 'bg-[#FFFCF8] text-[#2A1512] shadow-xs' : 'text-[#6E5A52] hover:text-[#2A1512]'"
            @click="filterType = 'minors'"
          >
            Mineurs ({{ minorCount }})
          </button>
        </div>
      </div>

      <div class="flex items-center gap-2 text-xs text-[#6E5A52] self-end md:self-auto">
        <span class="font-serif italic font-semibold text-sm text-[#2A1512]">{{ filteredBadges.length }}</span>
        <span>badge(s) affiché(s)</span>
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

    <!-- Aucun résultat pour la recherche -->
    <div
      v-else-if="filteredBadges.length === 0"
      class="bg-[#FFFCF8] rounded-2xl border border-[#E6D9CB] p-12 text-center space-y-3 print:hidden"
    >
      <UIcon
        name="i-lucide-search-x"
        class="w-8 h-8 text-[#D8C6B4] mx-auto"
      />
      <p class="text-xs font-medium text-[#6E5A52]">
        Aucun badge ne correspond à votre recherche.
      </p>
      <button
        type="button"
        class="text-xs font-semibold text-[#7A291E] hover:underline"
        @click="searchQuery = ''; filterType = 'all'"
      >
        Réinitialiser les filtres
      </button>
    </div>

    <!-- ======================================================== -->
    <!-- GRILLE DES BADGES (AUTHENTIQUE DESIGN VOLUNTEERBADGE)    -->
    <!-- ======================================================== -->
    <div
      v-else
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 print:grid-cols-2 print:gap-6 print:p-0 badges-container"
    >
      <div
        v-for="badge in filteredBadges"
        :key="badge.id"
        class="badge-card-item flex flex-col items-center gap-2.5 print:break-inside-avoid"
        :class="{ 'is-selected-for-print': selectedBadgeForPrint?.id === badge.id }"
      >
        <!-- Composant officiel du Badge -->
        <VolunteerBadge
          :volunteer="{
            id: badge.id,
            firstName: badge.firstName,
            lastName: badge.lastName,
            photoUrl: badge.photoUrl,
            qrCodeUrl: badge.qrCodeUrl,
            editionName: badge.editionName,
            editionYear: badge.editionYear,
            isMinor: badge.isMinor,
            minorValidationStatus: badge.isApprovedMinor ? 'VALIDATED' : 'PENDING'
          }"
          :hide-actions="true"
          @open-qr="openQrModal(badge)"
        />

        <!-- Barre d'actions sous chaque badge (masquée à l'impression) -->
        <div class="flex items-center gap-2 print:hidden w-full max-w-[310px] justify-center pt-0.5">
          <button
            type="button"
            class="inline-flex items-center justify-center gap-1.5 h-8 px-3.5 rounded-full bg-[#FFFCF8] hover:bg-[#F6EFE6] text-[#2A1512] border border-[#D8C6B4] font-semibold text-xs transition-colors shadow-2xs cursor-pointer flex-1"
            title="Imprimer uniquement ce badge"
            @click="printSingleBadge(badge)"
          >
            <UIcon name="i-lucide-printer" class="w-3.5 h-3.5 text-[#7A291E]" />
            <span>Imprimer</span>
          </button>

          <button
            type="button"
            class="inline-flex items-center justify-center gap-1.5 h-8 px-3.5 rounded-full bg-[#F3DCD5] hover:bg-[#ECCBC4] text-[#7A291E] border border-[#D9A79F] font-semibold text-xs transition-colors shadow-2xs cursor-pointer flex-1"
            title="Agrandir et vérifier le QR Code"
            @click="openQrModal(badge)"
          >
            <UIcon name="i-lucide-maximize-2" class="w-3.5 h-3.5" />
            <span>Zoom QR</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- MODALE ZOOM DU QR CODE DE CONTRÔLE                      -->
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
          v-if="isQrModalOpen && previewQrBadge"
          class="fixed inset-0 z-50 bg-[#2A1512]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:hidden"
          @click="isQrModalOpen = false"
        >
          <div
            class="w-full max-w-sm bg-[#FFFCF8] rounded-3xl border border-[#E6D9CB] shadow-2xl p-6 space-y-4 my-8 text-center"
            @click.stop
          >
            <!-- En-tête modale -->
            <div class="flex items-center justify-between pb-3 border-b border-[#E6D9CB]">
              <div class="text-left">
                <span class="text-[10px] font-bold tracking-wider uppercase text-[#7A291E] block">
                  Contrôle d'accès
                </span>
                <h3 class="text-base font-serif italic font-semibold text-[#2A1512]">
                  {{ previewQrBadge.firstName }} {{ previewQrBadge.lastName }}
                </h3>
              </div>

              <button
                type="button"
                aria-label="Fermer"
                class="p-1.5 rounded-full text-[#6E5A52] hover:text-[#2A1512] hover:bg-[#F6EFE6] transition-colors cursor-pointer"
                @click="isQrModalOpen = false"
              >
                <UIcon name="i-lucide-x" class="w-4 h-4" />
              </button>
            </div>

            <!-- Grand QR Code -->
            <div class="p-4 bg-white border border-[#D8C6B4] rounded-2xl shadow-xs inline-block mx-auto">
              <img
                v-if="previewQrBadge.qrCodeUrl"
                :src="previewQrBadge.qrCodeUrl"
                alt="QR Code haute résolution"
                class="w-56 h-56 object-contain mx-auto"
              >
              <div
                v-else
                class="w-56 h-56 flex items-center justify-center text-xs text-[#6E5A52] font-mono"
              >
                QR en cours de génération...
              </div>
            </div>

            <!-- Infos bénévole & ID -->
            <div class="space-y-1">
              <p class="font-mono text-xs font-bold text-[#2A1512]">
                ID: {{ previewQrBadge.id.slice(0, 8).toUpperCase() }}
              </p>
              <p class="text-xs text-[#6E5A52] truncate">
                {{ previewQrBadge.email }}
              </p>
            </div>

            <!-- Actions dans la modale -->
            <div class="flex items-center gap-2 pt-2">
              <button
                type="button"
                class="flex-1 inline-flex items-center justify-center gap-2 h-9 px-4 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
                @click="printSingleBadge(previewQrBadge)"
              >
                <UIcon name="i-lucide-printer" class="w-4 h-4" />
                <span>Imprimer ce badge</span>
              </button>

              <button
                type="button"
                class="inline-flex items-center justify-center h-9 px-4 rounded-full bg-[#FFFCF8] hover:bg-[#F6EFE6] text-[#2A1512] border border-[#D8C6B4] font-semibold text-xs transition-colors cursor-pointer"
                @click="isQrModalOpen = false"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
@media print {
  body {
    background-color: white !important;
  }
  aside,
  header,
  nav,
  .print-hidden,
  .print\:hidden {
    display: none !important;
  }
  main {
    padding: 0 !important;
    margin: 0 !important;
    background-color: white !important;
  }
  /* Impression d'un badge unique */
  .is-printing-single .badge-card-item:not(.is-selected-for-print) {
    display: none !important;
  }
  .is-printing-single .badge-card-item.is-selected-for-print {
    display: flex !important;
    justify-content: center !important;
    margin: 30px auto !important;
  }
}
</style>

