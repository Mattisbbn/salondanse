<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const { isAdmin } = useAuth()

if (!isAdmin.value) {
  await navigateTo('/espace-benevole/login')
}

useHead({
  title: 'Gestion des Missions · Administration'
})

const toast = useToast()

interface MissionItem {
  id: string
  name: string
  description: string | null
  color: string | null
  isSensitive: boolean
  isActive: boolean
  defaultCapacity: number
  editionId: string
  stats: {
    slotsCount: number
    registrationsCount: number
    totalCapacity: number
  }
}

interface MissionsResponse {
  total: number
  edition: {
    id: string
    name: string
    year: number
  }
  missions: MissionItem[]
}

const { data, status, refresh } = await useFetch<MissionsResponse>('/api/admin/missions')

const searchQuery = ref('')
const selectedType = ref<'ALL' | 'PUBLIC' | 'SENSITIVE'>('ALL')
const selectedStatus = ref<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL')

// KPIs calculés
const stats = computed(() => {
  const list = data.value?.missions || []
  const total = list.length
  const active = list.filter(m => m.isActive).length
  const sensitive = list.filter(m => m.isSensitive).length
  const totalRegistrations = list.reduce((acc, m) => acc + m.stats.registrationsCount, 0)

  return { total, active, sensitive, totalRegistrations }
})

// Liste filtrée
const filteredMissions = computed(() => {
  if (!data.value?.missions) return []
  let list = data.value.missions

  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(m =>
      m.name.toLowerCase().includes(q)
      || (m.description && m.description.toLowerCase().includes(q))
    )
  }

  if (selectedType.value === 'PUBLIC') {
    list = list.filter(m => !m.isSensitive)
  } else if (selectedType.value === 'SENSITIVE') {
    list = list.filter(m => m.isSensitive)
  }

  if (selectedStatus.value === 'ACTIVE') {
    list = list.filter(m => m.isActive)
  } else if (selectedStatus.value === 'ARCHIVED') {
    list = list.filter(m => !m.isActive)
  }

  return list
})

// ========================================================
// MODALE CRÉATION / MODIFICATION DE MISSION
// ========================================================
const isFormModalOpen = ref(false)
const isEditing = ref(false)
const editingMissionId = ref<string | null>(null)
const isSubmitting = ref(false)

const formState = reactive({
  name: '',
  description: '',
  isSensitive: false,
  isActive: true,
  defaultCapacity: 3,
  updateExistingSlots: false
})

function openCreateModal() {
  isEditing.value = false
  editingMissionId.value = null
  formState.name = ''
  formState.description = ''
  formState.isSensitive = false
  formState.isActive = true
  formState.defaultCapacity = 3
  formState.updateExistingSlots = false
  isFormModalOpen.value = true
}

function openEditModal(mission: MissionItem) {
  isEditing.value = true
  editingMissionId.value = mission.id
  formState.name = mission.name
  formState.description = mission.description || ''
  formState.isSensitive = mission.isSensitive
  formState.isActive = mission.isActive
  formState.defaultCapacity = mission.defaultCapacity
  formState.updateExistingSlots = false
  isFormModalOpen.value = true
}

async function handleSaveMission() {
  if (!formState.name.trim()) {
    toast.add({
      title: 'Nom requis',
      description: 'Veuillez renseigner le nom de la mission.',
      color: 'warning'
    })
    return
  }

  isSubmitting.value = true

  try {
    if (isEditing.value && editingMissionId.value) {
      const res = await $fetch<{ message: string }>(`/api/admin/missions/${editingMissionId.value}`, {
        method: 'PUT',
        body: {
          name: formState.name.trim(),
          description: formState.description.trim() || null,
          isSensitive: formState.isSensitive,
          isActive: formState.isActive,
          defaultCapacity: Number(formState.defaultCapacity),
          updateExistingSlots: formState.updateExistingSlots
        }
      })

      toast.add({
        title: 'Mission mise à jour',
        description: res.message,
        color: 'success'
      })
    } else {
      const res = await $fetch<{ message: string }>('/api/admin/missions', {
        method: 'POST',
        body: {
          name: formState.name.trim(),
          description: formState.description.trim() || null,
          isSensitive: formState.isSensitive,
          defaultCapacity: Number(formState.defaultCapacity),
          editionId: data.value?.edition?.id
        }
      })

      toast.add({
        title: 'Mission créée',
        description: res.message,
        color: 'success'
      })
    }

    isFormModalOpen.value = false
    await refresh()
  } catch (err: unknown) {
    const errorObj = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    toast.add({
      title: 'Erreur',
      description: errorObj?.data?.statusMessage || errorObj?.statusMessage || errorObj?.message || 'Une erreur est survenue lors de l\'enregistrement.',
      color: 'error'
    })
  } finally {
    isSubmitting.value = false
  }
}

