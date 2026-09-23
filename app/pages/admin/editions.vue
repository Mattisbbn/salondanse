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
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Gestion Multi-Éditions
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-0.5">
          Consultez les éditions du festival, basculez l'édition courante ou préparez l'édition suivante
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <UButton
          color="neutral"
          variant="subtle"
          size="sm"
          icon="i-lucide-refresh-cw"
          :loading="status === 'pending'"
          @click="() => refresh()"
        />

        <UButton
          color="primary"
          variant="solid"
          size="md"
          icon="i-lucide-calendar-plus"
          label="Nouvelle édition"
          class="font-semibold shadow-xs cursor-pointer"
          @click="isCreateModalOpen = true"
        />
      </div>
    </div>

    <!-- Chargement -->
    <div
      v-if="status === 'pending'"
      class="py-16 text-center text-slate-400"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="w-6 h-6 animate-spin mx-auto text-violet-600 mb-2"
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
        class="bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all"
        :class="[
          ed.isCurrent
            ? 'border-2 border-violet-500 ring-4 ring-violet-50'
            : 'border-slate-200 hover:border-slate-300'
        ]"
      >
        <div class="space-y-3">
          <!-- Statut et année -->
          <div class="flex items-center justify-between">
            <span class="text-2xl font-black text-slate-900 tracking-tight">
              {{ ed.year }}
            </span>

            <UBadge
              v-if="ed.isCurrent"
              color="primary"
              variant="solid"
              size="sm"
              class="font-bold shadow-xs"
            >
              Édition en cours
            </UBadge>
            <UBadge
              v-else
              color="neutral"
              variant="subtle"
              size="sm"
              class="text-slate-500"
            >
              Archivée / En attente
            </UBadge>
          </div>

          <div>
            <h3 class="text-base font-bold text-slate-800">
              {{ ed.name }}
            </h3>
            <p class="text-xs text-slate-400 mt-0.5">
              Inscriptions : {{ ed.isRegistrationOpen ? 'Ouvertes' : 'Fermées' }}
            </p>
          </div>

          <!-- Statistiques de l'édition -->
          <div class="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-center">
            <div class="p-2 bg-slate-50 rounded-xl">
              <span class="block text-base font-black text-slate-900">
                {{ ed.stats.volunteersCount }}
              </span>
              <span class="text-[10px] text-slate-400 font-medium">Bénévoles</span>
            </div>
            <div class="p-2 bg-slate-50 rounded-xl">
              <span class="block text-base font-black text-slate-900">
                {{ ed.stats.timeSlotsCount }}
              </span>
              <span class="text-[10px] text-slate-400 font-medium">Créneaux</span>
            </div>
            <div class="p-2 bg-slate-50 rounded-xl">
              <span class="block text-base font-black text-slate-900">
                {{ ed.stats.invitationsCount }}
              </span>
              <span class="text-[10px] text-slate-400 font-medium">Invitations</span>
            </div>
          </div>
        </div>

        <!-- Action de bascule & configuration des dates -->
        <div class="pt-4 mt-2 space-y-2 border-t border-slate-100">
          <UButton
            color="neutral"
            variant="soft"
            size="sm"
            block
            icon="i-lucide-calendar-days"
            label="Configurer les jours de festival"
            class="font-medium cursor-pointer"
            @click="openDaysModal(ed)"
          />

          <div
            v-if="ed.isCurrent"
            class="w-full py-2 px-3 rounded-xl bg-violet-50 text-violet-700 text-xs font-bold text-center flex items-center justify-center gap-1.5"
          >
            <UIcon
              name="i-lucide-check-circle"
              class="w-4 h-4"
            />
            <span>Édition de référence active</span>
          </div>

          <UButton
            v-else
            color="neutral"
            variant="outline"
            size="sm"
            block
            :loading="isSwitching === ed.id"
            icon="i-lucide-arrow-right-left"
            label="Définir comme édition active"
            class="font-medium cursor-pointer"
            @click="setCurrentEdition(ed)"
          />
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
          class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          @click="isCreateModalOpen = false"
        >
          <div
            class="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-6 space-y-4"
            @click.stop
          >
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                <UIcon
                  name="i-lucide-calendar-plus"
                  class="w-5 h-5"
                />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-base font-bold text-slate-900">
                  Initialiser une nouvelle édition
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">
                  Préparez la prochaine saison du Salon de la Danse
                </p>
              </div>
            </div>

            <form
              class="space-y-4 pt-2"
              @submit.prevent="handleCreateEdition"
            >
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  Année <span class="text-red-500">*</span>
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
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  Nom officiel <span class="text-red-500">*</span>
                </label>
                <UInput
                  v-model="newName"
                  placeholder="Ex : Salon de la Danse 2028"
                  required
                  size="md"
                  class="w-full"
                />
              </div>

              <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div class="flex items-center gap-2">
                  <input
                    id="newIsCurrent"
                    v-model="newIsCurrent"
                    type="checkbox"
                    class="w-4 h-4 rounded text-violet-600 border-slate-300 focus:ring-violet-500 cursor-pointer"
                  >
                  <label
                    for="newIsCurrent"
                    class="text-xs font-semibold text-slate-900 cursor-pointer"
                  >
                    Définir immédiatement comme édition active
                  </label>
                </div>
                <p class="text-[11px] text-slate-500 pl-6">
                  Si cochée, l'édition 2027 sera archivée et la nouvelle édition sera la cible par défaut.
                </p>
              </div>

              <!-- Boutons d'action -->
              <div class="flex items-center justify-end gap-2.5 pt-2">
                <UButton
                  color="neutral"
                  variant="subtle"
                  size="sm"
                  label="Annuler"
                  :disabled="isSubmitting"
                  @click="isCreateModalOpen = false"
                />

                <UButton
                  type="submit"
                  color="primary"
                  variant="solid"
                  size="sm"
                  :loading="isSubmitting"
                  icon="i-lucide-check"
                  label="Créer l'édition"
                  class="font-semibold shadow-xs cursor-pointer"
                />
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
          class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          @click="isDaysModalOpen = false"
        >
          <div
            class="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-xl p-6 space-y-5 my-8 max-h-[90vh] flex flex-col"
            @click.stop
          >
            <!-- Header -->
            <div class="flex items-start justify-between gap-3 shrink-0">
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                  <UIcon
                    name="i-lucide-calendar-range"
                    class="w-5 h-5"
                  />
                </div>
                <div>
                  <h3 class="text-base font-bold text-slate-900">
                    Jours de festival · {{ selectedEditionForDays?.name }}
                  </h3>
                  <p class="text-xs text-slate-500 mt-0.5">
                    Activez, désactivez ou ajoutez des dates de festival sans restriction de durée (1 à 4+ jours).
                  </p>
                </div>
              </div>
              <button
                type="button"
                class="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
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
                class="py-12 text-center text-slate-400"
              >
                <UIcon
                  name="i-lucide-loader-2"
                  class="w-6 h-6 animate-spin mx-auto text-violet-600 mb-2"
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
                  <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Dates configurées ({{ editionDaysList.length }})
                  </h4>
                  <span class="text-[11px] text-slate-400">
                    5 créneaux par date active
                  </span>
                </div>

                <div
                  v-if="editionDaysList.length === 0"
                  class="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs"
                >
                  Aucun jour configuré pour le moment. Ajoutez une date ci-dessous.
                </div>

                <div
                  v-for="day in editionDaysList"
                  :key="day.dayKey"
                  class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 transition-colors"
                  :class="{ 'opacity-60 bg-slate-100/70': !day.isActive }"
                >
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-bold text-slate-900">
                        {{ day.dayLabel }}
                      </span>
                      <UBadge
                        v-if="day.isActive"
                        color="success"
                        variant="subtle"
                        size="xs"
                        class="font-medium"
                      >
                        Actif
                      </UBadge>
                      <UBadge
                        v-else
                        color="neutral"
                        variant="subtle"
                        size="xs"
                        class="text-slate-500"
                      >
                        Désactivé
                      </UBadge>
                    </div>
                    <div class="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                      <span class="inline-flex items-center gap-1">
                        <UIcon
                          name="i-lucide-clock"
                          class="w-3.5 h-3.5 text-slate-400"
                        />
                        {{ day.slotsCount }} créneaux
                      </span>
                      <span>•</span>
                      <span
                        class="inline-flex items-center gap-1"
                        :class="day.registrationsCount > 0 ? 'text-violet-700 font-semibold' : ''"
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
                      class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-violet-600 focus:ring-offset-2 disabled:opacity-50"
                      :class="day.isActive ? 'bg-violet-600' : 'bg-slate-300'"
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
              <div class="p-4 bg-violet-50/60 rounded-xl border border-violet-100 space-y-3">
                <div class="flex items-center gap-2">
                  <UIcon
                    name="i-lucide-plus-circle"
                    class="w-4 h-4 text-violet-700"
                  />
                  <h4 class="text-xs font-bold text-violet-950">
                    Ajouter une date de festival
                  </h4>
                </div>
                <p class="text-[11px] text-slate-600">
                  La date sélectionnée génèrera automatiquement les 5 créneaux de travail pour toutes les missions du salon.
                </p>

                <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  <UInput
                    v-model="newDayInput"
                    type="date"
                    size="sm"
                    class="flex-1"
                  />
                  <UButton
                    color="primary"
                    variant="solid"
                    size="sm"
                    icon="i-lucide-plus"
                    label="Ajouter ce jour"
                    :loading="isAddingDay"
                    :disabled="!newDayInput || isAddingDay"
                    class="cursor-pointer shrink-0 font-semibold"
                    @click="handleAddDay"
                  />
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-end pt-3 border-t border-slate-100 shrink-0">
              <UButton
                color="neutral"
                variant="subtle"
                size="sm"
                label="Fermer"
                @click="isDaysModalOpen = false"
              />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
