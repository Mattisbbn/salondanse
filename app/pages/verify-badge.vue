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
    background: `radial-gradient(circle at ${glareX.value}% ${glareY.value}%, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.12) 35%, transparent 65%)`,
    opacity: glareOpacity.value,
    transition: isInteracting.value ? 'opacity 0.15s ease-out' : 'opacity 0.4s ease-out'
  }
})
</script>

<template>
  <div class="h-dvh min-h-dvh max-h-dvh w-full overflow-hidden flex flex-col justify-center items-center p-3 sm:p-4 bg-slate-950 relative selection:bg-violet-500 selection:text-white">
    <!-- Fond d'ambiance sombre avec halo discret -->
    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(99,102,241,0.18),transparent_65%)]" />

    <!-- Scène 3D avec perspective -->
    <div class="relative z-10 w-full flex justify-center [perspective:1000px]">
      <!-- Carte physique de badge / effet carte bancaire avec 3D Tilt -->
      <div
        ref="cardRef"
        class="relative w-full max-w-sm rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.7),0_0_30px_rgba(99,102,241,0.15)] backdrop-blur-xl p-4 sm:p-5 text-center text-white flex flex-col justify-between cursor-pointer select-none"
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
          class="pointer-events-none absolute inset-0 rounded-3xl z-20"
          :style="glareStyle"
        />

        <!-- Reflet lumineux animé (shimmer) -->
        <div
          data-shimmer
          class="pointer-events-none absolute inset-0"
        />

        <!-- Halo holographique d'angle -->
        <div class="pointer-events-none absolute -top-16 -right-16 w-36 h-36 bg-violet-500/20 rounded-full blur-2xl" />
        <div class="pointer-events-none absolute -bottom-16 -left-16 w-36 h-36 bg-indigo-500/15 rounded-full blur-2xl" />

        <!-- En-tête du badge -->
        <div class="relative z-10 space-y-1">
          <div class="flex items-center justify-between px-1 text-[10px] uppercase font-bold tracking-widest text-violet-400">
            <span class="flex items-center gap-1.5">
              <UIcon
                name="i-lucide-wifi"
                class="w-3.5 h-3.5 rotate-90 text-violet-400/80"
              />
              Contrôle d'accès
            </span>
            <span class="px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono text-[9px] tracking-normal border border-white/10">
              PASS 2027
            </span>
          </div>
          <h1 class="text-lg sm:text-xl font-black text-white tracking-tight pt-0.5">
            Salon de la Danse
          </h1>
        </div>

        <!-- Chargement -->
        <div
          v-if="status === 'pending'"
          class="relative z-10 py-12 text-center text-slate-400 space-y-2"
        >
          <UIcon
            name="i-lucide-loader-2"
            class="w-8 h-8 animate-spin mx-auto text-violet-400"
          />
          <p class="text-xs text-slate-300">
            Vérification de l'accréditation en cours...
          </p>
        </div>

        <!-- Badge valide -->
        <div
          v-else-if="data?.valid && data.volunteer"
          class="relative z-10 space-y-3 sm:space-y-3.5 mt-3 transition-opacity duration-300"
        >
          <!-- Pastille de statut -->
          <div>
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-[0_0_12px_rgba(16,185,129,0.25)]">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <UIcon
                name="i-lucide-shield-check"
                class="w-4 h-4 text-emerald-400"
              />
              <span>Badge valide</span>
            </div>
          </div>

          <!-- Photo et nom -->
          <div class="space-y-2">
            <div class="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto">
              <img
                v-if="data.volunteer.photoUrl"
                :src="data.volunteer.photoUrl"
                :alt="`${data.volunteer.firstName} ${data.volunteer.lastName}`"
                class="w-full h-full rounded-2xl object-cover ring-2 ring-violet-400/60 shadow-lg shadow-violet-950/60"
              >
              <div
                v-else
                class="w-full h-full rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-800 text-white flex items-center justify-center font-black text-xl sm:text-2xl ring-2 ring-violet-400/60 shadow-lg shadow-violet-950/60"
              >
                {{ data.volunteer.firstName.charAt(0) }}{{ data.volunteer.lastName.charAt(0) }}
              </div>
              <div class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md ring-2 ring-slate-900">
                <UIcon
                  name="i-lucide-check"
                  class="w-3.5 h-3.5 font-bold"
                />
              </div>
            </div>

            <div>
              <h2 class="text-lg sm:text-xl font-bold text-white tracking-tight">
                {{ data.volunteer.firstName }} {{ data.volunteer.lastName }}
              </h2>
              <div
                v-if="data.volunteer.isMinor"
                class="flex items-center justify-center gap-2 mt-1"
              >
                <UBadge
                  :color="data.volunteer.isApprovedMinor ? 'success' : 'warning'"
                  variant="solid"
                  size="xs"
                  class="font-semibold px-2 py-0.5 shadow-xs"
                >
                  {{ data.volunteer.isApprovedMinor ? 'Mineur (Autorisé)' : 'Mineur (En attente)' }}
                </UBadge>
              </div>
            </div>
          </div>

          <!-- Récapitulatif missions -->
          <div class="p-2.5 sm:p-3 bg-white/[0.04] border border-white/10 rounded-2xl text-left space-y-1.5 backdrop-blur-sm">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Missions ({{ data.volunteer.missions.length }})
            </span>
            <div class="space-y-1 max-h-24 sm:max-h-28 overflow-y-auto pr-1">
              <div
                v-for="m in data.volunteer.missions"
                :key="m.id"
                class="text-xs flex items-center justify-between py-0.5 border-b border-white/[0.06] last:border-0"
              >
                <span class="font-medium text-slate-200 truncate mr-2">{{ m.missionName }}</span>
                <span class="text-violet-300 font-mono text-[11px] shrink-0">{{ m.timeSlot }}</span>
              </div>
            </div>
          </div>

          <!-- Footer accréditation physique -->
          <div class="pt-1 flex items-center justify-center gap-2 text-[10px] font-mono text-slate-400">
            <span>ID : {{ data.volunteer.id.slice(0, 8).toUpperCase() }}</span>
            <span class="text-slate-600">•</span>
            <span>ANGERS 2027</span>
          </div>
        </div>

        <!-- Badge invalide -->
        <div
          v-else
          class="relative z-10 space-y-3 py-6 transition-opacity duration-300"
        >
          <div class="w-14 h-14 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(239,68,68,0.25)]">
            <UIcon
              name="i-lucide-shield-x"
              class="w-7 h-7"
            />
          </div>
          <div class="space-y-1">
            <h2 class="text-base sm:text-lg font-bold text-red-400">
              Accréditation Invalide
            </h2>
            <p class="text-xs text-slate-300 max-w-xs mx-auto">
              {{ data?.message || 'Ce badge n\'est pas actif ou le planning du bénévole n\'est pas encore validé.' }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
[data-shimmer] {
  background: linear-gradient(
    115deg,
    transparent 20%,
    rgba(255, 255, 255, 0.03) 38%,
    rgba(255, 255, 255, 0.12) 50%,
    rgba(255, 255, 255, 0.03) 62%,
    transparent 80%
  );
  animation: shimmer 6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-150%) skewX(-20deg);
  }
  35%, 100% {
    transform: translateX(150%) skewX(-20deg);
  }
}
</style>
