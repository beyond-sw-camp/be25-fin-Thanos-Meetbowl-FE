import assert from 'node:assert/strict'
import test from 'node:test'

import {
  extractFileNameFromDisposition,
  previewKind,
  resolveBlobFileName,
} from '../src/lib/file-actions.js'

test('extractFileNameFromDisposition prefers UTF-8 encoded filenames', () => {
  assert.equal(
    extractFileNameFromDisposition(
      `attachment; filename*=UTF-8''%E1%84%92%E1%85%AC%E1%84%8B%E1%85%B4%E1%84%85%E1%85%A9%E1%86%A8.pdf; filename="fallback.pdf"`,
    ),
    '회의록.pdf',
  )
  assert.equal(
    extractFileNameFromDisposition('attachment; filename="minutes.pdf"'),
    'minutes.pdf',
  )
  assert.equal(extractFileNameFromDisposition(''), '')
})

test('resolveBlobFileName falls back when the header is missing', () => {
  assert.equal(
    resolveBlobFileName(
      { get(name) { return name === 'Content-Disposition' ? 'attachment; filename="report.csv"' : null } },
      'fallback.csv',
    ),
    'report.csv',
  )
  assert.equal(resolveBlobFileName({ get() { return null } }, 'fallback.csv'), 'fallback.csv')
  assert.equal(resolveBlobFileName(null, ''), 'download')
})

test('previewKind classifies image pdf text and unsupported content', () => {
  assert.equal(previewKind('image/png'), 'image')
  assert.equal(previewKind('application/pdf'), 'pdf')
  assert.equal(previewKind('text/plain; charset=utf-8'), 'text')
  assert.equal(previewKind('application/vnd.ms-excel'), 'unsupported')
})
