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
    label: 'Missions',
    to: '/admin/missions',
    icon: 'i-lucide-list-checks'
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
    label: 'Profils Mineurs',
    to: '/admin/minors',
    icon: 'i-lucide-shield-alert'
  },
 
 
   {
    label: 'Éditions',
    to: '/admin/editions',
    icon: 'i-lucide-calendar-cog'
  },
  {
    label: 'Exports de données',
    to: '/admin/exports',
    icon: 'i-lucide-download'
  },
   {
    label: 'Logs',
    to: '/admin/logs',
    icon: 'i-lucide-file-text'
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
  <div class="min-h-screen bg-[#F6EFE6] text-[#2A1512] flex flex-col font-sans selection:bg-[#F3DCD5] selection:text-[#7A291E]">
    <!-- ======================================================== -->
    <!-- DESKTOP SIDEBAR (Fond sombre des Coulisses #2E1411)       -->
    <!-- ======================================================== -->
    <aside
      class="hidden md:flex md:w-64 md:flex-col fixed inset-y-0 left-0 z-30 bg-[#2E1411] border-r border-[#3D1C18] text-[#FFF7EE]"
      aria-label="Navigation principale"
    >
      <!-- En-tête Sidebar : Identité de marque officielle -->
      <div class="h-20 flex items-center justify-between px-5 border-b border-[#3D1C18]">
        <NuxtLink to="/" class="flex flex-col min-w-0 group">
          <span class="font-serif italic font-semibold text-lg text-[#FFF7EE] tracking-tight group-hover:text-[#D9B777] transition-colors leading-none">
            Salon de la Danse
          </span>
          <span class="text-[10px] font-bold tracking-[0.2em] uppercase text-[#D9B777] mt-1.5 leading-none">
            Angers · Édition 2027
          </span>
        </NuxtLink>

        <!-- Badge de rôle DA -->
        <span
          v-if="isAdmin"
          class="font-semibold text-[11px] px-2.5 py-0.5 rounded-full shrink-0 bg-[#7A291E] text-white border border-[#A8372A]"
        >
          Admin
        </span>
        <span
          v-else-if="isBenevole"
          class="font-semibold text-[11px] px-2.5 py-0.5 rounded-full shrink-0 bg-[#F3DCD5] text-[#7A291E]"
        >
          Bénévole
        </span>
      </div>

      <!-- Navigation Desktop -->
      <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div class="px-3 pb-2 text-[10px] font-bold !text-stone-300 uppercase tracking-[0.18em]">
          {{ isAdmin ? 'Administration' : isBenevole ? 'Espace Bénévole' : 'Navigation' }}
        </div>

        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
          :class="[
            route.path === item.to || (item.to !== '/admin' && route.path.startsWith(item.to))
              ? 'bg-[#7A291E] !text-white shadow-xs font-semibold'
              : '!text-stone-100 hover:!text-white hover:bg-[#3D1C18] font-medium'
          ]"
        >
          <UIcon
            :name="item.icon"
            class="w-4 h-4 shrink-0 transition-colors"
            :class="[
              route.path === item.to || (item.to !== '/admin' && route.path.startsWith(item.to))
                ? '!text-white'
                : '!text-stone-200 group-hover:!text-white'
            ]"
          />
          <span class="truncate text-inherit">{{ item.label }}</span>
        </NuxtLink>

        <!-- Message si non connecté -->
        <div
          v-if="!isAuthenticated"
          class="p-4 rounded-xl bg-[#3D1C18] border border-[#522520] text-center mt-4"
        >
          <p class="text-xs !text-stone-100 mb-3">
            Vous n'êtes pas connecté
          </p>
          <UButton
            to="/espace-benevole/login"
            color="primary"
            variant="solid"
            size="xs"
            block
            label="Connexion"
          />
        </div>
      </nav>

      <!-- Bas de sidebar : Profil connecté & Déconnexion -->
      <div class="p-3 border-t border-[#3D1C18] bg-[#220E0C]">
        <div
          v-if="isAuthenticated"
          class="flex items-center gap-2.5 p-2 rounded-xl bg-[#2E1411] border border-[#3D1C18]"
        >
          <div class="w-8 h-8 rounded-full bg-[#F3DCD5] text-[#7A291E] flex items-center justify-center font-bold text-xs shrink-0">
            {{ userInitials }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold !text-white truncate">
              {{ fullName || 'Utilisateur' }}
            </p>
            <p class="text-[11px] !text-stone-300 truncate">
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
            class="!text-stone-300 hover:!text-white hover:bg-[#3D1C18]"
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
    <!-- MOBILE HEADER (Sticky, Fond sombre Coulisses #2E1411)    -->
    <!-- ======================================================== -->
    <header class="md:hidden sticky top-0 z-30 bg-[#2E1411] border-b border-[#3D1C18] h-14 px-4 flex items-center justify-between text-[#FFF7EE]">
      <div class="flex items-center gap-2.5 min-w-0">
        <NuxtLink to="/" class="flex flex-col min-w-0">
          <span class="font-serif italic font-semibold text-sm text-[#FFF7EE] truncate leading-tight">
            Salon de la Danse
          </span>
          <span class="text-[9px] font-bold uppercase tracking-[0.16em] text-[#D9B777] leading-none">
            {{ currentPageTitle }}
          </span>
        </NuxtLink>
      </div>

      <div class="flex items-center gap-2">
        <span
          v-if="isAdmin"
          class="font-semibold text-[10px] px-2 py-0.5 rounded-full bg-[#7A291E] text-white border border-[#A8372A]"
        >
          Admin
        </span>
        <span
          v-else-if="isBenevole"
          class="font-semibold text-[10px] px-2 py-0.5 rounded-full bg-[#F3DCD5] text-[#7A291E]"
        >
          Bénévole
        </span>

        <button
          type="button"
          :aria-label="isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'"
          class="p-2 rounded-lg text-[#FFF7EE] hover:bg-[#3D1C18] focus:outline-hidden"
          @click="isMobileMenuOpen = !isMobileMenuOpen"
        >
          <UIcon :name="isMobileMenuOpen ? 'i-lucide-x' : 'i-lucide-menu'" class="w-5 h-5" />
        </button>
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
          class="fixed inset-0 z-50 bg-[#2A1512]/60 backdrop-blur-xs md:hidden"
          @click="isMobileMenuOpen = false"
        >
          <Transition
            appear
            enter-active-class="transition-transform duration-200 ease-out"
            enter-from-class="translate-x-full"
            enter-to-class="translate-x-0"
            leave-active-class="transition-transform duration-150 ease-in"
            leave-from-class="translate-x-0"
            leave-to-class="translate-x-full"
          >
            <div
              v-if="isMobileMenuOpen"
              class="fixed inset-y-0 right-0 flex w-80 max-w-[85vw] flex-col border-l border-[#3D1C18] bg-[#2E1411] text-[#FFF7EE] shadow-2xl"
              @click.stop
            >
              <!-- Header du menu mobile -->
              <div class="p-4 border-b border-[#3D1C18] flex items-center justify-between bg-[#220E0C]">
                <div>
                  <span class="font-serif italic font-semibold text-base text-[#FFF7EE] block leading-tight">
                    Salon de la Danse
                  </span>
                  <span class="text-[10px] font-bold tracking-[0.16em] uppercase text-[#D9B777]">
                    Angers · Édition 2027
                  </span>
                </div>

                <button
                  type="button"
                  aria-label="Fermer le menu"
                  class="p-2 rounded-full text-[#D8C6B4] hover:text-[#FFF7EE] hover:bg-[#3D1C18]"
                  @click="isMobileMenuOpen = false"
                >
                  <UIcon name="i-lucide-x" class="w-5 h-5" />
                </button>
              </div>

              <!-- Profil connecté & Accès rapide Badge -->
              <div
                v-if="isAuthenticated"
                class="p-4 border-b border-[#3D1C18] bg-[#2E1411] space-y-3"
              >
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-[#F3DCD5] text-[#7A291E] flex items-center justify-center font-bold text-sm shrink-0 border border-[#ECCBC4]">
                    {{ userInitials }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <p class="text-xs font-bold text-white truncate">
                        {{ fullName }}
                      </p>
                      <span
                        v-if="isAdmin"
                        class="font-semibold text-[10px] px-2 py-0.5 rounded-full bg-[#7A291E] text-white border border-[#A8372A]"
                      >
                        Admin
                      </span>
                      <span
                        v-else
                        class="font-semibold text-[10px] px-2 py-0.5 rounded-full bg-[#F3DCD5] text-[#7A291E]"
                      >
                        Bénévole
                      </span>
                    </div>
                    <p class="text-[11px] text-stone-300 truncate mt-0.5">
                      {{ user?.email }}
                    </p>
                  </div>
                </div>

                <!-- Bouton d'accès rapide Badge (H-11 mobile) -->
                <div>
                  <NuxtLink
                    v-if="isBenevole"
                    to="/espace-benevole/dashboard"
                    class="h-11 px-4 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] text-white font-semibold text-xs flex items-center justify-center gap-2 w-full transition-colors"
                    @click="isMobileMenuOpen = false"
                  >
                    <UIcon name="i-lucide-qr-code" class="w-4 h-4 text-[#D9B777]" />
                    <span>Mon Badge Membre & QR Code</span>
                  </NuxtLink>
                  <NuxtLink
                    v-else-if="isAdmin"
                    to="/admin/badges"
                    class="h-11 px-4 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] text-white font-semibold text-xs flex items-center justify-center gap-2 w-full transition-colors"
                    @click="isMobileMenuOpen = false"
                  >
                    <UIcon name="i-lucide-id-card" class="w-4 h-4 text-[#D9B777]" />
                    <span>Contrôle Badges & QR Codes</span>
                  </NuxtLink>
                </div>
              </div>

              <!-- Liens de navigation complets -->
              <nav class="flex-1 p-3 space-y-1.5 overflow-y-auto">
                <div class="px-2 pt-1 pb-2 text-[10px] font-bold !text-stone-300 uppercase tracking-[0.16em]">
                  {{ isAdmin ? 'Menu Administration' : isBenevole ? 'Menu Bénévole' : 'Navigation' }}
                </div>

                <NuxtLink
                  v-for="item in navItems"
                  :key="item.to"
                  :to="item.to"
                  class="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm transition-all"
                  :class="[
                    route.path === item.to || (item.to !== '/admin' && route.path.startsWith(item.to))
                      ? 'bg-[#7A291E] !text-white shadow-xs font-semibold'
                      : '!text-stone-100 hover:!text-white hover:bg-[#3D1C18] font-medium'
                  ]"
                  @click="isMobileMenuOpen = false"
                >
                  <UIcon
                    :name="item.icon"
                    class="w-4 h-4 shrink-0 transition-colors"
                    :class="[
                      route.path === item.to || (item.to !== '/admin' && route.path.startsWith(item.to))
                        ? '!text-white'
                        : '!text-stone-200 group-hover:!text-white'
                    ]"
                  />
                  <span class="truncate text-inherit">{{ item.label }}</span>
                </NuxtLink>
              </nav>

              <!-- Déconnexion ou Connexion en bas -->
              <div class="p-3 border-t border-[#3D1C18] bg-[#220E0C]">
                <button
                  v-if="isAuthenticated"
                  type="button"
                  class="h-11 px-4 rounded-full border border-[#D9A79F] bg-transparent text-[#F4D8D3] hover:bg-[#7A291E]/20 w-full flex items-center justify-center gap-2 font-medium text-xs cursor-pointer transition-colors"
                  @click="() => { isMobileMenuOpen = false; logout(); }"
                >
                  <UIcon name="i-lucide-log-out" class="w-4 h-4 text-[#F4D8D3]" />
                  <span>Se déconnecter</span>
                </button>
                <NuxtLink
                  v-else
                  to="/espace-benevole/login"
                  class="h-11 px-4 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] text-white font-semibold text-xs flex items-center justify-center gap-2 w-full transition-colors"
                  @click="isMobileMenuOpen = false"
                >
                  <UIcon name="i-lucide-log-in" class="w-4 h-4" />
                  <span>Se connecter</span>
                </NuxtLink>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- ======================================================== -->
    <!-- ZONE CENTRALE (<slot />) SUR FOND CRÈME #F6EFE6          -->
    <!-- ======================================================== -->
    <main class="flex-1 md:pl-64 flex flex-col min-h-screen bg-[#F6EFE6]">
      <div
        class="flex-1 p-4 sm:p-6 lg:p-8 w-full mx-auto pb-10"
        :class="isAdmin ? 'max-w-[1600px]' : 'max-w-7xl'"
      >
        <slot />
      </div>
    </main>
  </div>
</template>
