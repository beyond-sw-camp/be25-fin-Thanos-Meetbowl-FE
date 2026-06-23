import assert from 'node:assert/strict'
import test from 'node:test'

import {
  formatRetentionPeriod,
  fromRetentionDays,
  toRetentionDays,
  validateRetentionPeriod,
} from '../src/lib/admin-mail-retention-policy-format.js'

test('retention period converts years and months into retention days', () => {
  // 저장 요청 직전에는 드롭다운 선택값이 retentionDays 정수로 합쳐져야 한다.
  assert.equal(toRetentionDays(0, 0, 1), 7)
  assert.equal(toRetentionDays(0, 1, 0), 30)
  assert.equal(toRetentionDays(0, 6, 0), 180)
  assert.equal(toRetentionDays(1, 0, 0), 365)
  assert.equal(toRetentionDays(2, 0, 0), 730)
  assert.equal(toRetentionDays(10, 0, 0), 3650)
})

test('retention days convert into the closest years and months for display', () => {
  // GET 응답값은 다시 년/개월/주 드롭다운 초기값으로 풀어 써야 한다.
  assert.deepEqual(fromRetentionDays(7), { years: 0, months: 0, weeks: 1 })
  assert.deepEqual(fromRetentionDays(30), { years: 0, months: 1, weeks: 0 })
  assert.deepEqual(fromRetentionDays(180), { years: 0, months: 6, weeks: 0 })
  assert.deepEqual(fromRetentionDays(365), { years: 1, months: 0, weeks: 0 })
  assert.deepEqual(fromRetentionDays(3649), { years: 10, months: 0, weeks: 0 })
})

test('retention period validation rejects empty and overflowing ranges', () => {
  // 0년 0개월 0주와 10년 초과 조합은 화면에서 저장되기 전에 차단해야 한다.
  assert.equal(validateRetentionPeriod(0, 0, 0), '보관 기간은 1일 이상 3650일 이하여야 합니다.')
  assert.equal(validateRetentionPeriod(10, 0, 1), '보관 기간은 1일 이상 3650일 이하여야 합니다.')
  assert.equal(validateRetentionPeriod(1, 0, 0), '')
  assert.equal(validateRetentionPeriod(0, 6, 0), '')
  assert.equal(validateRetentionPeriod(0, 0, 1), '')
})

test('retention period text is formatted in years and months', () => {
  // helper text와 현재 적용값은 같은 포맷터를 기준으로 노출한다.
  assert.equal(formatRetentionPeriod(1, 0, 0), '1년 0개월 0주')
  assert.equal(formatRetentionPeriod(0, 6, 2), '0년 6개월 2주')
})
