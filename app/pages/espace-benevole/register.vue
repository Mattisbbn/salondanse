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
const verifiedEdition = ref<{
  id: string
  name: string
  year: number
  eventStartDate?: string | null
  eventDays?: string[]
} | null>(null)

// Étape 2 : Formulaire d'inscription
const firstName = ref('')
const lastName = ref('')
const email = ref('')
const phone = ref('')
const password = ref('')
const birthDate = ref('')
const isMinor = ref(false)
const parentalAuthorizationUrl = ref<string | null>(null)
const pdfFileName = ref('')
const isUploadingPdf = ref(false)
const pdfInputRef = ref<HTMLInputElement | null>(null)

const photoUrl = ref<string | null>(null)
const photoFileName = ref('')
const photoInputRef = ref<HTMLInputElement | null>(null)

const isRegistering = ref(false)

// Calcul dynamique de l'âge par rapport aux dates du Salon
const userAgeAtEvent = computed<number | null>(() => {
  if (!birthDate.value) return null
  const b = new Date(birthDate.value)
  if (isNaN(b.getTime())) return null

  // Date de référence de l'événement
  let eventDate = new Date(`${verifiedEdition.value?.year || 2027}-05-14T00:00:00Z`)
  if (verifiedEdition.value?.eventStartDate) {
    eventDate = new Date(verifiedEdition.value.eventStartDate)
  } else if (verifiedEdition.value?.eventDays && verifiedEdition.value.eventDays.length > 0) {
    eventDate = new Date(verifiedEdition.value.eventDays[0]!)
  }

  let age = eventDate.getFullYear() - b.getFullYear()
  const m = eventDate.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && eventDate.getDate() < b.getDate())) {
    age--
  }
  return age
})

// Synchronisation automatique de isMinor
watch(userAgeAtEvent, (newAge) => {
  if (newAge !== null) {
    const minor = newAge < 18
    isMinor.value = minor
    if (!minor) {
      parentalAuthorizationUrl.value = null
      pdfFileName.value = ''
      if (pdfInputRef.value) {
        pdfInputRef.value.value = ''
      }
    }
  } else {
    isMinor.value = false
  }
})

// Upload de l'autorisation parentale (PDF uniquement, max 10 Mo)
async function handlePdfChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    toast.add({
      title: 'Format non supporté',
      description: 'Veuillez sélectionner un document au format PDF uniquement.',
      color: 'warning'
    })
    target.value = ''
    return
  }

  const maxSizeBytes = 10 * 1024 * 1024
  if (file.size > maxSizeBytes) {
    toast.add({
      title: 'Fichier trop volumineux',
      description: 'L\'autorisation parentale ne doit pas dépasser 10 Mo.',
      color: 'warning'
    })
    target.value = ''
    return
  }

  isUploadingPdf.value = true
  pdfFileName.value = file.name

  try {
    const formData = new FormData()
    formData.append('file', file)

    const res = await $fetch<{ url: string, message: string }>('/api/upload', {
      method: 'POST',
      body: formData
    })

    parentalAuthorizationUrl.value = res.url
    toast.add({
      title: 'Document téléversé',
      description: 'Votre autorisation parentale a été enregistrée avec succès.',
      color: 'success'
    })
  } catch (err: unknown) {
    parentalAuthorizationUrl.value = null
    pdfFileName.value = ''
    const errorObj = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    toast.add({
      title: 'Échec du téléversement',
      description: errorObj?.data?.statusMessage || errorObj?.statusMessage || errorObj?.message || 'Erreur lors de l\'envoi du PDF.',
      color: 'error'
    })
    if (pdfInputRef.value) {
      pdfInputRef.value.value = ''
    }
  } finally {
    isUploadingPdf.value = false
  }
}

