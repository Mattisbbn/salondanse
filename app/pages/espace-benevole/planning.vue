<script setup lang="ts">
const { user } = useAuth()
const toast = useToast()

useHead({
  title: 'Mon Planning · Espace Bénévole'
})

interface MissionData {
  id: string
  missionId: string
  name: string
  description: string | null
  capacityMax: number
  locationNotes?: string | null
  registeredCount: number
  availablePlaces: number
  isSelectedByMe: boolean
  isSensitive?: boolean
  isAssignedByAdmin?: boolean
}

interface SlotData {
  id: string
  date: string
  startTime: string
  endTime: string
  orderIndex: number
  missions: MissionData[]
}

interface DayData {
  date: string
  dayKey: string
  dayLabel: string
  fullDayLabel: string
  slots: SlotData[]
}

interface PlanningApiResponse {
  edition?: {
    id: string
    name: string
    year: number
  } | null
  planningStatus: 'DRAFT' | 'CONFIRMED'
  planningLockedAt: string | null
  isLocked: boolean
  isRegistrationOpen?: boolean
  registrationStartDate?: string | null
  registrationEndDate?: string | null
  mySelectedSlotMissionIds: string[]
  days: DayData[]
}

// Chargement des créneaux
const { data, status, refresh } = await useFetch<PlanningApiResponse>('/api/planning/slots', {
  lazy: false
})


// Liste des IDs sélectionnés dans l'UI (réactif)
const selectedIds = ref<string[]>([])
const activeDayIndex = ref(0)
const isSavingDraft = ref(false)
const isConfirming = ref(false)
const isConfirmModalOpen = ref(false)

// Initialisation de la sélection à partir des données reçues (uniquement missions publiques)
watch(data, (newData) => {
  if (newData?.days) {
    const publicSelected: string[] = []
    for (const d of newData.days) {
      for (const s of d.slots) {
        for (const m of s.missions) {
          if (!m.isSensitive && newData.mySelectedSlotMissionIds?.includes(m.id)) {
            publicSelected.push(m.id)
          }
        }
      }
    }
    selectedIds.value = publicSelected
  }
}, { immediate: true })

// Missions sensibles déjà attribuées à ce bénévole par l'administration
const assignedSensitiveMissions = computed(() => {
  const list: Array<{
    slot: SlotData
    mission: MissionData
  }> = []
  if (!data.value?.days) return list
  for (const day of data.value.days) {
    for (const slot of day.slots) {
      for (const m of slot.missions) {
        if (m.isSensitive && m.isAssignedByAdmin) {
          list.push({ slot, mission: m })
        }
      }
    }
  }
  return list
})

// Statut de confirmation
const isConfirmed = computed(() => {
  return data.value?.planningStatus === 'CONFIRMED' || data.value?.isLocked === true
})

// Statut d'ouverture des inscriptions
const isRegistrationOpen = computed(() => {
  return data.value?.isRegistrationOpen !== false
})

// Compteur total de créneaux (créneaux publics choisis + créneaux attribués par l'admin)
const selectedCount = computed(() => {
  return selectedIds.value.length + assignedSensitiveMissions.value.length
})

// Progression en pourcentage
const progressPercentage = computed(() => {
  return Math.min(100, Math.round((selectedCount.value / 3) * 100))
})

// Map associant chaque slotId à la mission sélectionnée par l'utilisateur ou attribuée par l'admin
const selectedBySlotMap = computed(() => {
  const map = new Map<string, MissionData>()
  if (!data.value?.days) return map

  for (const day of data.value.days) {
    for (const slot of day.slots) {
      for (const m of slot.missions) {
        if ((m.isSensitive && m.isAssignedByAdmin) || selectedIds.value.includes(m.id)) {
          map.set(slot.id, m)
        }
      }
    }
  }
  return map
})

// Compte de sélections par jour (pour pastille sur les onglets)
const selectedCountByDay = computed(() => {
  const counts: Record<number, number> = {}
  if (!data.value?.days) return counts

  data.value.days.forEach((day, index) => {
    let count = 0
    day.slots.forEach((slot) => {
      slot.missions.forEach((m) => {
        if ((m.isSensitive && m.isAssignedByAdmin) || selectedIds.value.includes(m.id)) {
          count++
        }
      })
    })
    counts[index] = count
  })
  return counts
})

