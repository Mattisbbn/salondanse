<script setup lang="ts">
import { z } from 'zod'

definePageMeta({
  layout: false
})

useHead({
  title: 'Connexion · Espace Bénévoles'
})

const route = useRoute()
const { login } = useAuth()
const toast = useToast()

const state = reactive({
  email: '',
  password: ''
})

const showPassword = ref(false)
const isLoading = ref(false)

const warningMessage = computed(() => {
  if (route.query.warning === 'auth_required') {
    return 'Connexion requise : veuillez vous identifier pour accéder à cet espace.'
  }
  return null
})

const schema = z.object({
  email: z.string().min(1, 'Veuillez saisir votre e-mail').email('Format d\'e-mail invalide'),
  password: z.string().min(1, 'Le mot de passe est obligatoire')
})

const onSubmit = async () => {
  if (isLoading.value) return
  isLoading.value = true

  try {
    const user = await login({
      email: state.email,
      password: state.password
    })

    toast.add({
      title: 'Connexion réussie',
      description: `Bienvenue, ${user.firstName} ${user.lastName}`,
      color: 'success'
    })

    if (user.role === 'ADMIN') {
      await navigateTo('/admin')
    } else {
      await navigateTo('/espace-benevole/planning')
    }
  } catch (err: unknown) {
    const errorObj = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    const message = errorObj?.data?.statusMessage || errorObj?.statusMessage || errorObj?.message || 'Identifiants incorrects. Veuillez vérifier votre adresse e-mail et votre mot de passe.'
    toast.add({
      title: 'Erreur de connexion',
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
      <!-- Carte principale de connexion -->
      <div class="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-6 sm:p-8">
        <!-- En-tête sobre aligné à gauche -->
        <div class="text-left mb-6">
          <h1 class="text-2xl font-bold tracking-tight text-[#0F172A]">
            Espace Bénévoles
          </h1>
          <p class="text-sm text-slate-500 mt-1">
            Salon de la Danse • Connexion
          </p>
        </div>

        <!-- Alerte de redirection auth_required -->
        <div
          v-if="warningMessage"
          class="mb-5 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 flex items-start gap-2.5"
        >
          <UIcon
            name="i-lucide-alert-triangle"
            class="w-4 h-4 text-amber-600 shrink-0 mt-0.5"
          />
          <span class="leading-relaxed font-medium">{{ warningMessage }}</span>
        </div>

        <!-- Formulaire de connexion -->
        <UForm
          :schema="schema"
          :state="state"
          class="space-y-4"
          @submit="onSubmit"
        >
          <!-- Champ Adresse e-mail -->
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
              placeholder="user@mail.fr"
              size="md"
              class="w-full"
              autocomplete="email"
              autofocus
            />
          </UFormField>

          <!-- Champ Mot de passe avec toggle masquer/afficher -->
          <UFormField
            label="Mot de passe"
            name="password"
            required
            class="text-left"
          >
            <UInput
              v-model="state.password"
              :type="showPassword ? 'text' : 'password'"
              icon="i-lucide-lock"
              placeholder="••••••••"
              size="md"
              class="w-full"
              autocomplete="current-password"
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
                  :aria-label="showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
                  @click="showPassword = !showPassword"
                />
              </template>
            </UInput>
          </UFormField>

          <div class="flex justify-end pt-1">
            <NuxtLink
              to="/espace-benevole/forgot-password"
              class="text-xs text-violet-600 hover:text-violet-700 hover:underline font-medium"
            >
              Mot de passe oublié ?
            </NuxtLink>
          </div>

          <!-- Bouton pleine largeur violet (#7C3AED) -->
          <div class="pt-2">
            <UButton
              type="submit"
              color="primary"
              block
              size="lg"
              :loading="isLoading"
              class="w-full justify-center font-medium shadow-xs cursor-pointer"
            >
              Se connecter
            </UButton>
          </div>
        </UForm>

        <!-- Lien discret inscription -->
        <div class="mt-6 pt-5 border-t border-[#E2E8F0] text-center">
          <NuxtLink
            to="/espace-benevole/register"
            class="text-xs text-slate-500 hover:text-violet-600 transition-colors font-medium inline-flex items-center gap-1"
          >
            <span>Pas encore de compte ?</span>
            <span class="text-violet-600 font-semibold underline underline-offset-2">S'inscrire</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Note discrète pour le Salon de la Danse 2027 -->
      <p class="text-center text-xs text-slate-400 mt-4">
        Salon de la Danse Angers • Édition 2027
      </p>
    </div>
  </div>
</template>
