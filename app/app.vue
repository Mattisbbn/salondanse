<script setup lang="ts">
const { fetchUser } = useAuth()

// Restauration de la session au premier chargement / rechargement (F5)
await fetchUser()

useHead({
  titleTemplate: (titleChunk) => {
    return titleChunk ? `${titleChunk} · Salon de la Danse` : 'Salon de la Danse 2027 · Bénévoles'
  },
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { name: 'description', content: 'Plateforme de gestion des bénévoles du Salon de la Danse 2027' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'fr',
    class: 'light'
  }
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
