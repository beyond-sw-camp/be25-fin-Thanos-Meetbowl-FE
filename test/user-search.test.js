import assert from 'node:assert/strict'
import test from 'node:test'

import { canRequestUserSuggestions } from '../src/utils/user-search.js'

test('canRequestUserSuggestions blocks empty values and standalone hangul jamo', () => {
  assert.equal(canRequestUserSuggestions(''), false)
  assert.equal(canRequestUserSuggestions('   '), false)
  assert.equal(canRequestUserSuggestions('\u3148'), false)
  assert.equal(canRequestUserSuggestions('\u3131'), false)
  assert.equal(canRequestUserSuggestions('\u314F'), false)
  assert.equal(canRequestUserSuggestions('\u3148\u314F'), false)
})

test('canRequestUserSuggestions allows one-syllable hangul and latin or numeric input', () => {
  assert.equal(canRequestUserSuggestions('\uC9F1'), true)
  assert.equal(canRequestUserSuggestions('\uAE40'), true)
  assert.equal(canRequestUserSuggestions('\uC9F1\uAD6C'), true)
  assert.equal(canRequestUserSuggestions('\uAE40\uC9C0'), true)
  assert.equal(canRequestUserSuggestions('a'), true)
  assert.equal(canRequestUserSuggestions('1'), true)
  assert.equal(canRequestUserSuggestions('user'), true)
})
