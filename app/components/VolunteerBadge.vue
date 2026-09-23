<script setup lang="ts">
interface VolunteerData {
  id: string
  firstName: string
  lastName: string
  photoUrl?: string | null
  qrCodeUrl?: string
  editionName?: string
  editionYear?: number
  isMinor?: boolean
  minorValidationStatus?: string
}

defineProps<{
  volunteer: VolunteerData
}>()

const emit = defineEmits<{
  (e: 'open-qr'): void
}>()

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

  // Ratio centré (-1 à 1)
  const percentX = (x / rect.width) * 2 - 1
  const percentY = (y / rect.height) * 2 - 1

  // Amplitude max : 13 degrés
  rotateX.value = Math.max(-14, Math.min(14, -percentY * 13))
  rotateY.value = Math.max(-14, Math.min(14, percentX * 13))

  // Coordonnées pour le reflet spéculaire
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
  <div class="w-full flex justify-center lg:justify-start [perspective:1000px]">
    <div
      ref="cardRef"
      class="relative w-full max-w-[320px] aspect-[9/14] min-h-[480px] bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/80 ring-1 ring-black/5 shadow-xl shadow-indigo-950/10 p-5 flex flex-col justify-between overflow-hidden cursor-pointer select-none"
      :style="cardTransformStyle"
      @mousemove="onMouseMove"
      @mouseleave="resetTilt"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend="resetTilt"
      @touchcancel="resetTilt"
      @click="emit('open-qr')"
    >
      <!-- Reflet spéculaire dynamique (Glare effect) -->
      <div
        class="pointer-events-none absolute inset-0 rounded-3xl z-30"
        :style="glareStyle"
      />

      <!-- ======================================================== -->
      <!-- CONTENU & HIÉRARCHIE VISUELLE DU BADGE                   -->
      <!-- ======================================================== -->

      <!-- HAUT : En-tête -->
      <div class="relative z-10 space-y-3">
        <!-- Logo et Édition -->
        <div class="flex items-center justify-between px-0.5">
          <span class="font-extrabold text-sm tracking-tight text-slate-800">
            Salon de la Danse
          </span>
          <span class="px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 font-bold text-[10px] tracking-wide border border-violet-100 shadow-2xs">
            Édition {{ volunteer.editionYear || 2027 }}
          </span>
        </div>
      </div>

      <!-- MILIEU HAUT : Photo d'identité ronde -->
      <div class="relative z-10 flex flex-col items-center my-auto">
        <div class="relative w-20 h-20 sm:w-22 sm:h-22">
          <img
            v-if="volunteer.photoUrl"
            :src="volunteer.photoUrl"
            :alt="`${volunteer.firstName} ${volunteer.lastName}`"
            class="w-full h-full rounded-full object-cover border-2 border-violet-600 shadow-md ring-4 ring-violet-50"
          >
          <div
            v-else
            class="w-full h-full rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-2xl border-2 border-violet-600 shadow-md ring-4 ring-violet-50"
          >
            {{ volunteer.firstName.charAt(0) }}{{ volunteer.lastName.charAt(0) }}
          </div>
        </div>

        <!-- Pastille statut mineur si applicable -->
        <div
          v-if="volunteer.isMinor"
          class="mt-1.5"
        >
          <span
            class="text-[9px] font-bold px-2 py-0.5 rounded-full inline-block"
            :class="volunteer.minorValidationStatus === 'VALIDATED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'"
          >
            {{ volunteer.minorValidationStatus === 'VALIDATED' ? 'Mineur Autorisé' : 'Mineur En attente' }}
          </span>
        </div>

        <!-- MILIEU : Nom et Prénom -->
        <div class="text-center px-2 mt-2.5">
          <h3 class="text-slate-900 font-bold text-lg sm:text-xl tracking-tight leading-snug truncate max-w-[260px]">
            {{ volunteer.firstName }} {{ volunteer.lastName }}
          </h3>
        </div>
      </div>

      <!-- MILIEU BAS : QR Code officiel contrasté -->
      <div class="relative z-10 flex flex-col items-center mb-8">
        <div
          class="p-2 bg-white border border-slate-200/90 rounded-2xl shadow-xs group-hover:border-violet-300 transition-colors"
          title="Toucher pour plein écran"
        >
          <img
            v-if="volunteer.qrCodeUrl"
            :src="volunteer.qrCodeUrl"
            alt="QR Code d'accréditation"
            class="w-24 h-24 sm:w-28 sm:h-28 object-contain"
          >
          <div
            v-else
            class="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center text-slate-300 text-[10px] font-mono"
          >
            QR en attente
          </div>
        </div>

        <div class="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-slate-400 group-hover:text-violet-600 transition-colors">
          <UIcon
            name="i-lucide-maximize-2"
            class="w-3 h-3"
          />
          <span>Toucher pour plein écran</span>
        </div>
      </div>

      <!-- BAS : Identifiant unique -->
      <div class="relative z-10 pt-2 flex items-center justify-center text-[10px] font-mono text-slate-400 px-0.5">
        <span class="tracking-wider">ID: {{ volunteer.id.slice(0, 8).toUpperCase() }}</span>
      </div>
    </div>
  </div>
</template>
