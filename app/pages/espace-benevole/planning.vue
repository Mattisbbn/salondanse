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
      description: 'Vous avez sélectionné 3 créneaux consécutifs le même jour (6h d\'affilée). Veuillez intercaler une pause.',
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
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- En-tête de la page -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Mon Planning Bénévole
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-0.5">
          Salon de la Danse 2027 • 14, 15 et 16 Mai (Angers)
        </p>
      </div>

      <!-- Badge de statut -->
      <div>
        <UBadge
          v-if="isConfirmed"
          color="success"
          variant="subtle"
          size="sm"
          class="font-medium inline-flex items-center gap-1.5"
        >
          <UIcon
            name="i-lucide-lock"
            class="w-3.5 h-3.5"
          />
          <span>Planning validé et verrouillé</span>
        </UBadge>
      </div>
    </div>

    <!-- Bandeau discret d'alerte Inscriptions Fermées -->
    <div
      v-if="!isRegistrationOpen"
      class="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 shadow-xs"
    >
      <UIcon
        name="i-lucide-lock"
        class="w-5 h-5 text-amber-600 shrink-0 mt-0.5"
      />
      <div class="text-xs text-amber-900 leading-relaxed">
        <p class="font-bold">
          Inscriptions fermées - Consultation seule
        </p>
        <p class="text-amber-800 mt-0.5">
          La campagne d'inscription est actuellement fermée. Vous pouvez consulter les créneaux et missions en lecture seule.
        </p>
      </div>
    </div>

    <!-- Bandeau d'information VERROUILLÉ -->
    <div
      v-if="isConfirmed"
      class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3"
    >
      <UIcon
        name="i-lucide-check-circle"
        class="w-5 h-5 text-emerald-600 shrink-0 mt-0.5"
      />
      <div class="text-xs sm:text-sm text-emerald-900">
        <p class="font-semibold">
          Votre planning est confirmé et verrouillé !
        </p>
        <p class="mt-0.5 text-emerald-700">
          Validé le {{ formattedLockedDate }}. Vos créneaux sont définitivement enregistrés. Pour toute demande de changement, veuillez contacter l'administration.
        </p>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- BARRE RÉCAPITULATIVE FLOTTANTE / STICKY                  -->
    <!-- ======================================================== -->
    <div class="sticky top-16 md:top-4 z-20 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm p-4 transition-all">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <!-- Compteur & barre de progression -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-xs font-semibold text-slate-700">
              <span class="text-violet-600 font-bold text-sm">{{ selectedCount }}</span> / 3 créneaux sélectionnés
              <span class="text-slate-400 font-normal ml-1">({{ selectedCount * 2 }}h de bénévolat)</span>
            </span>
            <span class="text-[11px] text-slate-500 font-medium">
              {{ selectedCount === 0 ? 'Min. 1 créneau' : selectedCount === 3 ? 'Quota maximal atteint' : `${3 - selectedCount} restant(s)` }}
            </span>
          </div>

          <!-- Barre de progression -->
          <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
            <div
              class="h-full transition-all duration-300 rounded-full"
              :class="[
                selectedCount === 0
                  ? 'bg-slate-300 w-0'
                  : selectedCount < 3
                    ? 'bg-violet-600'
                    : 'bg-emerald-600'
              ]"
              :style="{ width: `${progressPercentage}%` }"
            />
          </div>
        </div>

        <!-- Actions de validation (masquées si déjà confirmé ou inscriptions fermées) -->
        <div
          v-if="!isConfirmed && isRegistrationOpen"
          class="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100"
        >
          <UButton
            color="neutral"
            variant="subtle"
            size="sm"
            :loading="isSavingDraft"
            :disabled="isSavingDraft"
            icon="i-lucide-save"
            label="Enregistrer brouillon"
            @click="saveDraft"
          />

          <UButton
            color="primary"
            variant="solid"
            size="sm"
            :disabled="selectedCount < 1 || selectedCount > 3 || hasConsecutiveSlotsConflict"
            icon="i-lucide-check-circle"
            class="font-semibold shadow-xs"
            label="Valider définitivement"
            @click="openConfirmModal"
          />
        </div>
      </div>

      <!-- Alerte de pause obligatoire si 3 consécutifs -->
      <div
        v-if="hasConsecutiveSlotsConflict && !isConfirmed"
        class="mt-2.5 pt-2.5 border-t border-red-100 flex items-center gap-2 text-xs text-red-600 font-medium"
      >
        <UIcon
          name="i-lucide-alert-triangle"
          class="w-4 h-4 shrink-0"
        />
        <span>Règle métier violée : Interdiction d'enchaîner 3 créneaux consécutifs le même jour (pause obligatoire de 2h).</span>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- ONGLETS PAR JOUR (Mobile-First)                          -->
    <!-- ======================================================== -->
    <div
      v-if="data?.days && data.days.length > 0"
      class="space-y-4"
    >
      <div class="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        <button
          v-for="(day, idx) in data.days"
          :key="day.dayKey"
          type="button"
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer"
          :class="[
            activeDayIndex === idx
              ? 'bg-violet-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100/70 border border-slate-200'
          ]"
          @click="activeDayIndex = idx"
        >
          <span>{{ day.dayLabel }}</span>
          <span
            v-if="selectedCountByDay[idx] && selectedCountByDay[idx] > 0"
            class="w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center transition-colors"
            :class="[
              activeDayIndex === idx
                ? 'bg-white text-violet-700'
                : 'bg-violet-100 text-violet-700'
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
          <h2 class="text-base sm:text-lg font-bold text-slate-900">
            {{ data.days[activeDayIndex]?.fullDayLabel }}
          </h2>
          <span class="text-xs text-slate-500">
            5 créneaux de 2h disponibles
          </span>
        </div>

        <!-- Tranches horaires du jour -->
        <div
          v-for="slot in data.days[activeDayIndex]?.slots"
          :key="slot.id"
          class="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3"
        >
          <!-- En-tête de tranche horaire -->
          <div class="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                <UIcon
                  name="i-lucide-clock"
                  class="w-4 h-4"
                />
              </div>
              <div>
                <span class="text-sm font-bold text-slate-900">
                  {{ slot.startTime }} - {{ slot.endTime }}
                </span>
                <span class="text-[11px] text-slate-400 font-medium ml-2">
                  Créneau {{ slot.orderIndex }} / 5
                </span>
              </div>
            </div>

            <!-- Indicateur si une mission est choisie sur cette tranche -->
            <div v-if="selectedBySlotMap.has(slot.id)">
              <UBadge
                color="primary"
                variant="subtle"
                size="xs"
                class="font-medium"
              >
                1 mission choisie
              </UBadge>
            </div>
          </div>

          <!-- Grille des missions du créneau -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            <div
              v-for="mission in slot.missions"
              :key="mission.id"
              class="rounded-xl p-3 border transition-all select-none flex flex-col justify-between"
              :class="[
                mission.isSensitive
                  ? mission.isAssignedByAdmin
                    ? 'border-2 border-violet-500 bg-violet-50/70 shadow-xs cursor-not-allowed'
                    : 'opacity-60 bg-slate-100/70 border-dashed border-slate-300 cursor-not-allowed'
                  : selectedIds.includes(mission.id)
                    ? 'border-2 border-violet-600 bg-violet-50/50 shadow-xs cursor-pointer'
                    : mission.availablePlaces <= 0
                      ? 'border-slate-200 bg-slate-50/80 opacity-50 cursor-not-allowed'
                      : selectedBySlotMap.has(slot.id)
                        ? 'border-slate-200 bg-slate-50/60 opacity-60 cursor-not-allowed'
                        : isConfirmed || !isRegistrationOpen
                          ? 'border-slate-200 bg-white opacity-70 cursor-not-allowed'
                          : 'border-slate-200 bg-white hover:border-violet-300 hover:shadow-xs cursor-pointer'
              ]"
              @click="toggleMission(slot, mission)"
            >
              <div>
                <div class="flex items-start justify-between gap-2 mb-1.5">
                  <span class="text-xs font-bold text-slate-900 leading-snug">
                    {{ mission.name }}
                  </span>

                  <!-- Icône de sélection -->
                  <div class="shrink-0">
                    <UIcon
                      v-if="mission.isSensitive && mission.isAssignedByAdmin"
                      name="i-lucide-shield-check"
                      class="w-4 h-4 text-violet-600"
                    />
                    <UIcon
                      v-else-if="mission.isSensitive"
                      name="i-lucide-lock"
                      class="w-4 h-4 text-slate-400"
                    />
                    <UIcon
                      v-else-if="selectedIds.includes(mission.id)"
                      name="i-lucide-check-circle-2"
                      class="w-4 h-4 text-violet-600"
                    />
                    <div
                      v-else-if="!isConfirmed && isRegistrationOpen && mission.availablePlaces > 0 && !selectedBySlotMap.has(slot.id)"
                      class="w-4 h-4 rounded-full border border-slate-300"
                    />
                  </div>
                </div>

                <!-- Cas 1 : Poste sensible attribué par l'admin -->
                <template v-if="mission.isSensitive && mission.isAssignedByAdmin">
                  <div class="inline-flex items-center gap-1 text-[10px] text-violet-700 bg-violet-100/90 px-2 py-0.5 rounded-md font-semibold mb-1.5">
                    <UIcon
                      name="i-lucide-shield-check"
                      class="w-3 h-3 shrink-0"
                    />
                    <span>Attribué par l'admin</span>
                  </div>
                  <p class="text-[11px] text-violet-800/90 font-medium mb-2 leading-relaxed">
                    Ce poste vous a été affecté directement par l'équipe d'organisation.
                  </p>
                </template>

                <!-- Cas 2 : Poste sensible sous restriction admin (non attribué) -->
                <template v-else-if="mission.isSensitive">
                  <div class="inline-flex items-center gap-1 text-[10px] text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-md font-medium mb-1.5">
                    <UIcon
                      name="i-lucide-lock"
                      class="w-3 h-3 shrink-0 text-slate-500"
                    />
                    <span>Poste sous restriction</span>
                  </div>
                  <p class="text-[11px] text-slate-500 italic mb-2 leading-relaxed">
                    Ce poste nécessite une habilitation et est attribué directement par l'équipe d'organisation.
                  </p>
                </template>

                <!-- Cas 3 : Poste standard -->
                <p
                  v-else-if="mission.description"
                  class="text-[11px] text-slate-500 line-clamp-2 mb-2"
                >
                  {{ mission.description }}
                </p>
              </div>

              <!-- Pied de carte -->
              <!-- Cas 1 : Poste sensible attribué par l'admin -->
              <div
                v-if="mission.isSensitive && mission.isAssignedByAdmin"
                class="flex items-center justify-between pt-2 border-t border-violet-200/70 mt-2 text-[10px]"
              >
                <span class="text-violet-700 font-semibold flex items-center gap-1">
                  <UIcon
                    name="i-lucide-check"
                    class="w-3 h-3"
                  />
                  Affectation confirmée
                </span>
                <UBadge
                  color="primary"
                  variant="subtle"
                  size="xs"
                >
                  Attribution Admin
                </UBadge>
              </div>

              <!-- Cas 2 : Poste sensible sous restriction standard -->
              <div
                v-else-if="mission.isSensitive"
                class="flex items-center justify-between pt-2 border-t border-slate-200/60 mt-2 text-[10px]"
              >
                <span class="text-slate-400 font-medium flex items-center gap-1">
                  <UIcon
                    name="i-lucide-shield-alert"
                    class="w-3 h-3"
                  />
                  Accès restreint
                </span>
                <UBadge
                  color="neutral"
                  variant="subtle"
                  size="xs"
                  class="text-slate-500"
                >
                  Attribution Admin
                </UBadge>
              </div>

              <!-- Cas 3 : Jauges dynamiques strictes : Vert (>1), Orange (1), Gris (0) -->
              <div
                v-else
                class="flex items-center justify-between pt-2 border-t border-slate-100 mt-2"
              >
                <span class="text-[10px] text-slate-400 font-medium">
                  Jauge : {{ mission.registeredCount }} / {{ mission.capacityMax }}
                </span>

                <UBadge
                  v-if="mission.availablePlaces > 1"
                  color="success"
                  variant="subtle"
                  size="xs"
                  class="text-[10px] font-medium"
                >
                  {{ mission.availablePlaces }} places dispo
                </UBadge>
                <UBadge
                  v-else-if="mission.availablePlaces === 1"
                  color="warning"
                  variant="subtle"
                  size="xs"
                  class="text-[10px] font-medium"
                >
                  1 place restante !
                </UBadge>
                <UBadge
                  v-else
                  color="neutral"
                  variant="outline"
                  size="xs"
                  class="text-[10px] font-medium text-slate-400"
                >
                  Complet
                </UBadge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- État de chargement -->
    <div
      v-else-if="status === 'pending'"
      class="py-16 text-center text-slate-400"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="w-6 h-6 animate-spin mx-auto text-violet-600 mb-2"
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
          class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          @click="isConfirmModalOpen = false"
        >
          <div
            class="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-6 space-y-4"
            @click.stop
          >
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                <UIcon
                  name="i-lucide-lock"
                  class="w-5 h-5"
                />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-base font-bold text-slate-900">
                  Confirmation définitive du planning
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">
                  Bénévole : {{ user?.firstName }} {{ user?.lastName }}
                </p>
              </div>
            </div>

            <!-- Récapitulatif des créneaux -->
            <div class="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Créneaux sélectionnés ({{ selectedCount }})
              </span>
              <div
                v-for="item in selectedMissionsDetails"
                :key="item.slotMissionId"
                class="flex items-center justify-between text-xs py-1 border-b border-slate-200/60 last:border-0"
              >
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="font-bold text-slate-900">{{ item.missionName }}</span>
                  <span class="text-slate-500">({{ item.dayLabel }})</span>
                  <UBadge
                    v-if="item.isAssignedByAdmin"
                    color="primary"
                    variant="subtle"
                    size="xs"
                    class="text-[10px]"
                  >
                    Affecté par l'organisation
                  </UBadge>
                </div>
                <span class="text-violet-700 font-semibold font-mono">{{ item.timeSlotLabel }}</span>
              </div>
            </div>

            <!-- Avertissement de verrouillage -->
            <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
              <UIcon
                name="i-lucide-alert-triangle"
                class="w-4 h-4 text-amber-600 shrink-0 mt-0.5"
              />
              <span>
                <strong>Attention :</strong> Une fois validé, votre planning sera <strong>définitivement verrouillé</strong>. Aucune modification ne sera possible sans l'accord d'un administrateur.
              </span>
            </div>

            <!-- Boutons de la modale -->
            <div class="flex items-center justify-end gap-2.5 pt-2">
              <UButton
                color="neutral"
                variant="subtle"
                size="sm"
                label="Annuler"
                :disabled="isConfirming"
                @click="isConfirmModalOpen = false"
              />

              <UButton
                color="primary"
                variant="solid"
                size="sm"
                :loading="isConfirming"
                icon="i-lucide-check-circle"
                label="Confirmer et verrouiller"
                class="font-semibold shadow-xs"
                @click="confirmPlanning"
              />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
