<script setup lang="ts">
const { isAdmin } = useAuth()

if (!isAdmin.value) {
  await navigateTo('/espace-benevole/login')
}

useHead({
  title: 'Logs · Admin'
})

interface AuditLogItem {
  id: string
  action: string
  details: string | null
  targetId: string | null
  createdAt: string
  adminName: string
  adminEmail: string
  editionName: string
}

interface AuditResponse {
  total: number
  logs: AuditLogItem[]
}

const { data, status } = await useFetch<AuditResponse>('/api/admin/audit-logs')

const searchQuery = ref('')
const selectedAction = ref('ALL')

// Options de filtre
const actionOptions = [
  { label: 'Toutes les actions', value: 'ALL' },
  { label: 'Attributions de mission', value: 'ASSIGN_MISSION' },
  { label: 'Retraits de mission', value: 'UNASSIGN_MISSION' },
  { label: 'Autorisations mineur', value: 'APPROVE_MINOR' },
  { label: 'Invitations envoyées', value: 'SEND_INVITATION' },
  { label: 'Verrouillages statut', value: 'LOCK_STATUS' },
  { label: 'Créations d\'édition', value: 'CREATE_EDITION' }
]

const filteredLogs = computed(() => {
  if (!data.value?.logs) return []
  let list = data.value.logs

  if (selectedAction.value !== 'ALL') {
    list = list.filter(l => l.action.includes(selectedAction.value))
  }

  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter((l) => {
      return (
        l.action.toLowerCase().includes(q)
        || l.adminName.toLowerCase().includes(q)
        || l.adminEmail.toLowerCase().includes(q)
        || (l.details && l.details.toLowerCase().includes(q))
        || (l.targetId && l.targetId.toLowerCase().includes(q))
      )
    })
  }

  return list
})

// Formatage de date
function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// Badge couleur par action
function getActionBadgeColor(action: string): 'primary' | 'success' | 'warning' | 'error' | 'neutral' {
  if (action.includes('ASSIGN_MISSION')) return 'primary'
  if (action.includes('APPROVE_MINOR') || action.includes('SUCCESS')) return 'success'
  if (action.includes('UNASSIGN') || action.includes('DELETE') || action.includes('RESET')) return 'error'
  if (action.includes('LOCK') || action.includes('WARN')) return 'warning'
  return 'neutral'
}

