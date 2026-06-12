import assert from 'node:assert/strict'
import test from 'node:test'

import {
  parseCaptionPayload,
  sortedCaptions,
  upsertCaption,
} from '../src/lib/caption-store.js'

test('uses text, sourceText, then trimmed sourceTranscript', () => {
  assert.equal(parseCaptionPayload({
    eventType: 'caption.updated',
    segmentId: 'one',
    text: ' text ',
    sourceText: 'source',
    sourceTranscript: ' transcript ',
  }).text, 'text')
  assert.equal(parseCaptionPayload({
    eventType: 'caption.updated',
    segmentId: 'two',
    sourceText: ' source ',
    sourceTranscript: ' transcript ',
  }).text, 'source')
  assert.equal(parseCaptionPayload({
    eventType: 'caption.updated',
    segmentId: 'three',
    sourceTranscript: ' transcript ',
  }).text, 'transcript')
})

test('upserts streaming captions and keeps finalized state', () => {
  let captions = new Map()
  captions = upsertCaption(captions, {
    eventType: 'caption.updated',
    segmentId: 'segment',
    sequence: 2,
    status: 'STREAMING',
    text: '안녕',
  })
  captions = upsertCaption(captions, {
    eventType: 'caption.updated',
    segmentId: 'segment',
    sequence: 2,
    status: 'FINALIZED',
    text: '안녕하세요',
  })
  captions = upsertCaption(captions, {
    eventType: 'caption.updated',
    segmentId: 'segment',
    sequence: 2,
    status: 'STREAMING',
    text: '뒤늦은 중간 결과',
  })

  assert.equal(captions.size, 1)
  assert.equal(captions.get('segment').status, 'FINALIZED')
  assert.equal(captions.get('segment').text, '안녕하세요')
})

test('sorts by sequence and falls back to startedAtMs', () => {
  const captions = new Map([
    ['late', { segmentId: 'late', sequence: null, startedAtMs: 300 }],
    ['second', { segmentId: 'second', sequence: 2, startedAtMs: 100 }],
    ['first', { segmentId: 'first', sequence: 1, startedAtMs: 200 }],
  ])
  assert.deepEqual(
    sortedCaptions(captions).map((caption) => caption.segmentId),
    ['first', 'second', 'late'],
  )
})
