import assert from 'node:assert/strict'
import test from 'node:test'

import {
  addMinutes,
  fromDateTimeInput,
  kstDayRangeUtc,
  kstToUtcIso,
  meetingEnd,
  minutesToTime,
  shiftDateKst,
  timeToMinutes,
  toDateTimeInput,
  utcToKstClock,
  utcToKstDate,
} from '../src/utils/dateTime.js'

test('time conversion helpers keep hour and minute values consistent', () => {
  assert.equal(timeToMinutes('09:30'), 570)
  assert.equal(minutesToTime(570), '09:30')
  assert.equal(addMinutes('23:30', 30), '24:00')
})

test('date time input helpers round-trip between space and T separator', () => {
  assert.equal(toDateTimeInput('2026-06-25 09:30'), '2026-06-25T09:30')
  assert.equal(fromDateTimeInput('2026-06-25T09:30'), '2026-06-25 09:30')
})

test('meetingEnd adds one hour to the meeting start value', () => {
  assert.equal(
    meetingEnd({ start: '2026-06-25 09:30' }),
    '2026-06-25 10:30',
  )
})

test('kst conversion helpers produce UTC range and KST display values', () => {
  assert.equal(kstToUtcIso('2026-06-25', '09:00'), '2026-06-25T00:00:00.000Z')
  assert.deepEqual(kstDayRangeUtc('2026-06-25'), {
    from: '2026-06-24T15:00:00.000Z',
    to: '2026-06-25T15:00:00.000Z',
  })
  assert.equal(utcToKstDate('2026-06-24T15:00:00.000Z'), '2026-06-25')
  assert.equal(utcToKstClock('2026-06-24T15:30:00.000Z'), '00:30')
})

test('shiftDateKst moves the day forward and backward in KST', () => {
  assert.equal(shiftDateKst('2026-06-25', 1), '2026-06-26')
  assert.equal(shiftDateKst('2026-06-25', -2), '2026-06-23')
})
