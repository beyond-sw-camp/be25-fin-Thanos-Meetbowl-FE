const CAPTION_STATUSES = new Set(['STREAMING', 'FINALIZED'])

export function parseCaptionPayload(payload) {
  if (!payload || payload.eventType !== 'caption.updated') return null

  const segmentId = String(payload.segmentId || '').trim()
  const text = selectCaptionText(payload)
  if (!segmentId || !text) return null

  return {
    eventType: 'caption.updated',
    meetingId: String(payload.meetingId || ''),
    sessionId: String(payload.sessionId || ''),
    segmentId,
    sequence: finiteNumber(payload.sequence),
    status: CAPTION_STATUSES.has(payload.status) ? payload.status : 'STREAMING',
    language: normalizeLanguage(payload.language ?? payload.sourceLanguage),
    text,
    startedAtMs: finiteNumber(payload.startedAtMs) ?? 0,
    endedAtMs: finiteNumber(payload.endedAtMs),
    updatedAt: String(payload.updatedAt || ''),
  }
}

export function upsertCaption(captionMap, payload) {
  const caption = parseCaptionPayload(payload)
  if (!caption) return captionMap

  const next = new Map(captionMap)
  const previous = next.get(caption.segmentId)
  if (previous?.status === 'FINALIZED' && caption.status !== 'FINALIZED') {
    return next
  }
  next.set(caption.segmentId, {
    ...previous,
    ...caption,
  })
  return next
}

export function sortedCaptions(captionMap) {
  return [...captionMap.values()].sort((left, right) => {
    if (left.sequence !== null && right.sequence !== null) {
      return left.sequence - right.sequence
    }
    if (left.sequence !== null) return -1
    if (right.sequence !== null) return 1
    if (left.startedAtMs !== right.startedAtMs) {
      return left.startedAtMs - right.startedAtMs
    }
    return left.segmentId.localeCompare(right.segmentId)
  })
}

export function selectCaptionText(payload) {
  const candidates = [payload.text, payload.sourceText, payload.sourceTranscript]
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue
    const normalized = candidate.trim()
    if (normalized) return normalized
  }
  return ''
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function normalizeLanguage(value) {
  return value === 'ko' || value === 'en' ? value : 'unknown'
}
