import assert from 'node:assert/strict'
import test from 'node:test'

import {
  parseFeedbackPayload,
  sortedFeedbacks,
  upsertFeedback,
} from '../src/lib/feedback-store.js'

const meetingId = '37a44ba4-d6f9-4e91-bbb8-1e3913ad9cac'
const sessionId = '49763ddc-e696-4793-b4f1-851a37731934'

function feedbackPayload(overrides = {}) {
  return {
    eventType: 'feedback.generated',
    feedbackId: '4aff1ad9-e0ff-4848-a18e-85a309c72094',
    meetingId,
    sessionId,
    feedbackType: 'DECISION_REMINDER',
    message: '이 안건은 지난 회의에서 이미 결정되었습니다.',
    sources: [{
      minutesId: 'fdbd09e2-082c-4dcd-95bf-e15692eaf31b',
      meetingId: '744e5b8d-2f98-4d87-a8a7-b6dd661e96c9',
      title: '지난 회의',
      meetingDate: '2026-05-20',
      snippet: 'A안으로 진행하기로 결정',
      score: 0.91,
    }],
    fromSequence: 8,
    toSequence: 12,
    generatedAt: '2026-06-22T01:10:00Z',
    ...overrides,
  }
}

test('parses the LiveKit feedback.generated payload into a UI model', () => {
  const feedback = parseFeedbackPayload(feedbackPayload(), { meetingId, sessionId })

  assert.equal(feedback.feedbackType, 'DECISION_REMINDER')
  assert.equal(feedback.message, '이 안건은 지난 회의에서 이미 결정되었습니다.')
  assert.equal(feedback.sources.length, 1)
  assert.deepEqual(feedback.sources[0], {
    minutesId: 'fdbd09e2-082c-4dcd-95bf-e15692eaf31b',
    meetingId: '744e5b8d-2f98-4d87-a8a7-b6dd661e96c9',
    title: '지난 회의',
    meetingDate: '2026-05-20',
    snippet: 'A안으로 진행하기로 결정',
  })
})

test('rejects the Redis Stream envelope and malformed UI events', () => {
  assert.equal(parseFeedbackPayload(feedbackPayload({
    eventType: 'meeting.feedback.generated',
  })), null)
  assert.equal(parseFeedbackPayload(feedbackPayload({ message: ' '.repeat(5) })), null)
  assert.equal(parseFeedbackPayload(feedbackPayload({ feedbackType: 'UNKNOWN' })), null)
  assert.equal(parseFeedbackPayload(feedbackPayload({ sources: null })), null)
  assert.equal(parseFeedbackPayload(feedbackPayload({ fromSequence: 13, toSequence: 12 })), null)
  assert.equal(parseFeedbackPayload(feedbackPayload({ generatedAt: '2026-06-22T01:10:00' })), null)
})

test('rejects feedback for a different meeting or session', () => {
  const otherId = '3fa85f64-5717-4562-b3fc-2c963f66afa6'

  assert.equal(parseFeedbackPayload(feedbackPayload(), {
    meetingId: otherId,
    sessionId,
  }), null)
  assert.equal(parseFeedbackPayload(feedbackPayload(), {
    meetingId,
    sessionId: otherId,
  }), null)
})

test('deduplicates feedbackId and keeps the first accepted event', () => {
  let feedbacks = new Map()
  feedbacks = upsertFeedback(feedbacks, feedbackPayload(), { meetingId, sessionId })
  const accepted = feedbacks
  feedbacks = upsertFeedback(feedbacks, feedbackPayload({ message: '재전송된 메시지' }), {
    meetingId,
    sessionId,
  })

  assert.equal(feedbacks, accepted)
  assert.equal(feedbacks.size, 1)
  assert.equal(feedbacks.values().next().value.message, '이 안건은 지난 회의에서 이미 결정되었습니다.')
})

test('sorts newest first and evicts the oldest item at the configured limit', () => {
  const secondId = '744e5b8d-2f98-4d87-a8a7-b6dd661e96c9'
  const thirdId = 'a889573e-953c-4c4e-a77c-2ecb20970ef8'
  let feedbacks = new Map()
  feedbacks = upsertFeedback(feedbacks, feedbackPayload({
    generatedAt: '2026-06-22T01:10:00Z',
  }), {}, 2)
  feedbacks = upsertFeedback(feedbacks, feedbackPayload({
    feedbackId: secondId,
    generatedAt: '2026-06-22T01:11:00Z',
  }), {}, 2)
  feedbacks = upsertFeedback(feedbacks, feedbackPayload({
    feedbackId: thirdId,
    generatedAt: '2026-06-22T01:12:00Z',
  }), {}, 2)

  assert.deepEqual(
    sortedFeedbacks(feedbacks).map((feedback) => feedback.feedbackId),
    [thirdId, secondId],
  )
})
