<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const { isAdmin } = useAuth()

if (!isAdmin.value) {
  await navigateTo('/espace-benevole/login')
}

useHead({
  title: 'Gestion des Missions & Planning · Administration'
})

const toast = useToast()

// ========================================================
// TYPES & DONNÉES CATALOGUE (ÉTAPE 1)
// ========================================================
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

const { data: catalogueData, status: catalogueStatus, refresh: refreshCatalogue } = await useFetch<MissionsResponse>('/api/admin/missions')

// ========================================================
// TYPES & DONNÉES PLANNING & CRÉNEAUX (ÉTAPE 2)
// ========================================================
interface SlotMissionVolunteer {
  id: string
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
    photoUrl: string | null
  }
}

interface PlannedSlotMission {
  id: string
  missionId: string
  timeSlotId: string
  capacity: number
  capacityMax: number
  locationNotes: string | null
  mission: {
    id: string
    name: string
    description: string | null
    color: string | null
    isSensitive: boolean
    isActive: boolean
  }
  registeredCount: number
  availablePlaces: number
  registrations: SlotMissionVolunteer[]
}

interface PlanningSlot {
  id: string
  date: string
  startTime: string
  endTime: string
  orderIndex: number
  label: string
  slotMissions: PlannedSlotMission[]
}

interface PlanningDay {
  date: string
  dayKey: string
  dayLabel: string
  fullDayLabel: string
  slots: PlanningSlot[]
}

interface PlanningResponse {
  edition: {
    id: string
    name: string
    year: number
  }
  catalogMissions: Array<{
    id: string
    name: string
    description: string | null
    color: string | null
    isSensitive: boolean
    isActive: boolean
  }>
  days: PlanningDay[]
}

const { data: planningData, status: planningStatus, refresh: refreshPlanning } = await useFetch<PlanningResponse>('/api/admin/missions/planning')

// Vue active : 'catalogue' (Étape 1) ou 'planning' (Étape 2)
const currentView = ref<'catalogue' | 'planning'>('catalogue')

// Synchroniser les deux sources de données
async function refreshAll() {
  await Promise.all([refreshCatalogue(), refreshPlanning()])
}

// ========================================================
// ÉTAPE 1 : GESTION DU CATALOGUE (FILTRES & RECHERCHE)
// ========================================================
const searchQuery = ref('')
const selectedType = ref<'ALL' | 'PUBLIC' | 'SENSITIVE'>('ALL')
const selectedStatus = ref<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL')

const stats = computed(() => {
  const list = catalogueData.value?.missions || []
  const total = list.length
  const active = list.filter(m => m.isActive).length
  const sensitive = list.filter(m => m.isSensitive).length
  const totalRegistrations = list.reduce((acc, m) => acc + m.stats.registrationsCount, 0)
  const totalSlotsCount = list.reduce((acc, m) => acc + m.stats.slotsCount, 0)
  const totalCapacityNeeded = list.reduce((acc, m) => acc + m.stats.totalCapacity, 0)

  return { total, active, sensitive, totalRegistrations, totalSlotsCount, totalCapacityNeeded }
})

const filteredMissions = computed(() => {
  if (!catalogueData.value?.missions) return []
  let list = catalogueData.value.missions

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
// MODALE CRÉATION / MODIFICATION CATALOGUE (SANS CAPACITÉ FIGÉE)
// ========================================================
const isFormModalOpen = ref(false)
const isEditing = ref(false)
const editingMissionId = ref<string | null>(null)
const isSubmitting = ref(false)

const formState = reactive({
  name: '',
  description: '',
  isSensitive: false,
  isActive: true
})

function openCreateModal() {
  isEditing.value = false
  editingMissionId.value = null
  formState.name = ''
  formState.description = ''
  formState.isSensitive = false
  formState.isActive = true
  isFormModalOpen.value = true
}

function openEditModal(mission: MissionItem) {
  isEditing.value = true
  editingMissionId.value = mission.id
  formState.name = mission.name
  formState.description = mission.description || ''
  formState.isSensitive = mission.isSensitive
  formState.isActive = mission.isActive
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
          isActive: formState.isActive
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
          editionId: catalogueData.value?.edition?.id
        }
      })

      toast.add({
        title: 'Fiche mission créée',
        description: res.message,
        color: 'success'
      })
    }

    isFormModalOpen.value = false
    await refreshAll()
  } catch (err: unknown) {
    const errorObj = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    toast.add({
      title: 'Erreur',
      description: errorObj?.data?.statusMessage || errorObj?.statusMessage || errorObj?.message || 'Une erreur est survenue.',
      color: 'error'
    })
  } finally {
    isSubmitting.value = false
  }
}

// ========================================================
// MODALE SUPPRESSION / ARCHIVAGE CATALOGUE
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
    await refreshAll()
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

