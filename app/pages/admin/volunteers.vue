<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

useHead({
  title: 'Bénévoles & Plannings · Admin'
})

interface VolunteerRegistration {
  id: string
  slotMissionId: string
  missionId: string
  missionName: string
  isSensitive: boolean
  date: string
  startTime: string
  endTime: string
  orderIndex: number
  timeSlotId: string
}

interface VolunteerItem {
  id: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone: string
  photoUrl: string | null
  isMinor: boolean
  isApprovedMinor: boolean
  isLocked: boolean
  planningStatus: 'DRAFT' | 'CONFIRMED'
  planningLockedAt: string | null
  createdAt: string
  registrationsCount: number
  registrations: VolunteerRegistration[]
}

interface FilterMissionOption {
  id: string
  name: string
}

interface FilterDayOption {
  value: string
  label: string
}

interface VolunteersApiResponse {
  volunteers: VolunteerItem[]
  total: number
  filterOptions?: {
    missions: FilterMissionOption[]
    days: FilterDayOption[]
  }
}

interface AvailableMission {
  slotMissionId: string
  missionId: string
  name: string
  description: string | null
  isSensitive: boolean
  capacityMax: number
  registeredCount: number
  availablePlaces: number
}

interface AvailableSlot {
  id: string
  date: string
  startTime: string
  endTime: string
  orderIndex: number
  label: string
  missions: AvailableMission[]
}

interface AllSlotsApiResponse {
  slots: AvailableSlot[]
}

const toast = useToast()

// Filtres
const searchQuery = ref('')
const statusFilter = ref<'ALL' | 'DRAFT' | 'CONFIRMED'>('ALL')
const missionFilter = ref('ALL')
const dayFilter = ref('ALL')

// Chargement des bénévoles
const { data, status, refresh } = await useFetch<VolunteersApiResponse>('/api/admin/volunteers', {
  query: computed(() => ({
    q: searchQuery.value.trim(),
    status: statusFilter.value,
    missionId: missionFilter.value !== 'ALL' ? missionFilter.value : undefined,
    day: dayFilter.value !== 'ALL' ? dayFilter.value : undefined
  })),
  lazy: false
})

const volunteers = computed(() => data.value?.volunteers || [])
const availableFilterMissions = computed(() => data.value?.filterOptions?.missions || [])
const availableFilterDays = computed(() => data.value?.filterOptions?.days || [])

// Nombre total de bénévoles validés
const confirmedVolunteersCount = computed(() => volunteers.value.filter(v => v.planningStatus === 'CONFIRMED').length)

// État des rappels
const sendingReminderId = ref<string | null>(null)
const isBulkRemindModalOpen = ref(false)
const isSendingBulkReminders = ref(false)

async function sendIndividualReminder(volunteer: VolunteerItem) {
  if (sendingReminderId.value) return
  sendingReminderId.value = volunteer.id

  try {
    const res = await $fetch<{ success: boolean, message: string }>('/api/admin/volunteers/remind', {
      method: 'POST',
      body: { volunteerId: volunteer.id }
    })

    toast.add({
      title: 'Rappel envoyé !',
      description: res.message,
      color: 'success'
    })
  } catch (err: unknown) {
    const errorObj = err as { data?: { statusMessage?: string }, statusMessage?: string }
    toast.add({
      title: 'Erreur',
      description: errorObj?.data?.statusMessage || 'Impossible d\'envoyer le rappel.',
      color: 'error'
    })
  } finally {
    sendingReminderId.value = null
  }
}

async function handleBulkRemind() {
  if (isSendingBulkReminders.value) return
  isSendingBulkReminders.value = true

  try {
    const res = await $fetch<{ success: boolean, count: number, message: string }>('/api/admin/volunteers/remind', {
      method: 'POST',
      body: { all: true }
    })

    toast.add({
      title: 'Rappels groupés envoyés !',
      description: res.message,
      color: 'success'
    })
    isBulkRemindModalOpen.value = false
  } catch (err: unknown) {
    const errorObj = err as { data?: { statusMessage?: string }, statusMessage?: string }
    toast.add({
      title: 'Erreur',
      description: errorObj?.data?.statusMessage || 'Impossible d\'envoyer les rappels groupés.',
      color: 'error'
    })
  } finally {
    isSendingBulkReminders.value = false
  }
}

// Chargement de l'ensemble des créneaux et missions (y compris sensibles)
const { data: allSlotsData, refresh: refreshSlots } = await useFetch<AllSlotsApiResponse>('/api/admin/missions/all-slots', {
  lazy: false
})

const availableSlots = computed(() => allSlotsData.value?.slots || [])

// Modal de gestion du bénévole
const isModalOpen = ref(false)
const activeVolunteer = ref<VolunteerItem | null>(null)

// Formulaire d'assignation manuelle
const selectedSlotId = ref('')
const selectedSlotMissionId = ref('')
const isAssigning = ref(false)
const isUpdatingStatus = ref(false)
const deletingRegistrationId = ref<string | null>(null)

