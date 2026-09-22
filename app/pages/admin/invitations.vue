<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { z } from 'zod'

useHead({
  title: 'Invitations Bénévoles · Admin'
})

interface InvitationItem {
  id: string
  code: string
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

// Formulaire d'envoi
const emailInput = ref('')
const isSending = ref(false)

const emailSchema = z.string().trim().min(1, 'Veuillez saisir une adresse e-mail').email('Format d\'adresse e-mail invalide')

async function sendInvitation() {
  const result = emailSchema.safeParse(emailInput.value)
  if (!result.success) {
    toast.add({
      title: 'E-mail invalide',
      description: result.error.issues[0]?.message || 'Veuillez renseigner un e-mail valide.',
      color: 'error'
    })
    return
  }

  if (isSending.value) return
  isSending.value = true

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
        email: emailInput.value.trim()
      }
    })

    toast.add({
      title: 'Invitation envoyée !',
      description: `Code ${res.invitation.code} généré et e-mail expédié à ${emailInput.value.trim()}.`,
      color: 'success'
    })

    emailInput.value = ''
    await refresh()
  } catch (err: unknown) {
    const errorObj = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    const message = errorObj?.data?.statusMessage || errorObj?.statusMessage || errorObj?.message || 'Erreur lors de l\'envoi de l\'invitation.'
    toast.add({
      title: 'Échec de l\'envoi',
      description: message,
      color: 'error'
    })
  } finally {
    isSending.value = false
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
  </div>
</template>
