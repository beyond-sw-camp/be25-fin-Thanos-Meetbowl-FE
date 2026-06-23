import assert from 'node:assert/strict'
import test from 'node:test'

import {
  extractTiptapText,
  isValidTiptapDocument,
  parseTiptapDocument,
  stringifyTiptapDocument,
} from '../src/lib/minutes-content.js'

test('extractTiptapText extracts readable text from a Tiptap document', () => {
  const content = JSON.stringify({
    type: 'doc',
    content: [
      { type: 'heading', content: [{ type: 'text', text: '결정 사항' }] },
      { type: 'paragraph', content: [{ type: 'text', text: '캠페인 일정을 앞당긴다.' }] },
    ],
  })

  assert.equal(extractTiptapText(content), '결정 사항\n캠페인 일정을 앞당긴다.')
})

test('isValidTiptapDocument requires doc type and content array', () => {
  assert.equal(isValidTiptapDocument('{"type":"doc","content":[]}'), true)
  assert.equal(isValidTiptapDocument('{"type":"paragraph","content":[]}'), false)
  assert.equal(isValidTiptapDocument('{'), false)
})

test('parseTiptapDocument falls back to an empty editable document', () => {
  const parsed = parseTiptapDocument('{')

  assert.equal(parsed.type, 'doc')
  assert.equal(Array.isArray(parsed.content), true)
  assert.equal(stringifyTiptapDocument(parsed), '{"type":"doc","content":[{"type":"paragraph","content":[]}]}')
})
