<script setup lang="ts">
const { isAdmin } = useAuth()

if (!isAdmin.value) {
  await navigateTo('/espace-benevole/login')
}

interface EditionItem {
  id: string
  year: number
  name: string
  isCurrent: boolean
  isRegistrationOpen: boolean
  createdAt: string
  stats: {
    volunteersCount: number
    timeSlotsCount: number
    invitationsCount: number
  }
}

interface EditionsResponse {
  total: number
  editions: EditionItem[]
}

const { data, status, refresh } = await useFetch<EditionsResponse>('/api/admin/editions')
const toast = useToast()

// Modale nouvelle édition
const isCreateModalOpen = ref(false)
const newYear = ref(new Date().getFullYear() + 1)
const newName = ref(`Salon de la Danse ${new Date().getFullYear() + 1}`)
const newIsCurrent = ref(false)
const newIsRegistrationOpen = ref(true)
const isSubmitting = ref(false)

// Basculer l'édition active
const isSwitching = ref<string | null>(null)

async function setCurrentEdition(edition: EditionItem) {
  if (edition.isCurrent || isSwitching.value) return
  isSwitching.value = edition.id

  try {
    const res = await $fetch<{ message: string }>(`/api/admin/editions/${edition.id}/set-current`, {
      method: 'PATCH'
    })

    toast.add({
      title: 'Édition active modifiée',
      description: res.message || `L'édition ${edition.name} est maintenant active.`,
      color: 'success'
    })

    await refresh()
  } catch (err: unknown) {
    const errorObj = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    toast.add({
      title: 'Erreur',
      description: errorObj?.data?.statusMessage || errorObj?.statusMessage || errorObj?.message || 'Impossible de changer l\'édition active.',
      color: 'error'
    })
  } finally {
    isSwitching.value = null
  }
}

// Créer une nouvelle édition
async function handleCreateEdition() {
  if (!newName.value.trim()) {
    toast.add({
      title: 'Nom requis',
      description: 'Veuillez renseigner le nom de l\'édition.',
      color: 'warning'
    })
    return
  }

  isSubmitting.value = true

  try {
    const res = await $fetch<{ message: string }>('/api/admin/editions', {
      method: 'POST',
      body: {
        year: Number(newYear.value),
        name: newName.value.trim(),
        isCurrent: newIsCurrent.value,
        isRegistrationOpen: newIsRegistrationOpen.value
      }
    })

    toast.add({
      title: 'Édition créée',
      description: res.message || 'La nouvelle édition a été initialisée.',
      color: 'success'
    })

    isCreateModalOpen.value = false
    await refresh()
  } catch (err: unknown) {
    const errorObj = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    toast.add({
      title: 'Création impossible',
      description: errorObj?.data?.statusMessage || errorObj?.statusMessage || errorObj?.message || 'Erreur lors de la création de l\'édition.',
      color: 'error'
    })
  } finally {
    isSubmitting.value = false
  }
}

// ========================================================
// GESTION DES JOURS D'ÉDITION
// ========================================================
interface EditionDayItem {
  date: string
  dayKey: string
  dayLabel: string
  slotsCount: number
  registrationsCount: number
  isActive: boolean
}

const isDaysModalOpen = ref(false)
const selectedEditionForDays = ref<EditionItem | null>(null)
const isLoadingDays = ref(false)
const editionDaysList = ref<EditionDayItem[]>([])
const isTogglingDay = ref<string | null>(null)
const isAddingDay = ref(false)
const newDayInput = ref('')

async function openDaysModal(edition: EditionItem) {
  selectedEditionForDays.value = edition
  isDaysModalOpen.value = true
  newDayInput.value = ''
  await loadEditionDays(edition.id)
}

async function loadEditionDays(editionId: string) {
  isLoadingDays.value = true
  try {
    const res = await $fetch<{ edition: unknown, days: EditionDayItem[] }>(`/api/admin/editions/${editionId}/days`)
    editionDaysList.value = res.days || []
  } catch (err: unknown) {
    const errorObj = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    toast.add({
      title: 'Erreur',
      description: errorObj?.data?.statusMessage || errorObj?.statusMessage || errorObj?.message || 'Impossible de charger les dates de l\'édition.',
      color: 'error'
    })
  } finally {
    isLoadingDays.value = false
  }
}

