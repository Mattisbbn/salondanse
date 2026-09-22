export default defineNuxtRouteMiddleware(async (to) => {
  const publicRoutes = new Set([
    '/',
    '/espace-benevole/login',
    '/espace-benevole/register',
    '/espace-benevole/forgot-password',
    '/espace-benevole/reset-password',
    '/verify-badge'
  ])

  const { user, isInitialized, fetchUser } = useAuth()

  // Initialisation de la session utilisateur si nécessaire (SSR-friendly via useRequestFetch)
  if (!isInitialized.value) {
    await fetchUser()
  }

  const isPublic = publicRoutes.has(to.path)

  // 1. Accès non authentifié à une route protégée
  if (!user.value) {
    if (!isPublic) {
      return navigateTo({
        path: '/espace-benevole/login',
        query: { warning: 'auth_required' }
      })
    }
    return
  }

  // 2. Contrôle de rôle : Un bénévole ne peut pas accéder à /admin/...
  if (user.value.role === 'BENEVOLE' && to.path.startsWith('/admin')) {
    return navigateTo('/espace-benevole/planning')
  }

  // 3. Utilisateur déjà connecté tentant d'accéder aux pages de login ou register
  if (to.path === '/espace-benevole/login' || to.path === '/espace-benevole/register') {
    if (user.value.role === 'ADMIN') {
      return navigateTo('/admin')
    }
    return navigateTo('/espace-benevole/planning')
  }
})
