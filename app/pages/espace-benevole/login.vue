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

interface FormRef {
  clear: (name?: string) => void
}

const form = ref<FormRef | null>(null)
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

// ========================================================
// COMPTES DE DÉMONSTRATION
// ========================================================
interface DemoAccount {
  label: string
  roleLabel: string
  badgeColor: 'primary' | 'neutral' | 'warning'
  email: string
  password: string
  description: string
}

const demoAccounts: DemoAccount[] = [
  {
    label: 'Administrateur',
    roleLabel: 'Admin',
    badgeColor: 'primary',
    email: 'admin@salondeladanse.fr',
    password: 'Password123!',
    description: 'Accès complet au Back-Office (inscriptions, mineurs, plannings, multi-éditions)'
  },
  {
    label: 'Bénévole majeur',
    roleLabel: 'Majeur (Vierge)',
    badgeColor: 'neutral',
    email: 'benevole@salondeladanse.fr',
    password: 'Password123!',
    description: 'Planning vierge pour tester la sélection et la validation'
  },
  {
    label: 'Bénévole mineur (En attente)',
    roleLabel: 'En attente',
    badgeColor: 'warning',
    email: 'mineur.attente@salondeladanse.fr',
    password: 'Password123!',
    description: 'Mineur avec autorisation PDF liée, en attente de validation admin'
  }
]