// Missions disponibles pour le créneau sélectionné dans la modale
const missionsForSelectedSlot = computed(() => {
  if (!selectedSlotId.value) return []
  const slot = availableSlots.value.find(s => s.id === selectedSlotId.value)
  return slot?.missions || []
})

// Réinitialiser la mission si le créneau change
watch(selectedSlotId, () => {
  selectedSlotMissionId.value = ''
})

function openManageModal(volunteer: VolunteerItem) {
  activeVolunteer.value = volunteer
  selectedSlotId.value = availableSlots.value[0]?.id || ''
  selectedSlotMissionId.value = ''
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
  activeVolunteer.value = null
}

function getInitials(firstName: string, lastName: string) {
  const f = firstName?.[0] || ''
  const l = lastName?.[0] || ''
  return (f + l).toUpperCase() || 'B'
}

function formatSlotDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC'
  })
}

// Assigner une mission manuellement
async function assignMission() {
  if (!activeVolunteer.value || !selectedSlotMissionId.value) {
    toast.add({
      title: 'Sélection incomplète',
      description: 'Veuillez choisir un créneau horaire et une mission.',
      color: 'warning'
    })
    return
  }

  isAssigning.value = true
  try {
    const res = await $fetch<{ message: string }>(`/api/admin/volunteers/${activeVolunteer.value.id}/assign`, {
      method: 'POST',
      body: {
        slotMissionId: selectedSlotMissionId.value
      }
    })

    toast.add({
      title: 'Mission assignée',
      description: res.message,
      color: 'success'
    })

    await refresh()
    await refreshSlots()

    // Mettre à jour la vue du bénévole actif
    const updated = volunteers.value.find(v => v.id === activeVolunteer.value?.id)
    if (updated) {
      activeVolunteer.value = updated
    }
    selectedSlotMissionId.value = ''
  } catch (err: unknown) {
    const errorObj = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    toast.add({
      title: 'Erreur d\'assignation',
      description: errorObj?.data?.statusMessage || errorObj?.statusMessage || errorObj?.message || 'Impossible d\'assigner cette mission.',
      color: 'error'
    })
  } finally {
    isAssigning.value = false
  }
}

// Supprimer une affectation
async function removeRegistration(registrationId: string) {
  if (!activeVolunteer.value) return

  deletingRegistrationId.value = registrationId
  try {
    await $fetch(`/api/admin/volunteers/${activeVolunteer.value.id}/registrations/${registrationId}`, {
      method: 'DELETE'
    })

    toast.add({
      title: 'Affectation retirée',
      description: 'Le créneau a été retiré du planning du bénévole.',
      color: 'info'
    })

    await refresh()
    await refreshSlots()

    // Mettre à jour la vue du bénévole actif
    const updated = volunteers.value.find(v => v.id === activeVolunteer.value?.id)
    if (updated) {
      activeVolunteer.value = updated
    }
  } catch (err: unknown) {
    const errorObj = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    toast.add({
      title: 'Erreur',
      description: errorObj?.data?.statusMessage || errorObj?.statusMessage || 'Impossible de retirer cette mission.',
      color: 'error'
    })
  } finally {
    deletingRegistrationId.value = null
  }
}

// Modifier le statut (Brouillon / Validé / Verrouillé)
async function togglePlanningStatus(targetStatus: 'DRAFT' | 'CONFIRMED') {
  if (!activeVolunteer.value) return

  isUpdatingStatus.value = true
  try {
    await $fetch(`/api/admin/volunteers/${activeVolunteer.value.id}/status`, {
      method: 'PATCH',
      body: {
        planningStatus: targetStatus,
        isLocked: targetStatus === 'CONFIRMED'
      }
    })

    toast.add({
      title: 'Statut mis à jour',
      description: `Le planning est désormais en statut ${targetStatus === 'CONFIRMED' ? 'Validé et Verrouillé' : 'Brouillon (Modifiable)'}.`,
      color: 'success'
    })

    await refresh()
    const updated = volunteers.value.find(v => v.id === activeVolunteer.value?.id)
    if (updated) {
      activeVolunteer.value = updated
    }
  } catch (err: unknown) {
    const errorObj = err as { data?: { statusMessage?: string }, statusMessage?: string }
    toast.add({
      title: 'Erreur',
      description: errorObj?.data?.statusMessage || 'Impossible de modifier le statut.',
      color: 'error'
    })
  } finally {
    isUpdatingStatus.value = false
  }
}

// Approuver le statut mineur
async function toggleMinorApproval(volunteer: VolunteerItem) {
  try {
    const newStatus = !volunteer.isApprovedMinor
    await $fetch(`/api/admin/volunteers/${volunteer.id}/approve-minor`, {
      method: 'PATCH',
      body: {
        isApprovedMinor: newStatus
      }
    })

    toast.add({
      title: newStatus ? 'Autorisation parentale validée' : 'Autorisation retirée',
      description: `Profil mineur de ${volunteer.fullName} mis à jour.`,
      color: 'success'
    })

    await refresh()
  } catch (err: unknown) {
    const errorObj = err as { data?: { statusMessage?: string }, statusMessage?: string }
    toast.add({
      title: 'Erreur',
      description: errorObj?.data?.statusMessage || 'Action impossible.',
      color: 'error'
    })
  }
}

