import assert from 'node:assert/strict'
import test from 'node:test'

import {
  clearRememberedLoginId,
  readRememberedLoginId,
  writeRememberedLoginId,
} from '../src/lib/auth-session.js'

function createStorage() {
  const values = new Map()

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

test('remembered login id is stored trimmed and can be cleared', () => {
  globalThis.localStorage = createStorage()

  assert.equal(readRememberedLoginId(), '')
  assert.equal(writeRememberedLoginId('  meetbowl.user  '), 'meetbowl.user')
  assert.equal(readRememberedLoginId(), 'meetbowl.user')

  clearRememberedLoginId()

  assert.equal(readRememberedLoginId(), '')
})

test('empty remembered login id clears the saved value', () => {
  globalThis.localStorage = createStorage()

  writeRememberedLoginId('admin')
  assert.equal(readRememberedLoginId(), 'admin')

  writeRememberedLoginId('   ')

  assert.equal(readRememberedLoginId(), '')
})
