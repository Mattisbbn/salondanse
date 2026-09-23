<script setup lang="ts">
await navigateTo('/espace-benevole/dashboard', { redirectCode: 302 })
</script>

<template>
  <div class="p-8 text-center text-slate-400">
    <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin mx-auto text-violet-600 mb-2" />
    <p class="text-xs">Redirection vers votre espace bénévole...</p>
  </div>
</template>
