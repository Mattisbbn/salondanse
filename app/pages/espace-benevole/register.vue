<script setup lang="ts">
definePageMeta({
  layout: false
})

useHead({
  title: 'Inscription Bénévole · Salon de la Danse 2027'
})

const route = useRoute()
const toast = useToast()
const { fetchUser } = useAuth()

// Étape 1 : Code d'invitation
const invitationCode = ref('')
const isCheckingCode = ref(false)
const isCodeValid = ref(false)
const verifiedEdition = ref<{ id: string, name: string, year: number } | null>(null)

// Étape 2 : Formulaire d'inscription
const firstName = ref('')
const lastName = ref('')
const email = ref('')
const phone = ref('')
const password = ref('')
const isMinor = ref(false)
const photoUrl = ref<string | null>(null)
const photoFileName = ref('')
const photoInputRef = ref<HTMLInputElement | null>(null)

const isRegistering = ref(false)

// Vérification du code d'invitation
async function verifyCode(silentOnEmpty = false) {
  const codeToTest = invitationCode.value.trim().toUpperCase()
  if (!codeToTest) {
    if (!silentOnEmpty) {
      toast.add({
        title: 'Code requis',
        description: 'Veuillez saisir votre code d\'invitation reçu par e-mail.',
        color: 'warning'
      })
    }
    return
  }

  isCheckingCode.value = true

  try {
    const res = await $fetch<{
      valid: boolean
      code: string
      edition: { id: string, name: string, year: number }
    }>('/api/auth/verify-code', {
      method: 'POST',
      body: { code: codeToTest }
    })

    if (res.valid) {
      isCodeValid.value = true
      invitationCode.value = res.code
      verifiedEdition.value = res.edition
      toast.add({
        title: 'Code d\'invitation validé !',
        description: `Bienvenue sur l'inscription pour ${res.edition.name}.`,
        color: 'success'
      })
    }
  } catch (err: unknown) {
    isCodeValid.value = false
    const errorObj = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    const message = errorObj?.data?.statusMessage || errorObj?.statusMessage || errorObj?.message || 'Code d\'invitation invalide ou expiré.'
    toast.add({
      title: 'Code invalide',
      description: message,
      color: 'error'
    })
  } finally {
    isCheckingCode.value = false
  }
}

// Réinitialiser le code
function resetCode() {
  isCodeValid.value = false
  verifiedEdition.value = null
  invitationCode.value = ''
}

// Gestion de l'upload de photo avec limite stricte à 2 Mo
function handlePhotoChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // Vérification de la taille max (2 Mo = 2 * 1024 * 1024 octets)
  const maxSizeBytes = 2 * 1024 * 1024
  if (file.size > maxSizeBytes) {
    toast.add({
      title: 'Fichier trop volumineux',
      description: 'La photo d\'identité ne doit pas dépasser 2 Mo. Veuillez compresser ou choisir une autre image.',
      color: 'warning'
    })
    target.value = ''
    return
  }

  // Vérification du type d'image
  if (!file.type.startsWith('image/')) {
    toast.add({
      title: 'Format non supporté',
      description: 'Veuillez sélectionner un fichier image (JPG, PNG, WebP).',
      color: 'warning'
    })
    target.value = ''
    return
  }

  photoFileName.value = file.name

  const reader = new FileReader()
  reader.onload = (e) => {
    const result = e.target?.result
    if (typeof result === 'string') {
      photoUrl.value = result
    }
  }
  reader.readAsDataURL(file)
}

function removePhoto() {
  photoUrl.value = null
  photoFileName.value = ''
  if (photoInputRef.value) {
    photoInputRef.value.value = ''
  }
}

// Soumission du formulaire complet
async function handleRegister() {
  if (!isCodeValid.value) {
    toast.add({
      title: 'Code requis',
      description: 'Veuillez valider votre code d\'invitation avant de poursuivre.',
      color: 'warning'
    })
    return
  }

  if (!firstName.value.trim() || !lastName.value.trim()) {
    toast.add({
      title: 'Identité incomplète',
      description: 'Veuillez renseigner votre prénom et votre nom.',
      color: 'warning'
    })
    return
  }

  if (!email.value.trim() || !email.value.includes('@')) {
    toast.add({
      title: 'E-mail requis',
      description: 'Veuillez renseigner une adresse e-mail valide.',
      color: 'warning'
    })
    return
  }

  if (!phone.value.trim() || phone.value.trim().length < 8) {
    toast.add({
      title: 'Téléphone requis',
      description: 'Veuillez renseigner un numéro de téléphone de contact valide.',
      color: 'warning'
    })
    return
  }

  if (!password.value || password.value.length < 8) {
    toast.add({
      title: 'Mot de passe trop court',
      description: 'Le mot de passe doit comporter au moins 8 caractères.',
      color: 'warning'
    })
    return
  }

  if (!photoUrl.value) {
    toast.add({
      title: 'Photo d\'identité obligatoire',
      description: 'Votre photo d\'identité est requise pour générer votre badge d\'accréditation bénévole.',
      color: 'warning'
    })
    return
  }

  isRegistering.value = true

  try {
    const res = await $fetch<{ message: string }>('/api/auth/register', {
      method: 'POST',
      body: {
        code: invitationCode.value.trim().toUpperCase(),
        firstName: firstName.value.trim(),
        lastName: lastName.value.trim(),
        email: email.value.trim().toLowerCase(),
        phone: phone.value.trim(),
        password: password.value,
        isMinor: isMinor.value,
        photoUrl: photoUrl.value
      }
    })

    toast.add({
      title: 'Compte créé avec succès !',
      description: res.message || 'Bienvenue dans l\'équipe. Choisissez dès maintenant vos créneaux.',
      color: 'success'
    })

    // Actualiser le contexte d'authentification et rediriger vers le planning
    await fetchUser()
    await navigateTo('/espace-benevole/planning')
  } catch (err: unknown) {
    const errorObj = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    const message = errorObj?.data?.statusMessage || errorObj?.statusMessage || errorObj?.message || 'Erreur lors de l\'inscription.'
    toast.add({
      title: 'Inscription impossible',
      description: message,
      color: 'error'
    })
  } finally {
    isRegistering.value = false
  }
}

