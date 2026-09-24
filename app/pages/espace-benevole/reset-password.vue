<script setup lang="ts">
import { z } from 'zod'

definePageMeta({
  layout: false
})

useHead({
  title: 'Nouveau mot de passe · Espace Bénévoles'
})

const route = useRoute()
const toast = useToast()

const token = computed(() => (route.query.token as string | undefined)?.trim() || '')

const state = reactive({
  newPassword: '',
  confirmPassword: ''
})

const showPassword = ref(false)
const showConfirm = ref(false)
const isLoading = ref(false)

const schema = z.object({
  newPassword: z.string().min(8, 'Le mot de passe doit comporter au moins 8 caractères'),
  confirmPassword: z.string().min(1, 'Veuillez confirmer votre mot de passe')
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword']
})

const onSubmit = async () => {
  if (!token.value) {
    toast.add({
      title: 'Jeton manquant',
      description: 'Le lien de réinitialisation est incomplet ou invalide.',
      color: 'error'
    })
    return
  }

  if (isLoading.value) return
  isLoading.value = true

  try {
    const res = await $fetch<{ success: boolean, message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: {
        token: token.value,
        newPassword: state.newPassword
      }
    })

    toast.add({
      title: 'Mot de passe mis à jour',
      description: res.message || 'Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter.',
      color: 'success'
    })

    await navigateTo('/espace-benevole/login')
  } catch (err: unknown) {
    const errorObj = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    const message = errorObj?.data?.statusMessage || errorObj?.statusMessage || errorObj?.message || 'Une erreur est survenue lors de la réinitialisation.'
    toast.add({
      title: 'Erreur',
      description: message,
      color: 'error'
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#F6EFE6] text-[#2A1512]">
    <div class="w-full max-w-md">
      <!-- Carte principale (Papier #FFFCF8) -->
      <div class="bg-[#FFFCF8] rounded-3xl border border-[#E6D9CB] shadow-xs p-6 sm:p-8">
        <!-- En-tête -->
        <div class="text-left mb-6 space-y-1">
          <span class="text-[11px] font-bold tracking-[0.16em] uppercase text-[#7A291E] block">
            Réinitialisation sécurisée
          </span>
          <h1 class="font-serif italic font-semibold text-3xl text-[#2A1512] leading-tight">
            Nouveau mot de passe
          </h1>
          <p class="text-xs text-[#6E5A52]">
            Choisissez un mot de passe robuste d'au moins 8 caractères.
          </p>
        </div>

        <!-- Alerte si le token est manquant dans l'URL -->
        <div
          v-if="!token"
          class="space-y-4"
        >
          <div class="rounded-2xl border border-[#D9A660] bg-[#F7E4C6] p-4 text-left">
            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-alert-triangle"
                class="w-5 h-5 text-[#8A4B0F] shrink-0 mt-0.5"
              />
              <div class="text-xs text-[#8A4B0F] leading-relaxed">
                <p class="font-bold mb-1">
                  Lien manquant ou expiré
                </p>
                <p>
                  Ce formulaire requiert un jeton de sécurité valide. Veuillez faire une nouvelle demande de réinitialisation.
                </p>
              </div>
            </div>
          </div>

          <div class="pt-2">
            <NuxtLink
              to="/espace-benevole/forgot-password"
              class="w-full h-11 inline-flex items-center justify-center gap-2 text-xs bg-[#7A291E] hover:bg-[#5E1F16] text-white font-semibold rounded-full shadow-2xs transition-colors"
            >
              Demander un nouveau lien
            </NuxtLink>
          </div>
        </div>

        <!-- Formulaire de réinitialisation -->
        <UForm
          v-else
          :schema="schema"
          :state="state"
          class="space-y-4"
          @submit="onSubmit"
        >
          <!-- Champ Nouveau mot de passe -->
          <UFormField
            label="Nouveau mot de passe"
            name="newPassword"
            required
            class="text-left font-medium text-xs text-[#2A1512]"
          >
            <UInput
              v-model="state.newPassword"
              :type="showPassword ? 'text' : 'password'"
              icon="i-lucide-lock"
              placeholder="Minimum 8 caractères"
              size="md"
              class="w-full h-11"
              autocomplete="new-password"
              autofocus
            >
              <template #trailing>
                <button
                  type="button"
                  tabindex="-1"
                  class="text-[#6E5A52] hover:text-[#2A1512] p-1 cursor-pointer"
                  :aria-label="showPassword ? 'Masquer' : 'Afficher'"
                  @click="showPassword = !showPassword"
                >
                  <UIcon :name="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'" class="w-4 h-4" />
                </button>
              </template>
            </UInput>
          </UFormField>

          <!-- Champ Confirmation mot de passe -->
          <UFormField
            label="Confirmer le mot de passe"
            name="confirmPassword"
            required
            class="text-left font-medium text-xs text-[#2A1512]"
          >
            <UInput
              v-model="state.confirmPassword"
              :type="showConfirm ? 'text' : 'password'"
              icon="i-lucide-lock"
              placeholder="Répétez votre mot de passe"
              size="md"
              class="w-full h-11"
              autocomplete="new-password"
            >
              <template #trailing>
                <button
                  type="button"
                  tabindex="-1"
                  class="text-[#6E5A52] hover:text-[#2A1512] p-1 cursor-pointer"
                  :aria-label="showConfirm ? 'Masquer' : 'Afficher'"
                  @click="showConfirm = !showConfirm"
                >
                  <UIcon :name="showConfirm ? 'i-lucide-eye-off' : 'i-lucide-eye'" class="w-4 h-4" />
                </button>
              </template>
            </UInput>
          </UFormField>

          <!-- Bouton de validation -->
          <div class="pt-2">
            <button
              type="submit"
              :disabled="isLoading"
              class="w-full h-11 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs"
            >
              <UIcon
                v-if="isLoading"
                name="i-lucide-loader-2"
                class="w-4 h-4 animate-spin"
              />
              <span>Mettre à jour mon mot de passe</span>
            </button>
          </div>

          <div class="mt-5 pt-4 border-t border-[#E6D9CB] text-center">
            <NuxtLink
              to="/espace-benevole/login"
              class="text-xs text-[#6E5A52] hover:text-[#7A291E] transition-colors font-medium inline-flex items-center gap-1"
            >
              <UIcon
                name="i-lucide-arrow-left"
                class="w-3.5 h-3.5"
              />
              <span>Annuler et retourner à la connexion</span>
            </NuxtLink>
          </div>
        </UForm>
      </div>

      <!-- Footer discret -->
      <p class="text-center text-xs text-[#6E5A52] mt-4 font-medium">
        Salon de la Danse Angers · Édition 2027
      </p>
    </div>
  </div>
</template>
