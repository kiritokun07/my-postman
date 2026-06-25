const THEME_KEY = 'my-postman-theme'

export function getThemeMode() {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    /* ignore */
  }
  return 'system'
}

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function resolveTheme(mode) {
  return mode === 'system' ? getSystemTheme() : mode
}

export function applyTheme(mode) {
  const resolved = resolveTheme(mode)
  document.documentElement.setAttribute('data-theme', resolved)
  document.documentElement.setAttribute('data-theme-mode', mode)
}

export function setThemeMode(mode) {
  try {
    localStorage.setItem(THEME_KEY, mode)
  } catch {
    /* ignore */
  }
  applyTheme(mode)
}

export function initTheme() {
  const mode = getThemeMode()
  applyTheme(mode)
  return mode
}

export function watchSystemTheme(onChange) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = () => {
    if (getThemeMode() === 'system') {
      applyTheme('system')
      onChange?.()
    }
  }
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}
