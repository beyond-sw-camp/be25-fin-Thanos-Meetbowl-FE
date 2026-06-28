import assert from 'node:assert/strict'
import test from 'node:test'

import {
  onMinuteFavoritesChanged,
  readMinuteFavorites,
  toggleMinuteFavorite,
  writeMinuteFavorites,
} from '../src/lib/minute-favorites.js'

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null
    },
    setItem(key, value) {
      values.set(key, String(value))
    },
    removeItem(key) {
      values.delete(key)
    },
  }
}

function createWindowMock() {
  const listeners = new Map()
  return {
    addEventListener(type, handler) {
      const list = listeners.get(type) || []
      list.push(handler)
      listeners.set(type, list)
    },
    removeEventListener(type, handler) {
      const list = listeners.get(type) || []
      listeners.set(type, list.filter((item) => item !== handler))
    },
    dispatchEvent(event) {
      const list = listeners.get(event.type) || []
      for (const handler of list) handler(event)
    },
  }
}

test('readMinuteFavorites falls back to the default favorite when storage is invalid', () => {
  globalThis.localStorage = createStorage({
    'meetbowl.minutes.favorites': '{"broken"',
  })

  assert.deepEqual(readMinuteFavorites(), { min1: true })
})

test('toggleMinuteFavorite persists the toggled state', () => {
  globalThis.localStorage = createStorage()
  globalThis.window = createWindowMock()
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, init = {}) {
      this.type = type
      this.detail = init.detail
    }
  }

  assert.deepEqual(toggleMinuteFavorite('min2'), { min1: true, min2: true })
  assert.deepEqual(toggleMinuteFavorite('min2'), { min1: true, min2: false })
})

test('onMinuteFavoritesChanged listens to custom changes and storage changes', () => {
  globalThis.localStorage = createStorage()
  globalThis.window = createWindowMock()
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, init = {}) {
      this.type = type
      this.detail = init.detail
    }
  }

  const received = []
  const unsubscribe = onMinuteFavoritesChanged((value) => received.push(value))

  writeMinuteFavorites({ min1: true, min8: true })
  window.dispatchEvent({ type: 'storage', detail: { min9: true } })
  unsubscribe()
  window.dispatchEvent({ type: 'storage', detail: { min10: true } })

  assert.deepEqual(received, [
    { min1: true, min8: true },
    { min9: true },
  ])
})
