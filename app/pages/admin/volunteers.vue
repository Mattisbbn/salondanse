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

// Modal de gestion du planning du bénévole
const isModalOpen = ref(false)
const activeVolunteer = ref<VolunteerItem | null>(null)

// Modal d'aperçu œil des créneaux
const isViewSlotsModalOpen = ref(false)
const viewSlotsVolunteer = ref<VolunteerItem | null>(null)

function openViewSlotsModal(volunteer: VolunteerItem) {
  viewSlotsVolunteer.value = volunteer
  isViewSlotsModalOpen.value = true
}

function closeViewSlotsModal() {
  isViewSlotsModalOpen.value = false
  viewSlotsVolunteer.value = null
}

// Modal de prévisualisation du badge officiel
const isBadgeModalOpen = ref(false)
const badgeVolunteer = ref<VolunteerItem | null>(null)
const badgeData = ref<{
  valid: boolean
  status?: string
  volunteer?: {
    id: string
    firstName: string
    lastName: string
    photoUrl: string | null
    isMinor: boolean
    isApprovedMinor: boolean
    planningLockedAt: string | null
    editionName: string
    editionYear: number
    qrCodeUrl?: string
    verifyUrl?: string
    missions: Array<{
      id: string
      missionName: string
      isSensitive: boolean
      date: string
      timeSlot: string
    }>
  }
} | null>(null)
const isLoadingBadge = ref(false)

async function openBadgeModal(volunteer: VolunteerItem) {
  badgeVolunteer.value = volunteer
  isBadgeModalOpen.value = true
  isLoadingBadge.value = true
  badgeData.value = null

  try {
    const res = await $fetch<{
      valid: boolean
      status?: string
      volunteer?: {
        id: string
        firstName: string
        lastName: string
        photoUrl: string | null
        isMinor: boolean
        isApprovedMinor: boolean
        planningLockedAt: string | null
        editionName: string
        editionYear: number
        qrCodeUrl?: string
        verifyUrl?: string
        missions: Array<{
          id: string
          missionName: string
          isSensitive: boolean
          date: string
          timeSlot: string
        }>
      }
    }>(`/api/verify-badge?userId=${volunteer.id}`)
    badgeData.value = res
  } catch (err: unknown) {
    console.error('Erreur chargement badge:', err)
  } finally {
    isLoadingBadge.value = false
  }
}

function closeBadgeModal() {
  isBadgeModalOpen.value = false
  badgeVolunteer.value = null
  badgeData.value = null
}

// État d'assignation
const isAssigning = ref(false)
const assigningSlotMissionId = ref<string | null>(null)
const isUpdatingStatus = ref(false)
const deletingRegistrationId = ref<string | null>(null)

// Structuration du planning calendrier par journées
interface DayPlanning {
  dateIso: string
  dayLabel: string
  shortLabel: string
  slots: AvailableSlot[]
}

const planningDays = computed<DayPlanning[]>(() => {
  const map = new Map<string, AvailableSlot[]>()
  for (const slot of availableSlots.value) {
    const dateKey = slot.date.split('T')[0] || slot.date
    if (!map.has(dateKey)) {
      map.set(dateKey, [])
    }
    map.get(dateKey)!.push(slot)
  }

  const list: DayPlanning[] = []
  for (const [dateIso, slots] of map.entries()) {
    slots.sort((a, b) => a.orderIndex - b.orderIndex)
    const d = new Date(dateIso + 'T00:00:00.000Z')
    const dayLabel = d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC'
    })
    const shortLabel = d.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC'
    })
    list.push({
      dateIso,
      dayLabel: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1),
      shortLabel: shortLabel.charAt(0).toUpperCase() + shortLabel.slice(1),
      slots
    })
  }

  list.sort((a, b) => a.dateIso.localeCompare(b.dateIso))
  return list
})

const activePlanningDayDate = ref('')

const activeDayPlanning = computed(() => {
  if (!activePlanningDayDate.value) {
    return planningDays.value[0] || null
  }
  return planningDays.value.find(d => d.dateIso === activePlanningDayDate.value) || planningDays.value[0] || null
})

// Règles de gestion calculées en direct pour le bénévole actif
const activeVolunteerHours = computed(() => {
  return (activeVolunteer.value?.registrations?.length || 0) * 2
})

const hasConsecutiveSlotsAlert = computed(() => {
  if (!activeVolunteer.value?.registrations) return false
  const byDay: Record<string, number[]> = {}
  for (const reg of activeVolunteer.value.registrations) {
    const d = reg.date.split('T')[0] || reg.date
    if (!byDay[d]) byDay[d] = []
    byDay[d].push(reg.orderIndex)
  }
  for (const d in byDay) {
    const indices = byDay[d]!
    if (indices.length >= 3) {
      indices.sort((a, b) => a - b)
      for (let i = 0; i <= indices.length - 3; i++) {
        const o1 = indices[i]
        const o2 = indices[i + 1]
        const o3 = indices[i + 2]
        if (o1 !== undefined && o2 === o1 + 1 && o3 === o2 + 1) {
          return true
        }
      }
    }
  }
  return false
})

function getVolunteerDayRegistrationsCount(dateIso: string) {
  if (!activeVolunteer.value) return 0
  return activeVolunteer.value.registrations.filter(r => r.date.startsWith(dateIso)).length
}

function openManageModal(volunteer: VolunteerItem) {
  activeVolunteer.value = volunteer
  if (planningDays.value.length > 0) {
    const firstReg = volunteer.registrations[0]
    if (firstReg) {
      const regDate = firstReg.date.split('T')[0]
      const match = planningDays.value.find(d => d.dateIso === regDate)
      activePlanningDayDate.value = match ? match.dateIso : (planningDays.value[0]?.dateIso || '')
    } else {
      activePlanningDayDate.value = planningDays.value[0]?.dateIso || ''
    }
  }
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

function formatSlotFullDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC'
  })
}

