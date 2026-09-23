<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

useHead({
  title: 'Validation des Mineurs · Admin'
})

interface MinorItem {
  id: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone: string
  photoUrl: string | null
  birthDate: string | null
  age: number | null
  parentalAuthorizationUrl: string | null
  minorValidationStatus: 'NONE' | 'PENDING' | 'VALIDATED' | 'REJECTED'
  isApprovedMinor: boolean
  planningStatus: string
  createdAt: string
  edition: {
    id: string
    name: string
    year: number
  }
}

interface MinorsApiResponse {
  total: number
  minors: MinorItem[]
}

const toast = useToast()

const { data, status, refresh } = await useFetch<MinorsApiResponse>('/api/admin/minors', {
  lazy: false
})

const minors = computed(() => data.value?.minors || [])

// Statistiques
const stats = computed(() => {
  const list = minors.value
  return {
    total: list.length,
    pending: list.filter(m => m.minorValidationStatus === 'PENDING').length,
    validated: list.filter(m => m.minorValidationStatus === 'VALIDATED').length,
    rejected: list.filter(m => m.minorValidationStatus === 'REJECTED').length
  }
})

// Modale de visualisation PDF
const previewPdfUrl = ref<string | null>(null)
const previewVolunteerName = ref('')
const isPdfModalOpen = ref(false)

function openPdfPreview(url: string | null, name: string) {
  if (!url) {
    toast.add({
      title: 'Aucun document',
      description: 'Aucune autorisation parentale n\'a été transmise pour ce compte.',
      color: 'warning'
    })
    return
  }
  previewPdfUrl.value = url
  previewVolunteerName.value = name
  isPdfModalOpen.value = true
}

// Action Valider / Refuser
const updatingId = ref<string | null>(null)

