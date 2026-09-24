<script setup lang="ts">
import { z } from 'zod'

definePageMeta({
  layout: false
})

useHead({
  title: 'Mot de passe oublié · Espace Bénévoles'
})

const toast = useToast()

const state = reactive({
  email: ''
})

const isLoading = ref(false)
const isSubmitted = ref(false)

const schema = z.object({
  email: z.string().min(1, 'Veuillez saisir votre e-mail').email('Format d\'e-mail invalide')
})

const onSubmit = async () => {
  if (isLoading.value) return
  isLoading.value = true

  try {
    const res = await $fetch<{ success: boolean, message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: {
        email: state.email
      }
    })

    isSubmitted.value = true
    toast.add({
      title: 'Demande prise en compte',
      description: res.message || 'Si cette adresse existe, un lien vous a été envoyé.',
      color: 'success'
    })
  } catch (err: unknown) {
    const errorObj = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    const message = errorObj?.data?.statusMessage || errorObj?.statusMessage || errorObj?.message || 'Une erreur est survenue lors de l\'envoi de la demande.'
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
            Sécurité du compte
          </span>
          <h1 class="font-bold tracking-tight text-3xl text-[#2A1512] leading-tight">
            Mot de passe oublié
          </h1>
          <p class="text-xs text-[#6E5A52]">
            Indiquez votre adresse e-mail pour recevoir un lien de réinitialisation.
          </p>
        </div>

        <!-- État après soumission réussie (Statut Validé DA #E1E9DC / #2F5238) -->
        <div
          v-if="isSubmitted"
          class="space-y-5"
        >
          <div class="rounded-2xl border border-[#9DB79F] bg-[#E1E9DC] p-4 text-left">
            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-mail-check"
                class="w-5 h-5 text-[#2F5238] shrink-0 mt-0.5"
              />
              <div class="text-xs text-[#2F5238] leading-relaxed">
                <p class="font-bold mb-1">
                  E-mail envoyé (si le compte existe)
                </p>
                <p>
                  Si l'adresse <strong class="font-bold">{{ state.email }}</strong> est enregistrée, vous recevrez un lien valable 1 heure. Pensez à vérifier vos courriers indésirables / spams.
                </p>
              </div>
            </div>
          </div>

          <div class="pt-2 flex flex-col gap-2.5">
            <button
              type="button"
              class="w-full h-11 rounded-full border border-[#D8C6B4] bg-[#FFFCF8] hover:bg-[#F6EFE6] text-[#2A1512] font-semibold text-xs flex items-center justify-center cursor-pointer transition-colors"
              @click="isSubmitted = false"
            >
              Envoyer à une autre adresse
            </button>
            <NuxtLink
              to="/espace-benevole/login"
              class="w-full inline-flex items-center justify-center gap-1.5 text-xs text-[#7A291E] hover:text-[#5E1F16] font-semibold py-2 transition-colors"
            >
              <UIcon
                name="i-lucide-arrow-left"
                class="w-3.5 h-3.5"
              />
              <span>Retour à la page de connexion</span>
            </NuxtLink>
          </div>
        </div>

        <!-- Formulaire de demande -->
        <UForm
          v-else
          :schema="schema"
          :state="state"
          class="space-y-4"
          @submit="onSubmit"
        >
          <UFormField
            label="Adresse e-mail"
            name="email"
            required
            class="text-left font-medium text-xs text-[#2A1512]"
          >
            <UInput
              v-model="state.email"
              type="email"
              icon="i-lucide-mail"
              placeholder="votre-email@exemple.fr"
              size="md"
              class="w-full h-11"
              autocomplete="email"
              autofocus
            />
          </UFormField>

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
              <span>Recevoir le lien de réinitialisation</span>
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
              <span>Retour à la connexion</span>
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
