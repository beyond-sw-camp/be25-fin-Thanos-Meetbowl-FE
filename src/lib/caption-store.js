/**
 * 실시간 화상회의 중 발생하는 STT 자막 이벤트를 브라우저 상태로 관리하는 프론트엔드 저장소(Store) 모듈입니다.
 * STT 서버(meetbowl-stt)로부터 LiveKit DataChannel을 통해 수신되는 이벤트를 파싱하고 UI 렌더링에 맞게 데이터를 정제합니다.
 */

// 허용되는 자막의 상태값 집합 (스트리밍 중, 최종 확정)
const CAPTION_STATUSES = new Set(['STREAMING', 'FINALIZED'])

/**
 * [자막 페이로드 파싱]
 * 수신된 이벤트 데이터가 유효한 자막 업데이트인지 확인하고, 화면 표시 및 상태 관리에 적합한 정규화된 객체로 변환합니다.
 * @param {Object} payload 수신된 원시 이벤트 객체
 * @returns {Object|null} 유효한 자막 객체 또는 null
 */
export function parseCaptionPayload(payload) {
  if (!payload || payload.eventType !== 'caption.updated') return null

  const segmentId = String(payload.segmentId || '').trim()
  const text = selectCaptionText(payload)
  
  // 식별자나 텍스트가 없는 비정상 데이터는 무시합니다.
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
    startedAtEpochMs: finiteNumber(payload.startedAtEpochMs),
    endedAtMs: finiteNumber(payload.endedAtMs),
    publishedAtMs: finiteNumber(payload.publishedAtMs),
    updatedAt: String(payload.updatedAt || ''),
  }
}

/**
 * [자막 상태 업데이트 (Upsert)]
 * 기존 자막 맵(Map)에 새로운 자막 데이터를 병합합니다. React/Vue와 같은 프레임워크의 불변성(Immutability)을 유지하기 위해 새 Map을 반환합니다.
 * @param {Map} captionMap 기존 자막 상태 맵
 * @param {Object} payload 새로 수신된 자막 이벤트
 * @returns {Map} 업데이트된 새로운 자막 상태 맵
 */
export function upsertCaption(captionMap, payload) {
  const caption = parseCaptionPayload(payload)
  if (!caption) return captionMap // 유효하지 않은 데이터는 무시

  const next = new Map(captionMap)
  const previous = next.get(caption.segmentId)
  
  // 1. 이미 최종 확정(FINALIZED)된 세그먼트를 과거 상태(STREAMING)로 되돌리는 비정상 업데이트(네트워크 지연 등)를 차단합니다.
  if (previous?.status === 'FINALIZED' && caption.status !== 'FINALIZED') {
    return next
  }
  
  // 2. 상태 갱신: 기존 데이터를 최신 데이터로 병합하여 덮어씁니다.
  next.set(caption.segmentId, {
    ...previous,
    ...caption,
  })
  
  return next
}

/**
 * [자막 목록 정렬]
 * Map 형태로 관리되는 자막들을 화면 표시에 적합하게 시간순으로 정렬된 배열로 반환합니다.
 * 정렬 기준: 1. 시스템 발급 순번(sequence) -> 2. 발화 시작 시점(startedAtMs) -> 3. 세그먼트 ID(Fallback)
 * @param {Map} captionMap 자막 상태 맵
 * @returns {Array} 정렬된 자막 배열
 */
export function sortedCaptions(captionMap) {
  return [...captionMap.values()].sort((left, right) => {
    // 1. 서버가 부여한 시퀀스 번호를 최우선 기준으로 정렬
    if (left.sequence !== null && right.sequence !== null) {
      return left.sequence - right.sequence
    }
    // 시퀀스가 없는 경우 후순위로 밀어냄
    if (left.sequence !== null) return -1
    if (right.sequence !== null) return 1
    
    // 2. 시퀀스 번호가 같거나 없는 경우 발화 시작 시간순으로 정렬
    if (left.startedAtMs !== right.startedAtMs) {
      return left.startedAtMs - right.startedAtMs
    }
    
    // 3. 시간까지 완벽히 일치하는 예외적인 경우 식별자 알파벳순 정렬
    return left.segmentId.localeCompare(right.segmentId)
  })
}

/**
 * [최적 텍스트 선택]
 * 엔진에서 제공하는 여러 텍스트 후보군 중 화면에 표시할 가장 적합한 텍스트를 폴백(Fallback) 패턴으로 찾습니다.
 * @param {Object} payload 수신된 자막 이벤트
 * @returns {string} 표시할 텍스트 (없으면 빈 문자열)
 */
export function selectCaptionText(payload) {
  // 우선순위: 1. 가공 완료된 최적 텍스트(text) -> 2. 원문 텍스트(sourceText) -> 3. 원시 전사 텍스트(sourceTranscript)
  const candidates = [payload.text, payload.sourceText, payload.sourceTranscript]
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue
    const normalized = candidate.trim()
    if (normalized) return normalized
  }
  return ''
}

/** 타입 안정성을 위한 숫자 파싱 유틸리티 */
function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

/** 지원하는 언어 코드로의 정규화 (지원하지 않는 언어는 unknown으로 처리) */
function normalizeLanguage(value) {
  return value === 'ko' || value === 'en' ? value : 'unknown'
}