const catalogueColumns: TableColumn<MissionItem>[] = [
  {
    accessorKey: 'name',
    header: 'Mission'
  },
  {
    accessorKey: 'description',
    header: 'Description & Consignes'
  },
  {
    accessorKey: 'isSensitive',
    header: 'Type de poste'
  },
  {
    accessorKey: 'stats',
    header: 'Planification & Jauges'
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

// ========================================================
// ÉTAPE 2 : GESTION DE LA GRILLE DE PLANNING & BESOINS
// ========================================================
const selectedDayKey = ref<string>('')

// Sélection par défaut du premier jour disponible
watch(() => planningData.value?.days, (days) => {
  if (days && days.length > 0 && !selectedDayKey.value) {
    const firstDay = days[0]
    if (firstDay) {
      selectedDayKey.value = firstDay.dayKey
    }
  }
}, { immediate: true })

const activeDay = computed<PlanningDay | null>(() => {
  const days = planningData.value?.days
  if (!days || days.length === 0) return null
  const firstDay = days[0] || null
  if (!selectedDayKey.value) return firstDay
  return days.find(d => d.dayKey === selectedDayKey.value) || firstDay
})

// Statistiques du jour sélectionné
const dayStats = computed(() => {
  if (!activeDay.value) return { slotsCount: 0, missionsCount: 0, totalCapacity: 0, totalRegistrations: 0, coveragePct: 0 }
  let missionsCount = 0
  let totalCapacity = 0
  let totalRegistrations = 0

  for (const slot of activeDay.value.slots) {
    missionsCount += slot.slotMissions.length
    for (const sm of slot.slotMissions) {
      totalCapacity += sm.capacity
      totalRegistrations += sm.registeredCount
    }
  }

  const coveragePct = totalCapacity > 0 ? Math.round((totalRegistrations / totalCapacity) * 100) : 0
  return {
    slotsCount: activeDay.value.slots.length,
    missionsCount,
    totalCapacity,
    totalRegistrations,
    coveragePct
  }
})

// ========================================================
// MODALE PLANIFIER UNE MISSION (ÉTAPE 2)
// ========================================================
const isScheduleModalOpen = ref(false)
const isScheduling = ref(false)

const scheduleFormState = reactive({
  missionId: '',
  targetSlotId: '',
  selectedSlotIds: [] as string[],
  capacity: 4,
  locationNotes: ''
})

function openScheduleModal(presetMissionId?: string, presetSlotId?: string) {
  scheduleFormState.missionId = presetMissionId || (planningData.value?.catalogMissions[0]?.id || '')
  scheduleFormState.targetSlotId = presetSlotId || ''
  scheduleFormState.selectedSlotIds = presetSlotId ? [presetSlotId] : []
  scheduleFormState.capacity = 4
  scheduleFormState.locationNotes = ''
  isScheduleModalOpen.value = true
}

function quickPlanFromCatalogue(mission: MissionItem) {
  currentView.value = 'planning'
  openScheduleModal(mission.id)
}

async function handleConfirmSchedule() {
  if (!scheduleFormState.missionId) {
    toast.add({
      title: 'Mission requise',
      description: 'Veuillez sélectionner une mission du catalogue.',
      color: 'warning'
    })
    return
  }

  const slotIds = scheduleFormState.selectedSlotIds.length > 0
    ? scheduleFormState.selectedSlotIds
    : (scheduleFormState.targetSlotId ? [scheduleFormState.targetSlotId] : [])

  if (slotIds.length === 0) {
    toast.add({
      title: 'Créneau requis',
      description: 'Veuillez sélectionner au moins un créneau horaire.',
      color: 'warning'
    })
    return
  }

  isScheduling.value = true

  try {
    const res = await $fetch<{ message: string }>('/api/admin/missions/schedule', {
      method: 'POST',
      body: {
        missionId: scheduleFormState.missionId,
        timeSlotIds: slotIds,
        capacity: Number(scheduleFormState.capacity) || 1,
        locationNotes: scheduleFormState.locationNotes.trim() || null
      }
    })

    toast.add({
      title: 'Planification enregistrée',
      description: res.message,
      color: 'success'
    })

    isScheduleModalOpen.value = false
    await refreshAll()
  } catch (err: unknown) {
    const errorObj = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    toast.add({
      title: 'Erreur de planification',
      description: errorObj?.data?.statusMessage || errorObj?.statusMessage || errorObj?.message || 'Impossible d\'enregistrer cette planification.',
      color: 'error'
    })
  } finally {
    isScheduling.value = false
  }
}

// ========================================================
// MODALE AJUSTER LE CRÉNEAU (CAPACITÉ & LIEU PRÉCIS)
// ========================================================
const isAdjustModalOpen = ref(false)
const isAdjusting = ref(false)
const isUnscheduling = ref(false)

const currentAdjustSlotMission = ref<PlannedSlotMission | null>(null)
const currentAdjustSlotLabel = ref<string>('')

const adjustFormState = reactive({
  capacity: 2,
  locationNotes: ''
})

function openAdjustModal(sm: PlannedSlotMission, slotLabel: string) {
  currentAdjustSlotMission.value = sm
  currentAdjustSlotLabel.value = slotLabel
  adjustFormState.capacity = sm.capacity
  adjustFormState.locationNotes = sm.locationNotes || ''
  isAdjustModalOpen.value = true
}

async function handleSaveAdjust() {
  if (!currentAdjustSlotMission.value) return
  isAdjusting.value = true

  try {
    const res = await $fetch<{ message: string }>(`/api/admin/missions/slots/${currentAdjustSlotMission.value.id}`, {
      method: 'PUT',
      body: {
        capacity: Number(adjustFormState.capacity),
        locationNotes: adjustFormState.locationNotes.trim() || null
      }
    })

    toast.add({
      title: 'Créneau ajusté',
      description: res.message,
      color: 'success'
    })

    isAdjustModalOpen.value = false
    await refreshAll()
  } catch (err: unknown) {
    const errorObj = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    toast.add({
      title: 'Erreur',
      description: errorObj?.data?.statusMessage || errorObj?.statusMessage || errorObj?.message || 'Impossible de mettre à jour le créneau.',
      color: 'error'
    })
  } finally {
    isAdjusting.value = false
  }
}

async function handleUnscheduleSlotMission(smId: string) {
  if (!confirm('Êtes-vous sûr de vouloir retirer cette mission de ce créneau horaire ?')) {
    return
  }

  isUnscheduling.value = true
  try {
    const res = await $fetch<{ message: string }>(`/api/admin/missions/slots/${smId}`, {
      method: 'DELETE'
    })

    toast.add({
      title: 'Mission déprogrammée',
      description: res.message,
      color: 'success'
    })

    if (isAdjustModalOpen.value && currentAdjustSlotMission.value?.id === smId) {
      isAdjustModalOpen.value = false
    }
    await refreshAll()
  } catch (err: unknown) {
    const errorObj = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    toast.add({
      title: 'Impossible de déprogrammer',
      description: errorObj?.data?.statusMessage || errorObj?.statusMessage || errorObj?.message || 'Erreur lors de la suppression.',
      color: 'error'
    })
  } finally {
    isUnscheduling.value = false
  }
}

// Bénévoles inscrits sur un créneau pour aperçu
const isVolunteersListModalOpen = ref(false)
const selectedVolunteersList = ref<SlotMissionVolunteer[]>([])
const selectedVolunteersMissionTitle = ref('')

function openVolunteersPreview(sm: PlannedSlotMission) {
  selectedVolunteersList.value = sm.registrations
  selectedVolunteersMissionTitle.value = `${sm.mission.name} (${sm.registeredCount} bénévole(s))`
  isVolunteersListModalOpen.value = true
}
</script>

<template>
  <div class="space-y-6">
    <!-- En-tête principal -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
          <span>Gestion des Missions & Planning</span>
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-0.5">
          {{ catalogueData?.edition?.name || 'Salon de la Danse' }} • Deux étapes distinctes : Création catalogue puis Planification & Besoins par créneau
        </p>
      </div>

      <!-- Sélecteur d'étape / onglet principal -->
      <div class="flex items-center gap-2">
        <div class="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
          <button
            type="button"
            class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer"
            :class="currentView === 'catalogue' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
            @click="currentView = 'catalogue'"
          >
            <UIcon
              name="i-lucide-layers"
              class="w-4 h-4 text-violet-600"
            />
            <span>1. Catalogue des missions</span>
            <UBadge
              color="neutral"
              variant="solid"
              size="xs"
              class="font-bold"
            >
              {{ catalogueData?.missions?.length || 0 }}
            </UBadge>
          </button>

          <button
            type="button"
            class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer"
            :class="currentView === 'planning' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
            @click="currentView = 'planning'"
          >
            <UIcon
              name="i-lucide-calendar-clock"
              class="w-4 h-4 text-emerald-600"
            />
            <span>2. Grille de planning & Besoins</span>
            <UBadge
              color="success"
              variant="solid"
              size="xs"
              class="font-bold"
            >
              {{ stats.totalSlotsCount }}
            </UBadge>
          </button>
        </div>

        <UButton
          v-if="currentView === 'catalogue'"
          color="primary"
          variant="solid"
          size="md"
          icon="i-lucide-plus"
          label="Ajouter une mission"
          class="font-semibold shadow-xs cursor-pointer"
          @click="openCreateModal"
        />

        <UButton
          v-else
          color="primary"
          variant="solid"
          size="md"
          icon="i-lucide-calendar-plus"
          label="Planifier un créneau"
          class="font-semibold shadow-xs cursor-pointer"
          @click="openScheduleModal()"
        />
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- VUE 1 : CATALOGUE DES MISSIONS (ÉTAPE 1)                  -->
    <!-- ======================================================== -->
    <div
      v-if="currentView === 'catalogue'"
      class="space-y-6"
    >
      <!-- KPIs globaux -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="p-4 bg-white border border-[#E2E8F0] rounded-2xl shadow-xs">
          <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Missions Catalogue</span>
          <span class="text-2xl font-black text-slate-900 mt-1 block">{{ stats.total }}</span>
          <span class="text-[11px] text-slate-400 mt-0.5 block">Dont {{ stats.active }} active(s)</span>
        </div>

        <div class="p-4 bg-violet-50/70 border border-violet-200 rounded-2xl shadow-xs">
          <span class="text-[11px] font-semibold text-violet-800 uppercase tracking-wider block">Postes Sensibles (Manuel)</span>
          <span class="text-2xl font-black text-violet-900 mt-1 block">{{ stats.sensitive }}</span>
          <span class="text-[11px] text-violet-700/80 mt-0.5 block">Attribution admin réservée</span>
        </div>

        <div class="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl shadow-xs">
          <span class="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">Créneaux Planifiés</span>
          <span class="text-2xl font-black text-emerald-900 mt-1 block">{{ stats.totalSlotsCount }}</span>
          <span class="text-[11px] text-emerald-700/80 mt-0.5 block">Affectations temporelles actives</span>
        </div>

        <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-xs">
          <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Bénévoles Inscrits</span>
          <div class="flex items-baseline gap-1 mt-1">
            <span class="text-2xl font-black text-slate-900">{{ stats.totalRegistrations }}</span>
            <span class="text-xs text-slate-500 font-semibold">/ {{ stats.totalCapacityNeeded }} cibles</span>
          </div>
          <span class="text-[11px] text-slate-400 mt-0.5 block">Total places requises</span>
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

      <!-- Tableau du Catalogue -->
      <div class="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div class="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-sm font-bold text-slate-900">Missions référencées au catalogue</span>
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

        <!-- Vue Desktop -->
        <div class="hidden md:block">
          <UTable
            :data="filteredMissions"
            :columns="catalogueColumns"
            class="w-full"
          >
            <!-- Cellule Nom -->
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
                    {{ row.original.stats.slotsCount }} créneau(x) planifié(s)
                  </span>
                </div>
              </div>
            </template>

            <!-- Cellule Description -->
            <template #description-cell="{ row }">
              <div class="max-w-xs text-xs text-slate-600 line-clamp-2">
                {{ row.original.description || 'Aucune consigne générale spécifiée.' }}
              </div>
            </template>

            <!-- Cellule Type de poste -->
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
                <span>Public</span>
              </UBadge>
            </template>

            <!-- Cellule Planification & Jauges -->
            <template #stats-cell="{ row }">
              <div class="text-xs space-y-0.5">
                <div class="flex items-center gap-1.5 font-bold text-slate-900">
                  <UIcon
                    name="i-lucide-calendar-check"
                    class="w-3.5 h-3.5 text-emerald-600"
                  />
                  <span>{{ row.original.stats.slotsCount }} créneau(x)</span>
                </div>
                <div class="text-[11px] text-slate-500">
                  {{ row.original.stats.registrationsCount }} / {{ row.original.stats.totalCapacity }} place(s) occupée(s)
                </div>
              </div>
            </template>

            <!-- Cellule Statut -->
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
                  color="primary"
                  variant="subtle"
                  size="xs"
                  icon="i-lucide-calendar-plus"
                  label="Planifier"
                  class="cursor-pointer font-semibold"
                  title="Planifier cette mission sur la grille"
                  @click="quickPlanFromCatalogue(row.original)"
                />

                <UButton
                  color="neutral"
                  variant="subtle"
                  size="xs"
                  icon="i-lucide-pencil"
                  class="cursor-pointer"
                  title="Modifier la fiche mission"
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

        <!-- Vue Mobile -->
        <div
          v-if="filteredMissions.length > 0"
          class="block md:hidden divide-y divide-slate-100"
        >
          <div
            v-for="mission in filteredMissions"
            :key="mission.id"
            class="p-4 space-y-3 bg-white"
          >
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
                  <span class="font-bold text-sm text-slate-900 block truncate">{{ mission.name }}</span>
                  <span class="text-[11px] text-slate-400 block">{{ mission.stats.slotsCount }} créneau(x) planifié(s)</span>
                </div>
              </div>

              <UBadge
                v-if="mission.isActive"
                color="success"
                variant="solid"
                size="sm"
                class="font-semibold text-xs px-2 py-0.5"
              >
                Active
              </UBadge>
              <UBadge
                v-else
                color="neutral"
                variant="solid"
                size="sm"
                class="font-semibold text-xs px-2 py-0.5"
              >
                Archivée
              </UBadge>
            </div>

            <p
              v-if="mission.description"
              class="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100"
            >
              {{ mission.description }}
            </p>

            <div class="text-xs flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <span class="text-slate-400 block text-[11px]">Créneaux planifiés :</span>
                <span class="font-bold text-slate-800">{{ mission.stats.slotsCount }}</span>
              </div>
              <div>
                <span class="text-slate-400 block text-[11px]">Bénévoles inscrits :</span>
                <span class="font-bold text-slate-800">{{ mission.stats.registrationsCount }} / {{ mission.stats.totalCapacity }}</span>
              </div>
            </div>

            <div class="pt-1 flex items-center gap-2">
              <UButton
                color="primary"
                variant="solid"
                size="sm"
                icon="i-lucide-calendar-plus"
                label="Planifier"
                class="flex-1 justify-center font-semibold cursor-pointer py-2"
                @click="quickPlanFromCatalogue(mission)"
              />
              <UButton
                color="neutral"
                variant="subtle"
                size="sm"
                icon="i-lucide-pencil"
                class="cursor-pointer py-2"
                @click="openEditModal(mission)"
              />
              <UButton
                color="error"
                variant="subtle"
                size="sm"
                icon="i-lucide-trash-2"
                class="cursor-pointer py-2"
                @click="openDeleteModal(mission)"
              />
            </div>
          </div>
        </div>

        <div
          v-if="filteredMissions.length === 0 && catalogueStatus !== 'pending'"
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
    </div>

    <!-- ======================================================== -->
    <!-- VUE 2 : GRILLE DE PLANNING & BESOINS (ÉTAPE 2)            -->
    <!-- ======================================================== -->
    <div
      v-else
      class="space-y-6"
    >
      <!-- Barre des Jours d'événement -->
      <div class="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button
            v-for="day in planningData?.days || []"
            :key="day.dayKey"
            type="button"
            class="px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer shrink-0 flex items-center gap-2"
            :class="selectedDayKey === day.dayKey ? 'bg-primary-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'"
            @click="selectedDayKey = day.dayKey"
          >
            <UIcon
              name="i-lucide-calendar"
              class="w-4 h-4"
            />
            <span>{{ day.dayLabel }}</span>
            <UBadge
              :color="selectedDayKey === day.dayKey ? 'neutral' : 'neutral'"
              variant="solid"
              size="xs"
              class="font-bold text-[10px]"
            >
              {{ day.slots.reduce((acc, s) => acc + s.slotMissions.length, 0) }} mission(s)
            </UBadge>
          </button>
        </div>

        <div class="flex items-center gap-2">
          <UButton
            color="primary"
            variant="solid"
            size="sm"
            icon="i-lucide-plus"
            label="Planifier sur ce jour"
            class="font-semibold shadow-xs cursor-pointer"
            @click="openScheduleModal()"
          />
        </div>
      </div>

      <!-- Synthèse du Jour sélectionné -->
      <div
        v-if="activeDay"
        class="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div class="p-4 bg-white border border-[#E2E8F0] rounded-2xl shadow-xs">
          <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Date du planning</span>
          <span class="text-base sm:text-lg font-black text-slate-900 mt-1 block truncate">{{ activeDay.fullDayLabel }}</span>
          <span class="text-[11px] text-slate-400 mt-0.5 block">{{ dayStats.slotsCount }} tranche(s) horaire(s)</span>
        </div>

        <div class="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl shadow-xs">
          <span class="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">Postes Programmés</span>
          <span class="text-2xl font-black text-emerald-900 mt-1 block">{{ dayStats.missionsCount }}</span>
          <span class="text-[11px] text-emerald-700/80 mt-0.5 block">Sur toute la journée</span>
        </div>

        <div class="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl shadow-xs">
          <span class="text-[11px] font-semibold text-blue-800 uppercase tracking-wider block">Besoins Cibles (Capacité)</span>
          <span class="text-2xl font-black text-blue-900 mt-1 block">{{ dayStats.totalCapacity }} pers.</span>
          <span class="text-[11px] text-blue-700/80 mt-0.5 block">Jauge totale requise</span>
        </div>

        <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-xs">
          <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Taux de Couverture</span>
          <div class="flex items-baseline gap-1 mt-1">
            <span class="text-2xl font-black text-slate-900">{{ dayStats.totalRegistrations }}</span>
            <span class="text-xs text-slate-500 font-semibold">/ {{ dayStats.totalCapacity }} ({{ dayStats.coveragePct }}%)</span>
          </div>
          <div class="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              class="bg-emerald-500 h-full rounded-full transition-all duration-300"
              :style="{ width: `${Math.min(100, dayStats.coveragePct)}%` }"
            />
          </div>
        </div>
      </div>

      <!-- Grille des créneaux horaires -->
      <div
        v-if="activeDay && activeDay.slots.length > 0"
        class="space-y-4"
      >
        <div
          v-for="slot in activeDay.slots"
          :key="slot.id"
          class="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden"
        >
          <!-- En-tête du créneau horaire -->
          <div class="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="px-3 py-1 bg-slate-900 text-white font-mono font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5">
                <UIcon
                  name="i-lucide-clock"
                  class="w-3.5 h-3.5"
                />
                <span>{{ slot.startTime }} - {{ slot.endTime }}</span>
              </div>
              <div class="text-xs text-slate-600 font-medium">
                <span class="font-bold text-slate-900">{{ slot.slotMissions.length }}</span> mission(s) planifiée(s) •
                <span class="font-bold text-slate-900">
                  {{ slot.slotMissions.reduce((acc, sm) => acc + sm.registeredCount, 0) }} /
                  {{ slot.slotMissions.reduce((acc, sm) => acc + sm.capacity, 0) }}
                </span> bénévoles requis
              </div>
            </div>

            <div>
              <UButton
                color="primary"
                variant="soft"
                size="xs"
                icon="i-lucide-plus"
                label="Ajouter une mission sur ce créneau"
                class="font-semibold cursor-pointer"
                @click="openScheduleModal(undefined, slot.id)"
              />
            </div>
          </div>

          <!-- Missions positionnées sur ce créneau -->
          <div class="p-4">
            <div
              v-if="slot.slotMissions.length > 0"
              class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5"
            >
              <div
                v-for="sm in slot.slotMissions"
                :key="sm.id"
                class="p-3.5 rounded-xl border transition-all duration-150 relative group bg-white hover:border-primary-400 hover:shadow-xs cursor-pointer"
                :class="[
                  sm.mission.isSensitive
                    ? 'border-amber-200/90 bg-amber-50/30'
                    : 'border-slate-200 bg-white'
                ]"
                @click="openAdjustModal(sm, `${slot.startTime} - ${slot.endTime}`)"
              >
                <!-- Ligne Titre + Badge Type -->
                <div class="flex items-start justify-between gap-2">
                  <div class="flex items-center gap-2 min-w-0">
                    <div
                      class="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0"
                      :class="[
                        sm.mission.isSensitive
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-violet-100 text-violet-700'
                      ]"
                    >
                      <UIcon
                        :name="sm.mission.isSensitive ? 'i-lucide-lock' : 'i-lucide-briefcase'"
                        class="w-3.5 h-3.5"
                      />
                    </div>
                    <span class="font-bold text-xs text-slate-900 truncate block">
                      {{ sm.mission.name }}
                    </span>
                  </div>

                  <UBadge
                    v-if="sm.mission.isSensitive"
                    color="warning"
                    variant="solid"
                    size="xs"
                    class="text-[10px] font-bold px-1.5 py-0.5 shrink-0"
                  >
                    Sensible
                  </UBadge>
                </div>

                <!-- Lieu ou point de rendez-vous précis -->
                <div class="mt-2.5 flex items-center gap-1.5 text-[11px]">
                  <UIcon
                    name="i-lucide-map-pin"
                    class="w-3.5 h-3.5 text-primary-600 shrink-0"
                  />
                  <span
                    v-if="sm.locationNotes"
                    class="font-medium text-slate-800 truncate"
                  >
                    {{ sm.locationNotes }}
                  </span>
                  <span
                    v-else
                    class="text-slate-400 italic"
                  >
                    Point de RDV non précisé
                  </span>
                </div>

                <!-- Jauge de capacité spécifique -->
                <div class="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-slate-500 font-medium text-[11px]">Jauge créneau :</span>
                    <span class="font-mono font-bold text-slate-900">
                      {{ sm.registeredCount }} / {{ sm.capacity }} pers.
                    </span>
                  </div>

                  <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all duration-300"
                      :class="[
                        sm.registeredCount >= sm.capacity
                          ? 'bg-emerald-500'
                          : (sm.registeredCount > 0 ? 'bg-amber-500' : 'bg-slate-300')
                      ]"
                      :style="{ width: `${Math.min(100, (sm.registeredCount / (sm.capacity || 1)) * 100)}%` }"
                    />
                  </div>
                </div>

                <!-- Bénévoles inscrits (Avatars / Liste) & Actions -->
                <div class="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div
                    v-if="sm.registeredCount > 0"
                    class="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium"
                    @click.stop="openVolunteersPreview(sm)"
                  >
                    <UIcon
                      name="i-lucide-users"
                      class="w-3.5 h-3.5 text-slate-500"
                    />
                    <span>{{ sm.registeredCount }} inscrit(s)</span>
                  </div>
                  <div
                    v-else
                    class="text-[11px] text-slate-400 italic"
                  >
                    0 inscrit
                  </div>

                  <!-- Boutons de gestion rapide -->
                  <div class="flex items-center gap-1">
                    <UButton
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      icon="i-lucide-sliders-horizontal"
                      class="cursor-pointer"
                      title="Ajuster la capacité ou le lieu"
                      @click.stop="openAdjustModal(sm, `${slot.startTime} - ${slot.endTime}`)"
                    />
                    <UButton
                      color="error"
                      variant="ghost"
                      size="xs"
                      icon="i-lucide-trash-2"
                      class="cursor-pointer text-red-500 hover:text-red-700"
                      title="Retirer cette mission du créneau"
                      @click.stop="handleUnscheduleSlotMission(sm.id)"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- État vide : aucune mission sur ce créneau -->
            <div
              v-else
              class="py-6 border-2 border-dashed border-slate-200 rounded-xl text-center space-y-2"
            >
              <UIcon
                name="i-lucide-calendar-x"
                class="w-6 h-6 mx-auto text-slate-300"
              />
              <p class="text-xs text-slate-500">
                Aucune mission planifiée sur ce créneau horaire ({{ slot.startTime }} - {{ slot.endTime }}).
              </p>
              <UButton
                color="primary"
                variant="subtle"
                size="xs"
                icon="i-lucide-plus"
                label="Positionner une mission"
                class="cursor-pointer font-semibold"
                @click="openScheduleModal(undefined, slot.id)"
              />
            </div>
          </div>
        </div>
      </div>

      <div
        v-else-if="planningStatus !== 'pending'"
        class="py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200"
      >
        <UIcon
          name="i-lucide-calendar-off"
          class="w-10 h-10 mx-auto text-slate-300 mb-2"
        />
        <p class="text-sm font-semibold text-slate-700">
          Aucun créneau configuré pour ce jour.
        </p>
        <p class="text-xs text-slate-400 mt-1">
          Configurez les journées de l'édition dans la section Éditions.
        </p>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- MODALE CRÉATION / MODIFICATION FICHE CATALOGUE (ÉTAPE 1) -->
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
                  {{ isEditing ? 'Modifier la mission (Catalogue)' : 'Nouvelle mission (Catalogue)' }}
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">
                  Étape 1 : Définissez les caractéristiques générales du poste avant sa planification temporelle
                </p>
              </div>
            </div>

            <!-- Formulaire -->
            <form
              class="space-y-4 pt-1"
              @submit.prevent="handleSaveMission"
            >
              <!-- Nom de la mission -->
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

              <!-- Description & Consignes générales -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  Description & Consignes générales
                </label>
                <UTextarea
                  v-model="formState.description"
                  placeholder="Précisez le rôle du bénévole, les tâches attendues, les compétences requises..."
                  :rows="3"
                  size="md"
                  class="w-full text-xs"
                />
              </div>

              <!-- Option Sensible (Caisse / Billetterie / Gestion de clés) -->
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

              <!-- Option Active en modification -->
              <div
                v-if="isEditing"
                class="space-y-3 pt-1 border-t border-slate-100"
              >
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
                    Mission active (disponible au catalogue pour les plannings)
                  </label>
                </div>
              </div>

              <!-- Note explicative sur les créneaux -->
              <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-start gap-2">
                <UIcon
                  name="i-lucide-info"
                  class="w-4 h-4 text-primary-600 shrink-0 mt-0.5"
                />
                <span>
                  <strong>Pas de capacité globale imposée :</strong> la jauge de bénévoles requis (ex: 6 le matin, 2 l'après-midi) et le lieu précis se configurent à l'étape 2 sur la grille de planning pour chaque créneau horaire.
                </span>
              </div>

              <!-- Actions -->
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
                  :label="isEditing ? 'Enregistrer les modifications' : 'Créer la mission (Catalogue)'"
                  class="font-semibold shadow-xs cursor-pointer"
                />
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ======================================================== -->
    <!-- MODALE PLANIFIER UNE MISSION SUR LA GRILLE (ÉTAPE 2)     -->
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
          v-if="isScheduleModalOpen"
          class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          @click="isScheduleModalOpen = false"
        >
          <div
            class="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-xl p-6 space-y-4 my-8"
            @click.stop
          >
            <!-- Header -->
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <UIcon
                  name="i-lucide-calendar-plus"
                  class="w-5 h-5"
                />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-base font-bold text-slate-900">
                  Planifier & Définir les besoins
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">
                  Étape 2 : Positionnez une mission sur la grille horaire avec sa jauge cible et son lieu de RDV
                </p>
              </div>
            </div>

            <!-- Formulaire -->
            <form
              class="space-y-4 pt-1"
              @submit.prevent="handleConfirmSchedule"
            >
              <!-- Sélection de la mission -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  Mission du catalogue <span class="text-red-500">*</span>
                </label>
                <select
                  v-model="scheduleFormState.missionId"
                  required
                  class="w-full text-xs font-medium bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                >
                  <option
                    disabled
                    value=""
                  >
                    Sélectionnez une mission...
                  </option>
                  <option
                    v-for="m in planningData?.catalogMissions || []"
                    :key="m.id"
                    :value="m.id"
                  >
                    {{ m.name }} {{ m.isSensitive ? '🔒 (Poste sensible)' : '' }}
                  </option>
                </select>
              </div>

              <!-- Créneau(x) ciblé(s) sur le jour actuel -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  Tranches horaires ({{ activeDay?.dayLabel || 'Journée' }}) <span class="text-red-500">*</span>
                </label>
                <div class="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                  <label
                    v-for="s in activeDay?.slots || []"
                    :key="s.id"
                    class="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 text-xs font-medium cursor-pointer hover:border-primary-400"
                    :class="scheduleFormState.selectedSlotIds.includes(s.id) ? 'ring-2 ring-primary-500 border-primary-500' : ''"
                  >
                    <input
                      v-model="scheduleFormState.selectedSlotIds"
                      type="checkbox"
                      :value="s.id"
                      class="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                    >
                    <span class="font-mono text-slate-800">{{ s.startTime }} - {{ s.endTime }}</span>
                  </label>
                </div>
              </div>

              <!-- Jauge cible / Capacité spécifique pour ce créneau -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  Jauge cible / Capacité spécifique à ce moment-là <span class="text-red-500">*</span>
                </label>
                <div class="flex items-center gap-2">
                  <UInput
                    v-model.number="scheduleFormState.capacity"
                    type="number"
                    min="1"
                    max="50"
                    required
                    size="md"
                    class="w-32 font-mono font-bold"
                  />
                  <span class="text-xs text-slate-500 font-medium">bénévoles requis</span>
                </div>
                <p class="text-[11px] text-slate-400 mt-1">
                  Exemple : 6 personnes le samedi matin, 2 personnes le dimanche après-midi.
                </p>
              </div>

              <!-- Lieu ou point de rendez-vous précis -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  Lieu ou point de rendez-vous précis (optionnel)
                </label>
                <UInput
                  v-model="scheduleFormState.locationNotes"
                  placeholder="Ex : Entrée Nord - Guichet 2, Scène JayDance, Stand Billetterie..."
                  size="md"
                  class="w-full text-xs"
                />
                <p class="text-[11px] text-slate-400 mt-1">
                  Sera affiché directement sur le récapitulatif et le badge du bénévole.
                </p>
              </div>

              <!-- Actions -->
              <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <UButton
                  color="neutral"
                  variant="subtle"
                  size="sm"
                  label="Annuler"
                  :disabled="isScheduling"
                  @click="isScheduleModalOpen = false"
                />

                <UButton
                  type="submit"
                  color="primary"
                  variant="solid"
                  size="sm"
                  :loading="isScheduling"
                  icon="i-lucide-check"
                  label="Planifier sur la grille"
                  class="font-semibold shadow-xs cursor-pointer"
                />
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ======================================================== -->
    <!-- MODALE AJUSTER LE CRÉNEAU PLANIFIÉ (CAPACITÉ & LIEU)     -->
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
          v-if="isAdjustModalOpen && currentAdjustSlotMission"
          class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          @click="isAdjustModalOpen = false"
        >
          <div
            class="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-6 space-y-4 my-8"
            @click.stop
          >
            <!-- Header -->
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                <UIcon
                  name="i-lucide-sliders-horizontal"
                  class="w-5 h-5"
                />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-base font-bold text-slate-900 truncate">
                  Ajuster le créneau : {{ currentAdjustSlotMission.mission.name }}
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">
                  {{ currentAdjustSlotLabel }} • Modifiez les besoins cibles ou le point de RDV
                </p>
              </div>
            </div>

            <!-- Inscrits actuels -->
            <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
              <div>
                <span class="text-slate-500 block text-[11px]">Bénévoles déjà inscrits :</span>
                <span class="font-bold text-slate-900 text-sm">
                  {{ currentAdjustSlotMission.registeredCount }} bénévole(s)
                </span>
              </div>
              <UButton
                v-if="currentAdjustSlotMission.registeredCount > 0"
                color="primary"
                variant="subtle"
                size="xs"
                icon="i-lucide-eye"
                label="Voir les inscrits"
                class="cursor-pointer"
                @click="openVolunteersPreview(currentAdjustSlotMission)"
              />
            </div>

            <!-- Formulaire -->
            <form
              class="space-y-4 pt-1"
              @submit.prevent="handleSaveAdjust"
            >
              <!-- Jauge cible / Capacité spécifique -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  Capacité requise pour ce créneau <span class="text-red-500">*</span>
                </label>
                <UInput
                  v-model.number="adjustFormState.capacity"
                  type="number"
                  :min="currentAdjustSlotMission.registeredCount"
                  max="50"
                  required
                  size="md"
                  class="w-full font-mono font-bold"
                />
                <p class="text-[11px] text-slate-400 mt-1">
                  Ne peut pas être inférieure aux {{ currentAdjustSlotMission.registeredCount }} bénévole(s) déjà inscrit(s).
                </p>
              </div>

              <!-- Point de rendez-vous précis -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  Lieu ou point de rendez-vous précis
                </label>
                <UInput
                  v-model="adjustFormState.locationNotes"
                  placeholder="Ex : Entrée Nord, Scène A, Vestiaire B..."
                  size="md"
                  class="w-full text-xs"
                />
              </div>

              <!-- Actions -->
              <div class="flex items-center justify-between pt-3 border-t border-slate-100">
                <UButton
                  color="error"
                  variant="subtle"
                  size="sm"
                  icon="i-lucide-trash-2"
                  label="Retirer du créneau"
                  :disabled="isAdjusting || isUnscheduling"
                  class="cursor-pointer font-semibold"
                  @click="handleUnscheduleSlotMission(currentAdjustSlotMission.id)"
                />

                <div class="flex items-center gap-2">
                  <UButton
                    color="neutral"
                    variant="subtle"
                    size="sm"
                    label="Annuler"
                    :disabled="isAdjusting || isUnscheduling"
                    @click="isAdjustModalOpen = false"
                  />

                  <UButton
                    type="submit"
                    color="primary"
                    variant="solid"
                    size="sm"
                    :loading="isAdjusting"
                    icon="i-lucide-check"
                    label="Enregistrer"
                    class="font-semibold shadow-xs cursor-pointer"
                  />
                </div>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ======================================================== -->
    <!-- MODALE APERÇU DES BÉNÉVOLES INSCRITS SUR UN CRÉNEAU      -->
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
          v-if="isVolunteersListModalOpen"
          class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          @click="isVolunteersListModalOpen = false"
        >
          <div
            class="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-6 space-y-4 my-8"
            @click.stop
          >
            <div class="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 class="text-sm font-bold text-slate-900">
                  {{ selectedVolunteersMissionTitle }}
                </h3>
                <p class="text-xs text-slate-500">
                  Bénévoles affectés à ce créneau
                </p>
              </div>
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-lucide-x"
                class="cursor-pointer"
                @click="isVolunteersListModalOpen = false"
              />
            </div>

            <div class="divide-y divide-slate-100 max-h-60 overflow-y-auto">
              <div
                v-for="reg in selectedVolunteersList"
                :key="reg.id"
                class="py-2.5 flex items-center justify-between gap-3 text-xs"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {{ reg.user.firstName.charAt(0) }}{{ reg.user.lastName.charAt(0) }}
                  </div>
                  <div class="min-w-0">
                    <span class="font-bold text-slate-900 block truncate">
                      {{ reg.user.firstName }} {{ reg.user.lastName }}
                    </span>
                    <span class="text-[11px] text-slate-400 block truncate">
                      {{ reg.user.phone || reg.user.email }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div class="pt-2 flex justify-end">
              <UButton
                color="neutral"
                variant="subtle"
                size="sm"
                label="Fermer"
                class="cursor-pointer font-semibold"
                @click="isVolunteersListModalOpen = false"
              />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ======================================================== -->
    <!-- MODALE CONFIRMATION DE SUPPRESSION / ARCHIVAGE CATALOGUE -->
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
                • Si des inscriptions existent, la mission sera <span class="font-semibold text-amber-700">archivée</span> (soft delete) pour préserver les plannings validés.<br>
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
