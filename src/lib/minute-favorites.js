const STORAGE_KEY = 'meetbowl.minutes.favorites'
const CHANGE_EVENT = 'meetbowl:minutes-favorites-changed'

export function readMinuteFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (!parsed || typeof parsed !== 'object') return { min1: true }
    return parsed
  } catch {
    return { min1: true }
  }
}

export function writeMinuteFavorites(favorites) {
  const next = { ...(favorites || {}) }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }))
  return next
}

export function toggleMinuteFavorite(minuteId) {
  const current = readMinuteFavorites()
  return writeMinuteFavorites({ ...current, [minuteId]: !current[minuteId] })
}

export function onMinuteFavoritesChanged(callback) {
  const handler = (event) => callback(event.detail || readMinuteFavorites())
  window.addEventListener(CHANGE_EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}
