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
</script>

<template>
  <div class="w-full flex justify-center">
    <div
      class="relative w-full max-w-[310px] aspect-[9/14] min-h-[470px] bg-[#FFFCF8] rounded-3xl border border-[#E6D9CB] shadow-sm p-5 flex flex-col justify-between overflow-hidden select-none"
    >
      <!-- HAUT : En-tête du badge avec encoche tour de cou -->
      <div class="space-y-3">
        <!-- Encoche clip tour de cou -->
        <div class="w-12 h-1.5 rounded-full bg-[#E6D9CB] mx-auto -mt-1 mb-1.5" />

        <!-- Logo et Édition -->
        <div class="flex items-center justify-between px-0.5">
          <span class="font-serif italic font-semibold text-base tracking-tight text-[#2A1512]">
            Salon de la Danse
          </span>
          <span class="px-2.5 py-0.5 rounded-full bg-[#F3DCD5] text-[#7A291E] font-bold text-[10px] tracking-wide border border-[#ECCBC4]">
            Édition {{ volunteer.editionYear || 2027 }}
          </span>
        </div>
      </div>

      <!-- MILIEU HAUT : Photo d'identité ronde -->
      <div class="flex flex-col items-center my-auto">
        <div class="relative w-22 h-22 sm:w-24 sm:h-24">
          <img
            v-if="volunteer.photoUrl"
            :src="volunteer.photoUrl"
            :alt="`${volunteer.firstName} ${volunteer.lastName}`"
            class="w-full h-full rounded-full object-cover border-2 border-[#7A291E] shadow-sm ring-4 ring-[#FAF4F2]"
          >
          <div
            v-else
            class="w-full h-full rounded-full bg-[#7A291E] text-white flex items-center justify-center font-bold text-2xl border-2 border-[#5E1F16] shadow-sm ring-4 ring-[#FAF4F2]"
          >
            {{ volunteer.firstName.charAt(0) }}{{ volunteer.lastName.charAt(0) }}
          </div>
        </div>

        <!-- Pastille statut mineur si applicable -->
        <div
          v-if="volunteer.isMinor"
          class="mt-2.5"
        >
          <span
            class="text-[10px] font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1"
            :class="volunteer.minorValidationStatus === 'VALIDATED'
              ? 'bg-[#E1E9DC] text-[#2F5238] border border-[#9DB79F]'
              : 'bg-[#F7E4C6] text-[#8A4B0F] border border-[#D9A660]'"
          >
            <UIcon
              :name="volunteer.minorValidationStatus === 'VALIDATED' ? 'i-lucide-check' : 'i-lucide-clock'"
              class="w-3 h-3"
            />
            {{ volunteer.minorValidationStatus === 'VALIDATED' ? 'Mineur Autorisé' : 'Mineur En attente' }}
          </span>
        </div>

        <!-- MILIEU : Nom et Prénom -->
        <div class="text-center px-2 mt-3">
          <h3 class="text-[#2A1512] font-serif italic font-semibold text-xl tracking-tight leading-snug truncate max-w-[270px]">
            {{ volunteer.firstName }} {{ volunteer.lastName }}
          </h3>
          <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7A291E] block mt-0.5">
            Bénévole Officiel
          </span>
        </div>
      </div>

      <!-- MILIEU BAS : QR Code contrasté -->
      <div class="flex flex-col items-center mb-4">
        <div
          class="p-2.5 bg-[#FFFFFF] border border-[#D8C6B4] rounded-2xl shadow-2xs hover:border-[#7A291E] transition-colors cursor-pointer"
          title="Toucher pour plein écran"
          @click="emit('open-qr')"
        >
          <img
            v-if="volunteer.qrCodeUrl"
            :src="volunteer.qrCodeUrl"
            alt="QR Code d'accréditation"
            class="w-24 h-24 sm:w-28 sm:h-28 object-contain"
          >
          <div
            v-else
            class="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center text-[#6E5A52] text-[10px] font-mono"
          >
            QR en attente
          </div>
        </div>

        <button
          type="button"
          class="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-[#7A291E] hover:text-[#5E1F16] transition-colors cursor-pointer"
          @click="emit('open-qr')"
        >
          <UIcon
            name="i-lucide-maximize-2"
            class="w-3.5 h-3.5"
          />
          <span>Agrandir le QR Code</span>
        </button>
      </div>

      <!-- BAS : Identifiant unique -->
      <div class="pt-2 flex items-center justify-between text-[10px] font-mono text-[#6E5A52] border-t border-[#E6D9CB]">
        <span class="tracking-wider">ID: {{ volunteer.id.slice(0, 8).toUpperCase() }}</span>
        <span class="font-sans font-semibold text-[9px] uppercase tracking-wider text-[#7A291E]">Salon de la Danse</span>
      </div>
    </div>
  </div>
</template>
