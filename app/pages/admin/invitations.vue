<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { z } from 'zod'

useHead({
  title: 'Invitations Bénévoles · Admin'
})

interface InvitationItem {
  id: string
  code: string
  email: string | null
  isUsed: boolean
  createdAt: string
  usedBy: {
    id: string
    email: string
    name: string
  } | null
  registrationUrl: string
}

interface InvitationsResponse {
  invitations: InvitationItem[]
}

const toast = useToast()

// Chargement des invitations existantes
const { data, status, refresh } = await useFetch<InvitationsResponse>('/api/admin/invitations', {
  lazy: false
})

const invitations = computed(() => data.value?.invitations || [])

// Formulaire d'envoi & état
const emailInput = ref('')
const isSending = ref(false)

// Gestion du conflit pour invitation déjà existante
const isConflictModalOpen = ref(false)
const isRegenerating = ref(false)
const conflictData = ref<{
  email: string
  existingInvitation: {
    id: string
    code: string
    createdAt: string
  }
} | null>(null)

const emailSchema = z.string().trim().min(1, 'Veuillez saisir une adresse e-mail').email('Format d\'adresse e-mail invalide')

async function sendInvitation(replaceExisting = false) {
  const targetEmail = (replaceExisting && conflictData.value?.email)
    ? conflictData.value.email
    : emailInput.value.trim()

  const result = emailSchema.safeParse(targetEmail)
  if (!result.success) {
    toast.add({
      title: 'E-mail invalide',
      description: result.error.issues[0]?.message || 'Veuillez renseigner un e-mail valide.',
      color: 'error'
    })
    return
  }

  if (replaceExisting) {
    if (isRegenerating.value) return
    isRegenerating.value = true
  } else {
    if (isSending.value) return
    isSending.value = true
  }

  try {
    const res = await $fetch<{
      success: boolean
      message: string
      invitation: {
        code: string
        registrationUrl: string
      }
    }>('/api/admin/invitations/send', {
      method: 'POST',
      body: {
        email: targetEmail,
        replaceExisting
      }
    })

    toast.add({
      title: replaceExisting ? 'Invitation régénérée !' : 'Invitation envoyée !',
      description: replaceExisting
        ? `Nouveau code ${res.invitation.code} généré et renvoyé à ${targetEmail}. L'ancien code a été supprimé.`
        : `Code ${res.invitation.code} généré et e-mail expédié à ${targetEmail}.`,
      color: 'success'
    })

    if (replaceExisting) {
      isConflictModalOpen.value = false
      conflictData.value = null
    } else {
      emailInput.value = ''
    }

    await refresh()
  } catch (err: unknown) {
    const errorObj = err as {
      statusCode?: number
      data?: {
        statusCode?: number
        statusMessage?: string
        data?: {
          code?: string
          existingInvitation?: { id: string, code: string, createdAt: string }
        }
      }
      statusMessage?: string
      message?: string
    }

    const statusCode = errorObj?.statusCode || errorObj?.data?.statusCode
    const conflictCode = errorObj?.data?.data?.code

    if (statusCode === 409 || conflictCode === 'INVITATION_ALREADY_EXISTS') {
      const existing = errorObj?.data?.data?.existingInvitation || {
        id: '',
        code: '',
        createdAt: ''
      }
      conflictData.value = {
        email: targetEmail,
        existingInvitation: existing
      }
      isConflictModalOpen.value = true
      toast.add({
        title: 'Invitation déjà active',
        description: `Une invitation active existe déjà pour l'adresse ${targetEmail}.`,
        color: 'warning'
      })
      return
    }

    const message = errorObj?.data?.statusMessage || errorObj?.statusMessage || errorObj?.message || 'Erreur lors de l\'envoi de l\'invitation.'
    toast.add({
      title: 'Échec de l\'envoi',
      description: message,
      color: 'error'
    })
  } finally {
    isSending.value = false
    isRegenerating.value = false
  }
}

