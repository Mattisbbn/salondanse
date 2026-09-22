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
  <div class="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#F8FAFC]">
    <div class="w-full max-w-md">
      <!-- Carte principale -->
      <div class="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-6 sm:p-8">
        <!-- En-tête -->
        <div class="text-left mb-6">
          <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 text-xs font-semibold mb-3">
            <UIcon
              name="i-lucide-shield-check"
              class="w-3.5 h-3.5"
            />
            <span>Réinitialisation sécurisée</span>
          </div>
          <h1 class="text-2xl font-bold tracking-tight text-[#0F172A]">
            Définir un nouveau mot de passe
          </h1>
          <p class="text-sm text-slate-500 mt-1">
            Choisissez un mot de passe robuste d'au moins 8 caractères.
          </p>
        </div>

        <!-- Alerte si le token est manquant dans l'URL -->
        <div
          v-if="!token"
          class="space-y-4"
        >
          <div class="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-left">
            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-alert-triangle"
                class="w-5 h-5 text-amber-600 shrink-0 mt-0.5"
              />
              <div class="text-xs text-amber-900 leading-relaxed">
                <p class="font-semibold mb-1">
                  Lien de réinitialisation manquant ou invalide
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
              class="w-full inline-flex items-center justify-center gap-2 text-sm bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-xs transition-colors"
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
            class="text-left"
          >
            <UInput
              v-model="state.newPassword"
              :type="showPassword ? 'text' : 'password'"
              icon="i-lucide-lock"
              placeholder="Minimum 8 caractères"
              size="md"
              class="w-full"
              autocomplete="new-password"
              autofocus
            >
              <template #trailing>
                <UButton
                  :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  :padded="false"
                  type="button"
                  tabindex="-1"
                  class="text-slate-400 hover:text-slate-700 p-1"
                  :aria-label="showPassword ? 'Masquer' : 'Afficher'"
                  @click="showPassword = !showPassword"
                />
              </template>
            </UInput>
          </UFormField>

          <!-- Champ Confirmation mot de passe -->
          <UFormField
            label="Confirmer le mot de passe"
            name="confirmPassword"
            required
            class="text-left"
          >
            <UInput
              v-model="state.confirmPassword"
              :type="showConfirm ? 'text' : 'password'"
              icon="i-lucide-lock"
              placeholder="Répétez votre mot de passe"
              size="md"
              class="w-full"
              autocomplete="new-password"
            >
              <template #trailing>
                <UButton
                  :icon="showConfirm ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  :padded="false"
                  type="button"
                  tabindex="-1"
                  class="text-slate-400 hover:text-slate-700 p-1"
                  :aria-label="showConfirm ? 'Masquer' : 'Afficher'"
                  @click="showConfirm = !showConfirm"
                />
              </template>
            </UInput>
          </UFormField>

          <!-- Bouton de validation -->
          <div class="pt-2">
            <UButton
              type="submit"
              color="primary"
              block
              size="lg"
              :loading="isLoading"
              class="w-full justify-center font-medium shadow-xs cursor-pointer"
            >
              Mettre à jour mon mot de passe
            </UButton>
          </div>

          <div class="mt-5 pt-4 border-t border-[#E2E8F0] text-center">
            <NuxtLink
              to="/espace-benevole/login"
              class="text-xs text-slate-500 hover:text-slate-800 transition-colors font-medium inline-flex items-center gap-1"
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
      <p class="text-center text-xs text-slate-400 mt-4">
        Salon de la Danse Angers • Édition 2027
      </p>
    </div>
  </div>
</template>
