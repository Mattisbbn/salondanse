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
  <!-- ======================================================== -->
  <!-- 1. ARRIÈRE-PLAN AMBIANT STYLE « LAMPE À LAVE »           -->
  <!-- ======================================================== -->
  <div class="relative w-full rounded-3xl overflow-hidden bg-gradient-to-b from-slate-50/90 via-white to-violet-50/50 p-6 sm:p-10 flex flex-col items-center justify-center border border-slate-200/80 shadow-sm select-none">
    <!-- Bulles / orbes floues en superposition -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <!-- Orbe 1 : Violet pastel -->
      <div
        data-lava-orb="1"
        class="absolute -top-12 -left-12 w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-violet-400/40"
      />
      <!-- Orbe 2 : Fuchsia doux -->
      <div
        data-lava-orb="2"
        class="absolute top-1/4 -right-16 w-60 h-60 sm:w-72 sm:h-72 rounded-full bg-fuchsia-300/45"
      />
      <!-- Orbe 3 : Indigo doux -->
      <div
        data-lava-orb="3"
        class="absolute -bottom-16 left-1/4 w-72 h-72 sm:w-88 sm:h-88 rounded-full bg-indigo-300/45"
      />
      <!-- Orbe 4 : Rose poudré -->
      <div
        data-lava-orb="4"
        class="absolute bottom-1/3 -left-10 w-56 h-56 sm:w-64 sm:h-64 rounded-full bg-pink-300/50"
      />
    </div>

    <!-- ======================================================== -->
    <!-- 2 & 3. SCÈNE 3D TILT ET FORMAT DU BADGE VERTICAL         -->
    <!-- ======================================================== -->
    <div class="relative z-10 w-full flex justify-center [perspective:1000px]">
      <div
        ref="cardRef"
        class="relative w-full max-w-[320px] aspect-[9/14] min-h-[480px] bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/80 ring-1 ring-black/5 shadow-2xl shadow-indigo-950/10 p-5 flex flex-col justify-between overflow-hidden cursor-pointer"
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
        <!-- 4. CONTENU & HIÉRARCHIE VISUELLE DU BADGE                -->
        <!-- ======================================================== -->

        <!-- HAUT : Perforation tour de cou + En-tête -->
        <div class="relative z-10 space-y-3">
          <!-- Encoche / perforation ovale stylisée de tour de cou -->
          <div class="w-14 h-3 mx-auto rounded-full bg-slate-200/90 border border-slate-300/70 shadow-inner flex items-center justify-center">
            <div class="w-8 h-1 rounded-full bg-slate-300/70" />
          </div>

          <!-- Logo et Édition -->
          <div class="flex items-center justify-between px-0.5">
            <div class="flex items-center gap-1.5">
              <div class="w-6 h-6 rounded-lg bg-violet-600 text-white flex items-center justify-center font-black text-[11px] shadow-xs">
                SD
              </div>
              <span class="font-extrabold text-sm tracking-tight text-slate-800">
                Salon de la Danse
              </span>
            </div>
            <span class="px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 font-bold text-[10px] tracking-wide border border-violet-100 shadow-2xs">
              Édition {{ volunteer.editionYear || 2027 }}
            </span>
          </div>
        </div>

        <!-- MILIEU HAUT : Photo d'identité ronde + Badge violet BÉNÉVOLE -->
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

          <!-- Badge plein violet « BÉNÉVOLE » -->
          <div class="-mt-3 relative z-10">
            <span class="inline-flex items-center px-3 py-0.5 rounded-full bg-violet-600 text-white text-[10px] font-extrabold uppercase tracking-widest shadow-sm">
              BÉNÉVOLE
            </span>
          </div>

          <!-- Pastille statut mineur si applicable -->
          <div
            v-if="volunteer.isMinor"
            class="mt-1"
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
        <div class="relative z-10 flex flex-col items-center">
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

        <!-- BAS : Identifiant unique & Contrôle d'accès -->
        <div class="relative z-10 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-400 px-0.5">
          <span class="tracking-wider">ID: {{ volunteer.id.slice(0, 8).toUpperCase() }}</span>
          <span class="font-sans font-medium text-slate-500">Contrôle d'accès</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
[data-lava-orb] {
  filter: blur(60px);
  mix-blend-mode: multiply;
  will-change: transform;
  transform-origin: center center;
}

[data-lava-orb="1"] {
  animation: lavaMove1 14s ease-in-out infinite alternate;
}

[data-lava-orb="2"] {
  animation: lavaMove2 17s ease-in-out infinite alternate;
}

[data-lava-orb="3"] {
  animation: lavaMove3 15s ease-in-out infinite alternate;
}

[data-lava-orb="4"] {
  animation: lavaMove4 18s ease-in-out infinite alternate;
}

@keyframes lavaMove1 {
  0% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(45px, 35px) scale(1.18);
  }
  100% {
    transform: translate(-30px, 50px) scale(0.92);
  }
}

@keyframes lavaMove2 {
  0% {
    transform: translate(0, 0) scale(1.1);
  }
  50% {
    transform: translate(-50px, -25px) scale(0.95);
  }
  100% {
    transform: translate(25px, 45px) scale(1.15);
  }
}

@keyframes lavaMove3 {
  0% {
    transform: translate(0, 0) scale(0.95);
  }
  50% {
    transform: translate(35px, -45px) scale(1.2);
  }
  100% {
    transform: translate(-45px, -15px) scale(1.05);
  }
}

@keyframes lavaMove4 {
  0% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(-35px, 45px) scale(1.15);
  }
  100% {
    transform: translate(40px, -25px) scale(0.9);
  }
}
</style>