async function copyLink(url: string) {
  try {
    await navigator.clipboard.writeText(url)
    toast.add({
      title: 'Lien copié !',
      description: 'Le lien d\'inscription personnalisé a été copié dans votre presse-papier.',
      color: 'info'
    })
  } catch {
    toast.add({
      title: 'Erreur de copie',
      description: 'Impossible d\'accéder au presse-papier.',
      color: 'error'
    })
  }
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Colonnes pour UTable
const columns: TableColumn<InvitationItem>[] = [
  {
    accessorKey: 'email',
    header: 'Destinataire'
  },
  {
    accessorKey: 'code',
    header: 'Code d\'accès'
  },
  {
    accessorKey: 'isUsed',
    header: 'Statut'
  },
  {
    accessorKey: 'usedBy',
    header: 'Bénévole associé'
  },
  {
    accessorKey: 'createdAt',
    header: 'Date d\'émission'
  },
  {
    accessorKey: 'actions',
    header: 'Action'
  }
]
</script>

<template>
  <div class="space-y-6">
    <!-- En-tête -->
    <div class="pb-5 border-b border-[#E6D9CB]">
      <span class="text-[11px] font-bold tracking-[0.16em] uppercase text-[#7A291E] block mb-1">
        Recrutement & Accès
      </span>
      <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-[#2A1512]">
        Invitations Bénévoles
      </h1>
      <p class="text-xs sm:text-sm text-[#6E5A52] mt-0.5">
        Générez des codes d'accès uniques et invitez vos futurs bénévoles par e-mail
      </p>
    </div>

    <!-- Carte Formulaire d'envoi -->
    <div class="bg-[#FFFCF8] p-5 sm:p-6 rounded-2xl border border-[#E6D9CB] shadow-xs">
      <div class="flex items-center gap-3 mb-3">
        <div class="w-9 h-9 rounded-xl bg-[#F3DCD5] text-[#7A291E] flex items-center justify-center font-bold text-sm shrink-0">
          <UIcon
            name="i-lucide-send"
            class="w-4 h-4"
          />
        </div>
        <div>
          <h2 class="text-base font-bold text-[#2A1512]">
            Envoyer une nouvelle invitation
          </h2>
          <p class="text-xs text-[#6E5A52]">
            Un code sécurisé unique et un lien d'inscription direct seront générés et envoyés par e-mail.
          </p>
        </div>
      </div>

      <form
        class="flex flex-col sm:flex-row gap-3 pt-2"
        @submit.prevent="sendInvitation"
      >
        <div class="flex-1">
          <UInput
            v-model="emailInput"
            type="email"
            icon="i-lucide-mail"
            placeholder="candidat.benevole@exemple.fr"
            size="md"
            class="w-full"
            :disabled="isSending"
            required
            autocomplete="email"
          />
        </div>

        <button
          type="submit"
          class="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] text-white font-semibold text-xs transition-colors shrink-0 shadow-xs cursor-pointer disabled:opacity-50"
          :disabled="isSending"
        >
          <UIcon
            :name="isSending ? 'i-lucide-loader-2' : 'i-lucide-mail-plus'"
            class="w-4 h-4"
            :class="{ 'animate-spin': isSending }"
          />
          <span>Envoyer l'invitation</span>
        </button>
      </form>
    </div>

    <!-- Tableau des invitations émises -->
    <div class="bg-[#FFFCF8] rounded-2xl border border-[#E6D9CB] shadow-xs overflow-hidden">
      <div class="p-4 sm:p-5 border-b border-[#E6D9CB] flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-sm font-bold text-[#2A1512]">Historique des invitations</span>
          <span
            class="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#EFE5DA] text-[#5B463E] border border-[#D8C6B4]"
          >
            {{ invitations.length }} code(s)
          </span>
        </div>
      </div>

      <!-- Vue Desktop : Tableau UTable -->
      <div class="hidden md:block">
        <UTable
          :data="invitations"
          :columns="columns"
          class="w-full"
        >
          <!-- Cellule E-mail Destinataire -->
          <template #email-cell="{ row }">
            <div class="flex items-center gap-1.5 text-xs text-[#2A1512] font-medium">
              <UIcon
                name="i-lucide-mail"
                class="w-3.5 h-3.5 text-[#6E5A52] shrink-0"
              />
              <span
                v-if="row.original.email"
                class="truncate max-w-[200px] text-[#2A1512] font-semibold"
                :title="row.original.email"
              >
                {{ row.original.email }}
              </span>
              <span
                v-else-if="row.original.usedBy?.email"
                class="truncate max-w-[200px] text-[#2A1512] font-semibold"
                :title="row.original.usedBy.email"
              >
                {{ row.original.usedBy.email }}
              </span>
              <span
                v-else
                class="text-[#6E5A52] italic text-[11px]"
              >
                — Non renseigné —
              </span>
            </div>
          </template>

          <!-- Cellule Code -->
          <template #code-cell="{ row }">
            <span class="font-mono font-bold text-xs text-[#7A291E] bg-[#F3DCD5] px-2.5 py-1 rounded-full border border-[#D9A79F] inline-block">
              {{ row.original.code }}
            </span>
          </template>

          <!-- Cellule Statut -->
          <template #isUsed-cell="{ row }">
            <span
              v-if="row.original.isUsed"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#E1E9DC] text-[#2F5238] border border-[#9DB79F]"
            >
              <UIcon
                name="i-lucide-check"
                class="w-3.5 h-3.5"
              />
              <span>Utilisé</span>
            </span>
            <span
              v-else
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F7E4C6] text-[#8A4B0F] border border-[#D9A660]"
            >
              <UIcon
                name="i-lucide-clock"
                class="w-3.5 h-3.5"
              />
              <span>En attente</span>
            </span>
          </template>

          <!-- Cellule Bénévole -->
          <template #usedBy-cell="{ row }">
            <div
              v-if="row.original.usedBy"
              class="text-xs"
            >
              <p class="font-semibold text-[#2A1512]">
                {{ row.original.usedBy.name }}
              </p>
              <p class="text-[#6E5A52] text-[11px]">
                {{ row.original.usedBy.email }}
              </p>
            </div>
            <span
              v-else
              class="text-xs text-[#6E5A52]"
            >
              — Non utilisé —
            </span>
          </template>

          <!-- Cellule Date -->
          <template #createdAt-cell="{ row }">
            <span class="text-xs text-[#6E5A52] font-medium">
              {{ formatDate(row.original.createdAt) }}
            </span>
          </template>

          <!-- Cellule Actions -->
          <template #actions-cell="{ row }">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#FFFCF8] hover:bg-[#F6EFE6] text-[#2A1512] border border-[#D8C6B4] font-semibold text-xs transition-colors cursor-pointer"
              @click="copyLink(row.original.registrationUrl)"
            >
              <UIcon name="i-lucide-copy" class="w-3.5 h-3.5 text-[#7A291E]" />
              <span>Copier le lien</span>
            </button>
          </template>
        </UTable>
      </div>

      <!-- Vue Mobile : Liste de Cartes empilées -->
      <div
        v-if="invitations.length > 0"
        class="block md:hidden divide-y divide-[#E6D9CB]"
      >
        <div
          v-for="invitation in invitations"
          :key="invitation.id"
          class="p-4 space-y-3 bg-[#FFFCF8]"
        >
          <!-- En-tête de la carte : Code + Badge Statut -->
          <div class="flex items-start justify-between gap-2">
            <div class="space-y-1 min-w-0">
              <span class="font-mono font-bold text-xs text-[#7A291E] bg-[#F3DCD5] px-2.5 py-1 rounded-full border border-[#D9A79F] inline-block">
                {{ invitation.code }}
              </span>
              <p class="text-xs font-semibold text-[#2A1512] truncate flex items-center gap-1.5 mt-1">
                <UIcon
                  name="i-lucide-mail"
                  class="w-3.5 h-3.5 text-[#6E5A52] shrink-0"
                />
                <span class="truncate">{{ invitation.email || invitation.usedBy?.email || '— Non renseigné —' }}</span>
              </p>
            </div>

            <span
              v-if="invitation.isUsed"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#E1E9DC] text-[#2F5238] border border-[#9DB79F] shrink-0"
            >
              <UIcon
                name="i-lucide-check"
                class="w-3.5 h-3.5"
              />
              <span>Utilisé</span>
            </span>
            <span
              v-else
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F7E4C6] text-[#8A4B0F] border border-[#D9A660] shrink-0"
            >
              <UIcon
                name="i-lucide-clock"
                class="w-3.5 h-3.5"
              />
              <span>En attente</span>
            </span>
          </div>

          <!-- Corps de la carte -->
          <div class="text-xs space-y-1.5 p-3 rounded-xl bg-[#F6EFE6] border border-[#E6D9CB] text-[#6E5A52]">
            <div
              v-if="invitation.usedBy"
              class="flex justify-between items-center"
            >
              <span class="text-[#6E5A52] font-medium">Bénévole associé :</span>
              <span class="font-semibold text-[#2A1512]">{{ invitation.usedBy.name }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-[#6E5A52] font-medium">Date d'émission :</span>
              <span class="font-medium text-[#2A1512]">{{ formatDate(invitation.createdAt) }}</span>
            </div>
          </div>

          <!-- Actions de la carte -->
          <div class="pt-0.5">
            <button
              type="button"
              class="w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-full bg-[#FFFCF8] hover:bg-[#F6EFE6] text-[#2A1512] border border-[#D8C6B4] font-semibold text-xs transition-colors cursor-pointer"
              @click="copyLink(invitation.registrationUrl)"
            >
              <UIcon name="i-lucide-copy" class="w-4 h-4 text-[#7A291E]" />
              <span>Copier le lien d'inscription</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Message si liste vide -->
      <div
        v-if="invitations.length === 0 && status !== 'pending'"
        class="py-12 text-center text-[#6E5A52]"
      >
        <UIcon
          name="i-lucide-mail"
          class="w-8 h-8 mx-auto text-[#D8C6B4] mb-2"
        />
        <p class="text-xs font-medium">
          Aucune invitation émise pour le moment.
        </p>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- MODALE DE CONFIRMATION DE RÉGÉNÉRATION D'INVITATION      -->
    <!-- ======================================================== -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isConflictModalOpen && conflictData"
          class="fixed inset-0 z-50 bg-[#2E1411]/60 backdrop-blur-xs flex items-center justify-center p-4"
          @click="isConflictModalOpen = false"
        >
          <div
            class="w-full max-w-md bg-[#FFFCF8] rounded-2xl border border-[#E6D9CB] shadow-xl p-6 space-y-4"
            @click.stop
          >
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-[#F7E4C6] text-[#8A4B0F] flex items-center justify-center shrink-0">
                <UIcon
                  name="i-lucide-alert-triangle"
                  class="w-5 h-5"
                />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-lg font-bold text-[#2A1512]">
                  Invitation déjà existante
                </h3>
                <p class="text-xs text-[#6E5A52] mt-0.5">
                  Une invitation active a déjà été émise pour cette adresse
                </p>
              </div>
            </div>

            <div class="p-3.5 bg-[#F7E4C6]/40 border border-[#D9A660] rounded-xl space-y-2 text-xs">
              <p class="text-[#2A1512] leading-relaxed">
                Une invitation active est déjà en attente pour l'adresse <strong class="text-[#2A1512] font-semibold">{{ conflictData.email }}</strong>.
              </p>
              <div
                v-if="conflictData.existingInvitation.code"
                class="flex items-center gap-2 pt-1 font-mono text-xs"
              >
                <span class="text-[#6E5A52] font-sans">Ancien code :</span>
                <span class="font-bold text-[#7A291E] bg-[#F3DCD5] px-2 py-0.5 rounded-full border border-[#D9A79F]">
                  {{ conflictData.existingInvitation.code }}
                </span>
              </div>
              <p
                v-if="conflictData.existingInvitation.createdAt"
                class="text-[#6E5A52] text-[11px]"
              >
                Émis le {{ formatDate(conflictData.existingInvitation.createdAt) }}
              </p>
            </div>

            <p class="text-xs text-[#6E5A52] leading-relaxed">
              Souhaitez-vous <strong>supprimer l'ancienne invitation</strong> et générer un <strong>nouveau code</strong> pour lui renvoyer un e-mail d'invitation ?
            </p>

            <div class="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                class="inline-flex items-center justify-center h-9 px-4 rounded-full bg-[#FFFCF8] hover:bg-[#F6EFE6] text-[#2A1512] border border-[#D8C6B4] font-semibold text-xs transition-colors cursor-pointer"
                :disabled="isRegenerating"
                @click="isConflictModalOpen = false"
              >
                Annuler
              </button>

              <button
                type="button"
                class="inline-flex items-center justify-center gap-2 h-9 px-5 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                :disabled="isRegenerating"
                @click="sendInvitation(true)"
              >
                <UIcon
                  :name="isRegenerating ? 'i-lucide-loader-2' : 'i-lucide-refresh-cw'"
                  class="w-4 h-4"
                  :class="{ 'animate-spin': isRegenerating }"
                />
                <span>Régénérer et renvoyer</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
