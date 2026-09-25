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
// TYPES & DONNÉES PLANNING (CALENDRIER ÉTAPE 2)
// ========================================================
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

const { data: planningData, refresh: refreshPlanning } = await useFetch<PlanningResponse>('/api/admin/missions/planning')

// Vue active : 'catalogue' (Étape 1) ou 'planning' (Étape 2)
const currentView = ref<'catalogue' | 'planning'>('planning')

// Synchroniser les deux sources
async function refreshAll() {
  await Promise.all([refreshCatalogue(), refreshPlanning()])
}

// ========================================================
// ÉTAPE 1 : CATALOGUE DES MISSIONS (FILTRES & RECHERCHE)
// ========================================================
const searchQuery = ref('')
const selectedType = ref<'ALL' | 'PUBLIC' | 'SENSITIVE'>('ALL')
const selectedStatus = ref<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL')

const stats = computed(() => {
  const list = catalogueData.value?.missions || []
  const total = list.length
  const active = list.filter(m => m.isActive).length
  const sensitive = list.filter(m => m.isSensitive).length
  const totalSlotsCount = list.reduce((acc, m) => acc + m.stats.slotsCount, 0)
  const totalCapacityNeeded = list.reduce((acc, m) => acc + m.stats.totalCapacity, 0)

  return { total, active, sensitive, totalSlotsCount, totalCapacityNeeded }
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
// MODALE CRÉATION / MODIFICATION FICHE CATALOGUE
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
    header: 'Créneaux planifiés'
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
// ÉTAPE 2 : VRAI CALENDRIER CLASSIQUE (GRILLE COMPACTE)
// ========================================================
interface TimeRangeHeader {
  key: string
  startTime: string
  endTime: string
  orderIndex: number
}

// Extraction des plages horaires uniques triées pour les lignes du calendrier
const timeRangeRows = computed<TimeRangeHeader[]>(() => {
  const map = new Map<string, TimeRangeHeader>()
  for (const day of planningData.value?.days || []) {
    for (const slot of day.slots) {
      const key = `${slot.startTime} - ${slot.endTime}`
      if (!map.has(key)) {
        map.set(key, {
          key,
          startTime: slot.startTime,
          endTime: slot.endTime,
          orderIndex: slot.orderIndex
        })
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.orderIndex - b.orderIndex || a.startTime.localeCompare(b.startTime))
})

// Trouver le slot correspondant à un jour et une plage horaire
function getSlotForDayAndTime(day: PlanningDay, timeRange: TimeRangeHeader): PlanningSlot | undefined {
  return day.slots.find(s => s.startTime === timeRange.startTime && s.endTime === timeRange.endTime)
}

// Total de bénévoles requis pour une plage horaire donnée sur l'ensemble des jours
function getTimeRangeTotalCapacity(timeRange: TimeRangeHeader): number {
  let sum = 0
  for (const day of planningData.value?.days || []) {
    const slot = getSlotForDayAndTime(day, timeRange)
    if (slot) {
      sum += slot.slotMissions.reduce((acc, sm) => acc + sm.capacity, 0)
    }
  }
  return sum
}

// Total de bénévoles requis pour un jour donné
function getDayTotalCapacity(day: PlanningDay): number {
  return day.slots.reduce((acc, s) => acc + s.slotMissions.reduce((mAcc, sm) => mAcc + sm.capacity, 0), 0)
}

// ========================================================
// MODALE PLANIFIER UNE MISSION (ÉTAPE 2)
// ========================================================
const isScheduleModalOpen = ref(false)
const isScheduling = ref(false)

const scheduleFormState = reactive({
  missionId: '',
  targetSlotId: '',
  capacity: 4
})

function openScheduleModal(presetMissionId?: string, presetSlotId?: string) {
  scheduleFormState.missionId = presetMissionId || (planningData.value?.catalogMissions[0]?.id || '')
  scheduleFormState.targetSlotId = presetSlotId || (planningData.value?.days[0]?.slots[0]?.id || '')
  scheduleFormState.capacity = 4
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

  if (!scheduleFormState.targetSlotId) {
    toast.add({
      title: 'Créneau requis',
      description: 'Veuillez sélectionner un créneau horaire.',
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
        timeSlotId: scheduleFormState.targetSlotId,
        capacity: Number(scheduleFormState.capacity) || 1
      }
    })

    toast.add({
      title: 'Positionné sur le calendrier',
      description: res.message,
      color: 'success'
    })

    isScheduleModalOpen.value = false
    await refreshAll()
  } catch (err: unknown) {
    const errorObj = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    toast.add({
      title: 'Erreur',
      description: errorObj?.data?.statusMessage || errorObj?.statusMessage || errorObj?.message || 'Impossible d\'enregistrer.',
      color: 'error'
    })
  } finally {
    isScheduling.value = false
  }
}

// ========================================================
// MODALE AJUSTER LE CRÉNEAU (CAPACITÉ REQUISE)
// ========================================================
const isAdjustModalOpen = ref(false)
const isAdjusting = ref(false)
const isUnscheduling = ref(false)

const currentAdjustSlotMission = ref<PlannedSlotMission | null>(null)
const currentAdjustSlotLabel = ref<string>('')

const adjustFormState = reactive({
  capacity: 2
})

function openAdjustModal(sm: PlannedSlotMission, slotLabel: string) {
  currentAdjustSlotMission.value = sm
  currentAdjustSlotLabel.value = slotLabel
  adjustFormState.capacity = sm.capacity
  isAdjustModalOpen.value = true
}

async function handleSaveAdjust() {
  if (!currentAdjustSlotMission.value) return
  isAdjusting.value = true

  try {
    const res = await $fetch<{ message: string }>(`/api/admin/missions/slots/${currentAdjustSlotMission.value.id}`, {
      method: 'PUT',
      body: {
        capacity: Number(adjustFormState.capacity)
      }
    })

    toast.add({
      title: 'Capacité mise à jour',
      description: res.message,
      color: 'success'
    })

    isAdjustModalOpen.value = false
    await refreshAll()
  } catch (err: unknown) {
    const errorObj = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    toast.add({
      title: 'Erreur',
      description: errorObj?.data?.statusMessage || errorObj?.statusMessage || errorObj?.message || 'Impossible de mettre à jour.',
      color: 'error'
    })
  } finally {
    isAdjusting.value = false
  }
}

async function handleUnscheduleSlotMission(smId: string) {
  if (!confirm('Voulez-vous retirer cette mission de ce créneau ?')) {
    return
  }

  isUnscheduling.value = true
  try {
    const res = await $fetch<{ message: string }>(`/api/admin/missions/slots/${smId}`, {
      method: 'DELETE'
    })

    toast.add({
      title: 'Mission retirée du créneau',
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
      title: 'Action impossible',
      description: errorObj?.data?.statusMessage || errorObj?.statusMessage || errorObj?.message || 'Erreur lors de la suppression.',
      color: 'error'
    })
  } finally {
    isUnscheduling.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- En-tête principal -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4  ">
      <div>
        <span class="text-[11px] font-bold tracking-[0.16em] uppercase text-[#7A291E] block mb-1">
          Exploitation & Grille horaire
        </span>
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-[#2A1512]">
          Missions & Planning
        </h1>
      
      </div>

      <!-- Sélecteur d'onglet principal -->
      <div class="flex items-center gap-3">
        <div class="inline-flex p-1 bg-[#EFE5DA] rounded-full border border-[#E6D9CB]">
          <button
            type="button"
            class="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer"
            :class="currentView === 'planning' ? 'bg-[#FFFCF8] text-[#2A1512] shadow-xs' : 'text-[#6E5A52] hover:text-[#2A1512]'"
            @click="currentView = 'planning'"
          >
            <UIcon
              name="i-lucide-calendar-days"
              class="w-4 h-4 text-[#7A291E]"
            />
            <span>Calendrier </span>
            <span
              class="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#E1E9DC] text-[#2F5238]"
            >
              {{ stats.totalSlotsCount }}
            </span>
          </button>

          <button
            type="button"
            class="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer"
            :class="currentView === 'catalogue' ? 'bg-[#FFFCF8] text-[#2A1512] shadow-xs' : 'text-[#6E5A52] hover:text-[#2A1512]'"
            @click="currentView = 'catalogue'"
          >
            <UIcon
              name="i-lucide-layers"
              class="w-4 h-4 text-[#7A291E]"
            />
            <span>Liste des missions</span>
            <span
              class="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#EFE5DA] text-[#5B463E]"
            >
              {{ catalogueData?.missions?.length || 0 }}
            </span>
          </button>
        </div>

        <button
          v-if="currentView === 'planning'"
          type="button"
          class="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
          @click="openScheduleModal()"
        >
          <UIcon name="i-lucide-plus" class="w-4 h-4" />
          <span>Planifier un poste</span>
        </button>

        <button
          v-else
          type="button"
          class="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
          @click="openCreateModal"
        >
          <UIcon name="i-lucide-plus" class="w-4 h-4" />
          <span>Ajouter au catalogue</span>
        </button>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- VUE 1 : VRAI CALENDRIER CLASSIQUE (GRILLE COMPACTE)      -->
    <!-- ======================================================== -->
    <div
      v-if="currentView === 'planning'"
      class="space-y-4"
    >

      <!-- TABLEAU CALENDRIER CLASSIQUE (Multi-colonnes Jours x Lignes Horaires) -->
      <div class="bg-[#FFFCF8] rounded-2xl border border-[#E6D9CB] shadow-xs overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-left">
            <thead>
              <tr class="bg-[#F6EFE6] border-b border-[#E6D9CB] text-xs text-[#2A1512]">
                <!-- Colonne des horaires (Y-axis) -->
                <th class="py-3.5 px-3 w-32 border-r border-[#E6D9CB] text-center uppercase tracking-wider text-[11px] font-bold text-[#6E5A52] bg-[#F6EFE6] sticky left-0 z-10">
                  Horaires
                </th>

                <!-- Colonnes des jours (X-axis) -->
                <th
                  v-for="day in planningData?.days || []"
                  :key="day.dayKey"
                  class="py-3 px-3.5 min-w-[220px] border-r border-[#E6D9CB] last:border-r-0"
                >
                  <div class="flex items-center justify-between">
                    <div>
                      <span class="font-bold text-[#2A1512] text-xs sm:text-sm block">{{ day.dayLabel }}</span>
                      <span class="text-[10px] text-[#6E5A52] font-medium block">
                        Total : {{ getDayTotalCapacity(day) }} bénévoles requis
                      </span>
                    </div>
                    <span
                      class="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EFE5DA] text-[#5B463E] border border-[#D8C6B4]"
                    >
                      {{ day.slots.reduce((acc, s) => acc + s.slotMissions.length, 0) }} mission(s)
                    </span>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody class="divide-y divide-[#E6D9CB]">
              <tr
                v-for="timeRange in timeRangeRows"
                :key="timeRange.key"
                class="hover:bg-[#F6EFE6]/40 transition-colors"
              >
                <!-- Entête horaire sur la gauche -->
                <td class="py-3 px-2 border-r border-[#E6D9CB] bg-[#F6EFE6]/60 text-center font-mono font-bold text-xs text-[#2A1512] whitespace-nowrap sticky left-0 z-10">
                  <div class="flex items-center justify-center gap-1.5">
                    <UIcon
                      name="i-lucide-clock"
                      class="w-3.5 h-3.5 text-[#6E5A52]"
                    />
                    <span>{{ timeRange.key }}</span>
                  </div>
                  <span class="text-[10px] text-[#6E5A52] font-normal block mt-0.5">
                    {{ getTimeRangeTotalCapacity(timeRange) }} pers. tot.
                  </span>
                </td>

                <!-- Cellules du calendrier par jour -->
                <td
                  v-for="day in planningData?.days || []"
                  :key="`${day.dayKey}-${timeRange.key}`"
                  class="p-2 border-r border-[#E6D9CB] last:border-r-0 align-top"
                >
                  <div
                    v-if="getSlotForDayAndTime(day, timeRange)"
                    class="space-y-1.5 min-h-[50px] flex flex-col justify-between h-full"
                  >
                    <!-- Liste compacte des missions positionnées -->
                    <div class="space-y-1.5">
                      <div
                        v-for="sm in getSlotForDayAndTime(day, timeRange)!.slotMissions"
                        :key="sm.id"
                        class="group flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                        :class="[
                          sm.mission.isSensitive
                            ? 'bg-[#F3DCD5] text-[#7A291E] border-[#D9A79F] hover:border-[#7A291E]'
                            : 'bg-[#FFFCF8] text-[#2A1512] border-[#D8C6B4] hover:border-[#7A291E]'
                        ]"
                        :title="`Cliquer pour modifier la capacité (${sm.capacity} pers.) ou déprogrammer`"
                        @click="openAdjustModal(sm, `${day.dayLabel} • ${timeRange.key}`)"
                      >
                        <!-- Nom de la mission avec icône cadenas si sensible -->
                        <div class="flex items-center gap-1.5 min-w-0">
                          <UIcon
                            :name="sm.mission.isSensitive ? 'i-lucide-lock' : 'i-lucide-briefcase'"
                            class="w-3.5 h-3.5 shrink-0"
                            :class="sm.mission.isSensitive ? 'text-[#7A291E]' : 'text-[#6E5A52]'"
                          />
                          <span class="font-bold truncate text-[11px] sm:text-xs">
                            {{ sm.mission.name }}
                          </span>
                        </div>

                        <!-- Capacité seule : pas de x inscrits, pas de point de RDV -->
                        <div class="flex items-center gap-1 shrink-0">
                          <span
                            class="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            :class="sm.mission.isSensitive ? 'bg-[#FFFCF8] text-[#7A291E] border border-[#D9A79F]' : 'bg-[#EFE5DA] text-[#5B463E] border border-[#D8C6B4]'"
                          >
                            {{ sm.capacity }} pers.
                          </span>
                          <UIcon
                            name="i-lucide-pencil"
                            class="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#6E5A52]"
                          />
                        </div>
                      </div>
                    </div>

                    <!-- Bouton ajouter compact pour ce créneau -->
                    <button
                      type="button"
                      class="w-full mt-1 py-1 rounded-lg border border-dashed border-[#D8C6B4] text-[#6E5A52] hover:text-[#7A291E] hover:border-[#7A291E] hover:bg-[#F6EFE6] text-[10px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer opacity-70 hover:opacity-100"
                      title="Ajouter une mission sur ce créneau"
                      @click="openScheduleModal(undefined, getSlotForDayAndTime(day, timeRange)!.id)"
                    >
                      <UIcon
                        name="i-lucide-plus"
                        class="w-3 h-3"
                      />
                      <span>Ajouter</span>
                    </button>
                  </div>

                  <!-- Pas de créneau configuré sur cette tranche -->
                  <div
                    v-else
                    class="h-full flex items-center justify-center text-[#D8C6B4] text-[10px] italic"
                  >
                    -
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- VUE 2 : CATALOGUE DES MISSIONS (ÉTAPE 1)                  -->
    <!-- ======================================================== -->
    <div
      v-else
      class="space-y-6"
    >
   
      <!-- Filtres & Recherche -->
      <div class="bg-[#FFFCF8] rounded-2xl border border-[#E6D9CB] shadow-xs p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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
          <div class="flex items-center gap-1 bg-[#EFE5DA] p-1 rounded-full border border-[#E6D9CB] flex-1 sm:flex-initial justify-between sm:justify-start">
            <button
              type="button"
              class="px-3 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer flex-1 sm:flex-initial text-center"
              :class="selectedType === 'ALL' ? 'bg-[#FFFCF8] text-[#2A1512] shadow-xs' : 'text-[#6E5A52] hover:text-[#2A1512]'"
              @click="selectedType = 'ALL'"
            >
              Tous
            </button>
            <button
              type="button"
              class="px-3 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer flex-1 sm:flex-initial text-center"
              :class="selectedType === 'PUBLIC' ? 'bg-[#FFFCF8] text-[#2A1512] shadow-xs' : 'text-[#6E5A52] hover:text-[#2A1512]'"
              @click="selectedType = 'PUBLIC'"
            >
              Publiques
            </button>
            <button
              type="button"
              class="px-3 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer flex-1 sm:flex-initial text-center"
              :class="selectedType === 'SENSITIVE' ? 'bg-[#FFFCF8] text-[#7A291E] shadow-xs font-bold' : 'text-[#6E5A52] hover:text-[#2A1512]'"
              @click="selectedType = 'SENSITIVE'"
            >
              Sensibles
            </button>
          </div>

          <!-- Filtre Statut -->
          <div class="flex items-center gap-1 bg-[#EFE5DA] p-1 rounded-full border border-[#E6D9CB] flex-1 sm:flex-initial justify-between sm:justify-start">
            <button
              type="button"
              class="px-3 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer flex-1 sm:flex-initial text-center"
              :class="selectedStatus === 'ALL' ? 'bg-[#FFFCF8] text-[#2A1512] shadow-xs' : 'text-[#6E5A52] hover:text-[#2A1512]'"
              @click="selectedStatus = 'ALL'"
            >
              Toutes
            </button>
            <button
              type="button"
              class="px-3 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer flex-1 sm:flex-initial text-center"
              :class="selectedStatus === 'ACTIVE' ? 'bg-[#FFFCF8] text-[#2F5238] shadow-xs font-bold' : 'text-[#6E5A52] hover:text-[#2A1512]'"
              @click="selectedStatus = 'ACTIVE'"
            >
              Actives
            </button>
            <button
              type="button"
              class="px-3 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer flex-1 sm:flex-initial text-center"
              :class="selectedStatus === 'ARCHIVED' ? 'bg-[#FFFCF8] text-[#5B463E] shadow-xs font-bold' : 'text-[#6E5A52] hover:text-[#2A1512]'"
              @click="selectedStatus = 'ARCHIVED'"
            >
              Archivées
            </button>
          </div>
        </div>
      </div>

      <!-- Tableau du Catalogue -->
      <div class="bg-[#FFFCF8] rounded-2xl border border-[#E6D9CB] shadow-xs overflow-hidden">
        <div class="p-4 sm:p-5 border-b border-[#E6D9CB] flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-sm font-bold text-[#2A1512]">Missions référencées au catalogue</span>
            <span
              class="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#EFE5DA] text-[#5B463E] border border-[#D8C6B4]"
            >
              {{ filteredMissions.length }} mission(s)
            </span>
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
                      ? 'bg-[#F3DCD5] text-[#7A291E] border border-[#D9A79F]'
                      : 'bg-[#EFE5DA] text-[#5B463E] border border-[#D8C6B4]'
                  ]"
                >
                  <UIcon
                    :name="row.original.isSensitive ? 'i-lucide-lock' : 'i-lucide-briefcase'"
                    class="w-4 h-4"
                  />
                </div>
                <div class="min-w-0">
                  <span class="font-bold text-[#2A1512] text-xs sm:text-sm block truncate">
                    {{ row.original.name }}
                  </span>
                  <span class="text-[11px] text-[#6E5A52] block">
                    {{ row.original.stats.slotsCount }} créneau(x) planifié(s)
                  </span>
                </div>
              </div>
            </template>

            <!-- Cellule Description -->
            <template #description-cell="{ row }">
              <div class="max-w-xs text-xs text-[#6E5A52] line-clamp-2">
                {{ row.original.description || 'Aucune consigne générale spécifiée.' }}
              </div>
            </template>

            <!-- Cellule Type de poste -->
            <template #isSensitive-cell="{ row }">
              <span
                v-if="row.original.isSensitive"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F3DCD5] text-[#7A291E] border border-[#D9A79F]"
              >
                <UIcon
                  name="i-lucide-shield-alert"
                  class="w-3.5 h-3.5"
                />
                <span>Poste sensible</span>
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EFE5DA] text-[#5B463E] border border-[#D8C6B4]"
              >
                <UIcon
                  name="i-lucide-globe"
                  class="w-3.5 h-3.5"
                />
                <span>Public</span>
              </span>
            </template>

            <!-- Cellule Créneaux planifiés -->
            <template #stats-cell="{ row }">
              <div class="text-xs space-y-0.5">
                <div class="flex items-center gap-1.5 font-bold text-[#2A1512]">
                  <UIcon
                    name="i-lucide-calendar-check"
                    class="w-3.5 h-3.5 text-[#2F5238]"
                  />
                  <span>{{ row.original.stats.slotsCount }} créneau(x)</span>
                </div>
                <div class="text-[11px] text-[#6E5A52]">
                  {{ row.original.stats.totalCapacity }} place(s) requise(s)
                </div>
              </div>
            </template>

            <!-- Cellule Statut -->
            <template #isActive-cell="{ row }">
              <span
                v-if="row.original.isActive"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#E1E9DC] text-[#2F5238] border border-[#9DB79F]"
              >
                <UIcon
                  name="i-lucide-check-circle"
                  class="w-3.5 h-3.5"
                />
                <span>Active</span>
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EFE5DA] text-[#5B463E] border border-[#D8C6B4]"
              >
                <UIcon
                  name="i-lucide-archive"
                  class="w-3.5 h-3.5"
                />
                <span>Archivée</span>
              </span>
            </template>

            <!-- Cellule Actions -->
            <template #actions-cell="{ row }">
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] text-white font-semibold text-xs transition-colors cursor-pointer"
                  title="Positionner sur la grille du calendrier"
                  @click="quickPlanFromCatalogue(row.original)"
                >
                  <UIcon name="i-lucide-calendar-plus" class="w-3.5 h-3.5" />
                  <span>Planifier</span>
                </button>

                <button
                  type="button"
                  class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#FFFCF8] hover:bg-[#F6EFE6] text-[#2A1512] border border-[#D8C6B4] transition-colors cursor-pointer"
                  title="Modifier la fiche mission"
                  @click="openEditModal(row.original)"
                >
                  <UIcon name="i-lucide-pencil" class="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#FFFCF8] hover:bg-[#F4D8D3] text-[#9A2A22] border border-[#D9A79F] transition-colors cursor-pointer"
                  title="Supprimer ou archiver la mission"
                  @click="openDeleteModal(row.original)"
                >
                  <UIcon name="i-lucide-trash-2" class="w-3.5 h-3.5" />
                </button>
              </div>
            </template>
          </UTable>
        </div>

        <!-- Vue Mobile -->
        <div
          v-if="filteredMissions.length > 0"
          class="block md:hidden divide-y divide-[#E6D9CB]"
        >
          <div
            v-for="mission in filteredMissions"
            :key="mission.id"
            class="p-4 space-y-3 bg-[#FFFCF8]"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2.5 min-w-0">
                <div
                  class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                  :class="[
                    mission.isSensitive
                      ? 'bg-[#F3DCD5] text-[#7A291E] border border-[#D9A79F]'
                      : 'bg-[#EFE5DA] text-[#5B463E] border border-[#D8C6B4]'
                  ]"
                >
                  <UIcon
                    :name="mission.isSensitive ? 'i-lucide-lock' : 'i-lucide-briefcase'"
                    class="w-5 h-5"
                  />
                </div>
                <div class="min-w-0">
                  <span class="font-bold text-sm text-[#2A1512] block truncate">{{ mission.name }}</span>
                  <span class="text-[11px] text-[#6E5A52] block">{{ mission.stats.slotsCount }} créneau(x)</span>
                </div>
              </div>

              <span
                v-if="mission.isActive"
                class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E1E9DC] text-[#2F5238] border border-[#9DB79F]"
              >
                Active
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EFE5DA] text-[#5B463E] border border-[#D8C6B4]"
              >
                Archivée
              </span>
            </div>

            <p
              v-if="mission.description"
              class="text-xs text-[#6E5A52] bg-[#F6EFE6] p-2.5 rounded-xl border border-[#E6D9CB]"
            >
              {{ mission.description }}
            </p>

            <div class="text-xs flex items-center justify-between p-2.5 rounded-xl bg-[#F6EFE6] border border-[#E6D9CB]">
              <div>
                <span class="text-[#6E5A52] block text-[11px]">Créneaux planifiés :</span>
                <span class="font-bold text-[#2A1512]">{{ mission.stats.slotsCount }}</span>
              </div>
              <div>
                <span class="text-[#6E5A52] block text-[11px]">Capacité requise :</span>
                <span class="font-bold text-[#2A1512]">{{ mission.stats.totalCapacity }} pers.</span>
              </div>
            </div>

            <div class="pt-1 flex items-center gap-2">
              <button
                type="button"
                class="flex-1 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] text-white font-semibold text-xs transition-colors cursor-pointer"
                @click="quickPlanFromCatalogue(mission)"
              >
                <UIcon name="i-lucide-calendar-plus" class="w-4 h-4" />
                <span>Planifier</span>
              </button>
              <button
                type="button"
                class="inline-flex items-center justify-center w-11 h-11 rounded-full bg-[#FFFCF8] hover:bg-[#F6EFE6] text-[#2A1512] border border-[#D8C6B4] transition-colors cursor-pointer"
                @click="openEditModal(mission)"
              >
                <UIcon name="i-lucide-pencil" class="w-4 h-4" />
              </button>
              <button
                type="button"
                class="inline-flex items-center justify-center w-11 h-11 rounded-full bg-[#FFFCF8] hover:bg-[#F4D8D3] text-[#9A2A22] border border-[#D9A79F] transition-colors cursor-pointer"
                @click="openDeleteModal(mission)"
              >
                <UIcon name="i-lucide-trash-2" class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div
          v-if="filteredMissions.length === 0 && catalogueStatus !== 'pending'"
          class="py-12 text-center text-[#6E5A52]"
        >
          <UIcon
            name="i-lucide-briefcase"
            class="w-8 h-8 mx-auto text-[#D8C6B4] mb-2"
          />
          <p class="text-xs font-medium">
            Aucune mission trouvée pour ces critères de recherche.
          </p>
        </div>
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
          class="fixed inset-0 z-50 bg-[#2E1411]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          @click="isFormModalOpen = false"
        >
          <div
            class="w-full max-w-lg bg-[#FFFCF8] rounded-2xl border border-[#E6D9CB] shadow-xl p-6 space-y-4 my-8"
            @click.stop
          >
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-[#F3DCD5] text-[#7A291E] flex items-center justify-center shrink-0">
                <UIcon
                  :name="isEditing ? 'i-lucide-pencil' : 'i-lucide-plus-circle'"
                  class="w-5 h-5"
                />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-lg font-bold text-[#2A1512]">
                  {{ isEditing ? 'Modifier la mission (Catalogue)' : 'Nouvelle mission (Catalogue)' }}
                </h3>
                <p class="text-xs text-[#6E5A52] mt-0.5">
                  Étape 1 : Fiche générale du catalogue sans capacité arbitraire
                </p>
              </div>
            </div>

            <form
              class="space-y-4 pt-1"
              @submit.prevent="handleSaveMission"
            >
              <div>
                <label class="block text-xs font-semibold text-[#2A1512] mb-1">
                  Nom de la mission <span class="text-[#9A2A22]">*</span>
                </label>
                <UInput
                  v-model="formState.name"
                  placeholder="Ex : Accueil Artistes, Contrôle Billetterie..."
                  required
                  size="md"
                  class="w-full"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-[#2A1512] mb-1">
                  Description & Consignes générales
                </label>
                <UTextarea
                  v-model="formState.description"
                  placeholder="Précisez le rôle du bénévole, les tâches attendues..."
                  :rows="3"
                  size="md"
                  class="w-full text-xs"
                />
              </div>

              <div class="p-3 bg-[#F3DCD5]/60 border border-[#D9A79F] rounded-xl space-y-2">
                <div class="flex items-center gap-2">
                  <input
                    id="isSensitive"
                    v-model="formState.isSensitive"
                    type="checkbox"
                    class="w-4 h-4 rounded text-[#7A291E] border-[#D9A79F] focus:ring-[#7A291E] cursor-pointer"
                  >
                  <label
                    for="isSensitive"
                    class="text-xs font-bold text-[#7A291E] cursor-pointer flex items-center gap-1.5"
                  >
                    <UIcon
                      name="i-lucide-lock"
                      class="w-3.5 h-3.5 text-[#7A291E]"
                    />
                    <span>Poste sensible (attribution manuelle uniquement)</span>
                  </label>
                </div>
                <p class="text-[11px] text-[#7A291E]/80 pl-6 leading-relaxed">
                  Si cochée, cette mission ne sera pas proposée dans la sélection publique des bénévoles.
                </p>
              </div>

              <div
                v-if="isEditing"
                class="space-y-3 pt-1 border-t border-[#E6D9CB]"
              >
                <div class="flex items-center gap-2">
                  <input
                    id="isActive"
                    v-model="formState.isActive"
                    type="checkbox"
                    class="w-4 h-4 rounded text-[#7A291E] border-[#D8C6B4] focus:ring-[#7A291E] cursor-pointer"
                  >
                  <label
                    for="isActive"
                    class="text-xs font-semibold text-[#2A1512] cursor-pointer"
                  >
                    Mission active (disponible au catalogue pour le planning)
                  </label>
                </div>
              </div>

              <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E6D9CB]">
                <button
                  type="button"
                  class="inline-flex items-center justify-center h-9 px-4 rounded-full bg-[#FFFCF8] hover:bg-[#F6EFE6] text-[#2A1512] border border-[#D8C6B4] font-semibold text-xs transition-colors cursor-pointer"
                  :disabled="isSubmitting"
                  @click="isFormModalOpen = false"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  class="inline-flex items-center justify-center gap-2 h-9 px-5 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
                  :disabled="isSubmitting"
                >
                  <UIcon name="i-lucide-check" class="w-4 h-4" />
                  <span>{{ isEditing ? 'Enregistrer' : 'Créer la fiche mission' }}</span>
                </button>
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
          class="fixed inset-0 z-50 bg-[#2E1411]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          @click="isScheduleModalOpen = false"
        >
          <div
            class="w-full max-w-md bg-[#F6EFE6] rounded-2xl border border-[#D8C6B4] shadow-2xl p-6 space-y-4 my-8"
            @click.stop
          >
            <div class="flex items-start gap-3 pb-3 border-b border-[#E6D9CB]">
              <div class="w-10 h-10 rounded-xl bg-[#E1E9DC] text-[#2F5238] border border-[#C5D5BD] flex items-center justify-center shrink-0">
                <UIcon
                  name="i-lucide-calendar-plus"
                  class="w-5 h-5"
                />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-lg font-bold text-[#2A1512]">
                  Planifier un poste sur le calendrier
                </h3>
                <p class="text-xs text-[#6E5A52] mt-0.5">
                  Étape 2 : Positionnez une mission sur la grille avec sa capacité requise
                </p>
              </div>
            </div>

            <form
              class="space-y-4 pt-1"
              @submit.prevent="handleConfirmSchedule"
            >
              <!-- Sélection de la mission -->
              <div>
                <label class="block text-xs font-semibold text-[#2A1512] mb-1.5">
                  Mission <span class="text-[#9A2A22]">*</span>
                </label>
                <select
                  v-model="scheduleFormState.missionId"
                  required
                  class="w-full text-xs font-medium bg-[#FFFCF8] border border-[#D8C6B4] text-[#2A1512] rounded-xl px-3 py-2.5 shadow-2xs focus:ring-2 focus:ring-[#7A291E] focus:outline-none"
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
                    {{ m.name }} {{ m.isSensitive ? '🔒 (Sensible)' : '' }}
                  </option>
                </select>
              </div>

              <!-- Sélection de la tranche horaire -->
              <div>
                <label class="block text-xs font-semibold text-[#2A1512] mb-1.5">
                  Tranche horaire & Jour <span class="text-[#9A2A22]">*</span>
                </label>
                <select
                  v-model="scheduleFormState.targetSlotId"
                  required
                  class="w-full text-xs font-medium bg-[#FFFCF8] border border-[#D8C6B4] text-[#2A1512] rounded-xl px-3 py-2.5 shadow-2xs focus:ring-2 focus:ring-[#7A291E] focus:outline-none font-mono"
                >
                  <optgroup
                    v-for="day in planningData?.days || []"
                    :key="day.dayKey"
                    :label="day.dayLabel"
                  >
                    <option
                      v-for="s in day.slots"
                      :key="s.id"
                      :value="s.id"
                    >
                      {{ day.dayLabel }} • {{ s.startTime }} - {{ s.endTime }}
                    </option>
                  </optgroup>
                </select>
              </div>

              <!-- Capacité requise -->
              <div>
                <label class="block text-xs font-semibold text-[#2A1512] mb-1.5">
                  Capacité requise (bénévoles nécessaires) <span class="text-[#9A2A22]">*</span>
                </label>
                <div class="flex items-center gap-2.5">
                  <input
                    v-model.number="scheduleFormState.capacity"
                    type="number"
                    min="1"
                    max="50"
                    required
                    class="w-28 text-xs font-mono font-bold bg-[#FFFCF8] border border-[#D8C6B4] text-[#2A1512] rounded-xl px-3 py-2.5 shadow-2xs focus:ring-2 focus:ring-[#7A291E] focus:outline-none"
                  />
                  <span class="text-xs text-[#6E5A52] font-medium">bénévoles requis</span>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center justify-end gap-2.5 pt-4 border-t border-[#E6D9CB]">
                <button
                  type="button"
                  class="inline-flex items-center justify-center h-9 px-4 rounded-full bg-[#EFE5DA] hover:bg-[#E6D9CB] text-[#2A1512] border border-[#D8C6B4] font-semibold text-xs transition-colors cursor-pointer"
                  :disabled="isScheduling"
                  @click="isScheduleModalOpen = false"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  class="inline-flex items-center justify-center gap-2 h-9 px-5 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
                  :disabled="isScheduling"
                >
                  <UIcon name="i-lucide-check" class="w-4 h-4" />
                  <span>Ajouter au calendrier</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ======================================================== -->
    <!-- MODALE AJUSTER LE CRÉNEAU PLANIFIÉ (CAPACITÉ REQUISE)    -->
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
          class="fixed inset-0 z-50 bg-[#2E1411]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          @click="isAdjustModalOpen = false"
        >
          <div
            class="w-full max-w-sm bg-[#FFFCF8] rounded-2xl border border-[#E6D9CB] shadow-xl p-6 space-y-4 my-8"
            @click.stop
          >
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-[#F3DCD5] text-[#7A291E] flex items-center justify-center shrink-0">
                <UIcon
                  name="i-lucide-sliders-horizontal"
                  class="w-5 h-5"
                />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-base font-bold text-[#2A1512] truncate">
                  {{ currentAdjustSlotMission.mission.name }}
                </h3>
                <p class="text-xs text-[#6E5A52] mt-0.5">
                  {{ currentAdjustSlotLabel }}
                </p>
              </div>
            </div>

            <form
              class="space-y-4 pt-1"
              @submit.prevent="handleSaveAdjust"
            >
              <div>
                <label class="block text-xs font-semibold text-[#2A1512] mb-1">
                  Nombre de bénévoles requis <span class="text-[#9A2A22]">*</span>
                </label>
                <div class="flex items-center gap-2">
                  <UInput
                    v-model.number="adjustFormState.capacity"
                    type="number"
                    min="1"
                    max="50"
                    required
                    size="md"
                    class="w-32 font-mono font-bold"
                  />
                  <span class="text-xs text-[#6E5A52] font-medium">bénévoles requis</span>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center justify-between pt-3 border-t border-[#E6D9CB]">
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[#FFFCF8] hover:bg-[#F4D8D3] text-[#9A2A22] border border-[#D9A79F] font-semibold text-xs transition-colors cursor-pointer"
                  :disabled="isAdjusting || isUnscheduling"
                  @click="handleUnscheduleSlotMission(currentAdjustSlotMission.id)"
                >
                  <UIcon name="i-lucide-trash-2" class="w-3.5 h-3.5" />
                  <span>Retirer</span>
                </button>

                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="inline-flex items-center justify-center h-9 px-4 rounded-full bg-[#FFFCF8] hover:bg-[#F6EFE6] text-[#2A1512] border border-[#D8C6B4] font-semibold text-xs transition-colors cursor-pointer"
                    :disabled="isAdjusting || isUnscheduling"
                    @click="isAdjustModalOpen = false"
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    class="inline-flex items-center justify-center gap-2 h-9 px-5 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
                    :disabled="isAdjusting"
                  >
                    <UIcon name="i-lucide-check" class="w-4 h-4" />
                    <span>Enregistrer</span>
                  </button>
                </div>
              </div>
            </form>
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
          class="fixed inset-0 z-50 bg-[#2E1411]/60 backdrop-blur-xs flex items-center justify-center p-4"
          @click="isDeleteModalOpen = false"
        >
          <div
            class="w-full max-w-md bg-[#FFFCF8] rounded-2xl border border-[#E6D9CB] shadow-xl p-6 space-y-4"
            @click.stop
          >
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-[#F4D8D3] text-[#9A2A22] flex items-center justify-center shrink-0">
                <UIcon
                  name="i-lucide-alert-triangle"
                  class="w-5 h-5"
                />
              </div>
              <div>
                <h3 class="text-lg font-bold text-[#2A1512]">
                  Supprimer ou archiver la mission
                </h3>
                <p class="text-xs text-[#6E5A52] mt-0.5">
                  Action sur la mission « {{ missionToDelete.name }} »
                </p>
              </div>
            </div>

            <div class="p-3.5 bg-[#F6EFE6] rounded-xl border border-[#E6D9CB] text-xs text-[#6E5A52] space-y-2">
              <p v-if="missionToDelete.stats.registrationsCount > 0">
                Cette mission comporte actuellement <span class="font-bold text-[#2A1512]">{{ missionToDelete.stats.registrationsCount }} inscription(s) bénévole(s)</span>.
              </p>
              <p v-else>
                Aucun bénévole n'est actuellement inscrit sur cette mission.
              </p>

              <div class="text-[11px] text-[#6E5A52] bg-[#FFFCF8] p-2.5 rounded-lg border border-[#E6D9CB]">
                <span class="font-bold block text-[#2A1512]">Règle de sécurité :</span>
                • Si des inscriptions existent, la mission sera <span class="font-semibold text-[#8A4B0F]">archivée</span> (soft delete).<br>
                • S'il n'y a aucune inscription, elle sera <span class="font-semibold text-[#9A2A22]">définitivement supprimée</span> ainsi que ses créneaux rattachés.
              </div>
            </div>

            <div class="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                class="inline-flex items-center justify-center h-9 px-4 rounded-full bg-[#FFFCF8] hover:bg-[#F6EFE6] text-[#2A1512] border border-[#D8C6B4] font-semibold text-xs transition-colors cursor-pointer"
                :disabled="isDeleting"
                @click="isDeleteModalOpen = false"
              >
                Annuler
              </button>

              <button
                type="button"
                class="inline-flex items-center justify-center gap-2 h-9 px-5 rounded-full bg-[#9A2A22] hover:bg-[#7A1F18] text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
                :disabled="isDeleting"
                @click="handleConfirmDelete"
              >
                <UIcon name="i-lucide-trash-2" class="w-4 h-4" />
                <span>Confirmer</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
