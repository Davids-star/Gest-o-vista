import { createRouter, createWebHashHistory } from 'vue-router';
import { useAuth } from '../composables/useAuth';

import LoginSupervisorView from '../views/supervisor/LoginSupervisorView.vue';
import Dashboard from '../components/Dashboard.vue';
import ApontamentoView from '../views/supervisor/ApontamentoView.vue';
import MetasView from '../views/supervisor/MetasView.vue';
import AlertasView from '../views/supervisor/AlertasView.vue';
import EstacoesView from '../views/supervisor/EstacoesView.vue';
import LoteDetalheView from '../views/supervisor/LoteDetalheView.vue';

import LoginPinView from '../views/totem/LoginPinView.vue';
import ProducaoView from '../views/totem/ProducaoView.vue';
import TvView from '../views/TvView.vue';
import MobileSelectorView from '../views/mobile/MobileSelectorView.vue';

const routes = [
  // Rota raiz → Celular e Desktop vão DIRETO para a Supervisão / Dashboard
  { path: '/', redirect: () => {
      const { isLoggedIn } = useAuth();
      return isLoggedIn.value ? '/dashboard' : '/supervisor/login';
    } 
  },

  // ── Autenticação ──────────────────────────────────────────────
  {
    path: '/supervisor/login',
    name: 'SupervisorLogin',
    component: LoginSupervisorView,
    meta: { requiresAuth: false },
  },

  // ── Área do Supervisor / Gestão (Celular e Desktop) ─────────────
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true, roles: ['supervisor', 'administrador', 'admin'] },
  },
  {
    path: '/estacoes',
    name: 'Estacoes',
    component: EstacoesView,
    meta: { requiresAuth: true, roles: ['supervisor', 'administrador', 'admin'] },
  },
  {
    path: '/apontamento/:estacaoId?',
    name: 'Apontamento',
    component: ApontamentoView,
    meta: { requiresAuth: true, roles: ['supervisor', 'administrador', 'admin'] },
  },
  {
    path: '/metas',
    name: 'Metas',
    component: MetasView,
    meta: { requiresAuth: true, roles: ['supervisor', 'administrador', 'admin'] },
  },
  {
    path: '/alertas',
    name: 'Alertas',
    component: AlertasView,
    meta: { requiresAuth: true, roles: ['supervisor', 'administrador', 'admin'] },
  },
  {
    path: '/lotes/:estacaoId?',
    name: 'LoteDetalhe',
    component: LoteDetalheView,
    meta: { requiresAuth: true, roles: ['supervisor', 'administrador', 'admin'] },
  },

  // ── Totem (Acesso por URL específica do Totem) ────────────────
  {
    path: '/totem/login',
    name: 'TotemLogin',
    component: LoginPinView,
    meta: { requiresAuth: false },
  },
  {
    path: '/totem/producao/:estacaoId?',
    name: 'TotemProducao',
    component: ProducaoView,
    meta: { requiresAuth: false },
  },

  // ── Painel TV (Acesso por URL específica da TV) ────────────────
  {
    path: '/tv',
    name: 'TvView',
    component: TvView,
    meta: { requiresAuth: false },
  },

  // ── Seletor PWA Opcional ───────────────────────────────────────
  {
    path: '/mobile',
    name: 'MobileSelector',
    component: MobileSelectorView,
    meta: { requiresAuth: false },
  },

  // ── Fallback ──────────────────────────────────────────────────
  { path: '/:pathMatch(.*)*', redirect: '/supervisor/login' },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

function ativarDispositivoSeNecessario(to) {
  const deviceToken = to.query.device_token;
  if (!deviceToken) return false;

  const { setSession } = useAuth();
  setSession({ name: 'Dispositivo (Totem/TV)', role: 'operador' }, deviceToken);
  return true;
}

// ── Guard JWT ─────────────────────────────────────────────────────────────
router.beforeEach((to, _from, next) => {
  if (ativarDispositivoSeNecessario(to)) {
    const { device_token, ...restoQuery } = to.query;
    return next({ path: to.path, query: restoQuery, params: to.params, replace: true });
  }

  if (!to.meta.requiresAuth) return next();

  const { isLoggedIn, role } = useAuth();

  if (!isLoggedIn.value) {
    return next({ name: 'SupervisorLogin', query: { redirect: to.fullPath } });
  }

  if (to.meta.roles && !to.meta.roles.includes(role.value)) {
    return next({ name: 'Dashboard' });
  }

  next();
});

export default router;
