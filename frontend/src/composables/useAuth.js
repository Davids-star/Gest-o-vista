import { ref, computed } from 'vue'

// ─── Singleton reactivo ───────────────────────────────────────────────────
const _user = ref(null)
const _token = ref(null)

// Restaurar sessão do localStorage
try {
  const raw = localStorage.getItem('gp_session')
  if (raw) {
    const parsed = JSON.parse(raw)
    _user.value = parsed.user || null
    _token.value = parsed.token || null
  }
} catch {
  localStorage.removeItem('gp_session')
}

export function useAuth() {
  const user = _user
  const token = _token

  const isLoggedIn = computed(() => !!_token.value)

  // Normaliza o role do backend para os valores esperados pelo router
  const role = computed(() => {
    const r = _user.value?.role?.toLowerCase()
    if (!r) return null
    if (r === 'administrador' || r === 'admin' || r === 'chef') return 'administrador'
    if (r === 'supervisor') return 'supervisor'
    if (r === 'operador') return 'operador'
    return r
  })

  const isSupervisor = computed(() => role.value === 'supervisor')
  const isAdmin = computed(() => role.value === 'administrador' || role.value === 'chef')
  const isOperador = computed(() => role.value === 'operador')

  const setSession = (userData, accessToken) => {
    _user.value = userData
    _token.value = accessToken
    localStorage.setItem('gp_session', JSON.stringify({ user: userData, token: accessToken }))
  }

  const clearSession = () => {
    _user.value = null
    _token.value = null
    localStorage.removeItem('gp_session')
  }

  const homeRouteByRole = () => {
    if (isAdmin.value) return '/dashboard'
    if (isSupervisor.value) return '/dashboard'
    if (isOperador.value) return '/totem/login'
    return '/dashboard'
  }

  return {
    user,
    token,
    isLoggedIn,
    role,
    isSupervisor,
    isAdmin,
    isOperador,
    setSession,
    clearSession,
    homeRouteByRole,
  }
}
