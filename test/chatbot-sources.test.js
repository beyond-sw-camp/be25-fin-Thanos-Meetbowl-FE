import assert from 'node:assert/strict'
import test from 'node:test'

import { formatChatbotSourceLabel } from '../src/lib/chatbot-sources.js'


test('출처 제목을 축약하지 않고 모두 표시한다', () => {
  const label = formatChatbotSourceLabel([
    { title: 'openai-harmony.pdf', displayOrder: 2 },
    { title: 'gpt-oss-safeguard-guide.pdf', displayOrder: 1 },
  ])

  assert.equal(
    label,
    '참고한 자료: gpt-oss-safeguard-guide.pdf, openai-harmony.pdf',
  )
})


test('같은 출처 제목은 한 번만 표시한다', () => {
  const label = formatChatbotSourceLabel([
    { title: 'guide.pdf' },
    { title: 'guide.pdf' },
  ])

  assert.equal(label, '참고한 자료: guide.pdf')
})


test('출처가 없으면 빈 문자열을 반환한다', () => {
  assert.equal(formatChatbotSourceLabel([]), '')
})