async function updateMinorStatus(volunteer: MinorItem, newStatus: 'VALIDATED' | 'REJECTED') {
  if (updatingId.value) return
  updatingId.value = volunteer.id

  try {
    const res = await $fetch<{ message: string }>(`/api/admin/minors/${volunteer.id}/validate`, {
      method: 'POST',
      body: { status: newStatus }
    })

    toast.add({
      title: newStatus === 'VALIDATED' ? 'Profil mineur validé' : 'Profil mineur refusé',
      description: res.message || `Le statut de ${volunteer.fullName} a été mis à jour.`,
      color: newStatus === 'VALIDATED' ? 'success' : 'error'
    })

    await refresh()
  } catch (err: unknown) {
    const errorObj = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    toast.add({
      title: 'Action impossible',
      description: errorObj?.data?.statusMessage || errorObj?.statusMessage || errorObj?.message || 'Erreur lors de la mise à jour.',
      color: 'error'
    })
  } finally {
    updatingId.value = null
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

const columns: TableColumn<MinorItem>[] = [
  {
    accessorKey: 'fullName',
    header: 'Bénévole'
  },
  {
    accessorKey: 'birthDate',
    header: 'Naissance & Âge'
  },
  {
    accessorKey: 'contact',
    header: 'Coordonnées'
  },
  {
    accessorKey: 'document',
    header: 'Autorisation parentale'
  },
  {
    accessorKey: 'minorValidationStatus',
    header: 'Statut'
  },
  {
    accessorKey: 'actions',
    header: 'Actions'
  }
]
</script>

<template>
  <div class="space-y-6">
    <!-- En-tête -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Validation des Profils Mineurs
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-0.5">
          Vérifiez et validez les autorisations parentales des bénévoles de moins de 18 ans
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

    <!-- Cartes KPI de Synthèse -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      <div class="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Mineurs</span>
        <span class="text-2xl font-black text-slate-900 mt-1 block">{{ stats.total }}</span>
      </div>

      <div class="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl shadow-xs">
        <span class="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">À Valider</span>
        <span class="text-2xl font-black text-amber-900 mt-1 block">{{ stats.pending }}</span>
      </div>

      <div class="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl shadow-xs">
        <span class="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">Validés</span>
        <span class="text-2xl font-black text-emerald-900 mt-1 block">{{ stats.validated }}</span>
      </div>

      <div class="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl shadow-xs">
        <span class="text-[11px] font-semibold text-rose-800 uppercase tracking-wider block">Refusés</span>
        <span class="text-2xl font-black text-rose-900 mt-1 block">{{ stats.rejected }}</span>
      </div>
    </div>

    <!-- Tableau des profils mineurs -->
    <div class="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
      <div class="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-sm font-bold text-slate-900">Liste des déclarations</span>
          <UBadge
            color="neutral"
            variant="subtle"
            size="xs"
          >
            {{ minors.length }} candidat(s)
          </UBadge>
        </div>
      </div>

      <UTable
        :data="minors"
        :columns="columns"
        class="w-full"
      >
        <!-- Cellule Bénévole -->
        <template #fullName-cell="{ row }">
          <div class="flex items-center gap-3">
            <img
              v-if="row.original.photoUrl"
              :src="row.original.photoUrl"
              alt="Photo"
              class="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0"
            >
            <div
              v-else
              class="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs shrink-0"
            >
              {{ row.original.firstName.charAt(0) }}{{ row.original.lastName.charAt(0) }}
            </div>
            <div class="min-w-0">
              <p class="font-bold text-slate-900 text-xs truncate">
                {{ row.original.fullName }}
              </p>
              <p class="text-[11px] text-slate-400">
                Inscrit le {{ formatDate(row.original.createdAt) }}
              </p>
            </div>
          </div>
        </template>

        <!-- Cellule Date de Naissance & Âge -->
        <template #birthDate-cell="{ row }">
          <div class="text-xs space-y-0.5">
            <span class="font-medium text-slate-900 block">
              {{ formatDate(row.original.birthDate) }}
            </span>
            <UBadge
              v-if="row.original.age !== null"
              color="warning"
              variant="subtle"
              size="xs"
              class="font-semibold inline-flex items-center gap-1"
            >
              <UIcon
                name="i-lucide-user"
                class="w-3 h-3"
              />
              <span>{{ row.original.age }} ans</span>
            </UBadge>
            <span
              v-else
              class="text-slate-400 text-[11px]"
            >Non renseigné</span>
          </div>
        </template>

        <!-- Cellule Coordonnées -->
        <template #contact-cell="{ row }">
          <div class="text-xs space-y-0.5">
            <div class="flex items-center gap-1 text-slate-700">
              <UIcon
                name="i-lucide-mail"
                class="w-3.5 h-3.5 text-slate-400 shrink-0"
              />
              <span
                class="truncate max-w-[180px]"
                :title="row.original.email"
              >{{ row.original.email }}</span>
            </div>
            <div class="flex items-center gap-1 text-slate-500 text-[11px]">
              <UIcon
                name="i-lucide-phone"
                class="w-3 h-3 text-slate-400 shrink-0"
              />
              <span>{{ row.original.phone }}</span>
            </div>
          </div>
        </template>

        <!-- Cellule Document PDF -->
        <template #document-cell="{ row }">
          <div v-if="row.original.parentalAuthorizationUrl">
            <UButton
              color="primary"
              variant="subtle"
              size="xs"
              icon="i-lucide-file-text"
              label="Voir le PDF"
              class="font-semibold cursor-pointer shadow-2xs"
              @click="openPdfPreview(row.original.parentalAuthorizationUrl, row.original.fullName)"
            />
          </div>
          <span
            v-else
            class="text-[11px] text-rose-500 font-semibold inline-flex items-center gap-1"
          >
            <UIcon
              name="i-lucide-alert-triangle"
              class="w-3.5 h-3.5"
            />
            Document manquant
          </span>
        </template>

        <!-- Cellule Statut -->
        <template #minorValidationStatus-cell="{ row }">
          <UBadge
            v-if="row.original.minorValidationStatus === 'VALIDATED'"
            color="success"
            variant="subtle"
            size="xs"
            class="font-semibold inline-flex items-center gap-1"
          >
            <UIcon
              name="i-lucide-check-circle"
              class="w-3 h-3"
            />
            <span>Validé</span>
          </UBadge>
          <UBadge
            v-else-if="row.original.minorValidationStatus === 'REJECTED'"
            color="error"
            variant="subtle"
            size="xs"
            class="font-semibold inline-flex items-center gap-1"
          >
            <UIcon
              name="i-lucide-x-circle"
              class="w-3 h-3"
            />
            <span>Refusé</span>
          </UBadge>
          <UBadge
            v-else
            color="warning"
            variant="subtle"
            size="xs"
            class="font-semibold inline-flex items-center gap-1"
          >
            <UIcon
              name="i-lucide-clock"
              class="w-3 h-3"
            />
            <span>En attente</span>
          </UBadge>
        </template>

        <!-- Cellule Actions -->
        <template #actions-cell="{ row }">
          <div class="flex items-center gap-1.5">
            <!-- Bouton Valider -->
            <UButton
              color="success"
              variant="solid"
              size="xs"
              icon="i-lucide-check"
              label="Valider"
              :loading="updatingId === row.original.id"
              :disabled="row.original.minorValidationStatus === 'VALIDATED'"
              class="cursor-pointer font-semibold shadow-2xs"
              @click="updateMinorStatus(row.original, 'VALIDATED')"
            />

            <!-- Bouton Refuser -->
            <UButton
              color="error"
              variant="soft"
              size="xs"
              icon="i-lucide-x"
              label="Refuser"
              :loading="updatingId === row.original.id"
              :disabled="row.original.minorValidationStatus === 'REJECTED'"
              class="cursor-pointer font-semibold shadow-2xs"
              @click="updateMinorStatus(row.original, 'REJECTED')"
            />
          </div>
        </template>
      </UTable>

      <!-- Si liste vide -->
      <div
        v-if="minors.length === 0 && status !== 'pending'"
        class="py-12 text-center text-slate-400"
      >
        <UIcon
          name="i-lucide-shield-check"
          class="w-8 h-8 mx-auto text-slate-300 mb-2"
        />
        <p class="text-xs font-medium">
          Aucun profil bénévole mineur enregistré pour cette édition.
        </p>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- MODALE DE PRÉVISUALISATION DU PDF                       -->
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
          v-if="isPdfModalOpen && previewPdfUrl"
          class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          @click="isPdfModalOpen = false"
        >
          <div
            class="w-full max-w-4xl h-[88vh] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden"
            @click.stop
          >
            <!-- En-tête Modale -->
            <div class="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                  <UIcon
                    name="i-lucide-file-text"
                    class="w-4 h-4"
                  />
                </div>
                <div class="min-w-0">
                  <h3 class="text-sm font-bold text-slate-900 truncate">
                    Autorisation parentale — {{ previewVolunteerName }}
                  </h3>
                  <p class="text-[11px] text-slate-500">
                    Prévisualisation du document officiel
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <a
                  :href="previewPdfUrl"
                  target="_blank"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:text-violet-700 hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  <UIcon
                    name="i-lucide-external-link"
                    class="w-3.5 h-3.5"
                  />
                  <span>Ouvrir dans un onglet</span>
                </a>
                <UButton
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  aria-label="Fermer"
                  @click="isPdfModalOpen = false"
                />
              </div>
            </div>

            <!-- Contenu iframe PDF -->
            <div class="flex-1 bg-slate-100 relative">
              <iframe
                :src="previewPdfUrl"
                class="w-full h-full border-0"
                title="Autorisation parentale"
              />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
