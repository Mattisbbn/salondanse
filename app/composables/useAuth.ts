export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'ADMIN' | 'BENEVOLE'
}

export const useAuth = () => {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const isInitialized = useState<boolean>('auth-initialized', () => false)

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')
  const isBenevole = computed(() => user.value?.role === 'BENEVOLE')
  const role = computed(() => user.value?.role || null)
  const fullName = computed(() => {
    if (!user.value) return ''
    return `${user.value.firstName} ${user.value.lastName}`.trim()
  })

  const fetchUser = async () => {
    try {
      const fetcher = useRequestFetch()
      const data = await fetcher<{ user: AuthUser | null }>('/api/auth/me')
      if (data?.user) {
        user.value = data.user
      } else {
        user.value = null
      }
    } catch {
      user.value = null
    } finally {
      isInitialized.value = true
    }
  }

  const login = async (credentials: { email: string, password: string }): Promise<AuthUser> => {
    const response = await $fetch<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: credentials
    })
    user.value = response.user
    isInitialized.value = true
    return response.user
  }

  const logout = async () => {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    } catch (e) {
      console.error('Logout error:', e)
    } finally {
      user.value = null
      await navigateTo('/espace-benevole/login')
    }
  }

  return {
    user,
    role,
    isAdmin,
    isBenevole,
    isAuthenticated,
    isInitialized,
    fullName,
    fetchUser,
    login,
    logout
  }
}