// Modal de réinitialisation de mot de passe
const isResetModalOpen = ref(false)
const resetVolunteer = ref<VolunteerItem | null>(null)
const resetMode = ref<'temporary' | 'link'>('temporary')
const customTemporaryPassword = ref('')
const isResettingPassword = ref(false)
const resetResult = ref<{
  success: boolean
  mode: 'temporary' | 'link'
  temporaryPassword?: string
  resetUrl?: string
  message: string
} | null>(null)

function openResetPasswordModal(volunteer: VolunteerItem) {
  resetVolunteer.value = volunteer
  resetMode.value = 'temporary'
  customTemporaryPassword.value = ''
  resetResult.value = null
  isResetModalOpen.value = true
}

function closeResetModal() {
  isResetModalOpen.value = false
  resetVolunteer.value = null
  resetResult.value = null
}

async function handleAdminResetPassword() {
  if (!resetVolunteer.value) return

  isResettingPassword.value = true
  try {
    const res = await $fetch<{
      success: boolean
      mode: 'temporary' | 'link'
      temporaryPassword?: string
      resetUrl?: string
      message: string
    }>(`/api/admin/volunteers/${resetVolunteer.value.id}/reset-password`, {
      method: 'POST',
      body: {
        mode: resetMode.value,
        temporaryPassword: customTemporaryPassword.value.trim() || undefined
      }
    })

    resetResult.value = res
    toast.add({
      title: 'Mot de passe réinitialisé',
      description: res.message,
      color: 'success'
    })
  } catch (err: unknown) {
    const errorObj = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    toast.add({
      title: 'Erreur',
      description: errorObj?.data?.statusMessage || errorObj?.statusMessage || errorObj?.message || 'Impossible de réinitialiser le mot de passe.',
      color: 'error'
    })
  } finally {
    isResettingPassword.value = false
  }
}

const copySuccess = ref(false)
async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
    toast.add({
      title: 'Copié',
      description: 'Mot de passe copié dans le presse-papier.',
      color: 'info'
    })
  } catch {
    // clipboard failure fallback
  }
}

// Colonnes UTable
const columns: TableColumn<VolunteerItem>[] = [
  {
    accessorKey: 'volunteer',
    header: 'Bénévole'
  },
  {
    accessorKey: 'contact',
    header: 'Coordonnées'
  },
  {
    accessorKey: 'planningStatus',
    header: 'Statut planning'
  },
  {
    accessorKey: 'missions',
    header: 'Missions affectées'
  },
  {
    accessorKey: 'actions',
    header: 'Actions'
  }
]
</script>

