<script setup lang="ts">
definePageMeta({
  layout: false
})

useHead({
  title: 'Salon de la Danse 2027 · Angers'
})

const { isAuthenticated, isAdmin } = useAuth()
const targetUrl = computed(() => {
  if (!isAuthenticated.value) return '/espace-benevole/login'
  return isAdmin.value ? '/admin' : '/espace-benevole/planning'
})
</script>

<template>
  <div class="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[#F6EFE6] text-[#2A1512]">
    <div class="w-full max-w-lg text-center space-y-7">
      <!-- Surtitre officiel DA -->
      <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F3DCD5] text-[#7A291E] text-[11px] font-bold uppercase tracking-[0.16em]">
        <UIcon
          name="i-lucide-calendar"
          class="w-3.5 h-3.5 text-[#7A291E]"
        />
        <span>14, 15 & 16 Mai 2027 · Parc des Expositions d'Angers</span>
      </div>

      <!-- Titres élégants Playfair Display -->
      <div class="space-y-3">
        <h1 class="font-bold tracking-tight text-4xl sm:text-5xl text-[#2A1512] leading-tight">
          Le grand rendez-vous de toutes les danses
        </h1>
        <p class="text-base text-[#6E5A52] leading-relaxed">
          Plateforme officielle de gestion et d'organisation des équipes bénévoles.
        </p>
      </div>

      <!-- Action principale -->
      <div class="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
        <NuxtLink
          :to="targetUrl"
          class="w-full sm:w-auto min-w-[220px] h-11 inline-flex items-center justify-center gap-2.5 px-6 rounded-full font-semibold text-white bg-[#7A291E] hover:bg-[#5E1F16] transition-colors text-sm shadow-xs cursor-pointer"
        >
          <UIcon
            name="i-lucide-users"
            class="w-4 h-4 text-[#D9B777]"
          />
          <span>Accéder à l'espace</span>
          <UIcon
            name="i-lucide-arrow-right"
            class="w-4 h-4"
          />
        </NuxtLink>
      </div>

      <!-- Footer discret avec lien RGPD -->
      <div class="pt-6 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-xs text-[#6E5A52] font-medium">
        <span>Association Salon de la Danse Angers · Tous droits réservés</span>
        <span class="hidden sm:inline text-[#D8C6B4]">·</span>
        <NuxtLink
          to="/politique-confidentialite"
          class="hover:text-[#7A291E] underline underline-offset-2 transition-colors inline-flex items-center gap-1"
        >
          <UIcon name="i-lucide-shield-check" class="w-3.5 h-3.5 text-[#7A291E]" />
          <span>Politique de Confidentialité (RGPD)</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