// ========================================================
// MODALE SUPPRESSION / ARCHIVAGE
// ========================================================
const isDeleteModalOpen = ref(false)
const missionToDelete = ref<MissionItem | null>(null)
const isDeleting = ref(false)

function openDeleteModal(mission: MissionItem) {
  missionToDelete.value = mission
  isDeleteModalOpen.value = true
}

async function handleConfirmDelete() {
  if (!missionToDelete.value) return
  isDeleting.value = true

  try {
    const res = await $fetch<{ message: string, archived: boolean, deleted: boolean }>(`/api/admin/missions/${missionToDelete.value.id}`, {
      method: 'DELETE'
    })

    toast.add({
      title: res.archived ? 'Mission archivée' : 'Mission supprimée',
      description: res.message,
      color: res.archived ? 'warning' : 'success'
    })

    isDeleteModalOpen.value = false
    missionToDelete.value = null
    await refresh()
  } catch (err: unknown) {
    const errorObj = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    toast.add({
      title: 'Erreur',
      description: errorObj?.data?.statusMessage || errorObj?.statusMessage || errorObj?.message || 'Impossible de supprimer cette mission.',
      color: 'error'
    })
  } finally {
    isDeleting.value = false
  }
}

const columns: TableColumn<MissionItem>[] = [
  {
    accessorKey: 'name',
    header: 'Mission'
  },
  {
    accessorKey: 'description',
    header: 'Description'
  },
  {
    accessorKey: 'isSensitive',
    header: 'Type de poste'
  },
  {
    accessorKey: 'defaultCapacity',
    header: 'Capacité / créneau'
  },
  {
    accessorKey: 'isActive',
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
          Gestion des Missions
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-0.5">
          {{ data?.edition?.name || 'Salon de la Danse' }} • Configuration des postes, quotas et restrictions
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <UButton
          color="primary"
          variant="solid"
          size="md"
          icon="i-lucide-plus"
          label="Ajouter une mission"
          class="font-semibold shadow-xs cursor-pointer"
          @click="openCreateModal"
        />
      </div>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="p-4 bg-white border border-[#E2E8F0] rounded-2xl shadow-xs">
        <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Missions</span>
        <span class="text-2xl font-black text-slate-900 mt-1 block">{{ stats.total }}</span>
      </div>

      <div class="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl shadow-xs">
        <span class="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">Missions Actives</span>
        <span class="text-2xl font-black text-emerald-900 mt-1 block">{{ stats.active }}</span>
      </div>

      <div class="p-4 bg-violet-50/70 border border-violet-200 rounded-2xl shadow-xs">
        <span class="text-[11px] font-semibold text-violet-800 uppercase tracking-wider block">Postes Sensibles (Manuel)</span>
        <span class="text-2xl font-black text-violet-900 mt-1 block">{{ stats.sensitive }}</span>
      </div>

      <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-xs">
        <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Bénévoles Inscrits</span>
        <span class="text-2xl font-black text-slate-900 mt-1 block">{{ stats.totalRegistrations }}</span>
      </div>
    </div>

    <!-- Filtres & Recherche -->
    <div class="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      <div class="w-full sm:max-w-sm">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="Rechercher par nom ou description..."
          size="sm"
          class="w-full"
        />
      </div>

      <div class="flex items-center gap-2 flex-wrap w-full sm:w-auto">
        <!-- Filtre Type -->
        <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl flex-1 sm:flex-initial justify-between sm:justify-start">
          <button
            type="button"
            class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex-1 sm:flex-initial text-center"
            :class="selectedType === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
            @click="selectedType = 'ALL'"
          >
            Tous
          </button>
          <button
            type="button"
            class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex-1 sm:flex-initial text-center"
            :class="selectedType === 'PUBLIC' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
            @click="selectedType = 'PUBLIC'"
          >
            Publiques
          </button>
          <button
            type="button"
            class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex-1 sm:flex-initial text-center"
            :class="selectedType === 'SENSITIVE' ? 'bg-white text-violet-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'"
            @click="selectedType = 'SENSITIVE'"
          >
            Sensibles
          </button>
        </div>

        <!-- Filtre Statut -->
        <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl flex-1 sm:flex-initial justify-between sm:justify-start">
          <button
            type="button"
            class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex-1 sm:flex-initial text-center"
            :class="selectedStatus === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
            @click="selectedStatus = 'ALL'"
          >
            Toutes
          </button>
          <button
            type="button"
            class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex-1 sm:flex-initial text-center"
            :class="selectedStatus === 'ACTIVE' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'"
            @click="selectedStatus = 'ACTIVE'"
          >
            Actives
          </button>
          <button
            type="button"
            class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex-1 sm:flex-initial text-center"
            :class="selectedStatus === 'ARCHIVED' ? 'bg-white text-slate-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'"
            @click="selectedStatus = 'ARCHIVED'"
          >
            Archivées
          </button>
        </div>
      </div>
    </div>

    <!-- Tableau des missions -->
    <div class="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
      <div class="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-sm font-bold text-slate-900">Catalogue des missions</span>
          <UBadge
            color="neutral"
            variant="solid"
            size="sm"
            class="font-semibold text-xs px-2.5 py-0.5 rounded-md"
          >
            {{ filteredMissions.length }} mission(s)
          </UBadge>
        </div>
      </div>

      <!-- Vue Desktop : Tableau UTable -->
      <div class="hidden md:block">
        <UTable
          :data="filteredMissions"
          :columns="columns"
          class="w-full"
        >
          <!-- Cellule Nom de la Mission -->
          <template #name-cell="{ row }">
            <div class="flex items-center gap-3">
              <div
                class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                :class="[
                  row.original.isSensitive
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-violet-100 text-violet-700 border border-violet-200'
                ]"
              >
                <UIcon
                  :name="row.original.isSensitive ? 'i-lucide-lock' : 'i-lucide-briefcase'"
                  class="w-4 h-4"
                />
              </div>
              <div class="min-w-0">
                <span class="font-bold text-slate-900 text-xs sm:text-sm block truncate">
                  {{ row.original.name }}
                </span>
                <span class="text-[11px] text-slate-400 block">
                  {{ row.original.stats.slotsCount }} créneaux rattachés
                </span>
              </div>
            </div>
          </template>

          <!-- Cellule Description -->
          <template #description-cell="{ row }">
            <div class="max-w-xs text-xs text-slate-600 line-clamp-2">
              {{ row.original.description || 'Aucune consigne particulière.' }}
            </div>
          </template>

          <!-- Cellule Type de poste (Sensible / Public) -->
          <template #isSensitive-cell="{ row }">
            <UBadge
              v-if="row.original.isSensitive"
              color="warning"
              variant="solid"
              size="sm"
              class="font-semibold text-xs px-2.5 py-1 inline-flex items-center gap-1 shadow-2xs"
            >
              <UIcon
                name="i-lucide-shield-alert"
                class="w-3.5 h-3.5"
              />
              <span>Poste sensible (Manuel)</span>
            </UBadge>
            <UBadge
              v-else
              color="neutral"
              variant="solid"
              size="sm"
              class="font-semibold text-xs px-2.5 py-1 inline-flex items-center gap-1 shadow-2xs"
            >
              <UIcon
                name="i-lucide-globe"
                class="w-3.5 h-3.5"
              />
              <span>Public (Planning bénévole)</span>
            </UBadge>
          </template>

          <!-- Cellule Capacité par créneau -->
          <template #defaultCapacity-cell="{ row }">
            <div class="text-xs">
              <span class="font-bold text-slate-900">
                {{ row.original.defaultCapacity }} pers. / créneau
              </span>
              <span class="text-[11px] text-slate-400 block mt-0.5">
                {{ row.original.stats.registrationsCount }} inscrit(s) actuel(s)
              </span>
            </div>
          </template>

          <!-- Cellule Statut (Actif / Archivé) -->
          <template #isActive-cell="{ row }">
            <UBadge
              v-if="row.original.isActive"
              color="success"
              variant="solid"
              size="sm"
              class="font-semibold text-xs px-2.5 py-1 inline-flex items-center gap-1 shadow-2xs"
            >
              <UIcon
                name="i-lucide-check-circle"
                class="w-3.5 h-3.5"
              />
              <span>Active</span>
            </UBadge>
            <UBadge
              v-else
              color="neutral"
              variant="solid"
              size="sm"
              class="font-semibold text-xs px-2.5 py-1 inline-flex items-center gap-1 shadow-2xs"
            >
              <UIcon
                name="i-lucide-archive"
                class="w-3.5 h-3.5"
              />
              <span>Archivée</span>
            </UBadge>
          </template>

          <!-- Cellule Actions -->
          <template #actions-cell="{ row }">
            <div class="flex items-center gap-1.5">
              <UButton
                color="neutral"
                variant="subtle"
                size="xs"
                icon="i-lucide-pencil"
                class="cursor-pointer"
                title="Modifier la mission"
                @click="openEditModal(row.original)"
              />

              <UButton
                color="error"
                variant="subtle"
                size="xs"
                icon="i-lucide-trash-2"
                class="cursor-pointer"
                title="Supprimer ou archiver la mission"
                @click="openDeleteModal(row.original)"
              />
            </div>
          </template>
        </UTable>
      </div>

      <!-- Vue Mobile : Liste de Cartes empilées -->
      <div
        v-if="filteredMissions.length > 0"
        class="block md:hidden divide-y divide-slate-100"
      >
        <div
          v-for="mission in filteredMissions"
          :key="mission.id"
          class="p-4 space-y-3 bg-white"
        >
          <!-- En-tête : Titre + Type & Statut -->
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                :class="[
                  mission.isSensitive
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-violet-100 text-violet-700 border border-violet-200'
                ]"
              >
                <UIcon
                  :name="mission.isSensitive ? 'i-lucide-lock' : 'i-lucide-briefcase'"
                  class="w-5 h-5"
                />
              </div>
              <div class="min-w-0">
                <span class="font-bold text-sm text-slate-900 block truncate">
                  {{ mission.name }}
                </span>
                <span class="text-[11px] text-slate-400 block">
                  {{ mission.stats.slotsCount }} créneau(x) rattaché(s)
                </span>
              </div>
            </div>

            <!-- Statut Badge -->
            <UBadge
              v-if="mission.isActive"
              color="success"
              variant="solid"
              size="sm"
              class="font-semibold text-xs px-2.5 py-1 inline-flex items-center gap-1 shrink-0 shadow-2xs"
            >
              <UIcon
                name="i-lucide-check-circle"
                class="w-3.5 h-3.5"
              />
              <span>Active</span>
            </UBadge>
            <UBadge
              v-else
              color="neutral"
              variant="solid"
              size="sm"
              class="font-semibold text-xs px-2.5 py-1 inline-flex items-center gap-1 shrink-0 shadow-2xs"
            >
              <UIcon
                name="i-lucide-archive"
                class="w-3.5 h-3.5"
              />
              <span>Archivée</span>
            </UBadge>
          </div>

          <!-- Type de poste tag -->
          <div>
            <UBadge
              v-if="mission.isSensitive"
              color="warning"
              variant="solid"
              size="sm"
              class="font-semibold text-xs px-2.5 py-1 inline-flex items-center gap-1 shadow-2xs"
            >
              <UIcon
                name="i-lucide-shield-alert"
                class="w-3.5 h-3.5"
              />
              <span>Poste sensible (Attribution manuelle)</span>
            </UBadge>
            <UBadge
              v-else
              color="neutral"
              variant="solid"
              size="sm"
              class="font-semibold text-xs px-2.5 py-1 inline-flex items-center gap-1 shadow-2xs"
            >
              <UIcon
                name="i-lucide-globe"
                class="w-3.5 h-3.5"
              />
              <span>Poste public (Libre choix bénévole)</span>
            </UBadge>
          </div>

          <!-- Description si disponible -->
          <p
            v-if="mission.description"
            class="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100"
          >
            {{ mission.description }}
          </p>

          <!-- Données clés (Capacité & Inscrits) -->
          <div class="text-xs grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <span class="text-slate-400 block text-[11px]">Capacité standard :</span>
              <span class="font-bold text-slate-800">{{ mission.defaultCapacity }} pers. / créneau</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[11px]">Bénévoles inscrits :</span>
              <span class="font-bold text-slate-800">{{ mission.stats.registrationsCount }} inscrit(s)</span>
            </div>
          </div>

          <!-- Actions tactiles -->
          <div class="pt-1 flex items-center gap-2">
            <UButton
              color="primary"
              variant="subtle"
              size="sm"
              icon="i-lucide-pencil"
              label="Modifier"
              class="flex-1 justify-center font-semibold cursor-pointer py-2"
              @click="openEditModal(mission)"
            />

            <UButton
              color="error"
              variant="subtle"
              size="sm"
              icon="i-lucide-trash-2"
              :label="mission.isActive ? 'Archiver' : 'Supprimer'"
              class="cursor-pointer font-semibold px-3 py-2"
              @click="openDeleteModal(mission)"
            />
          </div>
        </div>
      </div>

      <!-- Message si aucune mission -->
      <div
        v-if="filteredMissions.length === 0 && status !== 'pending'"
        class="py-12 text-center text-slate-400"
      >
        <UIcon
          name="i-lucide-briefcase"
          class="w-8 h-8 mx-auto text-slate-300 mb-2"
        />
        <p class="text-xs font-medium">
          Aucune mission trouvée pour ces critères de recherche.
        </p>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- MODALE CRÉATION / ÉDITION D'UNE MISSION                  -->
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
          v-if="isFormModalOpen"
          class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          @click="isFormModalOpen = false"
        >
          <div
            class="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-xl p-6 space-y-4 my-8"
            @click.stop
          >
            <!-- Header -->
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                <UIcon
                  :name="isEditing ? 'i-lucide-pencil' : 'i-lucide-plus-circle'"
                  class="w-5 h-5"
                />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-base font-bold text-slate-900">
                  {{ isEditing ? 'Modifier la mission' : 'Créer une nouvelle mission' }}
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">
                  {{ isEditing ? 'Ajustez les paramètres, quotas ou consignes de ce poste' : 'Ajoutez un nouveau poste bénévole pour cette édition' }}
                </p>
              </div>
            </div>

            <!-- Formulaire -->
            <form
              class="space-y-4 pt-1"
              @submit.prevent="handleSaveMission"
            >
              <!-- Nom -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  Nom de la mission <span class="text-red-500">*</span>
                </label>
                <UInput
                  v-model="formState.name"
                  placeholder="Ex : Accueil Artistes, Contrôle Billetterie..."
                  required
                  size="md"
                  class="w-full"
                />
              </div>

              <!-- Description / Consignes -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  Description & Consignes (lieu, mission...)
                </label>
                <UTextarea
                  v-model="formState.description"
                  placeholder="Précisez le lieu de rendez-vous, les tâches clés ou les prérequis..."
                  :rows="3"
                  size="md"
                  class="w-full text-xs"
                />
              </div>

              <!-- Capacité par créneau -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  Capacité par créneau (nombre max de bénévoles) <span class="text-red-500">*</span>
                </label>
                <UInput
                  v-model.number="formState.defaultCapacity"
                  type="number"
                  min="1"
                  max="50"
                  required
                  size="md"
                  class="w-full font-mono font-bold"
                />
                <p class="text-[11px] text-slate-400 mt-1">
                  Nombre de places disponibles sur chaque créneau horaire de 2h.
                </p>
              </div>

              <!-- Option Sensible (Caisse / Billetterie) -->
              <div class="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2">
                <div class="flex items-center gap-2">
                  <input
                    id="isSensitive"
                    v-model="formState.isSensitive"
                    type="checkbox"
                    class="w-4 h-4 rounded text-amber-600 border-amber-300 focus:ring-amber-500 cursor-pointer"
                  >
                  <label
                    for="isSensitive"
                    class="text-xs font-bold text-amber-950 cursor-pointer flex items-center gap-1.5"
                  >
                    <UIcon
                      name="i-lucide-lock"
                      class="w-3.5 h-3.5 text-amber-700"
                    />
                    <span>Poste sensible (attribution manuelle uniquement)</span>
                  </label>
                </div>
                <p class="text-[11px] text-amber-900/80 pl-6 leading-relaxed">
                  Si cochée, cette mission ne sera pas proposée dans la sélection publique du planning bénévole. Seuls les administrateurs pourront y affecter manuellement des bénévoles de confiance.
                </p>
              </div>

              <!-- Options spécifiques en modification -->
              <div
                v-if="isEditing"
                class="space-y-3 pt-1 border-t border-slate-100"
              >
                <!-- Statut Active / Archivée -->
                <div class="flex items-center gap-2">
                  <input
                    id="isActive"
                    v-model="formState.isActive"
                    type="checkbox"
                    class="w-4 h-4 rounded text-violet-600 border-slate-300 focus:ring-violet-500 cursor-pointer"
                  >
                  <label
                    for="isActive"
                    class="text-xs font-semibold text-slate-800 cursor-pointer"
                  >
                    Mission active (visible pour les nouvelles affectations)
                  </label>
                </div>

                <!-- Répercuter la capacité sur les créneaux existants -->
                <div class="flex items-center gap-2">
                  <input
                    id="updateExistingSlots"
                    v-model="formState.updateExistingSlots"
                    type="checkbox"
                    class="w-4 h-4 rounded text-violet-600 border-slate-300 focus:ring-violet-500 cursor-pointer"
                  >
                  <label
                    for="updateExistingSlots"
                    class="text-xs font-semibold text-slate-800 cursor-pointer"
                  >
                    Appliquer cette nouvelle capacité à tous les créneaux déjà générés
                  </label>
                </div>
              </div>

              <!-- Boutons d'action -->
              <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <UButton
                  color="neutral"
                  variant="subtle"
                  size="sm"
                  label="Annuler"
                  :disabled="isSubmitting"
                  @click="isFormModalOpen = false"
                />

                <UButton
                  type="submit"
                  color="primary"
                  variant="solid"
                  size="sm"
                  :loading="isSubmitting"
                  icon="i-lucide-check"
                  :label="isEditing ? 'Enregistrer les modifications' : 'Créer la mission'"
                  class="font-semibold shadow-xs cursor-pointer"
                />
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ======================================================== -->
    <!-- MODALE CONFIRMATION DE SUPPRESSION / ARCHIVAGE           -->
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
          v-if="isDeleteModalOpen && missionToDelete"
          class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          @click="isDeleteModalOpen = false"
        >
          <div
            class="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-6 space-y-4"
            @click.stop
          >
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <UIcon
                  name="i-lucide-alert-triangle"
                  class="w-5 h-5"
                />
              </div>
              <div>
                <h3 class="text-base font-bold text-slate-900">
                  Supprimer ou archiver la mission
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">
                  Action sur la mission « {{ missionToDelete.name }} »
                </p>
              </div>
            </div>

            <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
              <p v-if="missionToDelete.stats.registrationsCount > 0">
                Cette mission comporte actuellement <span class="font-bold text-slate-900">{{ missionToDelete.stats.registrationsCount }} inscription(s) bénévole(s)</span>.
              </p>
              <p v-else>
                Aucun bénévole n'est actuellement inscrit sur cette mission.
              </p>

              <div class="text-[11px] text-slate-500 bg-white p-2 rounded-lg border border-slate-200">
                <span class="font-bold block text-slate-700">Règle de sécurité :</span>
                • Si des inscriptions existent, la mission sera <span class="font-semibold text-amber-700">archivée</span> (soft delete) pour ne plus la proposer sans corrompre les plannings validés.<br>
                • S'il n'y a aucune inscription, elle sera <span class="font-semibold text-red-700">définitivement supprimée</span> ainsi que ses créneaux rattachés.
              </div>
            </div>

            <div class="flex items-center justify-end gap-2.5 pt-2">
              <UButton
                color="neutral"
                variant="subtle"
                size="sm"
                label="Annuler"
                :disabled="isDeleting"
                @click="isDeleteModalOpen = false"
              />

              <UButton
                color="error"
                variant="solid"
                size="sm"
                :loading="isDeleting"
                icon="i-lucide-trash-2"
                label="Confirmer l'opération"
                class="font-semibold shadow-xs cursor-pointer"
                @click="handleConfirmDelete"
              />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
