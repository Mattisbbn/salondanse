<script setup lang="ts">
const route = useRoute()
const { user, isAdmin, isBenevole, isAuthenticated, fullName, logout } = useAuth()

const isMobileMenuOpen = ref(false)

// Fermer le menu mobile lors d'un changement de route
watch(() => route.fullPath, () => {
  isMobileMenuOpen.value = false
})

interface NavItem {
  label: string
  to: string
  icon: string
}

// Menu Admin
const adminNavItems: NavItem[] = [
  {
    label: 'Tableau de bord',
    to: '/admin',
    icon: 'i-lucide-layout-dashboard'
  },
  {
    label: 'Bénévoles & Plannings',
    to: '/admin/volunteers',
    icon: 'i-lucide-users'
  },
  {
    label: 'Profils Mineurs',
    to: '/admin/minors',
    icon: 'i-lucide-shield-alert'
  },
  {
    label: 'Badges & QR Codes',
    to: '/admin/badges',
    icon: 'i-lucide-id-card'
  },
  {
    label: 'Invitations',
    to: '/admin/invitations',
    icon: 'i-lucide-mail-plus'
  },
  {
    label: 'Journal d\'audit',
    to: '/admin/audit',
    icon: 'i-lucide-file-text'
  },
  {
    label: 'Multi-Éditions',
    to: '/admin/editions',
    icon: 'i-lucide-calendar-cog'
  },
  {
    label: 'Gestion des Missions',
    to: '/admin/missions',
    icon: 'i-lucide-list-checks'
  },
  {
    label: 'Exports de données',
    to: '/admin/exports',
    icon: 'i-lucide-download'
  }
]

// Menu Bénévole
const benevoleNavItems: NavItem[] = [
  {
    label: 'Mon Planning',
    to: '/espace-benevole/planning',
    icon: 'i-lucide-calendar-days'
  },
  {
    label: 'Mon Profil & Badge',
    to: '/espace-benevole/dashboard',
    icon: 'i-lucide-badge-check'
  }
]

// Liste d'onglets filtrée selon le rôle
const navItems = computed<NavItem[]>(() => {
  if (isAdmin.value) {
    return adminNavItems
  }
  if (isBenevole.value) {
    return benevoleNavItems
  }
  // Si non connecté mais navigue sur le site
  return []
})

// Détermination du titre de la page courante pour le header mobile
const currentPageTitle = computed(() => {
  const found = [...adminNavItems, ...benevoleNavItems].find((item) => {
    if (item.to === '/admin') return route.path === '/admin'
    return route.path.startsWith(item.to)
  })
  return found?.label || 'Salon de la Danse'
})

// Initiales pour l'avatar
const userInitials = computed(() => {
  if (!user.value) return 'SD'
  const first = user.value.firstName?.[0] || ''
  const last = user.value.lastName?.[0] || ''
  return (first + last).toUpperCase() || 'SD'
})
</script>