// Liste détaillée des sélections pour la modale de confirmation
const selectedMissionsDetails = computed(() => {
  const list: Array<{
    slotMissionId: string
    dayLabel: string
    timeSlotLabel: string
    missionName: string
    orderIndex: number
    date: string
    isSensitive?: boolean
    isAssignedByAdmin?: boolean
  }> = []

  if (!data.value?.days) return list

  for (const day of data.value.days) {
    for (const slot of day.slots) {
      for (const m of slot.missions) {
        const isAssigned = m.isSensitive && m.isAssignedByAdmin
        const isSelected = !m.isSensitive && selectedIds.value.includes(m.id)
        if (isAssigned || isSelected) {
          list.push({
            slotMissionId: m.id,
            dayLabel: day.dayLabel,
            timeSlotLabel: `${slot.startTime} - ${slot.endTime}`,
            missionName: m.name,
            orderIndex: slot.orderIndex,
            date: day.date,
            isSensitive: m.isSensitive,
            isAssignedByAdmin: m.isAssignedByAdmin
          })
        }
      }
    }
  }

  return list.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return a.orderIndex - b.orderIndex
  })
})

// Validation locale des 3 créneaux consécutifs
const hasConsecutiveSlotsConflict = computed(() => {
  const slotsByDay: Record<string, number[]> = {}
  for (const item of selectedMissionsDetails.value) {
    if (!slotsByDay[item.date]) {
      slotsByDay[item.date] = []
    }
    slotsByDay[item.date]?.push(item.orderIndex)
  }

  for (const key of Object.keys(slotsByDay)) {
    const indices = slotsByDay[key] || []
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

// Date formatée de verrouillage
const formattedLockedDate = computed(() => {
  if (!data.value?.planningLockedAt) return ''
  const d = new Date(data.value.planningLockedAt)
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
})

// Toggle sélection d'une mission
function toggleMission(slot: SlotData, mission: MissionData) {
  if (isConfirmed.value) return

  if (!isRegistrationOpen.value) {
    toast.add({
      title: 'Inscriptions fermées',
      description: 'La période d\'inscription est fermée. Le planning est en consultation seule.',
      color: 'warning'
    })
    return
  }

  if (mission.isSensitive) {
    if (mission.isAssignedByAdmin) {
      toast.add({
        title: 'Poste attribué par l\'organisation',
        description: 'Ce créneau sensible vous a été affecté par l\'équipe d\'organisation et ne peut pas être modifié.',
        color: 'info'
      })
    } else {
      toast.add({
        title: 'Poste sous restriction',
        description: 'Les postes sous restriction (Caisse, Billetterie) sont attribués uniquement par l\'administration.',
        color: 'warning'
      })
    }
    return
  }

  const isAlreadySelected = selectedIds.value.includes(mission.id)

  if (isAlreadySelected) {
    // Désélection
    selectedIds.value = selectedIds.value.filter(id => id !== mission.id)
    return
  }

  // Vérification de la capacité
  if (mission.availablePlaces <= 0) {
    toast.add({
      title: 'Créneau complet',
      description: 'Cette mission n\'a plus de place disponible sur cette tranche horaire.',
      color: 'warning'
    })
    return
  }

  // Vérification si ce créneau horaire a déjà une autre mission choisie
  if (selectedBySlotMap.value.has(slot.id)) {
    toast.add({
      title: 'Créneau déjà occupé',
      description: `Vous avez déjà choisi la mission "${selectedBySlotMap.value.get(slot.id)?.name}" sur cette tranche horaire (${slot.startTime} - ${slot.endTime}).`,
      color: 'warning'
    })
    return
  }

  // Vérification quota maximum
  if (selectedCount.value >= 3) {
    toast.add({
      title: 'Quota maximal atteint',
      description: 'Vous ne pouvez sélectionner que 3 créneaux maximum sur l\'ensemble du week-end (6h).',
      color: 'warning'
    })
    return
  }

  // Ajout
  selectedIds.value.push(mission.id)
}

// Sauvegarde du brouillon
async function saveDraft() {
  if (isSavingDraft.value || isConfirmed.value) return
  isSavingDraft.value = true

  try {
    await $fetch('/api/planning/draft', {
      method: 'POST',
      body: {
        slotMissionIds: selectedIds.value
      }
    })

    toast.add({
      title: 'Brouillon enregistré',
      description: `${selectedCount.value} créneau(x) sauvegardé(s) en brouillon. Vous pourrez revenir le modifier à tout moment.`,
      color: 'success'
    })
    await refresh()
  } catch (err: unknown) {
    const errorObj = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    const message = errorObj?.data?.statusMessage || errorObj?.statusMessage || errorObj?.message || 'Erreur lors de l\'enregistrement du brouillon.'
    toast.add({
      title: 'Erreur',
      description: message,
      color: 'error'
    })
  } finally {
    isSavingDraft.value = false
  }
}

// Ouverture de la modale de confirmation
function openConfirmModal() {
  if (selectedCount.value < 1) {
    toast.add({
      title: 'Sélection requise',
      description: 'Veuillez sélectionner au moins 1 créneau (2h) avant de valider votre planning.',
      color: 'warning'
    })
    return
  }

  if (selectedCount.value > 3) {
    toast.add({
      title: 'Trop de créneaux',
      description: 'Le maximum autorisé est de 3 créneaux (6h).',
      color: 'warning'
    })
    return
  }

  if (hasConsecutiveSlotsConflict.value) {
    toast.add({
      title: 'Pause obligatoire non respectée',
      description: 'Impossible d\'enchaîner 3 créneaux consécutifs le même jour (pause obligatoire de 2h)',
      color: 'error'
    })
    return
  }

  isConfirmModalOpen.value = true
}

// Validation finale définitive
async function confirmPlanning() {
  if (isConfirming.value) return
  isConfirming.value = true

  try {
    const res = await $fetch<{ message: string }>('/api/planning/confirm', {
      method: 'POST',
      body: {
        slotMissionIds: selectedIds.value
      }
    })

    toast.add({
      title: 'Planning validé !',
      description: res.message || 'Votre planning est désormais validé et verrouillé.',
      color: 'success'
    })

    isConfirmModalOpen.value = false
    await refresh()
  } catch (err: unknown) {
    const errorObj = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    const message = errorObj?.data?.statusMessage || errorObj?.statusMessage || errorObj?.message || 'Erreur lors de la validation du planning.'
    toast.add({
      title: 'Validation impossible',
      description: message,
      color: 'error'
    })
  } finally {
    isConfirming.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-6xl xl:max-w-7xl mx-auto space-y-6 text-[#2A1512]">
    <!-- En-tête de la page -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E6D9CB]">
      <div class="space-y-1">
        <span class="text-[11px] font-bold tracking-[0.16em] uppercase text-[#7A291E] block">
          Espace Bénévoles · Choix des missions
        </span>
        <h1 class="font-bold tracking-tight text-2xl sm:text-3xl text-[#2A1512] leading-tight">
          Mon Planning Bénévole
        </h1>
   
      </div>

      <!-- Badge de statut DA -->
      <div>
        <span
          v-if="isConfirmed"
          class="font-semibold text-xs px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 bg-[#E1E9DC] text-[#2F5238] border border-[#9DB79F]"
        >
          <UIcon
            name="i-lucide-lock"
            class="w-3.5 h-3.5 text-[#2F5238]"
          />
          <span>Planning validé et verrouillé</span>
        </span>
        <span
          v-else
          class="font-semibold text-xs px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 bg-[#F7E4C6] text-[#8A4B0F] "
        >
          <UIcon
            name="i-lucide-clock"
            class="w-3.5 h-3.5 text-[#8A4B0F]"
          />
          <span>En attente de validation</span>
        </span>
      </div>
    </div>



    <!-- Bandeau discret d'alerte Inscriptions Fermées -->
    <div
      v-if="!isRegistrationOpen"
      class="bg-[#F7E4C6] border border-[#D9A660] rounded-2xl p-4 flex items-start gap-3 shadow-2xs"
    >
      <UIcon
        name="i-lucide-lock"
        class="w-5 h-5 text-[#8A4B0F] shrink-0 mt-0.5"
      />
      <div class="text-xs text-[#8A4B0F] leading-relaxed">
        <p class="font-bold">
          Inscriptions fermées — Consultation seule
        </p>
        <p class="mt-0.5">
          La campagne d'inscription est actuellement fermée. Vous pouvez consulter les créneaux et missions en lecture seule.
        </p>
      </div>
    </div>

    <!-- Bandeau d'information VERROUILLÉ -->
    <div
      v-if="isConfirmed"
      class="bg-[#E1E9DC] border border-[#9DB79F] rounded-2xl p-4 flex items-start gap-3"
    >
      <UIcon
        name="i-lucide-check-circle"
        class="w-5 h-5 text-[#2F5238] shrink-0 mt-0.5"
      />
      <div class="text-xs sm:text-sm text-[#2F5238]">
        <p class="font-bold">
          Votre planning est confirmé et verrouillé !
        </p>
        <p class="mt-0.5 text-xs opacity-90">
          Validé le {{ formattedLockedDate }}. Vos créneaux sont définitivement enregistrés. Pour toute demande de changement, veuillez contacter l'administration.
        </p>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- BARRE RÉCAPITULATIVE FLOTTANTE / STICKY (Papier #FFFCF8)  -->
    <!-- ======================================================== -->
    <div class="sticky top-16 md:top-4 z-20 bg-[#FFFCF8]/95 backdrop-blur-md rounded-3xl border border-[#E6D9CB] shadow-sm p-4 transition-all">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <!-- Compteur & barre de progression -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-xs font-semibold text-[#2A1512]">
              <span class="text-[#7A291E] font-bold text-sm">{{ selectedCount }}</span> / 3 créneaux sélectionnés
              <span class="text-[#6E5A52] font-normal ml-1">({{ selectedCount * 2 }}h de bénévolat)</span>
            </span>
            <span class="text-[11px] text-[#6E5A52] font-medium">
              {{ selectedCount === 0 ? 'Min. 1 créneau' : selectedCount === 3 ? 'Quota maximal atteint' : `${3 - selectedCount} restant(s)` }}
            </span>
          </div>

          <!-- Barre de progression -->
          <div class="w-full bg-[#EFE6DA] rounded-full h-2 overflow-hidden border border-[#E6D9CB]">
            <div
              class="h-full transition-all duration-300 rounded-full"
              :class="[
                selectedCount === 0
                  ? 'bg-transparent w-0'
                  : selectedCount < 3
                    ? 'bg-[#7A291E]'
                    : 'bg-[#2F5238]'
              ]"
              :style="{ width: `${progressPercentage}%` }"
            />
          </div>
        </div>

        <!-- Actions de validation (masquées si déjà confirmé ou inscriptions fermées) -->
        <div
          v-if="!isConfirmed && isRegistrationOpen"
          class="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E6D9CB]"
        >
          <button
            type="button"
            :disabled="isSavingDraft"
            class="h-10 sm:h-9 px-4 rounded-full border border-[#D8C6B4] bg-[#FFFCF8] hover:bg-[#F6EFE6] text-[#2A1512] font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            @click="saveDraft"
          >
            <UIcon
              v-if="isSavingDraft"
              name="i-lucide-loader-2"
              class="w-3.5 h-3.5 animate-spin"
            />
            <UIcon
              v-else
              name="i-lucide-save"
              class="w-3.5 h-3.5 text-[#7A291E]"
            />
            <span>Brouillon</span>
          </button>

          <button
            type="button"
            :disabled="selectedCount < 1 || selectedCount > 3 || hasConsecutiveSlotsConflict"
            class="h-10 sm:h-9 px-5 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
            @click="openConfirmModal"
          >
            <UIcon name="i-lucide-check-circle" class="w-3.5 h-3.5" />
            <span>Valider définitivement</span>
          </button>
        </div>
      </div>

      <!-- Alerte de pause obligatoire si 3 consécutifs -->
      <div
        v-if="hasConsecutiveSlotsConflict && !isConfirmed"
        class="mt-2.5 pt-2.5 border-t border-[#D9A79F] flex items-center gap-2 text-xs text-[#9A2A22] font-semibold"
      >
        <UIcon
          name="i-lucide-alert-triangle"
          class="w-4 h-4 shrink-0 text-[#9A2A22]"
        />
        <span>Impossible d'enchaîner 3 créneaux consécutifs le même jour (pause obligatoire de 2h)</span>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- ONGLETS PAR JOUR (Mobile-First)                          -->
    <!-- ======================================================== -->
    <div
      v-if="data?.days && data.days.length > 0"
      class="space-y-4"
    >
      <div class="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#E6D9CB]">
        <button
          v-for="(day, idx) in data.days"
          :key="day.dayKey"
          type="button"
          class="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer"
          :class="[
            activeDayIndex === idx
              ? 'bg-[#7A291E] text-white shadow-2xs'
              : 'bg-[#FFFCF8] text-[#2A1512] hover:bg-[#F6EFE6] border border-[#E6D9CB]'
          ]"
          @click="activeDayIndex = idx"
        >
          <span>{{ day.dayLabel }}</span>
          <span
            v-if="selectedCountByDay[idx] && selectedCountByDay[idx] > 0"
            class="w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center transition-colors"
            :class="[
              activeDayIndex === idx
                ? 'bg-white text-[#7A291E]'
                : 'bg-[#F3DCD5] text-[#7A291E]'
            ]"
          >
            {{ selectedCountByDay[idx] }}
          </span>
        </button>
      </div>

      <!-- Jour actif -->
      <div
        v-if="data.days[activeDayIndex]"
        class="space-y-6 pt-2"
      >
        <div class="flex items-center justify-between">
          <h2 class="font-bold text-lg text-[#2A1512]">
            {{ data.days[activeDayIndex]?.fullDayLabel }}
          </h2>
          <span class="text-xs text-[#6E5A52]">
            5 créneaux de 2h disponibles
          </span>
        </div>

        <!-- Tranches horaires du jour -->
        <div
          v-for="slot in data.days[activeDayIndex]?.slots"
          :key="slot.id"
          class="bg-[#FFFCF8] rounded-3xl border border-[#E6D9CB] p-4 sm:p-5 shadow-2xs space-y-3"
        >
          <!-- En-tête de tranche horaire -->
          <div class="flex items-center justify-between pb-2.5 border-b border-[#E6D9CB]">
            <div class="flex items-center gap-2.5">
              <div class="w-7 h-7 rounded-full bg-[#FAF2EF] text-[#7A291E] flex items-center justify-center">
                <UIcon
                  name="i-lucide-clock"
                  class="w-4 h-4"
                />
              </div>
              <div>
                <span class="text-sm font-bold text-[#2A1512]">
                  {{ slot.startTime }} - {{ slot.endTime }}
                </span>
                <span class="text-[11px] text-[#6E5A52] font-medium ml-2">
                  Créneau {{ slot.orderIndex }} / 5
                </span>
              </div>
            </div>

            <!-- Indicateur si une mission est choisie sur cette tranche -->
            <div v-if="selectedBySlotMap.has(slot.id)">
              <span class="font-semibold text-xs px-2.5 py-0.5 rounded-full bg-[#7A291E] text-white">
                1 mission choisie
              </span>
            </div>
          </div>

          <!-- Grille des missions du créneau -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div
              v-for="mission in slot.missions"
              :key="mission.id"
              class="rounded-2xl p-3.5 border transition-all select-none flex flex-col justify-between"
              :class="[
                mission.isSensitive
                  ? mission.isAssignedByAdmin
                    ? 'border-2 border-[#7A291E] bg-[#FAF2EF] cursor-not-allowed'
                    : 'opacity-60 bg-[#EFE6DA]/40 border-dashed border-[#D8C6B4] cursor-not-allowed'
                  : selectedIds.includes(mission.id)
                    ? 'border-2 border-[#7A291E] bg-[#FAF2EF] shadow-2xs cursor-pointer'
                    : mission.availablePlaces <= 0
                      ? 'border-[#E6D9CB] bg-[#EFE6DA]/30 opacity-60 cursor-not-allowed'
                      : selectedBySlotMap.has(slot.id)
                        ? 'border-[#E6D9CB] bg-[#EFE6DA]/20 opacity-60 cursor-not-allowed'
                        : isConfirmed || !isRegistrationOpen
                          ? 'border-[#E6D9CB] bg-white opacity-70 cursor-not-allowed'
                          : 'border-[#E6D9CB] bg-white hover:border-[#7A291E] hover:shadow-2xs cursor-pointer'
              ]"
              @click="toggleMission(slot, mission)"
            >
              <div>
                <div class="flex items-start justify-between gap-2 mb-2">
                  <span class="text-xs font-bold text-[#2A1512] leading-snug">
                    {{ mission.name }}
                  </span>

                  <!-- Icône de sélection -->
                  <div class="shrink-0">
                    <UIcon
                      v-if="mission.isSensitive && mission.isAssignedByAdmin"
                      name="i-lucide-shield-check"
                      class="w-4 h-4 text-[#7A291E]"
                    />
                    <UIcon
                      v-else-if="mission.isSensitive"
                      name="i-lucide-lock"
                      class="w-4 h-4 text-[#6E5A52]"
                    />
                    <UIcon
                      v-else-if="selectedIds.includes(mission.id)"
                      name="i-lucide-check-circle-2"
                      class="w-4 h-4 text-[#7A291E]"
                    />
                    <div
                      v-else-if="!isConfirmed && isRegistrationOpen && mission.availablePlaces > 0 && !selectedBySlotMap.has(slot.id)"
                      class="w-4 h-4 rounded-full border border-[#D8C6B4]"
                    />
                  </div>
                </div>

                <!-- Cas 1 : Poste sensible attribué par l'admin -->
                <template v-if="mission.isSensitive && mission.isAssignedByAdmin">
                  <div class="inline-flex items-center gap-1 text-[10px] text-[#7A291E] bg-[#F3DCD5] px-2 py-0.5 rounded-full font-bold mb-1.5">
                    <UIcon
                      name="i-lucide-shield-check"
                      class="w-3 h-3 shrink-0"
                    />
                    <span>Attribué par l'admin</span>
                  </div>
                  <p class="text-[11px] text-[#7A291E] font-medium mb-2 leading-relaxed">
                    Ce poste vous a été affecté directement par l'équipe d'organisation.
                  </p>
                </template>

                <!-- Cas 2 : Poste sensible sous restriction admin (non attribué) -->
                <template v-else-if="mission.isSensitive">
                  <div class="inline-flex items-center gap-1 text-[10px] text-[#7A291E] bg-[#F3DCD5] px-2 py-0.5 rounded-full font-bold mb-1.5">
                    <UIcon
                      name="i-lucide-lock"
                      class="w-3 h-3 shrink-0"
                    />
                    <span>Poste sensible</span>
                  </div>
                  <p class="text-[11px] text-[#6E5A52] italic mb-2 leading-relaxed">
                    Ce poste nécessite une habilitation et est attribué directement par l'équipe d'organisation.
                  </p>
                </template>

                <!-- Cas 3 : Poste standard -->
                <p
                  v-else-if="mission.description"
                  class="text-[11px] text-[#6E5A52] line-clamp-2 mb-2"
                >
                  {{ mission.description }}
                </p>

                <!-- Point de rendez-vous / Lieu précis -->
                <div
                  v-if="mission.locationNotes"
                  class="inline-flex items-center gap-1 text-[10px] font-medium text-[#6E5A52] bg-[#FAF2EF] px-2 py-0.5 rounded-md mb-2"
                >
                  <UIcon
                    name="i-lucide-map-pin"
                    class="w-3 h-3 text-[#7A291E] shrink-0"
                  />
                  <span class="truncate">{{ mission.locationNotes }}</span>
                </div>
              </div>

              <!-- Pied de carte avec Code Couleur DA officiel -->
              <!-- Cas 1 : Poste sensible attribué par l'admin -->
              <div
                v-if="mission.isSensitive && mission.isAssignedByAdmin"
                class="flex items-center justify-between pt-2 border-t border-[#ECCBC4] mt-2 text-[10px]"
              >
                <span class="text-[#7A291E] font-semibold flex items-center gap-1">
                  <UIcon
                    name="i-lucide-check"
                    class="w-3 h-3"
                  />
                  Affectation confirmée
                </span>
                <span class="font-semibold text-[10px] px-2 py-0.5 rounded-full bg-[#7A291E] text-white">
                  Attribution Admin
                </span>
              </div>

              <!-- Cas 2 : Poste sensible sous restriction standard -->
              <div
                v-else-if="mission.isSensitive"
                class="flex items-center justify-between pt-2 border-t border-[#E6D9CB] mt-2 text-[10px]"
              >
                <span class="text-[#6E5A52] font-medium flex items-center gap-1">
                  <UIcon
                    name="i-lucide-shield-alert"
                    class="w-3 h-3 text-[#7A291E]"
                  />
                  Accès restreint
                </span>
                <span class="font-semibold text-[10px] px-2 py-0.5 rounded-full bg-[#F3DCD5] text-[#7A291E]">
                  Attribution Admin
                </span>
              </div>

              <!-- Cas 3 : Jauges DA officielles : Vert (#E1E9DC), Jaune/Orange (#F7E4C6), Gris (#D8CFC8) -->
              <div
                v-else
                class="flex items-center justify-between pt-2 border-t border-[#E6D9CB] mt-2"
              >
                <span class="text-[10px] text-[#6E5A52] font-medium">
                  Jauge : {{ mission.registeredCount }} / {{ mission.capacityMax }}
                </span>

                <span
                  v-if="mission.availablePlaces > 1"
                  class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E1E9DC] text-[#2F5238] border border-[#9DB79F]"
                >
                  {{ mission.availablePlaces }} places dispo
                </span>
                <span
                  v-else-if="mission.availablePlaces === 1"
                  class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F7E4C6] text-[#8A4B0F] border border-[#D9A660]"
                >
                  1 place restante !
                </span>
                <span
                  v-else
                  class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#D8CFC8] text-[#6E5A52] border border-[#A99A91]"
                >
                  Complet
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- État de chargement -->
    <div
      v-else-if="status === 'pending'"
      class="py-16 text-center text-[#6E5A52]"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="w-6 h-6 animate-spin mx-auto text-[#7A291E] mb-2"
      />
      <p class="text-xs">
        Chargement du planning...
      </p>
    </div>

    <!-- ======================================================== -->
    <!-- MODALE DE CONFIRMATION AVANT VERROUILLAGE FINAL           -->
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
          v-if="isConfirmModalOpen"
          class="fixed inset-0 z-50 bg-[#2A1512]/60 backdrop-blur-xs flex items-center justify-center p-4"
          @click="isConfirmModalOpen = false"
        >
          <div
            class="w-full max-w-md bg-[#FFFCF8] rounded-3xl border border-[#E6D9CB] shadow-xl p-6 space-y-4"
            @click.stop
          >
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-full bg-[#FAF2EF] text-[#7A291E] flex items-center justify-center shrink-0">
                <UIcon
                  name="i-lucide-lock"
                  class="w-5 h-5"
                />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-bold text-lg text-[#2A1512]">
                  Confirmation définitive du planning
                </h3>
                <p class="text-xs text-[#6E5A52] mt-0.5">
                  Bénévole : {{ user?.firstName }} {{ user?.lastName }}
                </p>
              </div>
            </div>

            <!-- Récapitulatif des créneaux -->
            <div class="space-y-2 bg-[#FAF2EF] p-3.5 rounded-2xl border border-[#ECCBC4]">
              <span class="text-[11px] font-bold text-[#7A291E] uppercase tracking-wider block">
                Créneaux sélectionnés ({{ selectedCount }})
              </span>
              <div
                v-for="item in selectedMissionsDetails"
                :key="item.slotMissionId"
                class="flex items-center justify-between text-xs py-1 border-b border-[#ECCBC4]/60 last:border-0"
              >
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="font-bold text-[#2A1512]">{{ item.missionName }}</span>
                  <span class="text-[#6E5A52]">({{ item.dayLabel }})</span>
                  <span
                    v-if="item.isAssignedByAdmin"
                    class="font-semibold text-[10px] px-2 py-0.5 rounded-full bg-[#F3DCD5] text-[#7A291E]"
                  >
                    Affecté par l'organisation
                  </span>
                </div>
                <span class="text-[#7A291E] font-semibold font-mono">{{ item.timeSlotLabel }}</span>
              </div>
            </div>

            <!-- Avertissement de verrouillage -->
            <div class="bg-[#F7E4C6] border border-[#D9A660] rounded-2xl p-3 text-xs text-[#8A4B0F] flex items-start gap-2">
              <UIcon
                name="i-lucide-alert-triangle"
                class="w-4 h-4 text-[#8A4B0F] shrink-0 mt-0.5"
              />
              <span>
                <strong>Attention :</strong> Une fois validé, votre planning sera <strong>définitivement verrouillé</strong>. Aucune modification ne sera possible sans l'accord d'un administrateur.
              </span>
            </div>

            <!-- Boutons de la modale -->
            <div class="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                :disabled="isConfirming"
                class="h-10 px-4 rounded-full border border-[#D8C6B4] bg-[#FFFCF8] hover:bg-[#F6EFE6] text-[#2A1512] font-semibold text-xs cursor-pointer transition-colors"
                @click="isConfirmModalOpen = false"
              >
                Annuler
              </button>

              <button
                type="button"
                :disabled="isConfirming"
                class="h-10 px-5 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                @click="confirmPlanning"
              >
                <UIcon
                  v-if="isConfirming"
                  name="i-lucide-loader-2"
                  class="w-4 h-4 animate-spin"
                />
                <UIcon
                  v-else
                  name="i-lucide-check-circle"
                  class="w-4 h-4"
                />
                <span>Confirmer et verrouiller</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