// Pré-remplissage et auto-vérification si ?code=... est dans l'URL
onMounted(() => {
  const codeParam = route.query.code
  if (codeParam && typeof codeParam === 'string' && codeParam.trim()) {
    invitationCode.value = codeParam.trim().toUpperCase()
    verifyCode(true)
  }
})
</script>

<template>
  <div class="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-lg">
      <!-- En-tête -->
      <div class="text-center mb-6">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-600 text-white shadow-md shadow-violet-200 mb-3">
          <UIcon
            name="i-lucide-sparkles"
            class="w-7 h-7"
          />
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
          Salon de la Danse 2027
        </h1>
        <p class="text-sm text-slate-500 mt-1 font-medium">
          Rejoignez l'équipe des bénévoles • Angers, 14-16 mai 2027
        </p>
      </div>

      <!-- Carte d'inscription -->
      <div class="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8 space-y-6">
        <!-- Titre de la carte -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 class="text-lg font-bold text-[#0F172A]">
              Inscription Bénévole
            </h2>
            <p class="text-xs text-slate-500">
              Complétez votre profil pour accéder au choix des créneaux
            </p>
          </div>
          <UBadge
            v-if="!isCodeValid"
            color="primary"
            variant="subtle"
            size="sm"
            class="font-semibold"
          >
            Étape 1 sur 2
          </UBadge>
        </div>

        <!-- ======================================================== -->
        <!-- ÉTAPE 1 : VÉRIFICATION DU CODE D'INVITATION             -->
        <!-- ======================================================== -->
        <div class="space-y-3">
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">
            1. Code d'invitation personnel <span class="text-red-500">*</span>
          </label>

          <div
            v-if="!isCodeValid"
            class="flex gap-2"
          >
            <div class="relative flex-1">
              <UInput
                v-model="invitationCode"
                placeholder="Ex : DANSE-A1B2C3D4"
                icon="i-lucide-key-round"
                class="w-full uppercase font-mono tracking-wider"
                size="md"
                :disabled="isCheckingCode"
                @keydown.enter.prevent="verifyCode()"
              />
            </div>
            <UButton
              color="primary"
              variant="solid"
              size="md"
              :loading="isCheckingCode"
              icon="i-lucide-check-circle"
              label="Valider"
              class="font-semibold shrink-0 cursor-pointer"
              @click="verifyCode()"
            />
          </div>

          <!-- Code déjà validé -->
          <div
            v-else
            class="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <UIcon
                  name="i-lucide-check-check"
                  class="w-4 h-4"
                />
              </div>
              <div class="min-w-0">
                <span class="block text-xs font-mono font-bold text-emerald-900 tracking-wider">
                  {{ invitationCode }}
                </span>
                <span class="block text-[11px] text-emerald-700 truncate">
                  {{ verifiedEdition?.name || 'Salon de la Danse 2027' }} • Invitation vérifiée
                </span>
              </div>
            </div>

            <button
              type="button"
              class="text-xs text-slate-400 hover:text-slate-600 underline font-medium cursor-pointer"
              @click="resetCode"
            >
              Changer
            </button>
          </div>
        </div>

        <!-- ======================================================== -->
        <!-- ÉTAPE 2 : FORMULAIRE D'INSCRIPTION DÉVERROUILLÉ         -->
        <!-- ======================================================== -->
        <form
          v-if="isCodeValid"
          class="space-y-4 pt-2 border-t border-slate-100 transition-opacity duration-300"
          @submit.prevent="handleRegister"
        >
          <!-- Identité -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">
                Prénom <span class="text-red-500">*</span>
              </label>
              <UInput
                v-model="firstName"
                placeholder="Ex : Camille"
                size="md"
                class="w-full"
                required
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">
                Nom <span class="text-red-500">*</span>
              </label>
              <UInput
                v-model="lastName"
                placeholder="Ex : Moreau"
                size="md"
                class="w-full"
                required
              />
            </div>
          </div>

          <!-- Coordonnées -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">
                E-mail <span class="text-red-500">*</span>
              </label>
              <UInput
                v-model="email"
                type="email"
                placeholder="camille.moreau@email.fr"
                icon="i-lucide-mail"
                size="md"
                class="w-full"
                required
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">
                Téléphone <span class="text-red-500">*</span>
              </label>
              <UInput
                v-model="phone"
                type="tel"
                placeholder="06 12 34 56 78"
                icon="i-lucide-phone"
                size="md"
                class="w-full"
                required
              />
            </div>
          </div>

          <!-- Mot de passe -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              Mot de passe (8 caractères min.) <span class="text-red-500">*</span>
            </label>
            <UInput
              v-model="password"
              type="password"
              placeholder="••••••••••••"
              icon="i-lucide-lock"
              size="md"
              class="w-full"
              required
            />
          </div>

          <!-- Case Mineur -->
          <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div class="flex items-center gap-2">
              <input
                id="isMinor"
                v-model="isMinor"
                type="checkbox"
                class="w-4 h-4 rounded text-violet-600 border-slate-300 focus:ring-violet-500 cursor-pointer"
              >
              <label
                for="isMinor"
                class="text-xs font-semibold text-slate-900 cursor-pointer select-none"
              >
                Je suis mineur(e) (moins de 18 ans au 14 mai 2027)
              </label>
            </div>
            <p
              v-if="isMinor"
              class="text-[11px] text-amber-700 font-medium pl-6"
            >
              ⚠️ Une autorisation parentale signée par votre représentant légal vous sera demandée par l'organisation avant le festival.
            </p>
          </div>

          <!-- Upload Photo d'identité (Obligatoire pour Badge) -->
          <div class="space-y-2">
            <label class="block text-xs font-semibold text-slate-700">
              Photo d'identité cadrée (visage dégagé) <span class="text-red-500">*</span>
            </label>

            <input
              ref="photoInputRef"
              type="file"
              accept="image/png, image/jpeg, image/webp"
              class="hidden"
              @change="handlePhotoChange"
            >

            <!-- Aperçu de la photo si chargée -->
            <div
              v-if="photoUrl"
              class="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl"
            >
              <img
                :src="photoUrl"
                alt="Aperçu photo d'identité"
                class="w-16 h-16 rounded-xl object-cover border-2 border-violet-500 shadow-xs shrink-0"
              >
              <div class="min-w-0 flex-1">
                <span class="block text-xs font-bold text-slate-900 truncate">
                  {{ photoFileName || 'Photo enregistrée' }}
                </span>
                <span class="flex items-center gap-1 text-[11px] text-emerald-600 font-medium mt-0.5">
                  <UIcon
                    name="i-lucide-check-circle-2"
                    class="w-3.5 h-3.5"
                  />
                  Prête pour le badge d'accréditation
                </span>
              </div>
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-lucide-trash-2"
                label="Changer"
                class="text-slate-400 hover:text-red-600 cursor-pointer"
                @click="removePhoto"
              />
            </div>

            <!-- Bouton pour importer la photo -->
            <div
              v-else
              class="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-violet-400 hover:bg-violet-50/40 transition-colors cursor-pointer"
              @click="photoInputRef?.click()"
            >
              <div class="w-10 h-10 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center mx-auto mb-2">
                <UIcon
                  name="i-lucide-camera"
                  class="w-5 h-5"
                />
              </div>
              <p class="text-xs font-bold text-slate-800">
                Sélectionner une photo d'identité
              </p>
              <p class="text-[11px] text-slate-400 mt-0.5">
                Format JPG, PNG ou WebP (max. 2 Mo)
              </p>
            </div>
          </div>

          <!-- Bouton de soumission -->
          <div class="pt-3">
            <UButton
              type="submit"
              color="primary"
              variant="solid"
              size="lg"
              block
              :loading="isRegistering"
              icon="i-lucide-user-plus"
              label="Finaliser mon inscription"
              class="font-bold shadow-sm shadow-violet-200 cursor-pointer"
            />
          </div>
        </form>

        <!-- Message invitant à saisir le code si non validé -->
        <div
          v-else
          class="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1"
        >
          <UIcon
            name="i-lucide-lock"
            class="w-5 h-5 text-slate-400 mx-auto"
          />
          <p class="text-xs font-semibold text-slate-700">
            Formulaire d'inscription sécurisé
          </p>
          <p class="text-[11px] text-slate-500">
            Veuillez valider votre code d'invitation ci-dessus pour déverrouiller le formulaire d'inscription.
          </p>
        </div>

        <!-- Pied de carte : lien connexion -->
        <div class="pt-4 border-t border-slate-100 text-center">
          <p class="text-xs text-slate-500">
            Vous avez déjà un compte bénévole ou administrateur ?
            <NuxtLink
              to="/espace-benevole/login"
              class="text-violet-600 font-bold hover:underline ml-1"
            >
              Se connecter
            </NuxtLink>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
