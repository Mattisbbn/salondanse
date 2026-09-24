<script setup lang="ts">
await navigateTo('/espace-benevole/dashboard', { redirectCode: 302 })
</script>

<template>
  <div class="p-8 text-center text-[#6E5A52]">
    <UIcon
      name="i-lucide-loader-2"
      class="w-6 h-6 animate-spin mx-auto text-[#7A291E] mb-2"
    />
    <p class="text-xs">
      Redirection vers votre espace bénévole...
    </p>
  </div>
</template>
