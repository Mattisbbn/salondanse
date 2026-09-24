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
// EFFET 3D PARALLAX TILT & REFLET SPÉCULAIRE (GLARE)
// ========================================================
const cardRef = ref<HTMLElement | null>(null)
const isInteracting = ref(false)
const rotateX = ref(0)
const rotateY = ref(0)
const glareX = ref(50)
const glareY = ref(50)
const glareOpacity = ref(0)

function handlePointerMove(clientX: number, clientY: number) {
  if (!cardRef.value) return
  const rect = cardRef.value.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return

  const x = clientX - rect.left
  const y = clientY - rect.top

  const percentX = (x / rect.width) * 2 - 1
  const percentY = (y / rect.height) * 2 - 1

  rotateX.value = Math.max(-14, Math.min(14, -percentY * 13))
  rotateY.value = Math.max(-14, Math.min(14, percentX * 13))

  glareX.value = Math.max(0, Math.min(100, (x / rect.width) * 100))
  glareY.value = Math.max(0, Math.min(100, (y / rect.height) * 100))
  glareOpacity.value = 0.75
  isInteracting.value = true
}

function onMouseMove(e: MouseEvent) {
  handlePointerMove(e.clientX, e.clientY)
}

function onTouchStart(e: TouchEvent) {
  if (e.touches[0]) {
    handlePointerMove(e.touches[0].clientX, e.touches[0].clientY)
  }
}

function onTouchMove(e: TouchEvent) {
  if (e.touches[0]) {
    handlePointerMove(e.touches[0].clientX, e.touches[0].clientY)
  }
}

function resetTilt() {
  isInteracting.value = false
  rotateX.value = 0
  rotateY.value = 0
  glareOpacity.value = 0
}
const cardTransformStyle = computed(() => {
  return {
    transform: `rotateX(${rotateX.value.toFixed(2)}deg) rotateY(${rotateY.value.toFixed(2)}deg) ${
      isInteracting.value ? 'scale3d(1.02, 1.02, 1.02)' : 'scale3d(1, 1, 1)'
    }`,
    transition: isInteracting.value ? 'transform 0.1s ease-out' : 'transform 0.4s ease-out'
  }
})

const glareStyle = computed(() => {
  return {
    background: `radial-gradient(circle at ${glareX.value}% ${glareY.value}%, rgba(255, 255, 255, 0.65) 0%, rgba(255, 255, 255, 0.2) 35%, transparent 65%)`,
    opacity: glareOpacity.value,
    transition: isInteracting.value ? 'opacity 0.15s ease-out' : 'opacity 0.4s ease-out'
  }
})
</script>