<template>
  <div class="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans">
    <!-- ======================================================== -->
    <!-- DESKTOP SIDEBAR (Fixe à gauche, fine, épurée, fond blanc) -->
    <!-- ======================================================== -->
    <aside
      class="hidden md:flex md:w-64 md:flex-col fixed inset-y-0 left-0 z-30 bg-white border-r border-[#E2E8F0]"
      aria-label="Navigation principale"
    >
      <!-- En-tête Sidebar -->
      <div class="h-16 flex items-center justify-between px-5 border-b border-[#E2E8F0]">
        <div class="flex items-center gap-2.5 overflow-hidden">
          <div class="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
            SD
          </div>
          <div class="flex flex-col min-w-0">
            <span class="text-sm font-semibold tracking-tight text-[#0F172A] truncate">
              Salon de la Danse
            </span>
            <span class="text-[11px] text-slate-500 font-medium leading-none">
              Édition 2027
            </span>
          </div>
        </div>

        <!-- Badge de rôle -->
        <UBadge
          v-if="isAdmin"
          color="primary"
          variant="solid"
          size="sm"
          class="font-semibold text-xs px-2.5 py-0.5 rounded-md shrink-0 shadow-2xs"
        >
          Admin
        </UBadge>
        <UBadge
          v-else-if="isBenevole"
          color="neutral"
          variant="solid"
          size="sm"
          class="font-semibold text-xs px-2.5 py-0.5 rounded-md shrink-0 shadow-2xs"
        >
          Bénévole
        </UBadge>
      </div>

      <!-- Navigation Desktop -->
      <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div class="px-2 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          {{ isAdmin ? 'Administration' : isBenevole ? 'Espace Bénévole' : 'Navigation' }}
        </div>

        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
          :class="[
            route.path === item.to || (item.to !== '/admin' && route.path.startsWith(item.to))
              ? 'bg-violet-50 text-violet-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
          ]"
        >
          <UIcon
            :name="item.icon"
            class="w-4 h-4 shrink-0 transition-colors"
            :class="[
              route.path === item.to || (item.to !== '/admin' && route.path.startsWith(item.to))
                ? 'text-violet-600'
                : 'text-slate-400 group-hover:text-slate-600'
            ]"
          />
          <span class="truncate">{{ item.label }}</span>
        </NuxtLink>

        <!-- Message si aucune section disponible -->
        <div
          v-if="!isAuthenticated"
          class="p-4 bg-slate-50 rounded-lg border border-slate-200/80 text-center"
        >
          <p class="text-xs text-slate-500 mb-2">
            Vous n'êtes pas connecté
          </p>
          <UButton
            to="/espace-benevole/login"
            color="primary"
            variant="soft"
            size="xs"
            block
            label="Connexion"
          />
        </div>
      </nav>

      <!-- Bas de sidebar : Profil connecté & Déconnexion -->
      <div class="p-3 border-t border-[#E2E8F0] bg-white">
        <div
          v-if="isAuthenticated"
          class="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200/60"
        >
          <div class="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-semibold text-xs shrink-0">
            {{ userInitials }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-[#0F172A] truncate">
              {{ fullName || 'Utilisateur' }}
            </p>
            <p class="text-[11px] text-slate-500 truncate">
              {{ user?.email }}
            </p>
          </div>
          <UButton
            icon="i-lucide-log-out"
            color="neutral"
            variant="ghost"
            size="xs"
            title="Se déconnecter"
            aria-label="Déconnexion"
            class="text-slate-400 hover:text-red-600 hover:bg-red-50"
            @click="logout"
          />
        </div>
        <div v-else>
          <UButton
            to="/espace-benevole/login"
            color="primary"
            variant="solid"
            size="sm"
            block
            icon="i-lucide-log-in"
            label="Se connecter"
          />
        </div>
      </div>
    </aside>

    <!-- ======================================================== -->
    <!-- MOBILE HEADER (Sticky supérieur, épuré)                  -->
    <!-- ======================================================== -->
    <header class="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[#E2E8F0] h-14 px-4 flex items-center justify-between">
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="w-7 h-7 rounded-md bg-violet-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
          SD
        </div>
        <div class="flex flex-col min-w-0">
          <h1 class="text-xs font-bold text-[#0F172A] truncate">
            {{ currentPageTitle }}
          </h1>
          <span class="text-[10px] text-slate-500 font-medium leading-tight">
            Salon de la Danse
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <UBadge
          v-if="isAdmin"
          color="primary"
          variant="solid"
          size="sm"
          class="font-semibold text-xs px-2.5 py-0.5 rounded-md shadow-2xs"
        >
          Admin
        </UBadge>
        <UBadge
          v-else-if="isBenevole"
          color="neutral"
          variant="solid"
          size="sm"
          class="font-semibold text-xs px-2.5 py-0.5 rounded-md shadow-2xs"
        >
          Bénévole
        </UBadge>

        <UButton
          :icon="isMobileMenuOpen ? 'i-lucide-x' : 'i-lucide-menu'"
          color="neutral"
          variant="ghost"
          size="sm"
          aria-label="Menu"
          @click="isMobileMenuOpen = !isMobileMenuOpen"
        />
      </div>
    </header>

    <!-- ======================================================== -->
    <!-- MOBILE DRAWER / SLIDEOVER MENU                            -->
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
          v-if="isMobileMenuOpen"
          class="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs md:hidden"
          @click="isMobileMenuOpen = false"
        >
          <div
            class="fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200"
            @click.stop
          >
            <!-- Header du menu mobile -->
            <div class="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  SD
                </div>
                <div>
                  <span class="text-sm font-bold text-slate-900 block leading-tight">
                    Salon de la Danse
                  </span>
                  <span class="text-[10px] text-slate-500 font-medium">
                    Édition 2027 • Angers
                  </span>
                </div>
              </div>

              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="sm"
                aria-label="Fermer le menu"
                @click="isMobileMenuOpen = false"
              />
            </div>

            <!-- Profil connecté & Accès rapide Badge -->
            <div
              v-if="isAuthenticated"
              class="p-4 border-b border-slate-100 bg-violet-50/30 space-y-3"
            >
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-sm shrink-0 border border-violet-200">
                  {{ userInitials }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <p class="text-xs font-bold text-slate-900 truncate">
                      {{ fullName }}
                    </p>
                    <UBadge
                      :color="isAdmin ? 'primary' : 'neutral'"
                      variant="solid"
                      size="sm"
                      class="font-semibold text-xs px-2.5 py-0.5 rounded-md shadow-2xs"
                    >
                      {{ isAdmin ? 'Admin' : 'Bénévole' }}
                    </UBadge>
                  </div>
                  <p class="text-[11px] text-slate-500 truncate mt-0.5">
                    {{ user?.email }}
                  </p>
                </div>
              </div>

              <!-- Bouton d'accès rapide Badge & QR Code -->
              <div>
                <UButton
                  v-if="isBenevole"
                  to="/espace-benevole/dashboard"
                  color="primary"
                  variant="soft"
                  size="sm"
                  block
                  icon="i-lucide-qr-code"
                  label="Mon Badge Membre & QR Code"
                  class="font-semibold shadow-xs text-xs justify-center"
                  @click="isMobileMenuOpen = false"
                />
                <UButton
                  v-else-if="isAdmin"
                  to="/admin/badges"
                  color="primary"
                  variant="soft"
                  size="sm"
                  block
                  icon="i-lucide-id-card"
                  label="Contrôle Badges & QR Codes"
                  class="font-semibold shadow-xs text-xs justify-center"
                  @click="isMobileMenuOpen = false"
                />
              </div>
            </div>

            <!-- Liens de navigation complets -->
            <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
              <div class="px-2 pt-1 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {{ isAdmin ? 'Menu Administration' : isBenevole ? 'Menu Bénévole' : 'Navigation' }}
              </div>

              <NuxtLink
                v-for="item in navItems"
                :key="item.to"
                :to="item.to"
                class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all"
                :class="[
                  route.path === item.to || (item.to !== '/admin' && route.path.startsWith(item.to))
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                ]"
                @click="isMobileMenuOpen = false"
              >
                <UIcon
                  :name="item.icon"
                  class="w-4 h-4 shrink-0"
                  :class="[
                    route.path === item.to || (item.to !== '/admin' && route.path.startsWith(item.to))
                      ? 'text-white'
                      : 'text-slate-400'
                  ]"
                />
                <span class="truncate">{{ item.label }}</span>
              </NuxtLink>
            </nav>

            <!-- Déconnexion ou Connexion en bas -->
            <div class="p-3 border-t border-slate-200 bg-slate-50">
              <UButton
                v-if="isAuthenticated"
                icon="i-lucide-log-out"
                color="error"
                variant="subtle"
                size="sm"
                block
                label="Se déconnecter"
                class="font-medium justify-center cursor-pointer text-xs"
                @click="() => { isMobileMenuOpen = false; logout(); }"
              />
              <UButton
                v-else
                to="/espace-benevole/login"
                color="primary"
                variant="solid"
                size="sm"
                block
                icon="i-lucide-log-in"
                label="Se connecter"
                class="font-semibold justify-center text-xs"
                @click="isMobileMenuOpen = false"
              />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ======================================================== -->
    <!-- ZONE CENTRALE (<slot />) SUR FOND #F8FAFC                -->
    <!-- ======================================================== -->
    <main class="flex-1 md:pl-64 flex flex-col min-h-screen bg-[#F8FAFC]">
      <div class="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-8">
        <slot />
      </div>
    </main>
  </div>
</template>
