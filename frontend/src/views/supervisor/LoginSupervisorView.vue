<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../../composables/useAuth'
import { authApi } from '../../services/api'

const router = useRouter()
const { setSession, homeRouteByRole } = useAuth()

// ─── STATE ─────────────────────────────────────────────────────────────
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')

// ─── HANDLERS ──────────────────────────────────────────────────────────
const handleLogin = async () => {
  if (!email.value || !password.value) {
    errorMessage.value = 'Preencha email e senha.'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    // POST real à API: NestJS → TypeORM → PostgreSQL
    const data = await authApi.login(email.value, password.value)

    // A API retorna { access_token, user: { id, name, email, role } }
    const user = data.user || {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
    }

    setSession(user, data.access_token)
    router.push(homeRouteByRole())
  } catch (err) {
    errorMessage.value = err.message || 'Credenciais inválidas. Tente novamente.'
  } finally {
    isLoading.value = false
  }
}

const loginWithGoogle = () => {
  alert('Login com Google — OAuth não implementado nesta fase.')
}

const loginWithLinkedIn = () => {
  alert('Login com LinkedIn — OAuth não implementado nesta fase.')
}
</script>

<template>
  <!-- Fundo escuro com padrão de pontos e formas geométricas decorativas -->
  <div class="relative min-h-screen bg-[#0a0e0d] flex flex-col overflow-hidden select-none">

    <!-- ── Padrão de pontos (pseudo-fundo) ── -->
    <div
      class="absolute inset-0 pointer-events-none"
      style="background-image: radial-gradient(circle, #1f2937 1px, transparent 1px); background-size: 28px 28px; opacity: 0.45;"
    />

    <!-- ── Formas geométricas decorativas de fundo ── -->
    <div class="absolute top-[-80px] right-[-80px] w-72 h-72 rounded-full border border-[#22ff88]/10 pointer-events-none" />
    <div class="absolute top-[-40px] right-[-40px] w-48 h-48 rounded-full border border-[#22ff88]/10 pointer-events-none" />
    <div class="absolute bottom-[-100px] left-[-100px] w-96 h-96 rounded-full border border-gray-700/20 pointer-events-none" />
    <div class="absolute bottom-10 right-10 w-32 h-32 rotate-45 border border-gray-700/20 pointer-events-none" />

    <!-- ── Logo canto superior esquerdo ── -->
    <header class="relative z-10 p-6 flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl border-2 border-[#22ff88] bg-[#22ff88]/10 flex items-center justify-center text-[#22ff88] shadow-[0_0_14px_rgba(34,255,136,0.3)]">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <div>
        <span class="block text-lg font-extrabold text-[#22ff88] tracking-widest uppercase leading-tight">Novus</span>
        <span class="block text-xs text-gray-300 tracking-wider">Innovate &amp; Elevate</span>
      </div>
    </header>

    <!-- ── Card Central de Login ── -->
    <main class="relative z-10 flex-1 flex items-center justify-center px-4 pb-10">
      <div class="w-full max-w-md bg-[#11161a]/90 backdrop-blur border border-[#1f2937] rounded-2xl p-8 shadow-2xl">

        <!-- Ícone de usuário -->
        <div class="flex justify-center mb-6">
          <div class="w-16 h-16 rounded-full border-2 border-[#22ff88] bg-[#22ff88]/10 flex items-center justify-center shadow-[0_0_18px_rgba(34,255,136,0.25)]">
            <svg class="w-8 h-8 text-[#22ff88]" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
        </div>

        <h1 class="text-center text-2xl font-extrabold text-white mb-7">Bem-vindo de volta!</h1>

        <!-- Mensagem de erro -->
        <div v-if="errorMessage" class="mb-4 text-center text-xs font-semibold text-red-400 bg-red-950/40 border border-red-800/50 py-2 px-3 rounded-lg">
          {{ errorMessage }}
        </div>

        <!-- Campo Email -->
        <div class="mb-4">
          <label class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5" for="login-email">Email:</label>
          <input
            id="login-email"
            v-model="email"
            type="email"
            placeholder="Digite o seu email"
            @keyup.enter="handleLogin"
            class="w-full bg-[#0a0e0d] border border-[#1f2937] focus:border-[#22ff88] focus:shadow-[0_0_8px_rgba(34,255,136,0.2)] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-all"
          />
        </div>

        <!-- Campo Senha -->
        <div class="mb-3">
          <label class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5" for="login-password">Senha:</label>
          <input
            id="login-password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Digite a sua senha"
            @keyup.enter="handleLogin"
            class="w-full bg-[#0a0e0d] border border-[#1f2937] focus:border-[#22ff88] focus:shadow-[0_0_8px_rgba(34,255,136,0.2)] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-all"
          />
        </div>

        <!-- Mostrar senha + Esqueceu a senha -->
        <div class="flex items-center justify-between mb-6 text-xs text-gray-400">
          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input
              v-model="showPassword"
              type="checkbox"
              class="w-3.5 h-3.5 accent-[#22ff88] rounded"
            />
            <span>Mostrar senha</span>
          </label>
          <button class="text-[#22ff88] hover:underline font-medium transition-colors">
            Esqueceu a senha?
          </button>
        </div>

        <!-- Botão Entrar -->
        <button
          id="btn-entrar"
          @click="handleLogin"
          :disabled="isLoading"
          class="w-full py-3.5 rounded-xl bg-[#22ff88] hover:bg-[#1ce075] text-black font-extrabold text-sm uppercase tracking-widest transition-all shadow-[0_0_18px_rgba(34,255,136,0.3)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {{ isLoading ? 'Autenticando...' : 'Entrar' }}
        </button>

        <!-- Divisor + Login Social -->
        <div class="mt-7">
          <div class="flex items-center gap-3 mb-4">
            <span class="flex-1 h-px bg-[#1f2937]" />
            <span class="text-xs text-gray-500 tracking-wider whitespace-nowrap">Use outras contas</span>
            <span class="flex-1 h-px bg-[#1f2937]" />
          </div>

          <div class="flex justify-center gap-4">
            <!-- Google -->
            <button
              @click="loginWithGoogle"
              title="Entrar com Google"
              class="w-12 h-12 rounded-xl border border-[#1f2937] bg-[#0a0e0d] hover:border-[#22ff88]/40 hover:bg-[#22ff88]/5 flex items-center justify-center transition-all shadow"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </button>

            <!-- LinkedIn -->
            <button
              @click="loginWithLinkedIn"
              title="Entrar com LinkedIn"
              class="w-12 h-12 rounded-xl border border-[#1f2937] bg-[#0a0e0d] hover:border-[#22ff88]/40 hover:bg-[#22ff88]/5 flex items-center justify-center transition-all shadow"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="#0A66C2">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </button>
          </div>
        </div>

      </div>
    </main>
  </div>
</template>