<template>
  <div class="space-y-6">
    <!-- En-tête de la page -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Bénévoles & Plannings
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-0.5">
          Consultez, modifiez, annulez et forcez les attributions de missions
        </p>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          color="neutral"
          variant="subtle"
          size="sm"
          icon="i-lucide-refresh-cw"
          :loading="status === 'pending'"
          @click="() => refresh()"
        />
      </div>
    </div>

    <!-- Barre d'outils supérieure (Recherche + Filtres multi-critères) -->
    <div class="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-3">
      <!-- Ligne 1 : Recherche + Sélecteurs Mission et Jour -->
      <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        <!-- Recherche en temps réel (sm:col-span-5) -->
        <div class="sm:col-span-5">
          <UInput
            v-model="searchQuery"
            type="search"
            icon="i-lucide-search"
            placeholder="Rechercher nom, prénom, e-mail..."
            size="sm"
            class="w-full"
          />
        </div>

        <!-- Filtre par Mission (sm:col-span-4) -->
        <div class="sm:col-span-4">
          <select
            v-model="missionFilter"
            class="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 cursor-pointer transition-colors"
          >
            <option value="ALL">
              Toutes les missions
            </option>
            <option
              v-for="m in availableFilterMissions"
              :key="m.id"
              :value="m.id"
            >
              {{ m.name }}
            </option>
          </select>
        </div>

        <!-- Filtre par Jour (sm:col-span-3) -->
        <div class="sm:col-span-3">
          <select
            v-model="dayFilter"
            class="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 cursor-pointer transition-colors"
          >
            <option value="ALL">
              Tous les jours
            </option>
            <option
              v-for="d in availableFilterDays"
              :key="d.value"
              :value="d.value"
            >
              {{ d.label }}
            </option>
          </select>
        </div>
      </div>

      <!-- Ligne 2 : Filtres Statuts + Bouton Rappel Global -->
      <div class="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
        <!-- Filtre statut -->
        <div class="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0"
            :class="[
              statusFilter === 'ALL'
                ? 'bg-violet-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
            ]"
            @click="statusFilter = 'ALL'"
          >
            Tous ({{ volunteers.length }})
          </button>
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0"
            :class="[
              statusFilter === 'CONFIRMED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
            ]"
            @click="statusFilter = 'CONFIRMED'"
          >
            Validés / Verrouillés ({{ confirmedVolunteersCount }})
          </button>
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0"
            :class="[
              statusFilter === 'DRAFT'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
            ]"
            @click="statusFilter = 'DRAFT'"
          >
            Brouillons
          </button>
        </div>

        <!-- Déclenchement du rappel groupé -->
        <div class="flex items-center gap-2">
          <UButton
            color="primary"
            variant="soft"
            size="sm"
            icon="i-lucide-bell"
            label="Rappeler tous les validés"
            class="font-semibold text-xs cursor-pointer shadow-2xs"
            :disabled="confirmedVolunteersCount === 0"
            @click="isBulkRemindModalOpen = true"
          />
        </div>
      </div>
    </div>

    <!-- Tableau Nuxt UI UTable -->
    <div class="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
      <!-- Vue Desktop : Tableau UTable -->
      <div class="hidden md:block">
        <UTable
          :data="volunteers"
          :columns="columns"
          class="w-full"
        >
          <!-- Cellule Bénévole -->
          <template #volunteer-cell="{ row }">
            <div class="flex items-center gap-3 py-1">
              <div class="w-9 h-9 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs shrink-0 border border-violet-200/60">
                {{ getInitials(row.original.firstName, row.original.lastName) }}
              </div>
              <div>
                <div class="flex items-center gap-1.5">
                  <span class="font-bold text-sm text-slate-900">
                    {{ row.original.fullName }}
                  </span>
                  <!-- Pastille Mineur -->
                  <UBadge
                    v-if="row.original.isMinor"
                    color="warning"
                    variant="solid"
                    size="sm"
                    class="font-semibold text-[11px] px-2 py-0.5 rounded-md shadow-2xs"
                  >
                    Mineur {{ row.original.isApprovedMinor ? '✓' : '(Attente accord)' }}
                  </UBadge>
                </div>
                <span class="text-[11px] text-slate-400 font-mono">ID: {{ row.original.id.slice(0, 8) }}</span>
              </div>
            </div>
          </template>

          <!-- Cellule Coordonnées -->
          <template #contact-cell="{ row }">
            <div class="text-xs space-y-0.5">
              <p class="text-slate-700 font-medium">
                {{ row.original.email }}
              </p>
              <a
                v-if="row.original.phone"
                :href="'tel:' + row.original.phone"
                class="text-violet-600 hover:underline inline-flex items-center gap-1 text-[11px]"
              >
                <UIcon
                  name="i-lucide-phone"
                  class="w-3 h-3"
                />
                <span>{{ row.original.phone }}</span>
              </a>
            </div>
          </template>

          <!-- Cellule Statut Planning -->
          <template #planningStatus-cell="{ row }">
            <div class="space-y-1">
              <UBadge
                v-if="row.original.planningStatus === 'CONFIRMED'"
                color="success"
                variant="solid"
                size="sm"
                class="font-semibold text-xs px-2.5 py-1 inline-flex items-center gap-1 shadow-2xs"
              >
                <UIcon
                  name="i-lucide-lock"
                  class="w-3.5 h-3.5"
                />
                <span>Validé</span>
              </UBadge>
              <UBadge
                v-else
                color="warning"
                variant="solid"
                size="sm"
                class="font-semibold text-xs px-2.5 py-1 inline-flex items-center gap-1 shadow-2xs"
              >
                <UIcon
                  name="i-lucide-file-edit"
                  class="w-3.5 h-3.5"
                />
                <span>Brouillon</span>
              </UBadge>

              <span class="text-[11px] text-slate-400 block font-medium">
                {{ row.original.registrationsCount }} créneau(x)
              </span>
            </div>
          </template>

          <!-- Cellule Missions affectées -->
          <template #missions-cell="{ row }">
            <div class="flex flex-wrap gap-1.5 max-w-md py-1">
              <template v-if="row.original.registrations.length > 0">
                <span
                  v-for="reg in row.original.registrations"
                  :key="reg.id"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold shadow-2xs"
                  :class="[
                    reg.isSensitive
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-700 text-white'
                  ]"
                >
                  <UIcon
                    :name="reg.isSensitive ? 'i-lucide-shield-alert' : 'i-lucide-calendar'"
                    class="w-3.5 h-3.5 shrink-0 text-white"
                  />
                  <span>{{ reg.missionName }}</span>
                  <span class="opacity-80">({{ formatSlotDate(reg.date) }} {{ reg.startTime }})</span>
                </span>
              </template>
              <span
                v-else
                class="text-xs text-slate-400 italic"
              >
                Aucun créneau sélectionné
              </span>
            </div>
          </template>

          <!-- Cellule Actions -->
          <template #actions-cell="{ row }">
            <div class="flex items-center gap-1.5">
              <UButton
                color="primary"
                variant="subtle"
                size="xs"
                icon="i-lucide-sliders-horizontal"
                label="Gérer le planning"
                class="cursor-pointer font-medium"
                @click="openManageModal(row.original)"
              />

              <!-- Réinitialiser le mot de passe -->
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-lucide-key-round"
                title="Réinitialiser le mot de passe"
                class="cursor-pointer text-slate-500 hover:text-violet-600"
                @click="openResetPasswordModal(row.original)"
              />

              <!-- Toggle accord parental si mineur -->
              <UButton
                v-if="row.original.isMinor"
                :color="row.original.isApprovedMinor ? 'neutral' : 'warning'"
                variant="ghost"
                size="xs"
                :icon="row.original.isApprovedMinor ? 'i-lucide-check-check' : 'i-lucide-file-text'"
                :title="row.original.isApprovedMinor ? 'Accord parental validé' : 'Valider accord parental'"
                @click="toggleMinorApproval(row.original)"
              />

              <!-- Envoyer un rappel de convocation si planning validé -->
              <UButton
                v-if="row.original.planningStatus === 'CONFIRMED'"
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-lucide-bell"
                title="Envoyer un rappel de convocation"
                :loading="sendingReminderId === row.original.id"
                class="cursor-pointer text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                @click="sendIndividualReminder(row.original)"
              />
            </div>
          </template>
        </UTable>
      </div>

      <!-- Vue Mobile : Liste de Cartes empilées -->
      <div
        v-if="volunteers.length > 0"
        class="block md:hidden divide-y divide-slate-100"
      >
        <div
          v-for="volunteer in volunteers"
          :key="volunteer.id"
          class="p-4 space-y-3 bg-white"
        >
          <!-- En-tête de la carte : Avatar + Nom + Statut planning -->
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs shrink-0 border border-violet-200">
                {{ getInitials(volunteer.firstName, volunteer.lastName) }}
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="font-bold text-sm text-slate-900 truncate">
                    {{ volunteer.fullName }}
                  </span>
                  <UBadge
                    v-if="volunteer.isMinor"
                    color="warning"
                    variant="solid"
                    size="sm"
                    class="font-semibold text-[11px] px-2 py-0.5 rounded-md shadow-2xs"
                  >
                    Mineur {{ volunteer.isApprovedMinor ? '✓' : '' }}
                  </UBadge>
                </div>
                <span class="text-[11px] text-slate-400 font-mono block">ID: {{ volunteer.id.slice(0, 8) }}</span>
              </div>
            </div>

            <!-- Statut Badge -->
            <UBadge
              v-if="volunteer.planningStatus === 'CONFIRMED'"
              color="success"
              variant="solid"
              size="sm"
              class="font-semibold text-xs px-2.5 py-1 inline-flex items-center gap-1 shrink-0 shadow-2xs"
            >
              <UIcon
                name="i-lucide-lock"
                class="w-3.5 h-3.5"
              />
              <span>Validé</span>
            </UBadge>
            <UBadge
              v-else
              color="warning"
              variant="solid"
              size="sm"
              class="font-semibold text-xs px-2.5 py-1 inline-flex items-center gap-1 shrink-0 shadow-2xs"
            >
              <UIcon
                name="i-lucide-file-edit"
                class="w-3.5 h-3.5"
              />
              <span>Brouillon</span>
            </UBadge>
          </div>

          <!-- Coordonnées -->
          <div class="text-xs space-y-1 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div class="flex items-center gap-1.5 text-slate-700 font-medium">
              <UIcon
                name="i-lucide-mail"
                class="w-3.5 h-3.5 text-slate-400 shrink-0"
              />
              <span class="truncate">{{ volunteer.email }}</span>
            </div>
            <div
              v-if="volunteer.phone"
              class="flex items-center gap-1.5 pt-0.5"
            >
              <UIcon
                name="i-lucide-phone"
                class="w-3.5 h-3.5 text-slate-400 shrink-0"
              />
              <a
                :href="'tel:' + volunteer.phone"
                class="text-violet-600 font-semibold hover:underline"
              >
                {{ volunteer.phone }}
              </a>
            </div>
          </div>

          <!-- Créneaux / Missions -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Missions affectées :</span>
              <span class="font-bold text-slate-700">{{ volunteer.registrationsCount }} créneau(x)</span>
            </div>

            <div
              v-if="volunteer.registrations.length > 0"
              class="flex flex-wrap gap-1.5 pt-0.5"
            >
              <span
                v-for="reg in volunteer.registrations"
                :key="reg.id"
                class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border"
                :class="[
                  reg.isSensitive
                    ? 'bg-violet-50 text-violet-700 border-violet-200'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                ]"
              >
                <UIcon
                  :name="reg.isSensitive ? 'i-lucide-shield-alert' : 'i-lucide-calendar'"
                  class="w-3 h-3 shrink-0"
                  :class="reg.isSensitive ? 'text-violet-600' : 'text-slate-400'"
                />
                <span class="font-semibold">{{ reg.missionName }}</span>
                <span class="text-slate-400">({{ formatSlotDate(reg.date) }} {{ reg.startTime }})</span>
              </span>
            </div>
            <p
              v-else
              class="text-xs text-slate-400 italic"
            >
              Aucun créneau sélectionné pour le moment.
            </p>
          </div>

          <!-- Actions tactiles -->
          <div class="pt-2 flex items-center gap-2">
            <UButton
              color="primary"
              variant="subtle"
              size="sm"
              icon="i-lucide-sliders-horizontal"
              label="Gérer le planning"
              class="flex-1 justify-center font-semibold cursor-pointer py-2"
              @click="openManageModal(volunteer)"
            />

            <UButton
              color="neutral"
              variant="subtle"
              size="sm"
              icon="i-lucide-key-round"
              title="Mot de passe"
              class="cursor-pointer px-3 py-2"
              @click="openResetPasswordModal(volunteer)"
            />

            <UButton
              v-if="volunteer.isMinor"
              :color="volunteer.isApprovedMinor ? 'neutral' : 'warning'"
              variant="subtle"
              size="sm"
              :icon="volunteer.isApprovedMinor ? 'i-lucide-check-check' : 'i-lucide-file-text'"
              :title="volunteer.isApprovedMinor ? 'Accord validé' : 'Valider accord'"
              class="cursor-pointer px-3 py-2"
              @click="toggleMinorApproval(volunteer)"
            />

            <UButton
              v-if="volunteer.planningStatus === 'CONFIRMED'"
              color="neutral"
              variant="subtle"
              size="sm"
              icon="i-lucide-bell"
              title="Envoyer un rappel de convocation"
              :loading="sendingReminderId === volunteer.id"
              class="cursor-pointer px-3 py-2 text-amber-700 bg-amber-50 hover:bg-amber-100"
              @click="sendIndividualReminder(volunteer)"
            />
          </div>
        </div>
      </div>

      <!-- État vide -->
      <div
        v-if="volunteers.length === 0 && status !== 'pending'"
        class="py-12 text-center text-slate-400"
      >
        <UIcon
          name="i-lucide-users"
          class="w-8 h-8 mx-auto text-slate-300 mb-2"
        />
        <p class="text-xs font-medium">
          Aucun bénévole ne correspond aux critères de recherche.
        </p>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- MODALE DE GESTION DU PLANNING BÉNÉVOLE                   -->
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
          v-if="isModalOpen && activeVolunteer"
          class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          @click="closeModal"
        >
          <div
            class="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-6 my-8"
            @click.stop
          >
            <!-- En-tête Modale -->
            <div class="flex items-start justify-between pb-4 border-b border-slate-200">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-sm shrink-0 border border-violet-100">
                  {{ getInitials(activeVolunteer.firstName, activeVolunteer.lastName) }}
                </div>
                <div>
                  <h3 class="text-base sm:text-lg font-bold text-slate-900">
                    Planning de {{ activeVolunteer.fullName }}
                  </h3>
                  <p class="text-xs text-slate-500">
                    {{ activeVolunteer.email }} • {{ activeVolunteer.phone || 'Pas de numéro' }}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-1.5">
                <UButton
                  icon="i-lucide-key-round"
                  color="neutral"
                  variant="subtle"
                  size="xs"
                  label="Mot de passe"
                  @click="openResetPasswordModal(activeVolunteer)"
                />
                <UButton
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  @click="closeModal"
                />
              </div>
            </div>

            <!-- SECTION 1 : CRÉNEAUX ACTUELLEMENT ATTRIBUÉS -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Créneaux attribués ({{ activeVolunteer.registrations.length }})
                  </h4>
                  <UBadge
                    :color="activeVolunteer.planningStatus === 'CONFIRMED' ? 'success' : 'warning'"
                    variant="solid"
                    size="sm"
                    class="font-semibold text-xs px-2.5 py-0.5 rounded-md shadow-2xs"
                  >
                    {{ activeVolunteer.planningStatus === 'CONFIRMED' ? 'Validé & Verrouillé' : 'Brouillon' }}
                  </UBadge>
                </div>

                <!-- Bascule Statut Général -->
                <UButton
                  v-if="activeVolunteer.planningStatus === 'CONFIRMED'"
                  color="warning"
                  variant="soft"
                  size="xs"
                  icon="i-lucide-unlock"
                  label="Déverrouiller (Brouillon)"
                  :loading="isUpdatingStatus"
                  @click="togglePlanningStatus('DRAFT')"
                />
                <UButton
                  v-else
                  color="success"
                  variant="soft"
                  size="xs"
                  icon="i-lucide-lock"
                  label="Verrouiller (Valider)"
                  :loading="isUpdatingStatus"
                  @click="togglePlanningStatus('CONFIRMED')"
                />
              </div>

              <!-- Liste des créneaux -->
              <div
                v-if="activeVolunteer.registrations.length > 0"
                class="space-y-2 max-h-48 overflow-y-auto pr-1"
              >
                <div
                  v-for="reg in activeVolunteer.registrations"
                  :key="reg.id"
                  class="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                >
                  <div class="flex items-center gap-2.5">
                    <UIcon
                      :name="reg.isSensitive ? 'i-lucide-shield-alert' : 'i-lucide-calendar'"
                      class="w-4 h-4 shrink-0"
                      :class="reg.isSensitive ? 'text-violet-600' : 'text-slate-500'"
                    />
                    <div>
                      <div class="flex items-center gap-1.5">
                        <span class="font-bold text-slate-900">{{ reg.missionName }}</span>
                        <UBadge
                          v-if="reg.isSensitive"
                          color="warning"
                          variant="solid"
                          size="sm"
                          class="font-semibold text-[10px] px-2 py-0.5 rounded shadow-2xs"
                        >
                          Poste sensible
                        </UBadge>
                      </div>
                      <span class="text-slate-500 text-[11px]">
                        {{ formatSlotDate(reg.date) }} • {{ reg.startTime }} - {{ reg.endTime }}
                      </span>
                    </div>
                  </div>

                  <!-- Bouton suppression d'affectation -->
                  <UButton
                    color="error"
                    variant="ghost"
                    size="xs"
                    icon="i-lucide-trash-2"
                    :loading="deletingRegistrationId === reg.id"
                    title="Supprimer cette affectation"
                    @click="removeRegistration(reg.id)"
                  />
                </div>
              </div>

              <p
                v-else
                class="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl border border-slate-200 text-center"
              >
                Aucune mission n'est actuellement affectée à ce bénévole.
              </p>
            </div>

            <!-- SECTION 2 : FORCER / ATTRIBUER UNE MISSION (Override Admin) -->
            <div class="space-y-3 pt-4 border-t border-slate-200">
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-lucide-shield-check"
                  class="w-4 h-4 text-violet-600"
                />
                <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Attribution manuelle directe (Override Admin)
                </h4>
              </div>
              <p class="text-xs text-slate-500">
                Attribuez n'importe quel créneau, y compris les postes sensibles (Caisse, Billetterie) ou en dépassement de jauge.
              </p>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <!-- 1. Sélection de la tranche horaire -->
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Tranche horaire</label>
                  <select
                    v-model="selectedSlotId"
                    class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  >
                    <option
                      v-for="slot in availableSlots"
                      :key="slot.id"
                      :value="slot.id"
                    >
                      {{ slot.label }}
                    </option>
                  </select>
                </div>

                <!-- 2. Sélection de la mission -->
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Mission à affecter</label>
                  <select
                    v-model="selectedSlotMissionId"
                    class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  >
                    <option
                      value=""
                      disabled
                    >
                      -- Choisir une mission --
                    </option>
                    <option
                      v-for="m in missionsForSelectedSlot"
                      :key="m.slotMissionId"
                      :value="m.slotMissionId"
                    >
                      {{ m.name }} {{ m.isSensitive ? '[Poste restrein]' : '' }} ({{ m.registeredCount }}/{{ m.capacityMax }})
                    </option>
                  </select>
                </div>
              </div>

              <div class="flex justify-end pt-2">
                <UButton
                  color="primary"
                  variant="solid"
                  size="sm"
                  icon="i-lucide-plus"
                  label="Attribuer la mission"
                  :disabled="!selectedSlotMissionId || isAssigning"
                  :loading="isAssigning"
                  class="font-semibold shadow-xs cursor-pointer"
                  @click="assignMission"
                />
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ======================================================== -->
    <!-- MODALE DE RÉINITIALISATION DU MOT DE PASSE               -->
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
          v-if="isResetModalOpen && resetVolunteer"
          class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          @click="closeResetModal"
        >
          <div
            class="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-5 my-8 text-left"
            @click.stop
          >
            <!-- En-tête -->
            <div class="flex items-start justify-between pb-3 border-b border-slate-200">
              <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-sm shrink-0 border border-violet-100">
                  <UIcon
                    name="i-lucide-key-round"
                    class="w-4 h-4"
                  />
                </div>
                <div>
                  <h3 class="text-base font-bold text-slate-900">
                    Réinitialiser le mot de passe
                  </h3>
                  <p class="text-xs text-slate-500">
                    {{ resetVolunteer.fullName }} ({{ resetVolunteer.email }})
                  </p>
                </div>
              </div>

              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="closeResetModal"
              />
            </div>

            <!-- Résultat après action -->
            <div
              v-if="resetResult"
              class="space-y-4"
            >
              <div
                class="p-4 rounded-xl border"
                :class="resetResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'"
              >
                <div class="flex items-start gap-2.5">
                  <UIcon
                    :name="resetResult.success ? 'i-lucide-check-circle-2' : 'i-lucide-alert-circle'"
                    class="w-5 h-5 shrink-0 mt-0.5"
                    :class="resetResult.success ? 'text-emerald-600' : 'text-rose-600'"
                  />
                  <div class="text-xs leading-relaxed">
                    <p class="font-bold mb-1">
                      {{ resetResult.success ? 'Opération réussie' : 'Erreur' }}
                    </p>
                    <p>{{ resetResult.message }}</p>
                  </div>
                </div>
              </div>

              <!-- Si mot de passe temporaire généré -->
              <div
                v-if="resetResult.mode === 'temporary' && resetResult.temporaryPassword"
                class="space-y-2"
              >
                <label class="block text-xs font-semibold text-slate-700">
                  Nouveau mot de passe temporaire :
                </label>
                <div class="p-3 bg-violet-50 rounded-xl border border-violet-200 flex items-center justify-between gap-2">
                  <span class="font-mono font-bold text-sm text-violet-950 select-all tracking-wide">
                    {{ resetResult.temporaryPassword }}
                  </span>
                  <UButton
                    color="primary"
                    variant="soft"
                    size="xs"
                    :icon="copySuccess ? 'i-lucide-check' : 'i-lucide-copy'"
                    :label="copySuccess ? 'Copié !' : 'Copier'"
                    class="cursor-pointer"
                    @click="copyToClipboard(resetResult.temporaryPassword!)"
                  />
                </div>
                <p class="text-[11px] text-slate-500 italic">
                  Communiquez ce mot de passe au bénévole afin qu'il puisse se connecter.
                </p>
              </div>

              <!-- Bouton Terminer -->
              <div class="pt-2 flex justify-end">
                <UButton
                  color="neutral"
                  variant="outline"
                  size="sm"
                  class="cursor-pointer"
                  @click="closeResetModal"
                >
                  Fermer
                </UButton>
              </div>
            </div>

            <!-- Formulaire de choix -->
            <div
              v-else
              class="space-y-4"
            >
              <!-- Sélecteur de méthode -->
              <div class="space-y-2">
                <label class="block text-xs font-semibold text-slate-700">Méthode de réinitialisation</label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    class="p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    :class="[
                      resetMode === 'temporary'
                        ? 'border-violet-600 bg-violet-50 text-violet-700 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    ]"
                    @click="resetMode = 'temporary'"
                  >
                    <UIcon
                      name="i-lucide-key"
                      class="w-3.5 h-3.5"
                    />
                    <span>Mot de passe temporaire</span>
                  </button>

                  <button
                    type="button"
                    class="p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    :class="[
                      resetMode === 'link'
                        ? 'border-violet-600 bg-violet-50 text-violet-700 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    ]"
                    @click="resetMode = 'link'"
                  >
                    <UIcon
                      name="i-lucide-send"
                      class="w-3.5 h-3.5"
                    />
                    <span>Lien par e-mail</span>
                  </button>
                </div>
              </div>

              <!-- Options pour Mot de passe temporaire -->
              <div
                v-if="resetMode === 'temporary'"
                class="space-y-2"
              >
                <label class="block text-xs font-semibold text-slate-700">
                  Définir un mot de passe temporaire (optionnel)
                </label>
                <UInput
                  v-model="customTemporaryPassword"
                  type="text"
                  icon="i-lucide-lock"
                  placeholder="Laisser vide pour générer aléatoirement"
                  size="sm"
                  class="w-full"
                />
                <p class="text-[11px] text-slate-500">
                  Si laissé vide, un mot de passe sécurisé sera automatiquement généré.
                </p>
              </div>

              <!-- Message pour Lien par e-mail -->
              <div
                v-else
                class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed"
              >
                <p>
                  Un lien sécurisé valable <strong>1 heure</strong> sera envoyé à l'adresse <strong>{{ resetVolunteer.email }}</strong> pour lui permettre de choisir son nouveau mot de passe.
                </p>
              </div>

              <!-- Actions -->
              <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  class="cursor-pointer"
                  @click="closeResetModal"
                >
                  Annuler
                </UButton>
                <UButton
                  color="primary"
                  variant="solid"
                  size="sm"
                  :loading="isResettingPassword"
                  class="cursor-pointer font-semibold shadow-xs"
                  @click="handleAdminResetPassword"
                >
                  Confirmer la réinitialisation
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ======================================================== -->
    <!-- MODALE DE CONFIRMATION RAPPEL GROUPÉ                      -->
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
          v-if="isBulkRemindModalOpen"
          class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          @click="isBulkRemindModalOpen = false"
        >
          <div
            class="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-5 my-8"
            @click.stop
          >
            <!-- En-tête -->
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <UIcon
                  name="i-lucide-bell-ring"
                  class="w-5 h-5"
                />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-base font-bold text-slate-900">
                  Rappel général de convocation
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">
                  Notification e-mail des bénévoles dont le planning est validé
                </p>
              </div>
            </div>

            <!-- Détails -->
            <div class="bg-amber-50/80 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-2">
              <p class="font-semibold">
                Vous vous apprêtez à envoyer un e-mail de rappel à :
              </p>
              <div class="text-sm font-extrabold text-amber-950 flex items-center gap-1.5">
                <UIcon
                  name="i-lucide-users"
                  class="w-4 h-4 text-amber-700"
                />
                <span>{{ confirmedVolunteersCount }} bénévole(s) validé(s)</span>
              </div>
              <p class="text-[11px] text-amber-800 leading-relaxed pt-1 border-t border-amber-200/60">
                Cet e-mail leur rappellera la liste précise de leurs créneaux, les horaires de présentation au QG (15 min avant) et le lien direct vers leur badge numérique.
              </p>
            </div>

            <!-- Actions -->
            <div class="flex items-center justify-end gap-2.5 pt-1">
              <UButton
                color="neutral"
                variant="subtle"
                size="sm"
                label="Annuler"
                :disabled="isSendingBulkReminders"
                @click="isBulkRemindModalOpen = false"
              />

              <UButton
                color="primary"
                variant="solid"
                size="sm"
                icon="i-lucide-send"
                :loading="isSendingBulkReminders"
                label="Envoyer les rappels"
                class="font-semibold shadow-xs cursor-pointer"
                @click="handleBulkRemind"
              />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