async function applyDemoAccount(account: DemoAccount) {
  state.email = account.email
  state.password = account.password
  form.value?.clear()
  await nextTick()
  form.value?.clear()
  toast.add({
    title: 'Compte chargé',
    description: `${account.label} sélectionné (${account.email})`,
    color: 'success'
  })
}

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
  <div class="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-[#F6EFE6] text-[#2A1512]">
    <div class="w-full max-w-md lg:max-w-4xl">
      <!-- Conteneur principal Responsive (Carte Papier #FFFCF8) -->
      <div class="bg-[#FFFCF8] rounded-3xl border border-[#E6D9CB] shadow-xs overflow-hidden">
        <div class="lg:grid lg:grid-cols-12">
          
          <!-- Volet d'accueil & Démo (Colonne gauche sur PC, au-dessus sur mobile) -->
          <div class="lg:col-span-5 bg-[#FAF2EF]/70 border-b lg:border-b-0 lg:border-r border-[#ECCBC4]/70 p-6 sm:p-8 flex flex-col justify-between gap-6">
            <!-- En-tête officiel DA -->
            <div class="space-y-3">
              <span class="text-[11px] font-bold tracking-[0.16em] uppercase text-[#7A291E] inline-flex items-center gap-1.5">
                
                Espace Bénévoles
              </span>
              <div>
                <h1 class="font-bold tracking-tight text-3xl text-[#2A1512] leading-tight">
                  Connexion
                </h1>
                <p class="text-xs text-[#6E5A52] mt-1 font-medium">
                  Salon de la Danse · Édition 2027
                </p>
              </div>
             
            </div>

            <!-- Profils de Démonstration -->
            <div class="p-4 rounded-2xl bg-[#FFFCF8] border border-[#ECCBC4] space-y-3 shadow-2xs">
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-lucide-key-round"
                  class="w-4 h-4 text-[#7A291E] shrink-0"
                />
                <span class="text-xs font-bold text-[#7A291E] uppercase tracking-wider">
                  Profils de Démonstration
                </span>
              </div>

              <p class="text-[11px] text-[#6E5A52] leading-snug">
                Cliquez pour pré-remplir instantanément :
              </p>

              <!-- Boutons d'accès rapide -->
              <div class="flex flex-wrap lg:flex-col gap-2 pt-0.5">
                <button
                  v-for="acc in demoAccounts"
                  :key="acc.email"
                  type="button"
                  class="px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between gap-2 border cursor-pointer text-left w-full sm:w-auto lg:w-full"
                  :class="[
                    state.email === acc.email
                      ? 'bg-[#7A291E] text-white border-[#7A291E] shadow-2xs'
                      : 'bg-[#FFFCF8] text-[#2A1512] border-[#D8C6B4] hover:bg-[#F6EFE6]'
                  ]"
                  :title="acc.description"
                  @mousedown.prevent
                  @click="applyDemoAccount(acc)"
                >
                  <div class="flex items-center gap-2 truncate">
                    <UIcon
                      :name="acc.roleLabel === 'Admin' ? 'i-lucide-shield-check' : acc.roleLabel.includes('attente') ? 'i-lucide-clock' : 'i-lucide-user'"
                      class="w-3.5 h-3.5 shrink-0"
                    />
                    <span class="truncate">{{ acc.label }}</span>
                  </div>
                  <UIcon
                    v-if="state.email === acc.email"
                    name="i-lucide-check"
                    class="w-3.5 h-3.5 shrink-0"
                  />
                </button>
              </div>
            </div>

            <!-- Note information / dates en bas sur PC -->
            <div class="hidden lg:flex items-center gap-2 text-[11px] text-[#6E5A52] font-medium pt-2 border-t border-[#ECCBC4]/60">
              <UIcon name="i-lucide-calendar" class="w-3.5 h-3.5 text-[#7A291E]" />
              <span>14, 15 & 16 mai 2027</span>
            </div>
          </div>

          <!-- Volet Formulaire de Connexion (Colonne droite sur PC) -->
          <div class="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
            <div>
              <!-- Alerte de redirection auth_required -->
              <div
                v-if="warningMessage"
                class="mb-6 rounded-2xl border border-[#D9A660] bg-[#F7E4C6] p-3.5 text-xs text-[#8A4B0F] flex items-start gap-2.5 font-medium"
              >
                <UIcon
                  name="i-lucide-alert-triangle"
                  class="w-4 h-4 text-[#8A4B0F] shrink-0 mt-0.5"
                />
                <span class="leading-relaxed">{{ warningMessage }}</span>
              </div>

              <div class="mb-6 pb-2 hidden lg:block">
                <h2 class="text-lg font-bold text-[#2A1512]">
                  Identifiez-vous
                </h2>
                <p class="text-xs text-[#6E5A52]">
                  Saisissez vos identifiants pour accéder à votre espace
                </p>
              </div>

              <!-- Formulaire de connexion -->
              <UForm
                ref="form"
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
                  class="text-left font-medium text-xs text-[#2A1512]"
                >
                  <UInput
                    v-model="state.email"
                    type="email"
                    icon="i-lucide-mail"
                    placeholder="user@mail.fr"
                    size="md"
                    class="w-full h-11"
                    autocomplete="email"
                  />
                </UFormField>

                <!-- Champ Mot de passe avec toggle masquer/afficher -->
                <UFormField
                  label="Mot de passe"
                  name="password"
                  required
                  class="text-left font-medium text-xs text-[#2A1512]"
                >
                  <UInput
                    v-model="state.password"
                    :type="showPassword ? 'text' : 'password'"
                    icon="i-lucide-lock"
                    placeholder="••••••••"
                    size="md"
                    class="w-full h-11"
                    autocomplete="current-password"
                  >
                    <template #trailing>
                      <button
                        type="button"
                        tabindex="-1"
                        class="text-[#6E5A52] hover:text-[#2A1512] p-1 cursor-pointer"
                        :aria-label="showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
                        @click="showPassword = !showPassword"
                      >
                        <UIcon :name="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'" class="w-4 h-4" />
                      </button>
                    </template>
                  </UInput>
                </UFormField>

                <div class="flex justify-end pt-1">
                  <NuxtLink
                    to="/espace-benevole/forgot-password"
                    class="text-xs text-[#7A291E] hover:text-[#5E1F16] hover:underline font-semibold"
                  >
                    Mot de passe oublié ?
                  </NuxtLink>
                </div>

                <!-- Bouton H-11 ergonomique mobile, Brique (#7A291E) -->
                <div class="pt-3">
                  <button
                    type="submit"
                    :disabled="isLoading"
                    class="w-full h-11 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs"
                  >
                    <UIcon
                      v-if="isLoading"
                      name="i-lucide-loader-2"
                      class="w-4 h-4 animate-spin"
                    />
                    <span>Se connecter</span>
                  </button>
                </div>
              </UForm>
            </div>

            <!-- Lien inscription -->
            <div class="mt-8 pt-5 border-t border-[#E6D9CB] text-center">
              <NuxtLink
                to="/espace-benevole/register"
                class="text-xs text-[#6E5A52] hover:text-[#7A291E] transition-colors font-medium inline-flex items-center gap-1.5"
              >
                <span>Pas encore de compte ?</span>
                <span class="text-[#7A291E] font-bold underline underline-offset-2">S'inscrire</span>
              </NuxtLink>
            </div>
          </div>

        </div>
      </div>

      <!-- Note discrète pour le Salon de la Danse 2027 -->
      <p class="text-center text-xs text-[#6E5A52] mt-4 font-medium">
        Salon de la Danse Angers · Édition 2027
      </p>
    </div>
  </div>
</template>