// Assigner une mission manuellement en 1 clic depuis la grille ou le formulaire
async function quickAssignMission(slotMissionId: string) {
  if (!activeVolunteer.value) return

  assigningSlotMissionId.value = slotMissionId
  isAssigning.value = true
  try {
    const res = await $fetch<{ message: string }>(`/api/admin/volunteers/${activeVolunteer.value.id}/assign`, {
      method: 'POST',
      body: {
        slotMissionId
      }
    })

    toast.add({
      title: 'Mission affectée',
      description: res.message,
      color: 'success'
    })

    await refresh()
    await refreshSlots()

    const updated = volunteers.value.find(v => v.id === activeVolunteer.value?.id)
    if (updated) {
      activeVolunteer.value = updated
    }
  } catch (err: unknown) {
    const errorObj = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    toast.add({
      title: 'Erreur d\'affectation',
      description: errorObj?.data?.statusMessage || errorObj?.statusMessage || errorObj?.message || 'Impossible d\'affecter cette mission.',
      color: 'error'
    })
  } finally {
    isAssigning.value = false
    assigningSlotMissionId.value = null
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
    <div class="pb-4 border-b border-[#E6D9CB]">
      <span class="text-[11px] font-bold tracking-[0.16em] uppercase text-[#7A291E] block mb-1">
        Direction artistique · Plateforme bénévoles
      </span>
      <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-[#2A1512]">
        Bénévoles &amp; Plannings
      </h1>

    </div>

    <!-- Barre d'outils supérieure (Recherche + Filtres multi-critères) -->
    <div class="bg-[#FFFCF8] p-4 rounded-2xl border border-[#E6D9CB] shadow-xs space-y-3">
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
            class="w-full bg-[#FFFCF8] hover:bg-[#F6EFE6]/60 border border-[#D8C6B4] rounded-xl px-3 py-1.5 text-xs text-[#2A1512] font-medium focus:outline-none focus:ring-2 focus:ring-[#7A291E]/20 focus:border-[#7A291E] cursor-pointer transition-colors"
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
            class="w-full bg-[#FFFCF8] hover:bg-[#F6EFE6]/60 border border-[#D8C6B4] rounded-xl px-3 py-1.5 text-xs text-[#2A1512] font-medium focus:outline-none focus:ring-2 focus:ring-[#7A291E]/20 focus:border-[#7A291E] cursor-pointer transition-colors"
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
      <div class="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-[#E6D9CB]">
        <!-- Filtre statut -->
        <div class="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            class="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0"
            :class="[
              statusFilter === 'ALL'
                ? 'bg-[#7A291E] text-white shadow-xs'
                : 'bg-[#FFFCF8] text-[#2A1512] border border-[#D8C6B4] hover:bg-[#F6EFE6]'
            ]"
            @click="statusFilter = 'ALL'"
          >
            Tous ({{ volunteers.length }})
          </button>
          <button
            type="button"
            class="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0"
            :class="[
              statusFilter === 'CONFIRMED'
                ? 'bg-[#2F5238] text-white shadow-xs'
                : 'bg-[#FFFCF8] text-[#2A1512] border border-[#D8C6B4] hover:bg-[#F6EFE6]'
            ]"
            @click="statusFilter = 'CONFIRMED'"
          >
            Validés / Verrouillés ({{ confirmedVolunteersCount }})
          </button>
          <button
            type="button"
            class="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0"
            :class="[
              statusFilter === 'DRAFT'
                ? 'bg-[#8A4B0F] text-white shadow-xs'
                : 'bg-[#FFFCF8] text-[#2A1512] border border-[#D8C6B4] hover:bg-[#F6EFE6]'
            ]"
            @click="statusFilter = 'DRAFT'"
          >
            Brouillons
          </button>
        </div>

        <!-- Déclenchement du rappel groupé -->
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-[#FFFCF8] hover:bg-[#F6EFE6] text-[#7A291E] border border-[#D8C6B4] text-xs font-semibold transition-colors cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="confirmedVolunteersCount === 0"
            @click="isBulkRemindModalOpen = true"
          >
            <UIcon name="i-lucide-bell" class="w-3.5 h-3.5 text-[#7A291E]" />
            <span>Rappeler tous les validés</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Tableau Nuxt UI UTable -->
    <div class="bg-[#FFFCF8] rounded-2xl border border-[#E6D9CB] shadow-xs overflow-hidden">
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
              <div class="w-9 h-9 rounded-full bg-[#F3DCD5] text-[#7A291E] flex items-center justify-center font-bold text-xs shrink-0 border border-[#D9A79F]">
                {{ getInitials(row.original.firstName, row.original.lastName) }}
              </div>
              <div>
                <div class="flex items-center gap-1.5">
                  <span class="font-bold text-sm text-[#2A1512]">
                    {{ row.original.fullName }}
                  </span>
                  <!-- Pastille Mineur -->
                  <span
                    v-if="row.original.isMinor"
                    class="font-semibold text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                    :class="row.original.isApprovedMinor ? 'bg-[#E1E9DC] text-[#2F5238] border border-[#9DB79F]' : 'bg-[#F7E4C6] text-[#8A4B0F] border border-[#D9A660]'"
                  >
                    Mineur {{ row.original.isApprovedMinor ? '✓' : '(Attente accord)' }}
                  </span>
                </div>
                <span class="text-[11px] text-[#6E5A52] font-mono">ID: {{ row.original.id.slice(0, 8) }}</span>
              </div>
            </div>
          </template>

          <!-- Cellule Coordonnées -->
          <template #contact-cell="{ row }">
            <div class="text-xs space-y-0.5">
              <p class="text-[#2A1512] font-medium">
                {{ row.original.email }}
              </p>
              <a
                v-if="row.original.phone"
                :href="'tel:' + row.original.phone"
                class="text-[#7A291E] hover:underline inline-flex items-center gap-1 text-[11px] font-semibold"
              >
                <UIcon
                  name="i-lucide-phone"
                  class="w-3 h-3 text-[#7A291E]"
                />
                <span>{{ row.original.phone }}</span>
              </a>
            </div>
          </template>

          <!-- Cellule Statut Planning -->
          <template #planningStatus-cell="{ row }">
            <div class="space-y-1">
              <span
                v-if="row.original.planningStatus === 'CONFIRMED'"
                class="font-semibold text-xs px-2.5 py-1 inline-flex items-center gap-1 rounded-full bg-[#E1E9DC] text-[#2F5238] border border-[#9DB79F]"
              >
                <UIcon
                  name="i-lucide-lock"
                  class="w-3.5 h-3.5"
                />
                <span>Validé</span>
              </span>
              <span
                v-else
                class="font-semibold text-xs px-2.5 py-1 inline-flex items-center gap-1 rounded-full bg-[#F7E4C6] text-[#8A4B0F] border border-[#D9A660]"
              >
                <UIcon
                  name="i-lucide-file-edit"
                  class="w-3.5 h-3.5"
                />
                <span>Brouillon</span>
              </span>

              <span class="text-[11px] text-[#6E5A52] block font-medium">
                {{ row.original.registrationsCount }} créneau(x)
              </span>
            </div>
          </template>

          <!-- Cellule Missions affectées -->
          <template #missions-cell="{ row }">
            <div class="flex items-center gap-2 py-1">
              <template v-if="row.original.registrationsCount > 0">
                <span
                  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F6EFE6] hover:bg-[#EFE5DA] text-[#2A1512] border border-[#E6D9CB] transition-colors cursor-pointer select-none"
                  @click="openViewSlotsModal(row.original)"
                >
                  <UIcon
                    name="i-lucide-calendar-check-2"
                    class="w-3.5 h-3.5 text-[#7A291E]"
                  />
                  <span>{{ row.original.registrationsCount }} créneau(x)</span>
                </span>

                <UTooltip text="Voir le détail des créneaux">
                  <button
                    type="button"
                    title="Voir le détail des créneaux"
                    class="w-7 h-7 rounded-full flex items-center justify-center text-[#6E5A52] hover:text-[#7A291E] hover:bg-[#F6EFE6] transition-colors cursor-pointer"
                    @click="openViewSlotsModal(row.original)"
                  >
                    <UIcon name="i-lucide-eye" class="w-3.5 h-3.5" />
                  </button>
                </UTooltip>
              </template>
              <span
                v-else
                class="text-xs text-[#6E5A52] italic"
              >
                Aucun créneau sélectionné
              </span>
            </div>
          </template>

          <!-- Cellule Actions -->
          <template #actions-cell="{ row }">
            <div class="flex items-center gap-1.5">
              <!-- Gérer le planning -->
              <button
                type="button"
                class="inline-flex items-center gap-1 h-7 px-3 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] text-white text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                @click="openManageModal(row.original)"
              >
                <UIcon name="i-lucide-sliders-horizontal" class="w-3 h-3 text-white" />
                <span>Planning</span>
              </button>

              <!-- Voir le badge officiel -->
              <UTooltip text="Badge bénévole officiel">
                <button
                  type="button"
                  title="Badge bénévole officiel"
                  class="w-7 h-7 rounded-full flex items-center justify-center text-[#6E5A52] hover:text-[#7A291E] hover:bg-[#F6EFE6] transition-colors cursor-pointer"
                  @click="openBadgeModal(row.original)"
                >
                  <UIcon name="i-lucide-id-card" class="w-3.5 h-3.5" />
                </button>
              </UTooltip>

              <!-- Réinitialiser le mot de passe -->
              <UTooltip text="Réinitialiser le mot de passe">
                <button
                  type="button"
                  title="Réinitialiser le mot de passe"
                  class="w-7 h-7 rounded-full flex items-center justify-center text-[#6E5A52] hover:text-[#7A291E] hover:bg-[#F6EFE6] transition-colors cursor-pointer"
                  @click="openResetPasswordModal(row.original)"
                >
                  <UIcon name="i-lucide-key-round" class="w-3.5 h-3.5" />
                </button>
              </UTooltip>

              <!-- Toggle accord parental si mineur -->
              <UTooltip
                v-if="row.original.isMinor"
                :text="row.original.isApprovedMinor ? 'Accord parental validé' : 'Valider accord parental'"
              >
                <button
                  type="button"
                  :title="row.original.isApprovedMinor ? 'Accord parental validé' : 'Valider accord parental'"
                  class="w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                  :class="row.original.isApprovedMinor ? 'text-[#2F5238] bg-[#E1E9DC] hover:bg-[#c9dac2]' : 'text-[#8A4B0F] bg-[#F7E4C6] hover:bg-[#eed3a7]'"
                  @click="toggleMinorApproval(row.original)"
                >
                  <UIcon :name="row.original.isApprovedMinor ? 'i-lucide-check-check' : 'i-lucide-file-text'" class="w-3.5 h-3.5" />
                </button>
              </UTooltip>

              <!-- Envoyer un rappel de convocation si planning validé -->
              <UTooltip
                v-if="row.original.planningStatus === 'CONFIRMED'"
                text="Envoyer un rappel de convocation"
              >
                <button
                  type="button"
                  title="Envoyer un rappel de convocation"
                  :disabled="sendingReminderId === row.original.id"
                  class="w-7 h-7 rounded-full flex items-center justify-center text-[#8A4B0F] hover:bg-[#F7E4C6] transition-colors cursor-pointer disabled:opacity-50"
                  @click="sendIndividualReminder(row.original)"
                >
                  <UIcon name="i-lucide-bell" class="w-3.5 h-3.5" />
                </button>
              </UTooltip>
            </div>
          </template>
        </UTable>
      </div>

      <!-- Vue Mobile : Liste de Cartes empilées -->
      <div
        v-if="volunteers.length > 0"
        class="block md:hidden divide-y divide-[#E6D9CB]"
      >
        <div
          v-for="volunteer in volunteers"
          :key="volunteer.id"
          class="p-4 space-y-3 bg-[#FFFCF8]"
        >
          <!-- En-tête de la carte : Avatar + Nom + Statut planning -->
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-full bg-[#F3DCD5] text-[#7A291E] flex items-center justify-center font-bold text-xs shrink-0 border border-[#D9A79F]">
                {{ getInitials(volunteer.firstName, volunteer.lastName) }}
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="font-bold text-sm text-[#2A1512] truncate">
                    {{ volunteer.fullName }}
                  </span>
                  <span
                    v-if="volunteer.isMinor"
                    class="font-semibold text-[10px] px-2 py-0.5 rounded-full"
                    :class="volunteer.isApprovedMinor ? 'bg-[#E1E9DC] text-[#2F5238] border border-[#9DB79F]' : 'bg-[#F7E4C6] text-[#8A4B0F] border border-[#D9A660]'"
                  >
                    Mineur {{ volunteer.isApprovedMinor ? '✓' : '' }}
                  </span>
                </div>
                <span class="text-[11px] text-[#6E5A52] font-mono block">ID: {{ volunteer.id.slice(0, 8) }}</span>
              </div>
            </div>

            <!-- Statut Badge -->
            <span
              v-if="volunteer.planningStatus === 'CONFIRMED'"
              class="font-semibold text-xs px-2.5 py-1 inline-flex items-center gap-1 shrink-0 rounded-full bg-[#E1E9DC] text-[#2F5238] border border-[#9DB79F]"
            >
              <UIcon
                name="i-lucide-lock"
                class="w-3.5 h-3.5"
              />
              <span>Validé</span>
            </span>
            <span
              v-else
              class="font-semibold text-xs px-2.5 py-1 inline-flex items-center gap-1 shrink-0 rounded-full bg-[#F7E4C6] text-[#8A4B0F] border border-[#D9A660]"
            >
              <UIcon
                name="i-lucide-file-edit"
                class="w-3.5 h-3.5"
              />
              <span>Brouillon</span>
            </span>
          </div>

          <!-- Coordonnées -->
          <div class="text-xs space-y-1 p-3 rounded-xl bg-[#F6EFE6]/60 border border-[#E6D9CB]">
            <div class="flex items-center gap-1.5 text-[#2A1512] font-medium">
              <UIcon
                name="i-lucide-mail"
                class="w-3.5 h-3.5 text-[#6E5A52] shrink-0"
              />
              <span class="truncate">{{ volunteer.email }}</span>
            </div>
            <div
              v-if="volunteer.phone"
              class="flex items-center gap-1.5 pt-0.5"
            >
              <UIcon
                name="i-lucide-phone"
                class="w-3.5 h-3.5 text-[#6E5A52] shrink-0"
              />
              <a
                :href="'tel:' + volunteer.phone"
                class="text-[#7A291E] font-semibold hover:underline"
              >
                {{ volunteer.phone }}
              </a>
            </div>
          </div>

          <!-- Créneaux / Missions -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-xs text-[#6E5A52] font-medium">
              <span>Missions affectées :</span>
              <button
                v-if="volunteer.registrationsCount > 0"
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F6EFE6] hover:bg-[#EFE5DA] text-[#2A1512] border border-[#E6D9CB] transition-colors cursor-pointer"
                @click="openViewSlotsModal(volunteer)"
              >
                <UIcon
                  name="i-lucide-eye"
                  class="w-3.5 h-3.5 text-[#7A291E]"
                />
                <span>{{ volunteer.registrationsCount }} créneau(x)</span>
              </button>
              <span
                v-else
                class="text-xs text-[#6E5A52] italic"
              >
                Aucun créneau sélectionné
              </span>
            </div>
          </div>

          <!-- Actions tactiles -->
          <div class="pt-2 flex items-center gap-2">
            <button
              type="button"
              class="flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              @click="openManageModal(volunteer)"
            >
              <UIcon name="i-lucide-sliders-horizontal" class="w-4 h-4 text-white" />
              <span>Planning</span>
            </button>

            <button
              type="button"
              title="Badge officiel"
              class="h-11 px-3.5 rounded-full inline-flex items-center justify-center bg-[#FFFCF8] border border-[#D8C6B4] text-[#7A291E] hover:bg-[#F6EFE6] transition-colors cursor-pointer"
              @click="openBadgeModal(volunteer)"
            >
              <UIcon name="i-lucide-id-card" class="w-4 h-4" />
            </button>

            <button
              type="button"
              title="Mot de passe"
              class="h-11 px-3.5 rounded-full inline-flex items-center justify-center bg-[#FFFCF8] border border-[#D8C6B4] text-[#6E5A52] hover:text-[#7A291E] hover:bg-[#F6EFE6] transition-colors cursor-pointer"
              @click="openResetPasswordModal(volunteer)"
            >
              <UIcon name="i-lucide-key-round" class="w-4 h-4" />
            </button>

            <button
              v-if="volunteer.isMinor"
              type="button"
              :title="volunteer.isApprovedMinor ? 'Accord validé' : 'Valider accord'"
              class="h-11 px-3.5 rounded-full inline-flex items-center justify-center transition-colors cursor-pointer"
              :class="volunteer.isApprovedMinor ? 'bg-[#E1E9DC] text-[#2F5238] border border-[#9DB79F]' : 'bg-[#F7E4C6] text-[#8A4B0F] border border-[#D9A660]'"
              @click="toggleMinorApproval(volunteer)"
            >
              <UIcon :name="volunteer.isApprovedMinor ? 'i-lucide-check-check' : 'i-lucide-file-text'" class="w-4 h-4" />
            </button>

            <button
              v-if="volunteer.planningStatus === 'CONFIRMED'"
              type="button"
              title="Envoyer un rappel de convocation"
              :disabled="sendingReminderId === volunteer.id"
              class="h-11 px-3.5 rounded-full inline-flex items-center justify-center bg-[#F7E4C6] text-[#8A4B0F] border border-[#D9A660] hover:bg-[#eed3a7] transition-colors cursor-pointer disabled:opacity-50"
              @click="sendIndividualReminder(volunteer)"
            >
              <UIcon name="i-lucide-bell" class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- État vide -->
      <div
        v-if="volunteers.length === 0 && status !== 'pending'"
        class="py-12 text-center text-[#6E5A52]"
      >
        <UIcon
          name="i-lucide-users"
          class="w-8 h-8 mx-auto text-[#D8C6B4] mb-2"
        />
        <p class="text-xs font-medium">
          Aucun bénévole ne correspond aux critères de recherche.
        </p>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- MODALE 1 : APERÇU ŒIL DES CRÉNEAUX DU BÉNÉVOLE           -->
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
          v-if="isViewSlotsModalOpen && viewSlotsVolunteer"
          class="fixed inset-0 z-50 bg-[#2A1512]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          @click="closeViewSlotsModal"
        >
          <div
            class="w-full max-w-lg bg-[#FFFCF8] rounded-2xl border border-[#E6D9CB] shadow-2xl p-6 space-y-5 my-8 text-left"
            @click.stop
          >
            <!-- En-tête -->
            <div class="flex items-start justify-between pb-3 border-b border-[#E6D9CB]">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-[#F3DCD5] text-[#7A291E] flex items-center justify-center font-bold text-sm shrink-0 border border-[#D9A79F]">
                  {{ getInitials(viewSlotsVolunteer.firstName, viewSlotsVolunteer.lastName) }}
                </div>
                <div>
                  <h3 class="text-base font-bold text-[#2A1512]">
                    Créneaux de {{ viewSlotsVolunteer.fullName }}
                  </h3>
                  <p class="text-xs text-[#6E5A52]">
                    {{ viewSlotsVolunteer.registrationsCount }} créneau(x) • {{ viewSlotsVolunteer.registrationsCount * 2 }}h cumulées
                  </p>
                </div>
              </div>

              <button
                type="button"
                class="w-8 h-8 rounded-full flex items-center justify-center text-[#6E5A52] hover:text-[#2A1512] hover:bg-[#F6EFE6] transition-colors cursor-pointer"
                @click="closeViewSlotsModal"
              >
                <UIcon name="i-lucide-x" class="w-4 h-4" />
              </button>
            </div>

            <!-- Statut du planning -->
            <div class="flex items-center justify-between p-3.5 rounded-xl bg-[#F6EFE6]/60 border border-[#E6D9CB]">
              <div class="flex items-center gap-2">
                <span class="text-xs text-[#6E5A52] font-medium">Statut du planning :</span>
                <span
                  class="font-semibold text-xs px-2.5 py-0.5 rounded-full"
                  :class="viewSlotsVolunteer.planningStatus === 'CONFIRMED' ? 'bg-[#E1E9DC] text-[#2F5238] border border-[#9DB79F]' : 'bg-[#F7E4C6] text-[#8A4B0F] border border-[#D9A660]'"
                >
                  {{ viewSlotsVolunteer.planningStatus === 'CONFIRMED' ? 'Validé & Verrouillé' : 'Brouillon' }}
                </span>
              </div>
              <span class="text-xs text-[#6E5A52] font-semibold">
                {{ viewSlotsVolunteer.registrationsCount * 2 }}h / 6h max
              </span>
            </div>

            <!-- Liste des créneaux affectés -->
            <div
              v-if="viewSlotsVolunteer.registrations.length > 0"
              class="space-y-3 max-h-96 overflow-y-auto pr-1"
            >
              <div
                v-for="reg in viewSlotsVolunteer.registrations"
                :key="reg.id"
                class="p-4 rounded-xl border border-[#E6D9CB] bg-[#FFFCF8] shadow-2xs space-y-2"
              >
                <div class="flex items-center justify-between gap-2 flex-wrap">
                  <span class="font-bold text-sm text-[#2A1512]">
                    {{ reg.missionName }}
                  </span>
                  <div class="flex items-center gap-1.5 shrink-0">
                    <span
                      v-if="reg.isSensitive"
                      class="font-semibold text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0 bg-[#F3DCD5] text-[#7A291E] border border-[#D9A79F]"
                    >
                      <UIcon
                        name="i-lucide-shield-alert"
                        class="w-3 h-3"
                      />
                      <span>Poste sensible</span>
                    </span>
                    <span
                      v-else
                      class="font-medium text-[10px] px-2 py-0.5 rounded-full border border-[#E6D9CB] inline-flex items-center gap-1 shrink-0 text-[#6E5A52] bg-[#F6EFE6]"
                    >
                      <UIcon
                        name="i-lucide-shield-check"
                        class="w-3 h-3 text-[#6E5A52]"
                      />
                      <span>Mission standard</span>
                    </span>

                    <span class="text-xs font-semibold text-[#7A291E] bg-[#F3DCD5]/60 px-2 py-0.5 rounded-full border border-[#D9A79F] font-mono">
                      {{ reg.startTime }} - {{ reg.endTime }}
                    </span>
                  </div>
                </div>

                <p class="text-xs text-[#6E5A52] font-medium flex items-center gap-1.5">
                  <UIcon
                    name="i-lucide-calendar"
                    class="w-3.5 h-3.5 text-[#7A291E]"
                  />
                  <span>{{ formatSlotFullDate(reg.date) }}</span>
                </p>
              </div>
            </div>

            <div
              v-else
              class="p-8 text-center text-[#6E5A52] italic text-xs bg-[#F6EFE6]/40 rounded-xl border border-[#E6D9CB]"
            >
              Aucun créneau sélectionné pour le moment.
            </div>

            <!-- Pied de page -->
            <div class="flex items-center justify-between pt-3 border-t border-[#E6D9CB]">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                @click="() => {
                  const v = viewSlotsVolunteer
                  closeViewSlotsModal()
                  if (v) openManageModal(v)
                }"
              >
                <UIcon name="i-lucide-sliders-horizontal" class="w-3.5 h-3.5 text-white" />
                <span>Gérer le planning</span>
              </button>
              <button
                type="button"
                class="h-9 px-4 rounded-full bg-[#FFFCF8] hover:bg-[#F6EFE6] text-[#2A1512] border border-[#D8C6B4] text-xs font-semibold transition-colors cursor-pointer"
                @click="closeViewSlotsModal"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ======================================================== -->
    <!-- MODALE 2 : PRÉVISUALISATION DU BADGE BÉNÉVOLE OFFICIEL   -->
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
          v-if="isBadgeModalOpen && badgeVolunteer"
          class="fixed inset-0 z-50 bg-[#2A1512]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          @click="closeBadgeModal"
        >
          <div
            class="w-full max-w-sm bg-[#FFFCF8] rounded-2xl border border-[#E6D9CB] shadow-2xl p-5 space-y-4 my-8 text-left"
            @click.stop
          >
            <!-- En-tête -->
            <div class="flex items-center justify-between  ">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-full bg-[#F3DCD5] text-[#7A291E] flex items-center justify-center font-bold text-sm shrink-0 border border-[#D9A79F]">
                  <UIcon
                    name="i-lucide-id-card"
                    class="w-4 h-4"
                  />
                </div>
                <h3 class="text-sm font-bold text-[#2A1512] leading-tight">
                  Badge de {{ badgeVolunteer.fullName }}
                </h3>
              </div>

              <button
                type="button"
                class="w-7 h-7 rounded-full flex items-center justify-center text-[#6E5A52] hover:text-[#2A1512] hover:bg-[#F6EFE6] transition-colors cursor-pointer"
                @click="closeBadgeModal"
              >
                <UIcon name="i-lucide-x" class="w-4 h-4" />
              </button>
            </div>

            <!-- Corps : UNIQUEMENT LE BADGE -->
            <div class="flex justify-center py-1">
              <div
                v-if="isLoadingBadge"
                class="w-[280px] h-[440px] rounded-2xl bg-[#F6EFE6] border border-[#E6D9CB] flex flex-col items-center justify-center gap-2"
              >
                <UIcon
                  name="i-lucide-loader-2"
                  class="w-8 h-8 animate-spin text-[#7A291E]"
                />
                <span class="text-xs text-[#6E5A52] font-medium">Chargement du badge...</span>
              </div>
              <VolunteerBadge
                v-else
                :volunteer="{
                  id: badgeVolunteer.id,
                  firstName: badgeVolunteer.firstName,
                  lastName: badgeVolunteer.lastName,
                  photoUrl: badgeVolunteer.photoUrl,
                  qrCodeUrl: badgeData?.volunteer?.qrCodeUrl,
                  editionName: badgeData?.volunteer?.editionName,
                  editionYear: badgeData?.volunteer?.editionYear,
                  isMinor: badgeVolunteer.isMinor,
                  minorValidationStatus: badgeVolunteer.isApprovedMinor ? 'VALIDATED' : 'PENDING'
                }"
              />
            </div>

            <!-- Pied de page : Bouton Fermer -->
            <div class="pt-2 flex justify-center">
              <button
                type="button"
                class="h-9 px-4 rounded-full bg-[#FFFCF8] hover:bg-[#F6EFE6] text-[#2A1512] border border-[#D8C6B4] text-xs font-semibold transition-colors cursor-pointer w-full justify-center"
                @click="closeBadgeModal"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ======================================================== -->
    <!-- MODALE 3 : GESTION DU PLANNING BÉNÉVOLE (GRILLE VISUELLE) -->
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
          class="fixed inset-0 z-50 bg-[#2A1512]/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
          @click="closeModal"
        >
          <div
            class="w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#FFFCF8] rounded-2xl border border-[#E6D9CB] shadow-2xl overflow-hidden my-4 text-left"
            @click.stop
          >
            <!-- 1. En-tête Modale -->
            <div class="px-6 py-4 border-b border-[#E6D9CB] flex items-center justify-between gap-4 bg-[#F6EFE6]/50 shrink-0">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-11 h-11 rounded-full bg-[#F3DCD5] text-[#7A291E] flex items-center justify-center font-bold text-base shrink-0 border border-[#D9A79F]">
                  {{ getInitials(activeVolunteer.firstName, activeVolunteer.lastName) }}
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <h3 class="text-base sm:text-lg font-bold text-[#2A1512] truncate">
                      Planning de {{ activeVolunteer.fullName }}
                    </h3>
                    <span
                      class="font-semibold text-xs px-2.5 py-0.5 rounded-full"
                      :class="activeVolunteer.planningStatus === 'CONFIRMED' ? 'bg-[#E1E9DC] text-[#2F5238] border border-[#9DB79F]' : 'bg-[#F7E4C6] text-[#8A4B0F] border border-[#D9A660]'"
                    >
                      {{ activeVolunteer.planningStatus === 'CONFIRMED' ? 'Validé & Verrouillé' : 'Brouillon' }}
                    </span>
                    <span
                      v-if="activeVolunteer.isMinor"
                      class="font-semibold text-[11px] px-2 py-0.5 rounded-full"
                      :class="activeVolunteer.isApprovedMinor ? 'bg-[#E1E9DC] text-[#2F5238] border border-[#9DB79F]' : 'bg-[#F7E4C6] text-[#8A4B0F] border border-[#D9A660]'"
                    >
                      Mineur {{ activeVolunteer.isApprovedMinor ? '✓' : '' }}
                    </span>
                  </div>
                  <p class="text-xs text-[#6E5A52] truncate mt-0.5">
                    {{ activeVolunteer.email }} • {{ activeVolunteer.phone || 'Aucun numéro de téléphone' }}
                  </p>
                </div>
              </div>

              <!-- Actions En-tête -->
              <div class="flex items-center gap-2 shrink-0">
                <!-- Bascule Statut -->
                <button
                  v-if="activeVolunteer.planningStatus === 'CONFIRMED'"
                  type="button"
                  :disabled="isUpdatingStatus"
                  class="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-[#F7E4C6] hover:bg-[#eed3a7] text-[#8A4B0F] border border-[#D9A660] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  @click="togglePlanningStatus('DRAFT')"
                >
                  <UIcon name="i-lucide-unlock" class="w-3.5 h-3.5 text-[#8A4B0F]" />
                  <span>Déverrouiller</span>
                </button>
                <button
                  v-else
                  type="button"
                  :disabled="isUpdatingStatus"
                  class="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-[#2F5238] hover:bg-[#233f2a] text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  @click="togglePlanningStatus('CONFIRMED')"
                >
                  <UIcon name="i-lucide-lock" class="w-3.5 h-3.5 text-white" />
                  <span>Valider &amp; Verrouiller</span>
                </button>

                <button
                  type="button"
                  title="Voir le badge officiel"
                  class="w-8 h-8 rounded-full flex items-center justify-center bg-[#FFFCF8] border border-[#D8C6B4] text-[#7A291E] hover:bg-[#F6EFE6] transition-colors cursor-pointer"
                  @click="() => {
                    const v = activeVolunteer
                    if (v) openBadgeModal(v)
                  }"
                >
                  <UIcon name="i-lucide-id-card" class="w-4 h-4" />
                </button>

                <button
                  type="button"
                  class="w-8 h-8 rounded-full flex items-center justify-center text-[#6E5A52] hover:text-[#2A1512] hover:bg-[#F6EFE6] transition-colors cursor-pointer"
                  @click="closeModal"
                >
                  <UIcon name="i-lucide-x" class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- 2. Barre des règles de gestion & Cumul des heures (KPI) -->
            <div class="px-6 py-3 bg-[#FFFCF8] border-b border-[#E6D9CB] shrink-0 space-y-2.5">
              <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                <!-- Cumul Heures -->
                <div class="p-2.5 rounded-xl bg-[#F6EFE6]/60 border border-[#E6D9CB]">
                  <div class="flex items-center justify-between text-xs mb-1">
                    <span class="text-[#6E5A52] font-medium">Temps cumulé</span>
                    <span class="font-bold text-[#2A1512]">{{ activeVolunteerHours }}h / 6h max</span>
                  </div>
                  <div class="w-full bg-[#E6D9CB] rounded-full h-2 overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all duration-300"
                      :class="activeVolunteerHours > 6 ? 'bg-[#9A2A22]' : activeVolunteerHours >= 2 ? 'bg-[#2F5238]' : 'bg-[#D9A660]'"
                      :style="{ width: Math.min(100, (activeVolunteerHours / 6) * 100) + '%' }"
                    />
                  </div>
                </div>

                <!-- Règle 2h min -->
                <div
                  class="p-2.5 rounded-xl border flex items-center gap-2 text-xs"
                  :class="activeVolunteerHours >= 2 ? 'bg-[#E1E9DC]/60 border-[#9DB79F] text-[#2F5238]' : 'bg-[#F7E4C6]/60 border-[#D9A660] text-[#8A4B0F]'"
                >
                  <UIcon
                    :name="activeVolunteerHours >= 2 ? 'i-lucide-check-circle-2' : 'i-lucide-alert-circle'"
                    class="w-4 h-4 shrink-0"
                    :class="activeVolunteerHours >= 2 ? 'text-[#2F5238]' : 'text-[#8A4B0F]'"
                  />
                  <div>
                    <span class="font-bold block">Min. 2h</span>
                    <span class="text-[11px] opacity-90">{{ activeVolunteerHours >= 2 ? 'Règle respectée' : '1 créneau min. requis' }}</span>
                  </div>
                </div>

                <!-- Règle 6h max -->
                <div
                  class="p-2.5 rounded-xl border flex items-center gap-2 text-xs"
                  :class="activeVolunteerHours > 6 ? 'bg-[#F4D8D3]/60 border-[#D9A79F] text-[#9A2A22]' : 'bg-[#F6EFE6]/60 border-[#E6D9CB] text-[#2A1512]'"
                >
                  <UIcon
                    :name="activeVolunteerHours > 6 ? 'i-lucide-alert-octagon' : 'i-lucide-shield-check'"
                    class="w-4 h-4 shrink-0"
                    :class="activeVolunteerHours > 6 ? 'text-[#9A2A22]' : 'text-[#6E5A52]'"
                  />
                  <div>
                    <span class="font-bold block">Max. 6h</span>
                    <span class="text-[11px] opacity-90">{{ activeVolunteerHours > 6 ? 'Dépassement de 6h' : 'Plafond respecté' }}</span>
                  </div>
                </div>

                <!-- Pause obligatoire -->
                <div
                  class="p-2.5 rounded-xl border flex items-center gap-2 text-xs"
                  :class="hasConsecutiveSlotsAlert ? 'bg-[#F7E4C6]/80 border-[#D9A660] text-[#8A4B0F]' : 'bg-[#E1E9DC]/60 border-[#9DB79F] text-[#2F5238]'"
                >
                  <UIcon
                    :name="hasConsecutiveSlotsAlert ? 'i-lucide-coffee' : 'i-lucide-check-circle-2'"
                    class="w-4 h-4 shrink-0"
                    :class="hasConsecutiveSlotsAlert ? 'text-[#8A4B0F]' : 'text-[#2F5238]'"
                  />
                  <div>
                    <span class="font-bold block">Pause obligatoire</span>
                    <span class="text-[11px] opacity-90">{{ hasConsecutiveSlotsAlert ? '3 consécutifs sans pause' : 'Rythme équilibré' }}</span>
                  </div>
                </div>
              </div>

              <!-- Alerte si pause consécutive non respectée -->
              <div
                v-if="hasConsecutiveSlotsAlert"
                class="p-2.5 bg-[#F7E4C6]/60 border border-[#D9A660] rounded-xl text-xs text-[#8A4B0F] flex items-center gap-2"
              >
                <UIcon
                  name="i-lucide-alert-triangle"
                  class="w-4 h-4 text-[#8A4B0F] shrink-0"
                />
                <span><strong>Attention :</strong> Ce bénévole est affecté à 3 créneaux consécutifs sans pause sur la même journée. Une pause de 2h est normalement requise.</span>
              </div>
            </div>

            <!-- 3. Onglets par jour d'événement -->
            <div class="px-6 pt-3 pb-2 bg-[#F6EFE6]/40 border-b border-[#E6D9CB] flex items-center gap-2 overflow-x-auto shrink-0">
              <span class="text-xs font-semibold text-[#6E5A52] mr-1 shrink-0">Journée :</span>
              <button
                v-for="day in planningDays"
                :key="day.dateIso"
                type="button"
                class="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-2"
                :class="[
                  activePlanningDayDate === day.dateIso
                    ? 'bg-[#7A291E] text-white shadow-xs'
                    : 'bg-[#FFFCF8] text-[#2A1512] border border-[#D8C6B4] hover:bg-[#F6EFE6]'
                ]"
                @click="activePlanningDayDate = day.dateIso"
              >
                <span>{{ day.dayLabel }}</span>
                <span
                  class="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                  :class="[
                    activePlanningDayDate === day.dateIso
                      ? 'bg-white/20 text-white'
                      : getVolunteerDayRegistrationsCount(day.dateIso) > 0
                        ? 'bg-[#E1E9DC] text-[#2F5238]'
                        : 'bg-[#E6D9CB] text-[#6E5A52]'
                  ]"
                >
                  {{ getVolunteerDayRegistrationsCount(day.dateIso) }}
                </span>
              </button>
            </div>

            <!-- 4. Grille de planning hebdomadaire / journalière -->
            <div class="flex-1 overflow-y-auto p-6 space-y-6">
              <div
                v-if="activeDayPlanning && activeDayPlanning.slots.length > 0"
                class="space-y-6"
              >
                <!-- Boucle sur chaque tranche horaire du jour -->
                <div
                  v-for="slot in activeDayPlanning.slots"
                  :key="slot.id"
                  class="rounded-2xl border border-[#E6D9CB] bg-[#FFFCF8] p-4 sm:p-5 shadow-2xs space-y-3.5"
                >
                  <!-- En-tête de la tranche horaire -->
                  <div class="flex items-center justify-between pb-2.5 border-b border-[#E6D9CB] flex-wrap gap-2">
                    <div class="flex items-center gap-2.5">
                      <div class="w-8 h-8 rounded-full bg-[#F6EFE6] border border-[#E6D9CB] text-[#7A291E] flex items-center justify-center font-bold">
                        <UIcon
                          name="i-lucide-clock"
                          class="w-4 h-4"
                        />
                      </div>
                      <span class="font-bold text-sm sm:text-base text-[#2A1512] tracking-tight">
                        {{ slot.startTime }} - {{ slot.endTime }}
                      </span>
                      <span class="text-xs text-[#6E5A52] font-medium">(2h)</span>
                    </div>

                    <!-- Statut du bénévole sur cette tranche -->
                    <div v-if="activeVolunteer.registrations.some(r => r.timeSlotId === slot.id)">
                      <span class="font-semibold text-xs px-2.5 py-0.5 rounded-full bg-[#E1E9DC] text-[#2F5238] border border-[#9DB79F] inline-flex items-center gap-1">
                        <UIcon
                          name="i-lucide-check-circle"
                          class="w-3.5 h-3.5"
                        />
                        <span>Créneau affecté</span>
                      </span>
                    </div>
                    <div v-else>
                      <span class="text-xs text-[#6E5A52] italic">Bénévole disponible sur cette plage</span>
                    </div>
                  </div>

                  <!-- Grille des missions pour ce créneau horaire -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div
                      v-for="m in slot.missions"
                      :key="m.slotMissionId"
                      class="rounded-xl p-3.5 flex flex-col justify-between transition-all"
                      :class="[
                        activeVolunteer.registrations.some(r => r.slotMissionId === m.slotMissionId)
                          ? 'bg-[#E1E9DC]/70 border-2 border-[#2F5238] text-[#2F5238] shadow-xs'
                          : m.availablePlaces <= 0
                            ? 'bg-[#D8CFC8]/30 border border-[#A99A91] text-[#6E5A52]'
                            : 'bg-[#FFFCF8] border border-[#E6D9CB] hover:border-[#7A291E] text-[#2A1512]'
                      ]"
                    >
                      <!-- Haut de la carte mission -->
                      <div class="space-y-1.5">
                        <div class="flex items-start justify-between gap-1.5">
                          <span
                            class="font-bold text-xs line-clamp-2"
                            :class="activeVolunteer.registrations.some(r => r.slotMissionId === m.slotMissionId) ? 'text-[#2F5238]' : 'text-[#2A1512]'"
                          >
                            {{ m.name }}
                          </span>
                          <span
                            v-if="m.isSensitive"
                            class="font-semibold text-[9px] px-1.5 py-0.5 rounded-full shrink-0 inline-flex items-center gap-0.5 bg-[#F3DCD5] text-[#7A291E] border border-[#D9A79F]"
                          >
                            <UIcon
                              name="i-lucide-shield-alert"
                              class="w-2.5 h-2.5"
                            />
                            <span>Sensible</span>
                          </span>
                        </div>

                        <!-- Jauge / Places -->
                        <div class="flex items-center justify-between text-[11px] text-[#6E5A52] pt-0.5">
                          <span
                            v-if="activeVolunteer.registrations.some(r => r.slotMissionId === m.slotMissionId)"
                            class="font-bold text-[#2F5238] flex items-center gap-1"
                          >
                            <UIcon
                              name="i-lucide-check"
                              class="w-3 h-3"
                            />
                            Affecté à ce bénévole
                          </span>
                          <span
                            v-else-if="m.availablePlaces <= 0"
                            class="font-bold text-[#9A2A22] flex items-center gap-1"
                          >
                            <UIcon
                              name="i-lucide-alert-circle"
                              class="w-3 h-3"
                            />
                            Complet (0 libre)
                          </span>
                          <span
                            v-else
                            class="text-[#6E5A52]"
                          >
                            {{ m.availablePlaces }} place(s) libre(s)
                          </span>

                          <span class="font-mono text-[#6E5A52]">
                            {{ m.registeredCount }}/{{ m.capacityMax }}
                          </span>
                        </div>
                      </div>

                      <!-- Action en bas de la carte -->
                      <div class="pt-3 border-t border-[#E6D9CB] mt-2">
                        <!-- Cas 1 : Bénévole déjà affecté à cette mission -->
                        <template v-if="activeVolunteer.registrations.some(r => r.slotMissionId === m.slotMissionId)">
                          <button
                            type="button"
                            :disabled="deletingRegistrationId === activeVolunteer.registrations.find(r => r.slotMissionId === m.slotMissionId)?.id"
                            class="w-full h-8 inline-flex items-center justify-center gap-1 rounded-full bg-[#FFFCF8] hover:bg-[#F4D8D3] text-[#9A2A22] border border-[#D9A79F] text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
                            @click="() => {
                              const reg = activeVolunteer?.registrations.find(r => r.slotMissionId === m.slotMissionId)
                              if (reg) removeRegistration(reg.id)
                            }"
                          >
                            <UIcon name="i-lucide-trash-2" class="w-3 h-3" />
                            <span>Retirer l'affectation</span>
                          </button>
                        </template>

                        <!-- Cas 2 : Mission complète -> Forcer l'attribution (Override) -->
                        <template v-else-if="m.availablePlaces <= 0">
                          <button
                            type="button"
                            :disabled="isAssigning && assigningSlotMissionId === m.slotMissionId"
                            class="w-full h-8 inline-flex items-center justify-center gap-1 rounded-full bg-[#F7E4C6] hover:bg-[#eed3a7] text-[#8A4B0F] border border-[#D9A660] text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
                            @click="quickAssignMission(m.slotMissionId)"
                          >
                            <UIcon name="i-lucide-shield-alert" class="w-3 h-3" />
                            <span>Forcer (Override)</span>
                          </button>
                        </template>

                        <!-- Cas 3 : Mission disponible -> Affecter en 1 clic -->
                        <template v-else>
                          <button
                            type="button"
                            :disabled="isAssigning && assigningSlotMissionId === m.slotMissionId"
                            class="w-full h-8 inline-flex items-center justify-center gap-1 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] text-white text-xs font-semibold cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
                            @click="quickAssignMission(m.slotMissionId)"
                          >
                            <UIcon name="i-lucide-plus" class="w-3 h-3 text-white" />
                            <span>Affecter</span>
                          </button>
                        </template>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- État vide créneaux sur la journée -->
              <div
                v-else
                class="p-12 text-center text-[#6E5A52] bg-[#F6EFE6]/40 rounded-2xl border border-[#E6D9CB]"
              >
                <UIcon
                  name="i-lucide-calendar-x"
                  class="w-8 h-8 mx-auto text-[#D8C6B4] mb-2"
                />
                <p class="text-xs font-medium">
                  Aucun créneau horaire configuré pour cette journée.
                </p>
              </div>
            </div>

            <!-- 5. Pied de page Modale -->
            <div class="px-6 py-3 border-t border-[#E6D9CB] bg-[#F6EFE6]/40 flex items-center justify-between shrink-0">
              <span class="text-xs text-[#6E5A52] font-medium">
                {{ activeVolunteer.registrationsCount }} créneau(x) assigné(s) au total ({{ activeVolunteerHours }}h)
              </span>
              <button
                type="button"
                class="h-9 px-4 rounded-full bg-[#FFFCF8] hover:bg-[#F6EFE6] text-[#2A1512] border border-[#D8C6B4] text-xs font-semibold cursor-pointer transition-colors"
                @click="closeModal"
              >
                Fermer le planning
              </button>
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
          class="fixed inset-0 z-50 bg-[#2A1512]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          @click="closeResetModal"
        >
          <div
            class="w-full max-w-md bg-[#FFFCF8] rounded-2xl border border-[#E6D9CB] shadow-2xl p-6 space-y-5 my-8 text-left"
            @click.stop
          >
            <!-- En-tête -->
            <div class="flex items-start justify-between pb-3 border-b border-[#E6D9CB]">
              <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-full bg-[#F3DCD5] text-[#7A291E] flex items-center justify-center font-bold text-sm shrink-0 border border-[#D9A79F]">
                  <UIcon
                    name="i-lucide-key-round"
                    class="w-4 h-4"
                  />
                </div>
                <div>
                  <h3 class="text-base font-bold text-[#2A1512]">
                    Réinitialiser le mot de passe
                  </h3>
                  <p class="text-xs text-[#6E5A52]">
                    {{ resetVolunteer.fullName }} ({{ resetVolunteer.email }})
                  </p>
                </div>
              </div>

              <button
                type="button"
                class="w-7 h-7 rounded-full flex items-center justify-center text-[#6E5A52] hover:text-[#2A1512] hover:bg-[#F6EFE6] transition-colors cursor-pointer"
                @click="closeResetModal"
              >
                <UIcon name="i-lucide-x" class="w-4 h-4" />
              </button>
            </div>

            <!-- Résultat après action -->
            <div
              v-if="resetResult"
              class="space-y-4"
            >
              <div
                class="p-4 rounded-xl border"
                :class="resetResult.success ? 'bg-[#E1E9DC] border-[#9DB79F] text-[#2F5238]' : 'bg-[#F4D8D3] border-[#D9A79F] text-[#9A2A22]'"
              >
                <div class="flex items-start gap-2.5">
                  <UIcon
                    :name="resetResult.success ? 'i-lucide-check-circle-2' : 'i-lucide-alert-circle'"
                    class="w-5 h-5 shrink-0 mt-0.5"
                    :class="resetResult.success ? 'text-[#2F5238]' : 'text-[#9A2A22]'"
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
                <label class="block text-xs font-semibold text-[#2A1512]">
                  Nouveau mot de passe temporaire :
                </label>
                <div class="p-3 bg-[#F6EFE6] rounded-xl border border-[#E6D9CB] flex items-center justify-between gap-2">
                  <span class="font-mono font-bold text-sm text-[#2A1512] select-all tracking-wide">
                    {{ resetResult.temporaryPassword }}
                  </span>
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 h-7 px-3 rounded-full bg-[#7A291E] text-white hover:bg-[#5E1F16] text-xs font-semibold transition-colors cursor-pointer"
                    @click="copyToClipboard(resetResult.temporaryPassword!)"
                  >
                    <UIcon :name="copySuccess ? 'i-lucide-check' : 'i-lucide-copy'" class="w-3.5 h-3.5 text-white" />
                    <span>{{ copySuccess ? 'Copié !' : 'Copier' }}</span>
                  </button>
                </div>
                <p class="text-[11px] text-[#6E5A52] italic">
                  Communiquez ce mot de passe au bénévole afin qu'il puisse se connecter.
                </p>
              </div>

              <!-- Bouton Terminer -->
              <div class="pt-2 flex justify-end">
                <button
                  type="button"
                  class="h-9 px-4 rounded-full bg-[#FFFCF8] hover:bg-[#F6EFE6] text-[#2A1512] border border-[#D8C6B4] text-xs font-semibold transition-colors cursor-pointer"
                  @click="closeResetModal"
                >
                  Fermer
                </button>
              </div>
            </div>

            <!-- Formulaire de choix -->
            <div
              v-else
              class="space-y-4"
            >
              <!-- Sélecteur de méthode -->
              <div class="space-y-2">
                <label class="block text-xs font-semibold text-[#2A1512]">Méthode de réinitialisation</label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    class="p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    :class="[
                      resetMode === 'temporary'
                        ? 'border-[#7A291E] bg-[#F3DCD5] text-[#7A291E] shadow-xs'
                        : 'border-[#D8C6B4] bg-[#FFFCF8] text-[#6E5A52] hover:bg-[#F6EFE6]'
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
                        ? 'border-[#7A291E] bg-[#F3DCD5] text-[#7A291E] shadow-xs'
                        : 'border-[#D8C6B4] bg-[#FFFCF8] text-[#6E5A52] hover:bg-[#F6EFE6]'
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
                <label class="block text-xs font-semibold text-[#2A1512]">
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
                <p class="text-[11px] text-[#6E5A52]">
                  Si laissé vide, un mot de passe sécurisé sera automatiquement généré.
                </p>
              </div>

              <!-- Message pour Lien par e-mail -->
              <div
                v-else
                class="p-3 bg-[#F6EFE6]/60 rounded-xl border border-[#E6D9CB] text-xs text-[#2A1512] leading-relaxed"
              >
                <p>
                  Un lien sécurisé valable <strong>1 heure</strong> sera envoyé à l'adresse <strong>{{ resetVolunteer.email }}</strong> pour lui permettre de choisir son nouveau mot de passe.
                </p>
              </div>

              <!-- Actions -->
              <div class="flex items-center justify-end gap-2 pt-2 border-t border-[#E6D9CB]">
                <button
                  type="button"
                  class="h-9 px-4 rounded-full bg-[#FFFCF8] hover:bg-[#F6EFE6] text-[#2A1512] border border-[#D8C6B4] text-xs font-semibold transition-colors cursor-pointer"
                  @click="closeResetModal"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  :disabled="isResettingPassword"
                  class="h-9 px-4 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  @click="handleAdminResetPassword"
                >
                  Confirmer la réinitialisation
                </button>
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
          class="fixed inset-0 z-50 bg-[#2A1512]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          @click="isBulkRemindModalOpen = false"
        >
          <div
            class="w-full max-w-md bg-[#FFFCF8] rounded-2xl border border-[#E6D9CB] shadow-2xl p-6 space-y-5 my-8 text-left"
            @click.stop
          >
            <!-- En-tête -->
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-full bg-[#F7E4C6] text-[#8A4B0F] flex items-center justify-center shrink-0">
                <UIcon
                  name="i-lucide-bell-ring"
                  class="w-5 h-5"
                />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-base font-bold text-[#2A1512]">
                  Rappel général de convocation
                </h3>
                <p class="text-xs text-[#6E5A52] mt-0.5">
                  Notification e-mail des bénévoles dont le planning est validé.
                </p>
              </div>
            </div>

            <!-- Détails -->
            <div class="bg-[#F7E4C6]/40 border border-[#D9A660] rounded-xl p-4 text-xs text-[#8A4B0F] space-y-2">
              <p class="font-semibold text-[#2A1512]">
                Vous vous apprêtez à envoyer un e-mail de rappel à :
              </p>
              <div class="text-sm font-bold text-[#8A4B0F] flex items-center gap-1.5">
                <UIcon
                  name="i-lucide-users"
                  class="w-4 h-4 text-[#8A4B0F]"
                />
                <span>{{ confirmedVolunteersCount }} bénévole(s) validé(s)</span>
              </div>
              <p class="text-[11px] text-[#6E5A52] leading-relaxed pt-1 border-t border-[#D9A660]/40">
                Cet e-mail leur rappellera la liste précise de leurs créneaux, les horaires de présentation au QG (15 min avant) et le lien direct vers leur badge numérique.
              </p>
            </div>

            <!-- Actions -->
            <div class="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                :disabled="isSendingBulkReminders"
                class="h-9 px-4 rounded-full bg-[#FFFCF8] hover:bg-[#F6EFE6] text-[#2A1512] border border-[#D8C6B4] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                @click="isBulkRemindModalOpen = false"
              >
                Annuler
              </button>

              <button
                type="button"
                :disabled="isSendingBulkReminders"
                class="h-9 px-4 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                @click="handleBulkRemind"
              >
                <UIcon name="i-lucide-send" class="w-3.5 h-3.5 text-white" />
                <span>Envoyer les rappels</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