function removePdf() {
  parentalAuthorizationUrl.value = null
  pdfFileName.value = ''
  if (pdfInputRef.value) {
    pdfInputRef.value.value = ''
  }
}

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
      edition: {
        id: string
        name: string
        year: number
        eventStartDate?: string | null
        eventDays?: string[]
      }
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

  if (!birthDate.value) {
    toast.add({
      title: 'Date de naissance obligatoire',
      description: 'Veuillez renseigner votre date de naissance.',
      color: 'warning'
    })
    return
  }

  if (isMinor.value && !parentalAuthorizationUrl.value) {
    toast.add({
      title: 'Autorisation parentale obligatoire',
      description: 'En tant que bénévole mineur(e), vous devez obligatoirement joindre une autorisation parentale au format PDF.',
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
        birthDate: birthDate.value,
        isMinor: isMinor.value,
        parentalAuthorizationUrl: isMinor.value ? parentalAuthorizationUrl.value : null,
        email: email.value.trim().toLowerCase(),
        phone: phone.value.trim(),
        password: password.value,
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
  <div class="min-h-screen bg-[#F6EFE6] text-[#2A1512] flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-xl">
      <!-- En-tête -->
      <div class="text-center mb-6 space-y-1.5">
        <span class="text-[11px] font-bold tracking-[0.16em] uppercase text-[#7A291E] block">
          Salon de la Danse · Angers 2027
        </span>
        <h1 class="font-serif italic font-semibold text-3xl sm:text-4xl text-[#2A1512] leading-tight">
          Rejoindre les équipes
        </h1>
        <p class="text-xs text-[#6E5A52] font-medium">
          Inscription officielle des bénévoles · 14, 15 & 16 mai 2027
        </p>
      </div>

      <!-- Carte d'inscription (Papier #FFFCF8) -->
      <div class="bg-[#FFFCF8] rounded-3xl border border-[#E6D9CB] shadow-xs p-6 sm:p-8 space-y-6">
        <!-- Titre de la carte -->
        <div class="flex items-center justify-between pb-4 border-b border-[#E6D9CB]">
          <div>
            <h2 class="text-base font-bold text-[#2A1512]">
              Inscription Bénévole
            </h2>
            <p class="text-xs text-[#6E5A52]">
              Complétez votre profil pour débloquer le choix des créneaux
            </p>
          </div>
          <span
            v-if="!isCodeValid"
            class="font-semibold text-xs px-2.5 py-1 rounded-full bg-[#F3DCD5] text-[#7A291E]"
          >
            Étape 1 sur 2
          </span>
          <span
            v-else
            class="font-semibold text-xs px-2.5 py-1 rounded-full bg-[#E1E9DC] text-[#2F5238] border border-[#9DB79F]"
          >
            Étape 2 sur 2
          </span>
        </div>

        <!-- ======================================================== -->
        <!-- ÉTAPE 1 : VÉRIFICATION DU CODE D'INVITATION             -->
        <!-- ======================================================== -->
        <div class="space-y-3">
          <label class="block text-xs font-bold uppercase tracking-wider text-[#2A1512]">
            1. Code d'invitation personnel <span class="text-[#7A291E]">*</span>
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
                class="w-full uppercase font-mono tracking-wider h-11"
                size="md"
                :disabled="isCheckingCode"
                @keydown.enter.prevent="verifyCode()"
              />
            </div>
            <button
              type="button"
              :disabled="isCheckingCode || !invitationCode"
              class="h-11 px-5 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs shrink-0"
              @click="verifyCode()"
            >
              <UIcon
                v-if="isCheckingCode"
                name="i-lucide-loader-2"
                class="w-4 h-4 animate-spin"
              />
              <UIcon
                v-else
                name="i-lucide-check-circle"
                class="w-4 h-4"
              />
              <span>Valider</span>
            </button>
          </div>

          <!-- Code déjà validé (Statut DA #E1E9DC / #2F5238) -->
          <div
            v-else
            class="flex items-center justify-between p-3.5 rounded-2xl bg-[#E1E9DC] border border-[#9DB79F]"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 rounded-full bg-[#2F5238] text-white flex items-center justify-center shrink-0">
                <UIcon
                  name="i-lucide-check"
                  class="w-4 h-4"
                />
              </div>
              <div class="min-w-0">
                <span class="block text-xs font-mono font-bold text-[#2F5238] tracking-wider">
                  {{ invitationCode }}
                </span>
                <span class="block text-[11px] text-[#2F5238]/90 truncate">
                  {{ verifiedEdition?.name || 'Salon de la Danse 2027' }} · Invitation vérifiée
                </span>
              </div>
            </div>

            <button
              type="button"
              class="text-xs text-[#2F5238] hover:underline font-semibold cursor-pointer"
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
          class="space-y-4 pt-3 border-t border-[#E6D9CB] transition-opacity duration-300"
          @submit.prevent="handleRegister"
        >
          <!-- Identité -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-[#2A1512] mb-1">
                Prénom <span class="text-[#7A291E]">*</span>
              </label>
              <UInput
                v-model="firstName"
                placeholder="Ex : Camille"
                size="md"
                class="w-full h-11"
                required
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-[#2A1512] mb-1">
                Nom <span class="text-[#7A291E]">*</span>
              </label>
              <UInput
                v-model="lastName"
                placeholder="Ex : Moreau"
                size="md"
                class="w-full h-11"
                required
              />
            </div>
          </div>

          <!-- Coordonnées -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-[#2A1512] mb-1">
                E-mail <span class="text-[#7A291E]">*</span>
              </label>
              <UInput
                v-model="email"
                type="email"
                placeholder="camille.moreau@email.fr"
                icon="i-lucide-mail"
                size="md"
                class="w-full h-11"
                required
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-[#2A1512] mb-1">
                Téléphone <span class="text-[#7A291E]">*</span>
              </label>
              <UInput
                v-model="phone"
                type="tel"
                placeholder="06 12 34 56 78"
                icon="i-lucide-phone"
                size="md"
                class="w-full h-11"
                required
              />
            </div>
          </div>

          <!-- Mot de passe -->
          <div>
            <label class="block text-xs font-semibold text-[#2A1512] mb-1">
              Mot de passe (8 caractères min.) <span class="text-[#7A291E]">*</span>
            </label>
            <UInput
              v-model="password"
              type="password"
              placeholder="••••••••••••"
              icon="i-lucide-lock"
              size="md"
              class="w-full h-11"
              required
            />
          </div>

          <!-- Date de naissance & Détection automatique Mineur/Majeur -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-semibold text-[#2A1512]">
                Date de naissance <span class="text-[#7A291E]">*</span>
              </label>
              <div v-if="userAgeAtEvent !== null">
                <span
                  v-if="isMinor"
                  class="font-semibold text-xs px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 bg-[#F7E4C6] text-[#8A4B0F] border border-[#D9A660]"
                >
                  <UIcon name="i-lucide-shield-alert" class="w-3 h-3" />
                  Mineur(e) au Salon ({{ userAgeAtEvent }} ans)
                </span>
                <span
                  v-else
                  class="font-semibold text-xs px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 bg-[#E1E9DC] text-[#2F5238] border border-[#9DB79F]"
                >
                  <UIcon name="i-lucide-check" class="w-3 h-3" />
                  Majeur(e) au Salon ({{ userAgeAtEvent }} ans)
                </span>
              </div>
            </div>

            <UInput
              v-model="birthDate"
              type="date"
              icon="i-lucide-calendar"
              size="md"
              class="w-full h-11"
              required
            />
            <p class="text-[11px] text-[#6E5A52]">
              L'âge est calculé automatiquement à la date d'ouverture du festival (18 ans révolus requis pour le statut majeur).
            </p>
          </div>

          <!-- Section Spécifique Mineur(e) & Upload Autorisation Parentale (PDF) -->
          <div
            v-if="isMinor"
            class="p-4 bg-[#FAF2EF] border border-[#ECCBC4] rounded-2xl space-y-3"
          >
            <div class="flex items-start gap-2.5">
              <div class="w-8 h-8 rounded-full bg-[#F3DCD5] text-[#7A291E] flex items-center justify-center shrink-0">
                <UIcon
                  name="i-lucide-shield-alert"
                  class="w-4 h-4"
                />
              </div>
              <div>
                <h3 class="text-xs sm:text-sm font-bold text-[#7A291E]">
                  Bénévole mineur(e) — Autorisation parentale obligatoire
                </h3>
                <p class="text-[11px] text-[#6E5A52] mt-0.5 leading-relaxed">
                  Conformément au règlement du Salon de la Danse, tout bénévole âgé de moins de 18 ans au moment de l'événement doit obligatoirement fournir une autorisation parentale signée par un représentant légal (format PDF).
                </p>
              </div>
            </div>

            <div class="pt-1">
              <input
                ref="pdfInputRef"
                type="file"
                accept="application/pdf"
                class="hidden"
                @change="handlePdfChange"
              >

              <!-- Document déjà chargé -->
              <div
                v-if="parentalAuthorizationUrl"
                class="flex items-center justify-between p-3 bg-[#FFFCF8] border border-[#E6D9CB] rounded-2xl shadow-2xs"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-8 h-8 rounded-lg bg-[#E1E9DC] text-[#2F5238] flex items-center justify-center shrink-0">
                    <UIcon
                      name="i-lucide-file-check"
                      class="w-4 h-4"
                    />
                  </div>
                  <div class="min-w-0">
                    <span class="block text-xs font-semibold text-[#2A1512] truncate">
                      {{ pdfFileName || 'Autorisation-parentale.pdf' }}
                    </span>
                    <span class="block text-[10px] text-[#2F5238] font-medium">
                      Document PDF prêt pour vérification
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-1.5 shrink-0">
                  <a
                    :href="parentalAuthorizationUrl"
                    target="_blank"
                    class="p-2 text-xs text-[#7A291E] hover:text-[#5E1F16] font-medium rounded-full hover:bg-[#FAF2EF] transition-colors"
                    title="Aperçu du PDF"
                  >
                    <UIcon
                      name="i-lucide-eye"
                      class="w-4 h-4"
                    />
                  </a>
                  <button
                    type="button"
                    class="p-2 text-xs text-[#9A2A22] hover:text-[#7A291E] rounded-full hover:bg-[#F4D8D3] transition-colors cursor-pointer"
                    title="Supprimer"
                    @click="removePdf"
                  >
                    <UIcon
                      name="i-lucide-trash-2"
                      class="w-4 h-4"
                    />
                  </button>
                </div>
              </div>

              <!-- Bouton d'upload si non encore chargé -->
              <div v-else>
                <button
                  type="button"
                  class="w-full flex flex-col items-center justify-center gap-1.5 p-4 border-2 border-dashed border-[#D8C6B4] hover:border-[#7A291E] bg-[#FFFCF8] hover:bg-[#FAF2EF] rounded-2xl transition-all cursor-pointer text-center"
                  :disabled="isUploadingPdf"
                  @click="pdfInputRef?.click()"
                >
                  <div class="w-8 h-8 rounded-full bg-[#F3DCD5] text-[#7A291E] flex items-center justify-center">
                    <UIcon
                      v-if="isUploadingPdf"
                      name="i-lucide-loader-2"
                      class="w-4 h-4 animate-spin"
                    />
                    <UIcon
                      v-else
                      name="i-lucide-upload-cloud"
                      class="w-4 h-4"
                    />
                  </div>
                  <div>
                    <span class="text-xs font-bold text-[#2A1512] block">
                      {{ isUploadingPdf ? 'Téléversement du PDF en cours...' : 'Téléverser l\'autorisation parentale signée' }}
                    </span>
                    <span class="text-[10px] text-[#6E5A52]">
                      Document PDF uniquement (10 Mo maximum)
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <!-- Upload Photo d'identité (Obligatoire pour Badge) -->
          <div class="space-y-2">
            <label class="block text-xs font-semibold text-[#2A1512]">
              Photo d'identité cadrée (visage dégagé) <span class="text-[#7A291E]">*</span>
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
              class="flex items-center gap-4 p-3 bg-[#FFFCF8] border border-[#E6D9CB] rounded-2xl"
            >
              <img
                :src="photoUrl"
                alt="Aperçu photo d'identité"
                class="w-16 h-16 rounded-full object-cover border-2 border-[#7A291E] shadow-2xs shrink-0"
              >
              <div class="min-w-0 flex-1">
                <span class="block text-xs font-bold text-[#2A1512] truncate">
                  {{ photoFileName || 'Photo enregistrée' }}
                </span>
                <span class="flex items-center gap-1 text-[11px] text-[#2F5238] font-semibold mt-0.5">
                  <UIcon
                    name="i-lucide-check-circle-2"
                    class="w-3.5 h-3.5"
                  />
                  Prête pour le badge d'accréditation
                </span>
              </div>
              <button
                type="button"
                class="text-xs text-[#7A291E] hover:text-[#5E1F16] font-semibold underline cursor-pointer"
                @click="removePhoto"
              >
                Changer
              </button>
            </div>

            <!-- Bouton pour importer la photo -->
            <div
              v-else
              class="border-2 border-dashed border-[#D8C6B4] rounded-2xl p-4 text-center hover:border-[#7A291E] hover:bg-[#FAF2EF] transition-colors cursor-pointer"
              @click="photoInputRef?.click()"
            >
              <div class="w-10 h-10 rounded-full bg-[#F3DCD5] text-[#7A291E] flex items-center justify-center mx-auto mb-2">
                <UIcon
                  name="i-lucide-camera"
                  class="w-5 h-5"
                />
              </div>
              <p class="text-xs font-bold text-[#2A1512]">
                Sélectionner une photo d'identité
              </p>
              <p class="text-[11px] text-[#6E5A52] mt-0.5">
                Format JPG, PNG ou WebP (max. 2 Mo)
              </p>
            </div>
          </div>

          <!-- Bouton de soumission H-11 mobile -->
          <div class="pt-3">
            <button
              type="submit"
              :disabled="isRegistering"
              class="w-full h-11 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs"
            >
              <UIcon
                v-if="isRegistering"
                name="i-lucide-loader-2"
                class="w-4 h-4 animate-spin"
              />
              <UIcon
                v-else
                name="i-lucide-user-plus"
                class="w-4 h-4"
              />
              <span>Finaliser mon inscription</span>
            </button>
          </div>
        </form>

        <!-- Message invitant à saisir le code si non validé -->
        <div
          v-else
          class="p-4 bg-[#FFFCF8] border border-[#E6D9CB] rounded-2xl text-center space-y-1"
        >
          <UIcon
            name="i-lucide-lock"
            class="w-5 h-5 text-[#6E5A52] mx-auto"
          />
          <p class="text-xs font-bold text-[#2A1512]">
            Formulaire d'inscription sécurisé
          </p>
          <p class="text-[11px] text-[#6E5A52]">
            Veuillez valider votre code d'invitation ci-dessus pour déverrouiller le formulaire d'inscription.
          </p>
        </div>

        <!-- Pied de carte : lien connexion -->
        <div class="pt-4 border-t border-[#E6D9CB] text-center">
          <p class="text-xs text-[#6E5A52]">
            Vous avez déjà un compte bénévole ou administrateur ?
            <NuxtLink
              to="/espace-benevole/login"
              class="text-[#7A291E] font-bold hover:underline ml-1"
            >
              Se connecter
            </NuxtLink>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
