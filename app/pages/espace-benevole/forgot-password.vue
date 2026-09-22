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
  <div class="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#F8FAFC]">
    <div class="w-full max-w-md">
      <!-- Carte principale -->
      <div class="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-6 sm:p-8">
        <!-- En-tête -->
        <div class="text-left mb-6">
          <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 text-xs font-semibold mb-3">
            <UIcon
              name="i-lucide-key-round"
              class="w-3.5 h-3.5"
            />
            <span>Sécurité du compte</span>
          </div>
          <h1 class="text-2xl font-bold tracking-tight text-[#0F172A]">
            Mot de passe oublié
          </h1>
          <p class="text-sm text-slate-500 mt-1">
            Indiquez votre adresse e-mail pour recevoir un lien direct de réinitialisation.
          </p>
        </div>

        <!-- État après soumission réussie -->
        <div
          v-if="isSubmitted"
          class="space-y-5"
        >
          <div class="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-left">
            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-mail-check"
                class="w-5 h-5 text-emerald-600 shrink-0 mt-0.5"
              />
              <div class="text-xs text-emerald-800 leading-relaxed">
                <p class="font-semibold mb-1">
                  E-mail envoyé (si le compte existe)
                </p>
                <p>
                  Si l'adresse <strong class="text-emerald-950 font-medium">{{ state.email }}</strong> est enregistrée, vous recevrez un lien valable 1 heure. Pensez à vérifier vos courriers indésirables / spams.
                </p>
              </div>
            </div>
          </div>

          <div class="pt-2 flex flex-col gap-2">
            <UButton
              color="neutral"
              variant="outline"
              block
              size="md"
              class="w-full justify-center font-medium cursor-pointer"
              @click="isSubmitted = false"
            >
              Envoyer à une autre adresse
            </UButton>
            <NuxtLink
              to="/espace-benevole/login"
              class="w-full inline-flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium py-2 transition-colors"
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
            class="text-left"
          >
            <UInput
              v-model="state.email"
              type="email"
              icon="i-lucide-mail"
              placeholder="votre-email@exemple.fr"
              size="md"
              class="w-full"
              autocomplete="email"
              autofocus
            />
          </UFormField>

          <div class="pt-2">
            <UButton
              type="submit"
              color="primary"
              block
              size="lg"
              :loading="isLoading"
              class="w-full justify-center font-medium shadow-xs cursor-pointer"
            >
              Recevoir le lien de réinitialisation
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
              <span>Retour à la connexion</span>
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
