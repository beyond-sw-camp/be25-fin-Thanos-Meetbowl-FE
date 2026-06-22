const FEEDBACK_TYPES = new Set([
  'DECISION_REMINDER',
  'DUPLICATE_DISCUSSION',
  'RESOLVED_TOPIC',
])

export const MAX_REALTIME_FEEDBACK_ITEMS = 50

/**
 * LiveKit DataChannel의 feedback.generated UI 이벤트를 화면 상태 모델로 정규화한다.
 * 서버 내부 Redis Stream Envelope(meeting.feedback.generated)는 이 경로에서 받지 않는다.
 */
export function parseFeedbackPayload(payload, context = {}) {
  if (!payload || payload.eventType !== 'feedback.generated') return null

  const feedbackId = normalizeUuid(payload.feedbackId)
  const meetingId = normalizeUuid(payload.meetingId)
  const sessionId = normalizeUuid(payload.sessionId)
  const feedbackType = String(payload.feedbackType || '').trim()
  const message = typeof payload.message === 'string' ? payload.message.trim() : ''
  const generatedAt = normalizeIsoDateTime(payload.generatedAt)

  if (!feedbackId || !meetingId || !sessionId) return null
  if (!FEEDBACK_TYPES.has(feedbackType)) return null
  if (!message || message.length > 500 || !generatedAt) return null
  if (!Array.isArray(payload.sources)) return null

  const expectedMeetingId = String(context.meetingId || '').trim()
  const expectedSessionId = String(context.sessionId || '').trim()
  if (expectedMeetingId && meetingId !== expectedMeetingId) return null
  if (expectedSessionId && sessionId !== expectedSessionId) return null

  return {
    eventType: 'feedback.generated',
    feedbackId,
    meetingId,
    sessionId,
    feedbackType,
    message,
    sources: payload.sources.map(normalizeSource).filter(Boolean),
    generatedAt,
    generatedAtMs: Date.parse(generatedAt),
  }
}

/**
 * 새 피드백을 추가하고 feedbackId 재전송을 무시한다.
 * 장시간 회의에서도 브라우저 상태가 무한히 커지지 않도록 최근 항목만 유지한다.
 */
export function upsertFeedback(
  feedbackMap,
  payload,
  context = {},
  maxItems = MAX_REALTIME_FEEDBACK_ITEMS,
) {
  const feedback = parseFeedbackPayload(payload, context)
  if (!feedback || feedbackMap.has(feedback.feedbackId)) return feedbackMap

  const next = new Map(feedbackMap)
  next.set(feedback.feedbackId, feedback)

  const limit = Math.max(1, Number.isInteger(maxItems) ? maxItems : MAX_REALTIME_FEEDBACK_ITEMS)
  while (next.size > limit) {
    const oldest = sortedFeedbacks(next).at(-1)
    if (!oldest) break
    next.delete(oldest.feedbackId)
  }

  return next
}

export function sortedFeedbacks(feedbackMap) {
  return [...feedbackMap.values()].sort((left, right) => {
    if (left.generatedAtMs !== right.generatedAtMs) {
      return right.generatedAtMs - left.generatedAtMs
    }
    return right.feedbackId.localeCompare(left.feedbackId)
  })
}

function normalizeSource(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null

  const minutesId = normalizeUuid(source.minutesId)
  const meetingId = normalizeUuid(source.meetingId)
  if (!minutesId || !meetingId) return null

  return {
    minutesId,
    meetingId,
    title: normalizeText(source.title),
    meetingDate: normalizeDate(source.meetingDate),
    snippet: normalizeText(source.snippet),
  }
}

function normalizeUuid(value) {
  const normalized = String(value || '').trim().toLowerCase()
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(normalized)
    ? normalized
    : ''
}

function normalizeIsoDateTime(value) {
  const normalized = String(value || '').trim()
  const hasTimezone = /(Z|[+-]\d{2}:\d{2})$/i.test(normalized)
  if (!hasTimezone || !Number.isFinite(Date.parse(normalized))) return ''
  return normalized
}

function normalizeDate(value) {
  const normalized = String(value || '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : ''
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}
