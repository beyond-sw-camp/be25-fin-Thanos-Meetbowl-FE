import assert from 'node:assert/strict'
import test from 'node:test'

import { buildMinutesPdfFileName } from '../src/lib/minutes-pdf.js'

test('buildMinutesPdfFileName creates a safe Korean PDF filename', () => {
  assert.equal(buildMinutesPdfFileName('  주간 / 배포: 회의  '), '주간 배포 회의.pdf')
})

test('buildMinutesPdfFileName falls back when the title is empty or invalid', () => {
  assert.equal(buildMinutesPdfFileName(''), '회의록.pdf')
  assert.equal(buildMinutesPdfFileName('///'), '회의록.pdf')
})