<template>
  <div class="h-dvh min-h-dvh max-h-dvh w-full overflow-hidden flex flex-col justify-center items-center p-3 sm:p-4 bg-gradient-to-br from-blue-50 via-indigo-50/40 to-slate-100 relative select-none">
    <!-- Texture / Mesh / Orbes d'ambiance moderne -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden">
      <!-- Orbe haut-gauche azuré -->
      <div class="absolute -top-32 -left-32 w-80 h-80 sm:w-[28rem] sm:h-[28rem] rounded-full bg-blue-300/30 blur-3xl" />
      <!-- Orbe bas-droite indigo -->
      <div class="absolute -bottom-32 -right-32 w-80 h-80 sm:w-[28rem] sm:h-[28rem] rounded-full bg-indigo-300/30 blur-3xl" />
      <!-- Orbe discret centre violet -->
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-violet-200/20 blur-3xl" />
      <!-- Trame de texture moderne subtile -->
      <div class="absolute inset-0 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.12]" />
    </div>

    <!-- Scène 3D avec perspective -->
    <div class="relative z-10 w-full flex justify-center [perspective:1000px]">
      <!-- Carte physique du badge avec relief marqué -->
      <div
        ref="cardRef"
        class="relative w-full max-w-[340px] aspect-[9/14] min-h-[500px] bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/80 ring-1 ring-black/5 shadow-2xl shadow-indigo-500/10 p-5 sm:p-6 flex flex-col justify-between overflow-hidden cursor-pointer select-none"
        :style="cardTransformStyle"
        @mousemove="onMouseMove"
        @mouseleave="resetTilt"
        @touchstart.passive="onTouchStart"
        @touchmove.passive="onTouchMove"
        @touchend="resetTilt"
        @touchcancel="resetTilt"
      >
        <!-- Reflet spéculaire dynamique (Glare effect) -->
        <div
          class="pointer-events-none absolute inset-0 rounded-3xl z-30"
          :style="glareStyle"
        />

        <!-- HAUT : En-tête aéré -->
        <div class="relative z-10 flex items-center justify-between pb-3 border-b border-slate-100">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-2xs">
              <UIcon
                name="i-lucide-sparkles"
                class="w-3.5 h-3.5"
              />
            </div>
            <span class="font-extrabold text-sm tracking-tight text-slate-800">
              Salon de la Danse
            </span>
          </div>
          <span class="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[10px] tracking-wide border border-indigo-100 shadow-2xs">
            Édition {{ data?.volunteer?.editionYear || 2027 }}
          </span>
        </div>

        <!-- Chargement -->
        <div
          v-if="status === 'pending'"
          class="relative z-10 py-12 text-center text-slate-400 space-y-2 my-auto"
        >
          <UIcon
            name="i-lucide-loader-2"
            class="w-8 h-8 animate-spin mx-auto text-indigo-600"
          />
          <p class="text-xs text-slate-500 font-medium">
            Vérification de l'accréditation en cours...
          </p>
        </div>

        <!-- Badge valide -->
        <div
          v-else-if="data?.valid && data.volunteer"
          class="relative z-10 flex flex-col justify-between flex-1 my-auto space-y-4 pt-3 transition-opacity duration-300"
        >
          <!-- Photo + Identité + Statut (rééquilibré verticalement vers le centre) -->
          <div class="flex flex-col items-center my-auto py-2">
            <!-- Photo ronde agrandie avec contour discret et ombre douce -->
            <div class="relative w-24 h-24 sm:w-26 sm:h-26">
              <img
                v-if="data.volunteer.photoUrl"
                :src="data.volunteer.photoUrl"
                :alt="`${data.volunteer.firstName} ${data.volunteer.lastName}`"
                class="w-full h-full rounded-full object-cover border-2 border-indigo-500 shadow-md ring-4 ring-indigo-100"
              >
              <div
                v-else
                class="w-full h-full rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-2xl border-2 border-white/80 shadow-md ring-4 ring-indigo-100"
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
                class="text-[9px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs"
                :class="data.volunteer.isApprovedMinor ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'"
              >
                <UIcon
                  :name="data.volunteer.isApprovedMinor ? 'i-lucide-check' : 'i-lucide-alert-circle'"
                  class="w-3 h-3"
                />
                {{ data.volunteer.isApprovedMinor ? 'Mineur Autorisé' : 'Mineur En attente' }}
              </span>
            </div>

            <!-- Nom et Prénom bien contrasté -->
            <div class="text-center px-2 mt-3 space-y-0.5">
              <h2 class="text-slate-900 font-extrabold text-xl sm:text-2xl tracking-tight leading-tight truncate max-w-[280px]">
                {{ data.volunteer.firstName }} {{ data.volunteer.lastName }}
              </h2>
            </div>

            <!-- Pastille de statut plein avec relief (vert émeraude) -->
            <div class="mt-3">
              <div class="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-600 text-white text-xs font-medium shadow-sm shadow-emerald-600/30 ring-1 ring-emerald-500/50">
                <UIcon
                  name="i-lucide-badge-check"
                  class="w-4 h-4 text-emerald-100"
                />
                <span>Badge valide</span>
              </div>
            </div>
          </div>

          <!-- Récapitulatif missions : fond blanc, séparations nettes et typographies lisibles -->
          <div class="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs space-y-1.5">
            <div class="flex items-center justify-between px-0.5">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <UIcon
                  name="i-lucide-calendar-days"
                  class="w-3.5 h-3.5 text-indigo-500"
                />
                Missions ({{ data.volunteer.missions.length }})
              </span>
              <span class="text-[10px] font-medium text-slate-400">
                {{ data.volunteer.editionYear || 2027 }}
              </span>
            </div>
            <div class="divide-y divide-slate-100 max-h-24 overflow-y-auto pr-0.5">
              <div
                v-for="m in data.volunteer.missions"
                :key="m.id"
                class="text-xs flex items-center justify-between py-1.5 first:pt-0.5 last:pb-0.5 gap-2"
              >
                <span class="font-medium text-slate-700 truncate text-[11px] sm:text-xs">{{ m.missionName }}</span>
                <span class="text-indigo-600 font-mono text-[11px] shrink-0 font-semibold bg-indigo-50/70 px-2 py-0.5 rounded-md border border-indigo-100/60">{{ m.timeSlot }}</span>
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
                class="w-full h-full rounded-full object-cover border-2 border-amber-400 shadow-md ring-4 ring-amber-100"
              >
              <div
                v-else
                class="w-full h-full rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center font-bold text-2xl border-2 border-white/80 shadow-md ring-4 ring-amber-100"
              >
                {{ data.volunteer.firstName.charAt(0) }}{{ data.volunteer.lastName.charAt(0) }}
              </div>
            </div>

            <!-- Nom et Prénom -->
            <div class="text-center px-2 mt-3 space-y-0.5">
              <h2 class="text-slate-900 font-extrabold text-xl sm:text-2xl tracking-tight leading-tight truncate max-w-[280px]">
                {{ data.volunteer.firstName }} {{ data.volunteer.lastName }}
              </h2>
            </div>

            <!-- Pastille En attente de validation plein avec relief -->
            <div class="mt-3">
              <div class="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500 text-white text-xs font-medium shadow-sm shadow-amber-500/30 ring-1 ring-amber-400">
                <UIcon
                  name="i-lucide-clock"
                  class="w-4 h-4 text-amber-100"
                />
                <span>En attente de validation</span>
              </div>
            </div>
          </div>

          <!-- Message explicatif : fond blanc harmonisé -->
          <div class="bg-white border border-amber-200/80 rounded-2xl p-3 text-center space-y-1 shadow-xs">
            <p class="text-xs font-bold text-amber-900">
              Planning non finalisé
            </p>
            <p class="text-[11px] text-slate-500 leading-relaxed">
              Le bénévole n'a pas encore validé définitivement ses créneaux d'engagement.
            </p>
          </div>
        </div>

        <!-- Badge invalide / non trouvé -->
        <div
          v-else
          class="relative z-10 space-y-4 py-8 my-auto text-center transition-opacity duration-300"
        >
          <div class="w-16 h-16 rounded-2xl bg-red-50 border border-red-200/80 text-red-500 flex items-center justify-center mx-auto shadow-sm shadow-red-500/10">
            <UIcon
              name="i-lucide-shield-x"
              class="w-8 h-8"
            />
          </div>
          <div class="space-y-1.5">
            <div class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-red-600 text-white text-xs font-medium shadow-sm shadow-red-600/25">
              <UIcon
                name="i-lucide-alert-triangle"
                class="w-3.5 h-3.5"
              />
              <span>Accréditation Invalide</span>
            </div>
            <p class="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed pt-1">
              {{ data?.message || 'Ce badge n\'est pas actif ou est inconnu de l\'organisation.' }}
            </p>
          </div>
        </div>

        <!-- BAS : Identifiant unique discret et élégant -->
        <div class="relative z-10 pt-2 flex items-center justify-center text-[10px] font-mono text-slate-400 tracking-wider">
          <span>ID: {{ (data?.volunteer?.id || userId || '').slice(0, 8).toUpperCase() }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
