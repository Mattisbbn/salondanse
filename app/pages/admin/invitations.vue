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
    header: 'Destinataire (E-mail)'
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
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Invitations Bénévoles
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-0.5">
          Générez des codes d'accès uniques et invitez vos futurs bénévoles par e-mail
        </p>
      </div>

      <UButton
        color="neutral"
        variant="subtle"
        size="sm"
        icon="i-lucide-refresh-cw"
        :loading="status === 'pending'"
        label="Actualiser"
        @click="() => refresh()"
      />
    </div>

    <!-- Carte Formulaire d'envoi -->
    <div class="bg-white p-5 sm:p-6 rounded-2xl border border-[#E2E8F0] shadow-xs">
      <div class="flex items-center gap-2.5 mb-3">
        <div class="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-sm shrink-0">
          <UIcon
            name="i-lucide-send"
            class="w-4 h-4"
          />
        </div>
        <div>
          <h2 class="text-sm sm:text-base font-bold text-slate-900">
            Envoyer une nouvelle invitation
          </h2>
          <p class="text-xs text-slate-500">
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

        <UButton
          type="submit"
          color="primary"
          size="md"
          :loading="isSending"
          icon="i-lucide-mail-plus"
          label="Envoyer l'invitation"
          class="font-semibold shrink-0 cursor-pointer shadow-xs"
        />
      </form>
    </div>

    <!-- Tableau des invitations émises -->
    <div class="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
      <div class="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-sm font-bold text-slate-900">Historique des invitations</span>
          <UBadge
            color="neutral"
            variant="subtle"
            size="xs"
          >
            {{ invitations.length }} code(s)
          </UBadge>
        </div>
      </div>

      <UTable
        :data="invitations"
        :columns="columns"
        class="w-full"
      >
        <!-- Cellule E-mail Destinataire -->
        <template #email-cell="{ row }">
          <div class="flex items-center gap-1.5 text-xs text-slate-800 font-medium">
            <UIcon
              name="i-lucide-mail"
              class="w-3.5 h-3.5 text-slate-400 shrink-0"
            />
            <span
              v-if="row.original.email"
              class="truncate max-w-[200px] text-slate-900 font-semibold"
              :title="row.original.email"
            >
              {{ row.original.email }}
            </span>
            <span
              v-else-if="row.original.usedBy?.email"
              class="truncate max-w-[200px] text-slate-900 font-semibold"
              :title="row.original.usedBy.email"
            >
              {{ row.original.usedBy.email }}
            </span>
            <span
              v-else
              class="text-slate-400 italic text-[11px]"
            >
              — Non renseigné —
            </span>
          </div>
        </template>

        <!-- Cellule Code -->
        <template #code-cell="{ row }">
          <span class="font-mono font-bold text-xs text-violet-700 bg-violet-50 px-2.5 py-1 rounded-md border border-violet-200/70 inline-block">
            {{ row.original.code }}
          </span>
        </template>

        <!-- Cellule Statut -->
        <template #isUsed-cell="{ row }">
          <UBadge
            v-if="row.original.isUsed"
            color="success"
            variant="subtle"
            size="xs"
            class="font-medium inline-flex items-center gap-1"
          >
            <UIcon
              name="i-lucide-check"
              class="w-3 h-3"
            />
            <span>Utilisé</span>
          </UBadge>
          <UBadge
            v-else
            color="warning"
            variant="subtle"
            size="xs"
            class="font-medium inline-flex items-center gap-1"
          >
            <UIcon
              name="i-lucide-clock"
              class="w-3 h-3"
            />
            <span>En attente</span>
          </UBadge>
        </template>

        <!-- Cellule Bénévole -->
        <template #usedBy-cell="{ row }">
          <div
            v-if="row.original.usedBy"
            class="text-xs"
          >
            <p class="font-semibold text-slate-900">
              {{ row.original.usedBy.name }}
            </p>
            <p class="text-slate-400 text-[11px]">
              {{ row.original.usedBy.email }}
            </p>
          </div>
          <span
            v-else
            class="text-xs text-slate-400"
          >
            — Non utilisé —
          </span>
        </template>

        <!-- Cellule Date -->
        <template #createdAt-cell="{ row }">
          <span class="text-xs text-slate-600 font-medium">
            {{ formatDate(row.original.createdAt) }}
          </span>
        </template>

        <!-- Cellule Actions -->
        <template #actions-cell="{ row }">
          <UButton
            icon="i-lucide-copy"
            color="neutral"
            variant="ghost"
            size="xs"
            label="Copier le lien"
            class="text-slate-600 hover:text-violet-700 cursor-pointer"
            @click="copyLink(row.original.registrationUrl)"
          />
        </template>
      </UTable>

      <!-- Message si liste vide -->
      <div
        v-if="invitations.length === 0 && status !== 'pending'"
        class="py-12 text-center text-slate-400"
      >
        <UIcon
          name="i-lucide-mail"
          class="w-8 h-8 mx-auto text-slate-300 mb-2"
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
          class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          @click="isConflictModalOpen = false"
        >
          <div
            class="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-6 space-y-4"
            @click.stop
          >
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <UIcon
                  name="i-lucide-alert-triangle"
                  class="w-5 h-5"
                />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-base font-bold text-slate-900">
                  Invitation déjà existante
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">
                  Une invitation active a déjà été émise pour cette adresse
                </p>
              </div>
            </div>

            <div class="p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-xl space-y-2 text-xs">
              <p class="text-slate-700 leading-relaxed">
                Une invitation active est déjà en attente pour l'adresse <strong class="text-slate-950 font-semibold">{{ conflictData.email }}</strong>.
              </p>
              <div
                v-if="conflictData.existingInvitation.code"
                class="flex items-center gap-2 pt-1 font-mono text-xs"
              >
                <span class="text-slate-500 font-sans">Ancien code :</span>
                <span class="font-bold text-violet-700 bg-violet-100/70 px-2 py-0.5 rounded border border-violet-200">
                  {{ conflictData.existingInvitation.code }}
                </span>
              </div>
              <p
                v-if="conflictData.existingInvitation.createdAt"
                class="text-slate-500 text-[11px]"
              >
                Émis le {{ formatDate(conflictData.existingInvitation.createdAt) }}
              </p>
            </div>

            <p class="text-xs text-slate-600 leading-relaxed">
              Souhaitez-vous <strong>supprimer l'ancienne invitation</strong> et générer un <strong>nouveau code</strong> pour lui renvoyer un e-mail d'invitation ?
            </p>

            <div class="flex items-center justify-end gap-2.5 pt-2">
              <UButton
                color="neutral"
                variant="subtle"
                size="sm"
                label="Annuler"
                :disabled="isRegenerating"
                @click="isConflictModalOpen = false"
              />

              <UButton
                color="primary"
                variant="solid"
                size="sm"
                icon="i-lucide-refresh-cw"
                label="Régénérer et renvoyer"
                :loading="isRegenerating"
                class="font-semibold cursor-pointer"
                @click="sendInvitation(true)"
              />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
