/**
 * useTheme.js — GP Frontend V2
 *
 * Tema claro/escuro do app: **escuro é o principal** (o padrão pra quem
 * nunca escolheu nada, e o que qualquer tela nova deve assumir). Claro é
 * secundário — só existe pra quem escolhe manualmente (hoje, via
 * /mobile/config), e essa escolha persiste em localStorage.
 * App.vue chama useTheme() uma vez no boot pra sempre existir um
 * [data-gp-theme] em <html>, que o `@custom-variant dark` (ver style.css)
 * usa pra decidir as classes `dark:` do Tailwind nas telas de escritório
 * (Dashboard, Relatórios, Estações, Apontamento, Metas, Alertas, Lote) e as
 * variáveis --gp-* dos cards (.dark-panel). Totem e TV ficam de propósito
 * sempre escuros (.panel-industrial, cores fixas), não seguem esse tema.
 */
import { ref, watch } from 'vue';

const STORAGE_KEY = 'gp_theme';
// 'light' salvo ANTES desta migração vem de quando só as telas mobile liam
// esse valor (escuro nunca foi de fato "o principal" testado pra essas
// telas) — sem essa marca, quem já tinha clicado "Claro" lá acabaria com o
// Dashboard/Totem/TV inteiro claro sem ter escolhido isso pra valer.
// Ignora esse valor antigo uma única vez; escolhas feitas DEPOIS desta
// migração (inclusive "claro" de novo) persistem normalmente.
const MIGRATION_KEY = 'gp_theme_migrated_v2';

function readStoredTheme() {
  try {
    if (localStorage.getItem(MIGRATION_KEY) !== '1') {
      localStorage.setItem(MIGRATION_KEY, '1');
      localStorage.removeItem(STORAGE_KEY);
      return 'dark';
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'dark';
  } catch {
    return 'dark';
  }
}

const _theme = ref(readStoredTheme());
let attached = false;

function applyThemeToDocument(theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-gp-theme', theme);
}

function attachOnce() {
  if (attached) return;
  attached = true;
  applyThemeToDocument(_theme.value);
  watch(_theme, (theme) => {
    applyThemeToDocument(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Sem storage disponível (modo privado etc.) — tema só não persiste.
    }
  });
}

export function useTheme() {
  attachOnce();

  const setTheme = (theme) => {
    if (theme !== 'light' && theme !== 'dark') return;
    _theme.value = theme;
  };

  const toggleTheme = () => {
    _theme.value = _theme.value === 'dark' ? 'light' : 'dark';
  };

  return {
    theme: _theme,
    setTheme,
    toggleTheme,
  };
}