async function handleToggleDay(day: EditionDayItem) {
  if (!selectedEditionForDays.value || isTogglingDay.value) return
  isTogglingDay.value = day.dayKey

  try {
    const targetState = !day.isActive
    const res = await $fetch<{ message: string }>(`/api/admin/editions/${selectedEditionForDays.value.id}/days`, {
      method: 'POST',
      body: {
        action: 'TOGGLE_DAY',
        date: day.dayKey,
        active: targetState
      }
    })

    day.isActive = targetState
    toast.add({
      title: targetState ? 'Jour activé' : 'Jour désactivé',
      description: res.message,
      color: 'success'
    })

    await refresh()
  } catch (err: unknown) {
    const errorObj = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    toast.add({
      title: 'Action impossible',
      description: errorObj?.data?.statusMessage || errorObj?.statusMessage || errorObj?.message || 'Erreur lors de la mise à jour du statut du jour.',
      color: 'error'
    })
  } finally {
    isTogglingDay.value = null
  }
}

async function handleAddDay() {
  if (!selectedEditionForDays.value || !newDayInput.value) {
    toast.add({
      title: 'Date requise',
      description: 'Veuillez sélectionner une date.',
      color: 'warning'
    })
    return
  }

  isAddingDay.value = true

  try {
    const res = await $fetch<{ message: string }>(`/api/admin/editions/${selectedEditionForDays.value.id}/days`, {
      method: 'POST',
      body: {
        action: 'ADD_DAY',
        date: newDayInput.value
      }
    })

    toast.add({
      title: 'Jour ajouté',
      description: res.message,
      color: 'success'
    })

    newDayInput.value = ''
    await loadEditionDays(selectedEditionForDays.value.id)
    await refresh()
  } catch (err: unknown) {
    const errorObj = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    toast.add({
      title: 'Ajout impossible',
      description: errorObj?.data?.statusMessage || errorObj?.statusMessage || errorObj?.message || 'Erreur lors de l\'ajout du jour.',
      color: 'error'
    })
  } finally {
    isAddingDay.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- En-tête -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[#E6D9CB]">
      <div>
        <span class="text-[11px] font-bold tracking-[0.16em] uppercase text-[#7A291E] block mb-1">
          Saisons & Calendrier
        </span>
        <h1 class="text-2xl sm:text-3xl font-serif italic font-semibold tracking-tight text-[#2A1512]">
          Gestion Multi-Éditions
        </h1>
        <p class="text-xs sm:text-sm text-[#6E5A52] mt-0.5">
          Consultez les éditions du festival, basculez l'édition courante ou préparez l'édition suivante
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <button
          type="button"
          class="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
          @click="isCreateModalOpen = true"
        >
          <UIcon name="i-lucide-calendar-plus" class="w-4 h-4" />
          <span>Nouvelle édition</span>
        </button>
      </div>
    </div>

    <!-- Chargement -->
    <div
      v-if="status === 'pending'"
      class="py-16 text-center text-[#6E5A52]"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="w-6 h-6 animate-spin mx-auto text-[#7A291E] mb-2"
      />
      <p class="text-xs">
        Chargement des éditions...
      </p>
    </div>

    <!-- Grille des éditions -->
    <div
      v-else-if="data?.editions && data.editions.length > 0"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
    >
      <div
        v-for="ed in data.editions"
        :key="ed.id"
        class="bg-[#FFFCF8] rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all"
        :class="[
          ed.isCurrent
            ? 'border-2 border-[#7A291E] ring-4 ring-[#F3DCD5]/50'
            : 'border-[#E6D9CB] hover:border-[#D8C6B4]'
        ]"
      >
        <div class="space-y-3">
          <!-- Statut et année -->
          <div class="flex items-center justify-between">
            <span class="text-2xl font-serif italic font-semibold text-[#2A1512] tracking-tight">
              {{ ed.year }}
            </span>

            <span
              v-if="ed.isCurrent"
              class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E1E9DC] text-[#2F5238] border border-[#9DB79F]"
            >
              Édition en cours
            </span>
            <span
              v-else
              class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EFE5DA] text-[#5B463E] border border-[#D8C6B4]"
            >
              Archivée / En attente
            </span>
          </div>

          <div>
            <h3 class="text-base font-bold text-[#2A1512]">
              {{ ed.name }}
            </h3>
            <p class="text-xs text-[#6E5A52] mt-0.5">
              Inscriptions : {{ ed.isRegistrationOpen ? 'Ouvertes' : 'Fermées' }}
            </p>
          </div>

          <!-- Statistiques de l'édition -->
          <div class="grid grid-cols-3 gap-2 py-3 border-y border-[#E6D9CB] text-center">
            <div class="p-2 bg-[#F6EFE6] rounded-xl">
              <span class="block text-lg font-serif italic font-semibold text-[#2A1512]">
                {{ ed.stats.volunteersCount }}
              </span>
              <span class="text-[10px] text-[#6E5A52] font-medium">Bénévoles</span>
            </div>
            <div class="p-2 bg-[#F6EFE6] rounded-xl">
              <span class="block text-lg font-serif italic font-semibold text-[#2A1512]">
                {{ ed.stats.timeSlotsCount }}
              </span>
              <span class="text-[10px] text-[#6E5A52] font-medium">Créneaux</span>
            </div>
            <div class="p-2 bg-[#F6EFE6] rounded-xl">
              <span class="block text-lg font-serif italic font-semibold text-[#2A1512]">
                {{ ed.stats.invitationsCount }}
              </span>
              <span class="text-[10px] text-[#6E5A52] font-medium">Invitations</span>
            </div>
          </div>
        </div>

        <!-- Action de bascule & configuration des dates -->
        <div class="pt-4 mt-2 space-y-2 border-t border-[#E6D9CB]">
          <button
            type="button"
            class="w-full inline-flex items-center justify-center gap-2 h-9 px-4 rounded-full bg-[#FFFCF8] hover:bg-[#F6EFE6] text-[#2A1512] border border-[#D8C6B4] font-semibold text-xs transition-colors cursor-pointer"
            @click="openDaysModal(ed)"
          >
            <UIcon name="i-lucide-calendar-days" class="w-4 h-4 text-[#7A291E]" />
            <span>Configurer les jours de festival</span>
          </button>

          <div
            v-if="ed.isCurrent"
            class="w-full py-2 px-3 rounded-full bg-[#F3DCD5] text-[#7A291E] border border-[#D9A79F] text-xs font-bold text-center flex items-center justify-center gap-1.5"
          >
            <UIcon
              name="i-lucide-check-circle"
              class="w-4 h-4"
            />
            <span>Édition de référence active</span>
          </div>

          <button
            v-else
            type="button"
            class="w-full inline-flex items-center justify-center gap-2 h-9 px-4 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
            :disabled="isSwitching === ed.id"
            @click="setCurrentEdition(ed)"
          >
            <UIcon
              :name="isSwitching === ed.id ? 'i-lucide-loader-2' : 'i-lucide-arrow-right-left'"
              class="w-4 h-4"
              :class="{ 'animate-spin': isSwitching === ed.id }"
            />
            <span>Définir comme édition active</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- MODALE CRÉATION D'UNE NOUVELLE ÉDITION                   -->
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
          v-if="isCreateModalOpen"
          class="fixed inset-0 z-50 bg-[#2E1411]/60 backdrop-blur-xs flex items-center justify-center p-4"
          @click="isCreateModalOpen = false"
        >
          <div
            class="w-full max-w-md bg-[#FFFCF8] rounded-2xl border border-[#E6D9CB] shadow-xl p-6 space-y-4"
            @click.stop
          >
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-[#F3DCD5] text-[#7A291E] flex items-center justify-center shrink-0">
                <UIcon
                  name="i-lucide-calendar-plus"
                  class="w-5 h-5"
                />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-lg font-serif italic font-semibold text-[#2A1512]">
                  Initialiser une nouvelle édition
                </h3>
                <p class="text-xs text-[#6E5A52] mt-0.5">
                  Préparez la prochaine saison du Salon de la Danse
                </p>
              </div>
            </div>

            <form
              class="space-y-4 pt-2"
              @submit.prevent="handleCreateEdition"
            >
              <div>
                <label class="block text-xs font-semibold text-[#2A1512] mb-1">
                  Année <span class="text-[#9A2A22]">*</span>
                </label>
                <UInput
                  v-model.number="newYear"
                  type="number"
                  min="2025"
                  max="2035"
                  required
                  size="md"
                  class="w-full font-bold font-mono"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-[#2A1512] mb-1">
                  Nom officiel <span class="text-[#9A2A22]">*</span>
                </label>
                <UInput
                  v-model="newName"
                  placeholder="Ex : Salon de la Danse 2028"
                  required
                  size="md"
                  class="w-full"
                />
              </div>

              <div class="p-3 bg-[#F6EFE6] border border-[#E6D9CB] rounded-xl space-y-2">
                <div class="flex items-center gap-2">
                  <input
                    id="newIsCurrent"
                    v-model="newIsCurrent"
                    type="checkbox"
                    class="w-4 h-4 rounded text-[#7A291E] border-[#D8C6B4] focus:ring-[#7A291E] cursor-pointer"
                  >
                  <label
                    for="newIsCurrent"
                    class="text-xs font-semibold text-[#2A1512] cursor-pointer"
                  >
                    Définir immédiatement comme édition active
                  </label>
                </div>
                <p class="text-[11px] text-[#6E5A52] pl-6">
                  Si cochée, l'édition en cours sera archivée et la nouvelle édition sera la cible par défaut.
                </p>
              </div>

              <!-- Boutons d'action -->
              <div class="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  class="inline-flex items-center justify-center h-9 px-4 rounded-full bg-[#FFFCF8] hover:bg-[#F6EFE6] text-[#2A1512] border border-[#D8C6B4] font-semibold text-xs transition-colors cursor-pointer"
                  :disabled="isSubmitting"
                  @click="isCreateModalOpen = false"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  class="inline-flex items-center justify-center gap-2 h-9 px-5 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                  :disabled="isSubmitting"
                >
                  <UIcon name="i-lucide-check" class="w-4 h-4" />
                  <span>Créer l'édition</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ======================================================== -->
    <!-- MODALE GESTION DES JOURS DE FESTIVAL D'UNE ÉDITION       -->
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
          v-if="isDaysModalOpen"
          class="fixed inset-0 z-50 bg-[#2E1411]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          @click="isDaysModalOpen = false"
        >
          <div
            class="w-full max-w-lg bg-[#FFFCF8] rounded-2xl border border-[#E6D9CB] shadow-xl p-6 space-y-5 my-8 max-h-[90vh] flex flex-col"
            @click.stop
          >
            <!-- Header -->
            <div class="flex items-start justify-between gap-3 shrink-0">
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-xl bg-[#F3DCD5] text-[#7A291E] flex items-center justify-center shrink-0">
                  <UIcon
                    name="i-lucide-calendar-range"
                    class="w-5 h-5"
                  />
                </div>
                <div>
                  <h3 class="text-lg font-serif italic font-semibold text-[#2A1512]">
                    Jours de festival · {{ selectedEditionForDays?.name }}
                  </h3>
                  <p class="text-xs text-[#6E5A52] mt-0.5">
                    Activez, désactivez ou ajoutez des dates de festival sans restriction de durée (1 à 4+ jours).
                  </p>
                </div>
              </div>
              <button
                type="button"
                class="p-1 rounded-lg text-[#6E5A52] hover:text-[#2A1512] hover:bg-[#F6EFE6] transition-colors cursor-pointer"
                @click="isDaysModalOpen = false"
              >
                <UIcon
                  name="i-lucide-x"
                  class="w-5 h-5"
                />
              </button>
            </div>

            <!-- Contenu défilant -->
            <div class="flex-1 overflow-y-auto space-y-5 pr-1">
              <!-- Indicateur de chargement -->
              <div
                v-if="isLoadingDays"
                class="py-12 text-center text-[#6E5A52]"
              >
                <UIcon
                  name="i-lucide-loader-2"
                  class="w-6 h-6 animate-spin mx-auto text-[#7A291E] mb-2"
                />
                <p class="text-xs">
                  Chargement des dates...
                </p>
              </div>

              <!-- Liste des jours configurés -->
              <div
                v-else
                class="space-y-3"
              >
                <div class="flex items-center justify-between">
                  <h4 class="text-xs font-bold uppercase tracking-wider text-[#6E5A52]">
                    Dates configurées ({{ editionDaysList.length }})
                  </h4>
                  <span class="text-[11px] text-[#6E5A52]">
                    5 créneaux par date active
                  </span>
                </div>

                <div
                  v-if="editionDaysList.length === 0"
                  class="p-6 text-center bg-[#F6EFE6] rounded-xl border border-dashed border-[#D8C6B4] text-[#6E5A52] text-xs"
                >
                  Aucun jour configuré pour le moment. Ajoutez une date ci-dessous.
                </div>

                <div
                  v-for="day in editionDaysList"
                  :key="day.dayKey"
                  class="p-3.5 bg-[#F6EFE6] rounded-xl border border-[#E6D9CB] flex items-center justify-between gap-3 transition-colors"
                  :class="{ 'opacity-60 bg-[#EFE5DA]': !day.isActive }"
                >
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-bold text-[#2A1512]">
                        {{ day.dayLabel }}
                      </span>
                      <span
                        v-if="day.isActive"
                        class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#E1E9DC] text-[#2F5238] border border-[#9DB79F]"
                      >
                        Actif
                      </span>
                      <span
                        v-else
                        class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#EFE5DA] text-[#5B463E] border border-[#D8C6B4]"
                      >
                        Désactivé
                      </span>
                    </div>
                    <div class="flex items-center gap-2 mt-1 text-[11px] text-[#6E5A52]">
                      <span class="inline-flex items-center gap-1">
                        <UIcon
                          name="i-lucide-clock"
                          class="w-3.5 h-3.5 text-[#6E5A52]"
                        />
                        {{ day.slotsCount }} créneaux
                      </span>
                      <span>•</span>
                      <span
                        class="inline-flex items-center gap-1"
                        :class="day.registrationsCount > 0 ? 'text-[#7A291E] font-semibold' : ''"
                      >
                        <UIcon
                          name="i-lucide-users"
                          class="w-3.5 h-3.5"
                        />
                        {{ day.registrationsCount }} bénévole(s) inscrit(s)
                      </span>
                    </div>
                  </div>

                  <!-- Interrupteur Switch -->
                  <div class="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      role="switch"
                      :aria-checked="day.isActive"
                      :disabled="isTogglingDay === day.dayKey"
                      class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#7A291E] focus:ring-offset-2 disabled:opacity-50"
                      :class="day.isActive ? 'bg-[#7A291E]' : 'bg-[#D8C6B4]'"
                      :title="day.isActive ? 'Désactiver cette date' : 'Activer cette date'"
                      @click="handleToggleDay(day)"
                    >
                      <span
                        aria-hidden="true"
                        class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out"
                        :class="day.isActive ? 'translate-x-5' : 'translate-x-0'"
                      />
                    </button>
                  </div>
                </div>
              </div>

              <!-- Formulaire d'ajout d'une nouvelle date -->
              <div class="p-4 bg-[#F3DCD5]/40 rounded-xl border border-[#D9A79F] space-y-3">
                <div class="flex items-center gap-2">
                  <UIcon
                    name="i-lucide-plus-circle"
                    class="w-4 h-4 text-[#7A291E]"
                  />
                  <h4 class="text-xs font-bold text-[#7A291E]">
                    Ajouter une date de festival
                  </h4>
                </div>
                <p class="text-[11px] text-[#6E5A52]">
                  La date sélectionnée génèrera automatiquement les 5 créneaux de travail pour toutes les missions du salon.
                </p>

                <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  <UInput
                    v-model="newDayInput"
                    type="date"
                    size="sm"
                    class="flex-1"
                  />
                  <button
                    type="button"
                    class="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] text-white font-semibold text-xs transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                    :disabled="!newDayInput || isAddingDay"
                    @click="handleAddDay"
                  >
                    <UIcon
                      :name="isAddingDay ? 'i-lucide-loader-2' : 'i-lucide-plus'"
                      class="w-4 h-4"
                      :class="{ 'animate-spin': isAddingDay }"
                    />
                    <span>Ajouter ce jour</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-end pt-3 border-t border-[#E6D9CB] shrink-0">
              <button
                type="button"
                class="inline-flex items-center justify-center h-9 px-4 rounded-full bg-[#FFFCF8] hover:bg-[#F6EFE6] text-[#2A1512] border border-[#D8C6B4] font-semibold text-xs transition-colors cursor-pointer"
                @click="isDaysModalOpen = false"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
