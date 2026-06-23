import assert from 'node:assert/strict'
import test from 'node:test'

import { compareByDistanceTo, compareByEpochAsc, toEpochMs } from '../src/utils/dateTime.js'

test('toEpochMs는 정상 ISO는 epoch ms로, 빈/비정상 값은 null로 돌려준다', () => {
  assert.equal(toEpochMs('2026-06-26T00:00:00Z'), Date.parse('2026-06-26T00:00:00Z'))
  assert.equal(toEpochMs(''), null)
  assert.equal(toEpochMs(null), null)
  assert.equal(toEpochMs(undefined), null)
  assert.equal(toEpochMs('not-a-date'), null)
})

test('compareByEpochAsc는 빠른 시각이 앞, 비정상 값은 항상 뒤로 보낸다', () => {
  const items = [
    { id: 'late', at: '2026-07-01T00:00:00Z' },
    { id: 'bad', at: 'nope' },
    { id: 'early', at: '2026-06-20T00:00:00Z' },
    { id: 'empty', at: '' },
  ]
  const order = [...items].sort((a, b) => compareByEpochAsc(a.at, b.at)).map((x) => x.id)
  // 정상 값은 오름차순(early < late), 비정상(bad/empty)은 뒤쪽에 모인다.
  assert.deepEqual(order.slice(0, 2), ['early', 'late'])
  assert.deepEqual(order.slice(2).sort(), ['bad', 'empty'])
})

test('compareByDistanceTo는 기준 시각(now)에 가까운 것부터 정렬한다(과거·미래 무관)', () => {
  const now = Date.parse('2026-06-23T00:00:00Z')
  const compare = compareByDistanceTo(now)
  const items = [
    { id: 'far-future', at: '2026-07-10T00:00:00Z' }, // +17일
    { id: 'near-past', at: '2026-06-20T00:00:00Z' }, //  -3일
    { id: 'near-future', at: '2026-06-26T00:00:00Z' }, // +3일
    { id: 'far-past', at: '2026-05-01T00:00:00Z' }, // -53일
  ]
  const order = [...items].sort((a, b) => compare(a.at, b.at)).map((x) => x.id)
  // 거리 오름차순: 과거든 미래든 |at - now| 가 작은 순.
  assert.deepEqual(order, ['near-past', 'near-future', 'far-future', 'far-past'])
})

test('compareByDistanceTo는 비정상 값을 맨 뒤로 보낸다', () => {
  const now = Date.parse('2026-06-23T00:00:00Z')
  const compare = compareByDistanceTo(now)
  const items = [
    { id: 'bad', at: null },
    { id: 'ok', at: '2026-06-24T00:00:00Z' },
  ]
  const order = [...items].sort((a, b) => compare(a.at, b.at)).map((x) => x.id)
  assert.deepEqual(order, ['ok', 'bad'])
})
