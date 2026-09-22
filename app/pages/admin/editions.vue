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

        <!-- Action de bascule -->
        <div class="pt-4 mt-2">
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
  </div>
</template>
