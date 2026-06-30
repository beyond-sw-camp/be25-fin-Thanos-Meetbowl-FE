import assert from 'node:assert/strict'
import test from 'node:test'

import {
  TIMELINE,
  blockStyle,
  nowMarkerStyle,
  slotRangeFromOffsets,
  slotTimeFromOffset,
} from '../src/utils/timeline.js'

test('blockStyle clamps out-of-window ranges and enforces minimum width', () => {
  assert.deepEqual(blockStyle('08:00', '09:15'), {
    left: '0px',
    width: '36px',
  })
  assert.deepEqual(blockStyle('23:00', '00:00'), {
    left: `${(14 * TIMELINE.hourPx)}px`,
    width: `${TIMELINE.hourPx}px`,
  })
})

test('slotTimeFromOffset snaps to half-hour boundaries', () => {
  assert.equal(slotTimeFromOffset(0), '09:00')
  assert.equal(slotTimeFromOffset(31), '09:00')
  assert.equal(slotTimeFromOffset(32, 'end'), '09:30')
  assert.equal(slotTimeFromOffset(TIMELINE.hourPx * 2.6), '11:30')
})

test('slotRangeFromOffsets normalizes drag direction and preserves minimum range', () => {
  assert.deepEqual(slotRangeFromOffsets(90, 10), { start: '09:00', end: '10:30' })
  assert.deepEqual(slotRangeFromOffsets(0, 0), { start: '09:00', end: '09:30' })
})

test('nowMarkerStyle places the marker using the current KST time', () => {
  const OriginalDate = Date
  class FakeDate extends Date {
    constructor(...args) {
      if (args.length === 0) {
        super('2026-06-24T01:30:00.000Z')
        return
      }
      super(...args)
    }
    static now() {
      return new OriginalDate('2026-06-24T01:30:00.000Z').getTime()
    }
  }
  globalThis.Date = FakeDate

  assert.deepEqual(nowMarkerStyle(), {
    left: `${(90 / 60) * TIMELINE.hourPx}px`,
  })

  globalThis.Date = OriginalDate
})
