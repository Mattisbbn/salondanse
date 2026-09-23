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
  <div class="h-dvh min-h-dvh max-h-dvh w-full overflow-hidden flex flex-col justify-center items-center p-3 sm:p-4 bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 relative select-none">
    <!-- Scène 3D avec perspective -->
    <div class="relative z-10 w-full flex justify-center [perspective:1000px]">
      <!-- Carte physique de badge dans le même style que VolunteerBadge -->
      <div
        ref="cardRef"
        class="relative w-full max-w-[320px] aspect-[9/14] min-h-[480px] bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/80 ring-1 ring-black/5 shadow-2xl shadow-indigo-950/10 p-5 flex flex-col justify-between overflow-hidden cursor-pointer select-none"
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

        <!-- HAUT : En-tête -->
        <div class="relative z-10 space-y-2">
          <div class="flex items-center justify-between px-0.5">
            <span class="font-extrabold text-sm tracking-tight text-slate-800">
              Salon de la Danse
            </span>
            <span class="px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 font-bold text-[10px] tracking-wide border border-violet-100 shadow-2xs">
              Édition {{ data?.volunteer?.editionYear || 2027 }}
            </span>
          </div>
        </div>

        <!-- Chargement -->
        <div
          v-if="status === 'pending'"
          class="relative z-10 py-12 text-center text-slate-400 space-y-2 my-auto"
        >
          <UIcon
            name="i-lucide-loader-2"
            class="w-8 h-8 animate-spin mx-auto text-violet-600"
          />
          <p class="text-xs text-slate-500 font-medium">
            Vérification de l'accréditation en cours...
          </p>
        </div>

        <!-- Badge valide -->
        <div
          v-else-if="data?.valid && data.volunteer"
          class="relative z-10 flex flex-col justify-between flex-1 my-auto space-y-3 pt-1 transition-opacity duration-300"
        >
          <!-- Photo + Pastille de statut -->
          <div class="flex flex-col items-center">
            <!-- Pastille de statut -->
            <div class="mb-2">
              <div class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold shadow-xs">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <UIcon
                  name="i-lucide-shield-check"
                  class="w-3.5 h-3.5 text-emerald-600"
                />
                <span>Badge valide</span>
              </div>
            </div>

            <!-- Photo ronde comme volunteer badge -->
            <div class="relative w-20 h-20 sm:w-22 sm:h-22">
              <img
                v-if="data.volunteer.photoUrl"
                :src="data.volunteer.photoUrl"
                :alt="`${data.volunteer.firstName} ${data.volunteer.lastName}`"
                class="w-full h-full rounded-full object-cover border-2 border-violet-600 shadow-md ring-4 ring-violet-50"
              >
              <div
                v-else
                class="w-full h-full rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-2xl border-2 border-violet-600 shadow-md ring-4 ring-violet-50"
              >
                {{ data.volunteer.firstName.charAt(0) }}{{ data.volunteer.lastName.charAt(0) }}
              </div>
            </div>

            <!-- Pastille statut mineur si applicable -->
            <div
              v-if="data.volunteer.isMinor"
              class="mt-1.5"
            >
              <span
                class="text-[9px] font-bold px-2 py-0.5 rounded-full inline-block"
                :class="data.volunteer.isApprovedMinor ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'"
              >
                {{ data.volunteer.isApprovedMinor ? 'Mineur Autorisé' : 'Mineur En attente' }}
              </span>
            </div>

            <!-- Nom et Prénom -->
            <div class="text-center px-2 mt-2">
              <h3 class="text-slate-900 font-bold text-lg sm:text-xl tracking-tight leading-snug truncate max-w-[260px]">
                {{ data.volunteer.firstName }} {{ data.volunteer.lastName }}
              </h3>
            </div>
          </div>

          <!-- Récapitulatif missions -->
          <div class="p-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-left space-y-1">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Missions ({{ data.volunteer.missions.length }})
            </span>
            <div class="space-y-0.5 max-h-24 overflow-y-auto pr-1">
              <div
                v-for="m in data.volunteer.missions"
                :key="m.id"
                class="text-xs flex items-center justify-between py-0.5 border-b border-slate-200/60 last:border-0"
              >
                <span class="font-medium text-slate-700 truncate mr-2">{{ m.missionName }}</span>
                <span class="text-violet-700 font-mono text-[11px] shrink-0 font-medium">{{ m.timeSlot }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Badge invalide -->
        <div
          v-else
          class="relative z-10 space-y-3 py-6 my-auto text-center transition-opacity duration-300"
        >
          <div class="w-14 h-14 rounded-full bg-red-50 border border-red-200 text-red-500 flex items-center justify-center mx-auto shadow-xs">
            <UIcon
              name="i-lucide-shield-x"
              class="w-7 h-7"
            />
          </div>
          <div class="space-y-1">
            <h2 class="text-base sm:text-lg font-bold text-red-600">
              Accréditation Invalide
            </h2>
            <p class="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              {{ data?.message || 'Ce badge n\'est pas actif ou le planning du bénévole n\'est pas encore validé.' }}
            </p>
          </div>
        </div>

        <!-- BAS : Identifiant unique -->
        <div class="relative z-10 pt-2 flex items-center justify-center text-[10px] font-mono text-slate-400 px-0.5">
          <span class="tracking-wider">ID: {{ (data?.volunteer?.id || userId || '').slice(0, 8).toUpperCase() }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