function getActionLabel(action: string): string {
  switch (action) {
    case 'ASSIGN_MISSION':
      return 'Attribution mission'
    case 'UNASSIGN_MISSION':
      return 'Retrait mission'
    case 'APPROVE_MINOR':
      return 'Autorisation mineur'
    case 'SEND_INVITATION':
      return 'Envoi invitation'
    case 'LOCK_STATUS':
      return 'Verrouillage planning'
    case 'CREATE_EDITION':
      return 'Création édition'
    default:
      return action
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- En-tête -->
    <div class="pb-5 border-b border-[#E6D9CB]">
      <span class="text-[11px] font-bold tracking-[0.16em] uppercase text-[#7A291E] block mb-1">
        Traçabilité & Sécurité
      </span>
      <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-[#2A1512]">
        Journal d'Audit
      </h1>
  
    </div>

    <!-- Conteneur principal unifié : Filtres intégrés + Tableau -->
    <div class="bg-[#FFFCF8] rounded-2xl border border-[#E6D9CB] shadow-xs overflow-hidden">
      <!-- Header de filtres intégré au-dessus des en-têtes de colonnes -->
      <div class="p-3.5 sm:p-4 border-b border-[#E6D9CB] flex flex-col sm:flex-row items-center gap-3">
        <div class="w-full sm:w-72">
          <UInput
            v-model="searchQuery"
            placeholder="Rechercher par admin, action, détail..."
            icon="i-lucide-search"
            size="sm"
            class="w-full"
          />
        </div>

        <div class="w-full sm:w-60">
          <select
            v-model="selectedAction"
            class="w-full text-xs font-semibold bg-[#FFFCF8] border border-[#D8C6B4] text-[#2A1512] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7A291E] cursor-pointer"
          >
            <option
              v-for="opt in actionOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
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
          Chargement des logs d'audit...
        </p>
      </div>

      <!-- Aucun log -->
      <div
        v-else-if="filteredLogs.length === 0"
        class="p-12 text-center space-y-2"
      >
        <div class="w-12 h-12 rounded-2xl bg-[#F6EFE6] text-[#6E5A52] flex items-center justify-center mx-auto">
          <UIcon
            name="i-lucide-clipboard-list"
            class="w-6 h-6"
          />
        </div>
        <h3 class="text-base font-bold text-[#2A1512]">
          Aucune action enregistrée
        </h3>
        <p class="text-xs text-[#6E5A52]">
          Les opérations administratives (affectation, annulation, approbation mineur) apparaîtront ici.
        </p>
      </div>

      <!-- Tableau des logs -->
      <template v-else>
        <!-- Vue Desktop : Tableau -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-[#F6EFE6] border-b border-[#E6D9CB] text-[#6E5A52] font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th class="py-3.5 px-4">
                  Date & Heure
                </th>
                <th class="py-3.5 px-4">
                  Administrateur
                </th>
                <th class="py-3.5 px-4">
                  Action
                </th>
                <th class="py-3.5 px-4">
                  Détails de l'opération
                </th>
                <th class="py-3.5 px-4 text-right">
                  ID Cible
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#E6D9CB]">
              <tr
                v-for="log in filteredLogs"
                :key="log.id"
                class="hover:bg-[#F6EFE6]/40 transition-colors"
              >
                <!-- Date -->
                <td class="py-3 px-4 whitespace-nowrap font-mono text-[#6E5A52]">
                  {{ formatDate(log.createdAt) }}
                </td>

                <!-- Admin -->
                <td class="py-3 px-4 whitespace-nowrap">
                  <div class="font-bold text-[#2A1512]">
                    {{ log.adminName }}
                  </div>
                  <div class="text-[11px] text-[#6E5A52]">
                    {{ log.adminEmail }}
                  </div>
                </td>

                <!-- Action -->
                <td class="py-3 px-4 whitespace-nowrap">
                  <span
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                    :class="[
                      getActionBadgeColor(log.action) === 'success' ? 'bg-[#E1E9DC] text-[#2F5238] border border-[#9DB79F]' :
                      getActionBadgeColor(log.action) === 'primary' ? 'bg-[#F3DCD5] text-[#7A291E] border border-[#D9A79F]' :
                      getActionBadgeColor(log.action) === 'error' ? 'bg-[#F4D8D3] text-[#9A2A22] border border-[#D9A79F]' :
                      getActionBadgeColor(log.action) === 'warning' ? 'bg-[#F7E4C6] text-[#8A4B0F] border border-[#D9A660]' :
                      'bg-[#EFE5DA] text-[#5B463E] border border-[#D8C6B4]'
                    ]"
                  >
                    {{ getActionLabel(log.action) }}
                  </span>
                </td>

                <!-- Détails -->
                <td class="py-3 px-4 max-w-xs sm:max-w-md">
                  <p class="text-[#2A1512] line-clamp-2">
                    {{ log.details || '-' }}
                  </p>
                </td>

                <!-- Cible -->
                <td class="py-3 px-4 text-right whitespace-nowrap font-mono text-[11px] text-[#6E5A52]">
                  {{ log.targetId ? log.targetId.slice(0, 8).toUpperCase() : '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Vue Mobile : Liste de Cartes empilées -->
        <div class="block md:hidden divide-y divide-[#E6D9CB]">
          <div
            v-for="log in filteredLogs"
            :key="log.id"
            class="p-4 space-y-2.5 bg-[#FFFCF8]"
          >
            <!-- En-tête : Badge Action + Date & Heure -->
            <div class="flex items-start justify-between gap-2">
              <span
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0"
                :class="[
                  getActionBadgeColor(log.action) === 'success' ? 'bg-[#E1E9DC] text-[#2F5238] border border-[#9DB79F]' :
                  getActionBadgeColor(log.action) === 'primary' ? 'bg-[#F3DCD5] text-[#7A291E] border border-[#D9A79F]' :
                  getActionBadgeColor(log.action) === 'error' ? 'bg-[#F4D8D3] text-[#9A2A22] border border-[#D9A79F]' :
                  getActionBadgeColor(log.action) === 'warning' ? 'bg-[#F7E4C6] text-[#8A4B0F] border border-[#D9A660]' :
                  'bg-[#EFE5DA] text-[#5B463E] border border-[#D8C6B4]'
                ]"
              >
                {{ getActionLabel(log.action) }}
              </span>

              <span class="font-mono text-[11px] text-[#6E5A52] shrink-0">
                {{ formatDate(log.createdAt) }}
              </span>
            </div>

            <!-- Administrateur -->
            <div class="flex items-center gap-2 text-xs">
              <div class="w-6 h-6 rounded-md bg-[#F6EFE6] text-[#7A291E] flex items-center justify-center shrink-0">
                <UIcon
                  name="i-lucide-user"
                  class="w-3.5 h-3.5"
                />
              </div>
              <div class="min-w-0">
                <span class="font-bold text-[#2A1512] block truncate">{{ log.adminName }}</span>
                <span class="text-[11px] text-[#6E5A52] block truncate">{{ log.adminEmail }}</span>
              </div>
            </div>

            <!-- Détails de l'opération -->
            <div
              v-if="log.details"
              class="text-xs text-[#2A1512] bg-[#F6EFE6] p-2.5 rounded-xl border border-[#E6D9CB] leading-relaxed"
            >
              {{ log.details }}
            </div>

            <!-- ID Cible si présent -->
            <div
              v-if="log.targetId"
              class="flex items-center justify-between text-[11px] pt-0.5 text-[#6E5A52] font-mono"
            >
              <span>Cible concernée :</span>
              <span class="font-bold text-[#7A291E] bg-[#F3DCD5] px-1.5 py-0.5 rounded border border-[#D9A79F]">
                {{ log.targetId.slice(0, 8).toUpperCase() }}
              </span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
