import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildMinutesShareDocument,
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

test('advanced Tiptap table nodes remain valid and table text is searchable', () => {
  const document = {
    type: 'doc',
    content: [
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              {
                type: 'tableHeader',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: '담당자' }] }],
              },
              {
                type: 'tableCell',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: '김민준' }] }],
              },
            ],
          },
        ],
      },
    ],
  }

  assert.equal(isValidTiptapDocument(document), true)
  assert.equal(extractTiptapText(document), '담당자\n김민준')
})

test('buildMinutesShareDocument preserves the original minutes Tiptap content', () => {
  const minutesContent = JSON.stringify({
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '결정 사항' }] },
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              {
                type: 'tableHeader',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: '업무' }] }],
              },
            ],
          },
        ],
      },
    ],
  })

  const shared = buildMinutesShareDocument({
    title: '주간 회의',
    summary: '핵심 요약',
    content: minutesContent,
    link: 'https://meetbowl.example/app/minutes/meeting-id',
  })
  const document = parseTiptapDocument(shared)

  assert.equal(isValidTiptapDocument(shared), true)
  assert.equal(document.content.some((node) => node.type === 'table'), true)
  assert.equal(extractTiptapText(shared), [
    '안녕하세요,',
    '주간 회의 회의록을 공유드립니다.',
    '회의 요약',
    '핵심 요약',
    '회의록 본문',
    '결정 사항',
    '업무',
    '회의록 링크',
    'https://meetbowl.example/app/minutes/meeting-id',
  ].join('\n'))
})
