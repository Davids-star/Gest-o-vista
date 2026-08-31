/**
 * useTheme.js — GP Frontend V2
 *
 * O app inteiro nasceu 100% escuro (cores fixas em cada view, sem sistema de
 * tema). Refazer isso pra todo mundo de uma vez é um projeto à parte; por
 * enquanto o tema claro/escuro só existe nas telas mobile que optam por
 * consumir as variáveis --gp-* (ver style.css) — MobileSelectorView e
 * ConfigMobileView. O resto do app (Dashboard, Totem, TV) ignora o atributo
 * e continua escuro, sem risco de quebrar nada.
 */
import { ref, watch } from 'vue';

const STORAGE_KEY = 'gp_theme';

function readStoredTheme() {
  try {
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
