<script setup lang="ts">
definePageMeta({
  layout: false
})

useHead({
  title: 'Salon de la Danse 2027 • Angers'
})

const { isAuthenticated } = useAuth()
const targetVolunteerUrl = computed(() => isAuthenticated.value ? '/espace-benevole/planning' : '/espace-benevole/login')
</script>

<template>
  <div class="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[#F8FAFC]">
    <div class="w-full max-w-md text-center space-y-6">
      <!-- Badge discret -->
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 border border-violet-100 text-violet-700 text-xs font-semibold">
        <UIcon
          name="i-lucide-sparkles"
          class="w-3.5 h-3.5 text-violet-600"
        />
        <span>14, 15 & 16 Mai 2027 • Parc des Expositions</span>
      </div>

      <!-- Titres -->
      <div class="space-y-2">
        <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0F172A]">
          Salon de la Danse 2027 • Angers
        </h1>
        <p class="text-base text-slate-500 font-medium">
          Plateforme de gestion de l'événement
        </p>
      </div>

      <!-- Action principale -->
      <div class="pt-2 flex flex-col items-center gap-3">
        <NuxtLink
          :to="targetVolunteerUrl"
          class="w-full sm:w-auto min-w-[220px] inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] active:bg-[#5B21B6] transition-all shadow-sm hover:shadow text-sm cursor-pointer"
        >
          <UIcon
            name="i-lucide-users"
            class="w-4 h-4"
          />
          <span>Espace Bénévoles</span>
          <UIcon
            name="i-lucide-arrow-right"
            class="w-4 h-4 ml-0.5"
          />
        </NuxtLink>
      </div>

      <!-- Footer discret -->
      <p class="text-xs text-slate-400 pt-8">
        Association Salon de la Danse Angers • Tous droits réservés
      </p>
    </div>
  </div>
</template>
