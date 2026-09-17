import { createRouter, createWebHashHistory } from 'vue-router';
import { useAuth } from '../composables/useAuth';

// Único manifest.webmanifest pra tudo (gerado pelo vite-plugin-pwa) — nada
// de trocar `<link rel="manifest">` em runtime: em Chrome/Android real, o
// navegador decide se o app é instalável olhando o manifest já carregado
// na primeira visita da aba/PWA, e não reavalia de forma confiável quando
// o `href` muda depois via JS (testado num tablet real: o ícone instalado
// a partir do Totem não respeitava o manifest trocado). Em vez disso, o
// próprio app lembra "este aparelho é um Totem" e decide pra onde mandar
// o usuário quando o ícone abre em '/' — ver DEVICE_MODE_KEY abaixo.
const DEVICE_MODE_KEY = 'gp_device_mode';

import LoginSupervisorView from '../views/supervisor/LoginSupervisorView.vue';
import Dashboard from '../components/Dashboard.vue';
import ApontamentoView from '../views/supervisor/ApontamentoView.vue';
import RelatoriosView from '../views/supervisor/RelatoriosView.vue';
import MetasView from '../views/supervisor/MetasView.vue';
import AlertasView from '../views/supervisor/AlertasView.vue';
import EstacoesView from '../views/supervisor/EstacoesView.vue';
import LoteDetalheView from '../views/supervisor/LoteDetalheView.vue';

import LoginPinView from '../views/totem/LoginPinView.vue';
import ProducaoView from '../views/totem/ProducaoView.vue';
import TvView from '../views/TvView.vue';
import MobileSelectorView from '../views/mobile/MobileSelectorView.vue';
import ConfigMobileView from '../views/mobile/ConfigMobileView.vue';

const routes = [
  // Rota raiz → Celular e Desktop vão DIRETO para a Supervisão / Dashboard,
  // MAS um aparelho que já foi usado como Totem (ver DEVICE_MODE_KEY) cai
  // direto no Totem — é assim que o ícone do PWA instalado a partir do
  // Totem sabe pra onde abrir, sem precisar de um segundo manifest.
  { path: '/', redirect: () => {
      if (localStorage.getItem(DEVICE_MODE_KEY) === 'totem') return '/totem/login';
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
  // Relatórios (dia/semana/mês, comparativo por máquina, exportação Excel)
  // — diferente de /apontamento (operação do dia a dia, só supervisor),
  // esta é análise/histórico e vale tanto pra supervisor quanto admin.
  {
    path: '/relatorios',
    name: 'Relatorios',
    component: RelatoriosView,
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
  {
    path: '/mobile/config',
    name: 'MobileConfig',
    component: ConfigMobileView,
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

// Grava/limpa a "memória" do aparelho: entrar no Totem marca este
// navegador como Totem (o ícone instalado vai direto pra lá da próxima
// vez); voltar ao Seletor Mobile (link "Voltar ao Seletor Mobile" no
// LoginPinView) é a saída — limpa a marca pra esse aparelho voltar a
// abrir no fluxo normal de supervisor/celular.
router.afterEach((to) => {
  if (to.path.startsWith('/totem')) {
    localStorage.setItem(DEVICE_MODE_KEY, 'totem');
  } else if (to.path === '/mobile') {
    localStorage.removeItem(DEVICE_MODE_KEY);
  }
});

export default router;
