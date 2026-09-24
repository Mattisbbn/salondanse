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
    <div class="pb-4 border-b border-[#E6D9CB]">
      <span class="text-[11px] font-bold tracking-[0.16em] uppercase text-[#7A291E] block mb-1">
        Direction artistique · Plateforme bénévoles
      </span>
      <h1 class="text-2xl sm:text-3xl font-serif italic font-semibold tracking-tight text-[#2A1512]">
        Validation des Profils Mineurs
      </h1>
      <p class="text-xs sm:text-sm text-[#6E5A52] mt-0.5">
        Vérifiez et validez les autorisations parentales des bénévoles de moins de 18 ans.
      </p>
    </div>

    <!-- Cartes KPI de Synthèse -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      <div class="p-4 bg-[#FFFCF8] rounded-2xl border border-[#E6D9CB] shadow-xs">
        <span class="text-[11px] font-bold tracking-[0.12em] uppercase text-[#6E5A52] block">Total Mineurs</span>
        <span class="text-3xl font-serif italic font-semibold text-[#2A1512] mt-1 block">{{ stats.total }}</span>
      </div>

      <div class="p-4 bg-[#F7E4C6]/40 border border-[#D9A660] rounded-2xl shadow-xs">
        <span class="text-[11px] font-bold tracking-[0.12em] uppercase text-[#8A4B0F] block">À Valider</span>
        <span class="text-3xl font-serif italic font-semibold text-[#8A4B0F] mt-1 block">{{ stats.pending }}</span>
      </div>

      <div class="p-4 bg-[#E1E9DC]/60 border border-[#9DB79F] rounded-2xl shadow-xs">
        <span class="text-[11px] font-bold tracking-[0.12em] uppercase text-[#2F5238] block">Validés</span>
        <span class="text-3xl font-serif italic font-semibold text-[#2F5238] mt-1 block">{{ stats.validated }}</span>
      </div>

      <div class="p-4 bg-[#F4D8D3]/60 border border-[#D9A79F] rounded-2xl shadow-xs">
        <span class="text-[11px] font-bold tracking-[0.12em] uppercase text-[#9A2A22] block">Refusés</span>
        <span class="text-3xl font-serif italic font-semibold text-[#9A2A22] mt-1 block">{{ stats.rejected }}</span>
      </div>
    </div>

    <!-- Tableau des profils mineurs -->
    <div class="bg-[#FFFCF8] rounded-2xl border border-[#E6D9CB] shadow-xs overflow-hidden">
      <div class="p-4 sm:p-5 border-b border-[#E6D9CB] flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-sm font-bold text-[#2A1512]">Liste des déclarations</span>
          <span class="font-semibold text-xs px-2.5 py-0.5 rounded-full bg-[#F6EFE6] text-[#2A1512] border border-[#E6D9CB]">
            {{ minors.length }} candidat(s)
          </span>
        </div>
      </div>

      <!-- Vue Desktop : Tableau UTable -->
      <div class="hidden md:block">
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
                class="w-9 h-9 rounded-full object-cover border border-[#D9A79F] shrink-0"
              >
              <div
                v-else
                class="w-9 h-9 rounded-full bg-[#F3DCD5] text-[#7A291E] flex items-center justify-center font-bold text-xs shrink-0 border border-[#D9A79F]"
              >
                {{ row.original.firstName.charAt(0) }}{{ row.original.lastName.charAt(0) }}
              </div>
              <div class="min-w-0">
                <p class="font-bold text-[#2A1512] text-xs truncate">
                  {{ row.original.fullName }}
                </p>
                <p class="text-[11px] text-[#6E5A52]">
                  Inscrit le {{ formatDate(row.original.createdAt) }}
                </p>
              </div>
            </div>
          </template>

          <!-- Cellule Date de Naissance & Âge -->
          <template #birthDate-cell="{ row }">
            <div class="text-xs space-y-0.5">
              <span class="font-medium text-[#2A1512] block">
                {{ formatDate(row.original.birthDate) }}
              </span>
              <span
                v-if="row.original.age !== null"
                class="font-semibold text-[11px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 bg-[#F7E4C6] text-[#8A4B0F] border border-[#D9A660]"
              >
                <UIcon
                  name="i-lucide-user"
                  class="w-3 h-3 text-[#8A4B0F]"
                />
                <span>{{ row.original.age }} ans</span>
              </span>
              <span
                v-else
                class="text-[#6E5A52] text-[11px]"
              >Non renseigné</span>
            </div>
          </template>

          <!-- Cellule Coordonnées -->
          <template #contact-cell="{ row }">
            <div class="text-xs space-y-0.5">
              <div class="flex items-center gap-1 text-[#2A1512]">
                <UIcon
                  name="i-lucide-mail"
                  class="w-3.5 h-3.5 text-[#6E5A52] shrink-0"
                />
                <span
                  class="truncate max-w-[180px]"
                  :title="row.original.email"
                >{{ row.original.email }}</span>
              </div>
              <div class="flex items-center gap-1 text-[#6E5A52] text-[11px]">
                <UIcon
                  name="i-lucide-phone"
                  class="w-3 h-3 text-[#6E5A52] shrink-0"
                />
                <span>{{ row.original.phone }}</span>
              </div>
            </div>
          </template>

          <!-- Cellule Document PDF -->
          <template #document-cell="{ row }">
            <div v-if="row.original.parentalAuthorizationUrl">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-[#FFFCF8] hover:bg-[#F6EFE6] text-[#7A291E] border border-[#D8C6B4] text-xs font-semibold transition-colors cursor-pointer"
                @click="openPdfPreview(row.original.parentalAuthorizationUrl, row.original.fullName)"
              >
                <UIcon name="i-lucide-file-text" class="w-3.5 h-3.5 text-[#7A291E]" />
                <span>Voir le PDF</span>
              </button>
            </div>
            <span
              v-else
              class="text-[11px] text-[#9A2A22] font-semibold inline-flex items-center gap-1"
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
            <span
              v-if="row.original.minorValidationStatus === 'VALIDATED'"
              class="font-semibold text-xs px-2.5 py-1 inline-flex items-center gap-1 rounded-full bg-[#E1E9DC] text-[#2F5238] border border-[#9DB79F]"
            >
              <UIcon
                name="i-lucide-check-circle"
                class="w-3.5 h-3.5"
              />
              <span>Validé</span>
            </span>
            <span
              v-else-if="row.original.minorValidationStatus === 'REJECTED'"
              class="font-semibold text-xs px-2.5 py-1 inline-flex items-center gap-1 rounded-full bg-[#F4D8D3] text-[#9A2A22] border border-[#D9A79F]"
            >
              <UIcon
                name="i-lucide-x-circle"
                class="w-3.5 h-3.5"
              />
              <span>Refusé</span>
            </span>
            <span
              v-else
              class="font-semibold text-xs px-2.5 py-1 inline-flex items-center gap-1 rounded-full bg-[#F7E4C6] text-[#8A4B0F] border border-[#D9A660]"
            >
              <UIcon
                name="i-lucide-clock"
                class="w-3.5 h-3.5"
              />
              <span>En attente</span>
            </span>
          </template>

          <!-- Cellule Actions -->
          <template #actions-cell="{ row }">
            <div class="flex items-center gap-1.5">
              <!-- Bouton Valider -->
              <button
                type="button"
                :disabled="row.original.minorValidationStatus === 'VALIDATED' || updatingId === row.original.id"
                class="inline-flex items-center gap-1 h-7 px-3 rounded-full bg-[#2F5238] hover:bg-[#233f2a] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40"
                @click="updateMinorStatus(row.original, 'VALIDATED')"
              >
                <UIcon name="i-lucide-check" class="w-3 h-3 text-white" />
                <span>Valider</span>
              </button>

              <!-- Bouton Refuser -->
              <button
                type="button"
                :disabled="row.original.minorValidationStatus === 'REJECTED' || updatingId === row.original.id"
                class="inline-flex items-center gap-1 h-7 px-3 rounded-full bg-[#FFFCF8] hover:bg-[#F4D8D3] text-[#9A2A22] border border-[#D9A79F] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40"
                @click="updateMinorStatus(row.original, 'REJECTED')"
              >
                <UIcon name="i-lucide-x" class="w-3 h-3 text-[#9A2A22]" />
                <span>Refuser</span>
              </button>
            </div>
          </template>
        </UTable>
      </div>

      <!-- Vue Mobile : Liste de Cartes empilées -->
      <div
        v-if="minors.length > 0"
        class="block md:hidden divide-y divide-[#E6D9CB]"
      >
        <div
          v-for="minor in minors"
          :key="minor.id"
          class="p-4 space-y-3 bg-[#FFFCF8]"
        >
          <!-- En-tête : Avatar + Nom + Âge + Statut -->
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <img
                v-if="minor.photoUrl"
                :src="minor.photoUrl"
                alt="Photo"
                class="w-10 h-10 rounded-full object-cover border border-[#D9A79F] shrink-0"
              >
              <div
                v-else
                class="w-10 h-10 rounded-full bg-[#F3DCD5] text-[#7A291E] flex items-center justify-center font-bold text-xs shrink-0 border border-[#D9A79F]"
              >
                {{ minor.firstName.charAt(0) }}{{ minor.lastName.charAt(0) }}
              </div>
              <div class="min-w-0">
                <span class="font-bold text-sm text-[#2A1512] block truncate">
                  {{ minor.fullName }}
                </span>
                <span
                  v-if="minor.age !== null"
                  class="text-[11px] font-semibold text-[#8A4B0F] bg-[#F7E4C6] border border-[#D9A660] px-2 py-0.5 rounded-full inline-block mt-0.5"
                >
                  {{ minor.age }} ans (né(e) le {{ formatDate(minor.birthDate) }})
                </span>
              </div>
            </div>

            <!-- Statut Badge -->
            <span
              v-if="minor.minorValidationStatus === 'VALIDATED'"
              class="font-semibold text-xs px-2.5 py-1 inline-flex items-center gap-1 shrink-0 rounded-full bg-[#E1E9DC] text-[#2F5238] border border-[#9DB79F]"
            >
              <UIcon
                name="i-lucide-check-circle"
                class="w-3.5 h-3.5"
              />
              <span>Validé</span>
            </span>
            <span
              v-else-if="minor.minorValidationStatus === 'REJECTED'"
              class="font-semibold text-xs px-2.5 py-1 inline-flex items-center gap-1 shrink-0 rounded-full bg-[#F4D8D3] text-[#9A2A22] border border-[#D9A79F]"
            >
              <UIcon
                name="i-lucide-x-circle"
                class="w-3.5 h-3.5"
              />
              <span>Refusé</span>
            </span>
            <span
              v-else
              class="font-semibold text-xs px-2.5 py-1 inline-flex items-center gap-1 shrink-0 rounded-full bg-[#F7E4C6] text-[#8A4B0F] border border-[#D9A660]"
            >
              <UIcon
                name="i-lucide-clock"
                class="w-3.5 h-3.5"
              />
              <span>En attente</span>
            </span>
          </div>

          <!-- Coordonnées & Document -->
          <div class="text-xs space-y-2 p-3 rounded-xl bg-[#F6EFE6]/60 border border-[#E6D9CB] text-[#6E5A52]">
            <div class="flex items-center gap-1.5 text-[#2A1512]">
              <UIcon
                name="i-lucide-mail"
                class="w-3.5 h-3.5 text-[#6E5A52] shrink-0"
              />
              <span class="truncate font-medium">{{ minor.email }}</span>
            </div>
            <div
              v-if="minor.phone"
              class="flex items-center gap-1.5"
            >
              <UIcon
                name="i-lucide-phone"
                class="w-3.5 h-3.5 text-[#6E5A52] shrink-0"
              />
              <a
                :href="'tel:' + minor.phone"
                class="text-[#7A291E] font-semibold hover:underline"
              >
                {{ minor.phone }}
              </a>
            </div>

            <!-- PDF Accord parental -->
            <div class="pt-1 border-t border-[#E6D9CB] flex items-center justify-between">
              <span class="text-[#6E5A52] font-medium">Autorisation parentale :</span>
              <div v-if="minor.parentalAuthorizationUrl">
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-[#FFFCF8] hover:bg-[#F6EFE6] text-[#7A291E] border border-[#D8C6B4] text-xs font-semibold transition-colors cursor-pointer"
                  @click="openPdfPreview(minor.parentalAuthorizationUrl, minor.fullName)"
                >
                  <UIcon name="i-lucide-file-text" class="w-3.5 h-3.5 text-[#7A291E]" />
                  <span>Voir le PDF</span>
                </button>
              </div>
              <span
                v-else
                class="text-[11px] text-[#9A2A22] font-semibold inline-flex items-center gap-1"
              >
                <UIcon
                  name="i-lucide-alert-triangle"
                  class="w-3.5 h-3.5"
                />
                Manquante
              </span>
            </div>
          </div>

          <!-- Actions tactiles -->
          <div class="pt-1 flex items-center gap-2">
            <button
              type="button"
              :disabled="minor.minorValidationStatus === 'VALIDATED' || updatingId === minor.id"
              class="flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-full bg-[#2F5238] hover:bg-[#233f2a] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 shadow-xs"
              @click="updateMinorStatus(minor, 'VALIDATED')"
            >
              <UIcon name="i-lucide-check" class="w-4 h-4 text-white" />
              <span>Valider l'autorisation</span>
            </button>

            <button
              type="button"
              :disabled="minor.minorValidationStatus === 'REJECTED' || updatingId === minor.id"
              class="h-11 px-4 rounded-full inline-flex items-center justify-center gap-1 bg-[#FFFCF8] hover:bg-[#F4D8D3] text-[#9A2A22] border border-[#D9A79F] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40"
              @click="updateMinorStatus(minor, 'REJECTED')"
            >
              <UIcon name="i-lucide-x" class="w-4 h-4 text-[#9A2A22]" />
              <span>Refuser</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Si liste vide -->
      <div
        v-if="minors.length === 0 && status !== 'pending'"
        class="py-12 text-center text-[#6E5A52]"
      >
        <UIcon
          name="i-lucide-shield-check"
          class="w-8 h-8 mx-auto text-[#D8C6B4] mb-2"
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
          class="fixed inset-0 z-50 bg-[#2A1512]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          @click="isPdfModalOpen = false"
        >
          <div
            class="w-full max-w-4xl h-[88vh] bg-[#FFFCF8] rounded-2xl border border-[#E6D9CB] shadow-2xl flex flex-col overflow-hidden"
            @click.stop
          >
            <!-- En-tête Modale -->
            <div class="p-4 border-b border-[#E6D9CB] flex items-center justify-between bg-[#F6EFE6]/50 shrink-0">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-8 h-8 rounded-full bg-[#F3DCD5] text-[#7A291E] flex items-center justify-center shrink-0 border border-[#D9A79F]">
                  <UIcon
                    name="i-lucide-file-text"
                    class="w-4 h-4"
                  />
                </div>
                <div class="min-w-0">
                  <h3 class="text-sm font-bold text-[#2A1512] truncate">
                    Autorisation parentale — {{ previewVolunteerName }}
                  </h3>
                  <p class="text-[11px] text-[#6E5A52]">
                    Prévisualisation du document officiel
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <a
                  :href="previewPdfUrl"
                  target="_blank"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#FFFCF8] border border-[#D8C6B4] text-[#2A1512] hover:text-[#7A291E] hover:bg-[#F6EFE6] transition-colors shadow-2xs"
                >
                  <UIcon
                    name="i-lucide-external-link"
                    class="w-3.5 h-3.5 text-[#7A291E]"
                  />
                  <span>Ouvrir dans un onglet</span>
                </a>
                <button
                  type="button"
                  aria-label="Fermer"
                  class="w-8 h-8 rounded-full flex items-center justify-center text-[#6E5A52] hover:text-[#2A1512] hover:bg-[#F6EFE6] transition-colors cursor-pointer"
                  @click="isPdfModalOpen = false"
                >
                  <UIcon name="i-lucide-x" class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- Contenu iframe PDF -->
            <div class="flex-1 bg-[#F6EFE6] relative">
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
