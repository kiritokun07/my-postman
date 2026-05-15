const STORAGE_KEY = 'my-postman-history'
const MAX_HISTORY = 200

/**
 * Load history from localStorage
 */
export function getHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

/**
 * Save a new record to history and return updated list
 */
export function saveToHistory(record) {
  try {
    const history = getHistory()
    // Prepend new record
    const updated = [record, ...history].slice(0, MAX_HISTORY)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    return updated
  } catch {
    return getHistory()
  }
}

/**
 * Delete a single history record by id
 */
export function deleteHistoryItem(id) {
  const history = getHistory().filter((r) => r.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  return history
}

/**
 * Clear all history
 */
export function clearHistory() {
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * Export history as downloadable JSON file
 */
export function exportHistory() {
  const history = getHistory()
  const blob = new Blob([JSON.stringify(history, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `postman-history-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Format a timestamp to a relative human-readable string
 */
export function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

/**
 * Format bytes to human-readable string
 */
export function formatSize(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
