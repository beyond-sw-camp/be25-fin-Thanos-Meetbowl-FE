const SENSITIVE_KEY_PATTERN =
  /(password|passwordHash|passwd|pwd|token|secret|api[-_]?key|authorization|credential|refresh|bearer)/i

const SENSITIVE_TEXT_PATTERNS = [
  /(bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi,
  /("(?:password|passwordHash|passwd|pwd|token|secret|apiKey|accessToken|refreshToken|authorization)"\s*:\s*")[^"]*(")/gi,
]

const ACTION_TYPE_LABELS = {
  USER_CREATE: '회원 생성',
  USER_UPDATE: '회원 수정',
  USER_STATUS_CHANGE: '회원 상태 변경',
  USER_PASSWORD_RESET: '비밀번호 초기화',
  ORGANIZATION_CREATE: '조직 생성',
  ORGANIZATION_UPDATE: '조직 수정',
  ORGANIZATION_STATUS_CHANGE: '조직 상태 변경',
  AFFILIATE_CREATE: '계열사 생성',
  AFFILIATE_UPDATE: '계열사 수정',
  AFFILIATE_STATUS_CHANGE: '계열사 상태 변경',
  DEPARTMENT_CREATE: '부서 생성',
  DEPARTMENT_UPDATE: '부서 수정',
  DEPARTMENT_STATUS_CHANGE: '부서 상태 변경',
  TEAM_CREATE: '팀 생성',
  TEAM_UPDATE: '팀 수정',
  TEAM_STATUS_CHANGE: '팀 상태 변경',
  POSITION_CREATE: '직급 생성',
  POSITION_UPDATE: '직급 수정',
  POSITION_STATUS_CHANGE: '직급 상태 변경',
  MAIL_RETENTION_POLICY_UPDATE: '메일 보관 정책 수정',
}

const TARGET_TYPE_LABELS = {
  USER: '회원',
  AFFILIATE: '계열사',
  DEPARTMENT: '부서',
  TEAM: '팀',
  POSITION: '직급',
  MAIL_RETENTION_POLICY: '메일 보관 정책',
  ORGANIZATION: '조직',
}

const FIELD_LABELS = {
  userId: '사용자 ID',
  loginId: '로그인 ID',
  name: '이름',
  email: '이메일',
  role: '권한',
  status: '상태',
  affiliateId: '계열사',
  departmentId: '부서',
  teamId: '팀',
  positionId: '직급',
  activeFrom: '활성 시작일',
  activeUntil: '활성 종료일',
  retentionDays: '보관 기간',
  autoDeleteEnabled: '자동 삭제 여부',
  meetingStartReminderMinutes: '회의 시작 전 알림',
  minutesReviewReminderMinutes: '회의록 미검토 알림',
}

const VALUE_LABELS = {
  ADMIN: '관리자',
  USER: '일반 사용자',
  ACTIVE: '활성',
  INACTIVE: '비활성',
  LOCKED: '잠김',
  SUCCESS: '성공',
  FAILED: '실패',
  FAILURE: '실패',
  true: '사용',
  false: '사용 안 함',
}

const ORGANIZATION_FIELD_FALLBACK_LABEL = '알 수 없는 항목'

export const AUDIT_ACTION_TYPE_OPTIONS = [
  { value: '', label: '전체 작업' },
  { value: 'USER_CREATE', label: '회원 생성' },
  { value: 'USER_UPDATE', label: '회원 수정' },
  { value: 'USER_STATUS_CHANGE', label: '회원 상태 변경' },
  { value: 'USER_PASSWORD_RESET', label: '비밀번호 초기화' },
  { value: 'AFFILIATE_CREATE', label: '계열사 생성' },
  { value: 'AFFILIATE_UPDATE', label: '계열사 수정' },
  { value: 'AFFILIATE_STATUS_CHANGE', label: '계열사 상태 변경' },
  { value: 'DEPARTMENT_CREATE', label: '부서 생성' },
  { value: 'DEPARTMENT_UPDATE', label: '부서 수정' },
  { value: 'DEPARTMENT_STATUS_CHANGE', label: '부서 상태 변경' },
  { value: 'TEAM_CREATE', label: '팀 생성' },
  { value: 'TEAM_UPDATE', label: '팀 수정' },
  { value: 'TEAM_STATUS_CHANGE', label: '팀 상태 변경' },
  { value: 'POSITION_CREATE', label: '직급 생성' },
  { value: 'POSITION_UPDATE', label: '직급 수정' },
  { value: 'POSITION_STATUS_CHANGE', label: '직급 상태 변경' },
  { value: 'MAIL_RETENTION_POLICY_UPDATE', label: '메일 보관 정책 수정' },
]

export const AUDIT_TARGET_TYPE_OPTIONS = [
  { value: '', label: '전체 대상' },
  { value: 'USER', label: '회원' },
  { value: 'AFFILIATE', label: '계열사' },
  { value: 'DEPARTMENT', label: '부서' },
  { value: 'TEAM', label: '팀' },
  { value: 'POSITION', label: '직급' },
  { value: 'MAIL_RETENTION_POLICY', label: '메일 보관 정책' },
]

/**
 * 감사 로그의 결과(성공/실패)를 번역된 텍스트로 변환합니다.
 * @param {string|boolean} result - 변환할 결과 값 (예: 'SUCCESS', 'FAILED')
 * @returns {string} 번역된 결과 텍스트
 */
export function formatAuditResultLabel(result) {
  return formatTranslatedValue(result)
}

/**
 * 감사 로그의 작업 유형(actionType)을 번역된 텍스트로 변환합니다.
 * @param {string} actionType - 작업 유형 코드 (예: 'USER_CREATE')
 * @returns {string} 번역된 작업 유형 텍스트
 */
export function formatActionTypeLabel(actionType) {
  return ACTION_TYPE_LABELS[actionType] || actionType || '-'
}

/**
 * 감사 로그의 대상 유형(targetType)을 번역된 텍스트로 변환합니다.
 * @param {string} targetType - 대상 유형 코드 (예: 'USER')
 * @returns {string} 번역된 대상 유형 텍스트
 */
export function formatTargetTypeLabel(targetType) {
  return TARGET_TYPE_LABELS[targetType] || targetType || '-'
}

/**
 * 스냅샷 데이터 내에 존재하는 민감한 정보(비밀번호, 토큰 등)를 마스킹 처리하여 안전한 데이터로 변환합니다.
 * @param {any} snapshot - 정제할 스냅샷 객체, 배열 또는 문자열
 * @returns {any} 민감 정보가 마스킹된 스냅샷
 */
export function sanitizeSnapshot(snapshot) {
  if (snapshot === null || snapshot === undefined || snapshot === '') return null

  if (Array.isArray(snapshot)) {
    return snapshot.map((item) => sanitizeSnapshot(item))
  }

  if (typeof snapshot === 'object') {
    return Object.fromEntries(
      Object.entries(snapshot)
        .filter(([key]) => !SENSITIVE_KEY_PATTERN.test(key))
        .map(([key, value]) => [key, sanitizeSnapshot(value)]),
    )
  }

  if (typeof snapshot === 'string') {
    return sanitizeSensitiveText(snapshot)
  }

  return snapshot
}

/**
 * 작업 전/후 스냅샷을 비교하여 어떤 필드들이 어떻게 변경되었는지 요약된 배열을 반환합니다.
 * @param {Object} beforeSnapshot - 작업 전 스냅샷
 * @param {Object} afterSnapshot - 작업 후 스냅샷
 * @param {Object} options - 추가 옵션 (참조 ID 매핑 테이블 등)
 * @returns {Array<{key: string, label: string, before: string, after: string, beforeTitle: string, afterTitle: string}>} 변경 내역 배열
 */
export function summarizeAuditLogChanges(beforeSnapshot, afterSnapshot, options = {}) {
  const before = sanitizeSnapshot(beforeSnapshot)
  const after = sanitizeSnapshot(afterSnapshot)

  if (!isComparableObject(before) || !isComparableObject(after)) {
    if (formatComparisonValue(before) === formatComparisonValue(after)) return []
    return [
      {
        key: 'value',
        label: '값',
        before: formatDisplayValue(before, '', options),
        after: formatDisplayValue(after, '', options),
        beforeTitle: formatDebugValue(before, ''),
        afterTitle: formatDebugValue(after, ''),
      },
    ]
  }

  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  const changes = []

  for (const key of keys) {
    if (SENSITIVE_KEY_PATTERN.test(key)) continue

    const beforeValue = before[key]
    const afterValue = after[key]
    if (formatComparisonValue(beforeValue) === formatComparisonValue(afterValue)) continue

    changes.push({
      key,
      label: FIELD_LABELS[key] || key,
      before: formatDisplayValue(beforeValue, key, options),
      after: formatDisplayValue(afterValue, key, options),
      beforeTitle: formatDebugValue(beforeValue, key),
      afterTitle: formatDebugValue(afterValue, key),
    })
  }

  return changes
}

/**
 * 작업 전/후 스냅샷에서 대상(Target)의 표시 이름 및 로그인 ID를 추출합니다.
 * @param {string} targetId - 대상의 고유 ID
 * @param {Object} beforeSnapshot - 작업 전 스냅샷
 * @param {Object} afterSnapshot - 작업 후 스냅샷
 * @returns {{loginId: string, name: string, rawTargetId: string}} 화면에 표시할 대상의 정보
 */
export function extractAuditLogTargetDisplay(targetId, beforeSnapshot, afterSnapshot) {
  const before = sanitizeSnapshot(beforeSnapshot)
  const after = sanitizeSnapshot(afterSnapshot)

  const loginId = pickSnapshotValue(after, 'loginId') || pickSnapshotValue(before, 'loginId') || '-'
  const targetName = pickSnapshotValue(after, 'name') || pickSnapshotValue(before, 'name') || '-'

  return {
    loginId: formatDisplayValue(loginId, 'loginId'),
    name: formatDisplayValue(targetName, 'name'),
    rawTargetId: targetId ? String(targetId) : '',
  }
}

function isComparableObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function formatDisplayValue(value, key = '', options = {}) {
  const translated = formatTranslatedValue(value, key, options)
  return truncateValue(translated)
}

function formatComparisonValue(value) {
  if (value === null || value === undefined || value === '') return '-'
  if (Array.isArray(value)) return JSON.stringify(value.map((item) => formatComparisonValue(item)))
  if (typeof value === 'object') {
    return JSON.stringify(
      Object.fromEntries(
        Object.entries(value)
          .filter(([key]) => !SENSITIVE_KEY_PATTERN.test(key))
          .map(([key, item]) => [key, formatComparisonValue(item)]),
      ),
    )
  }
  return String(formatTranslatedValue(value))
}

function formatTranslatedValue(value, key = '', options = {}) {
  if (value === null || value === undefined || value === '') return '-'

  if (typeof value === 'boolean') return VALUE_LABELS[String(value)]

  if (Array.isArray(value)) {
    if (!value.length) return '-'
    return value.map((item) => formatDisplayValue(item, key, options)).join(', ')
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }

  const normalized = `${value}`.trim()
  if (!normalized) return '-'

  if (VALUE_LABELS[normalized] !== undefined) return VALUE_LABELS[normalized]
  if (key.endsWith('At') || key.endsWith('From') || key.endsWith('Until')) return normalized

  const referenceLabel = resolveReferenceLabel(normalized, key, options)
  if (referenceLabel) return referenceLabel

  return sanitizeSensitiveText(normalized)
}

function resolveReferenceLabel(value, key, options) {
  const referenceMap = options?.referenceMaps?.[key]

  if (!referenceMap) return null
  if (!looksLikeUuid(value)) return null

  return referenceMap.get(value) || ORGANIZATION_FIELD_FALLBACK_LABEL
}

function formatDebugValue(value, key) {
  if (value === null || value === undefined || value === '') return ''
  if (!key.endsWith('Id')) return ''

  const normalized = String(value).trim()
  return looksLikeUuid(normalized) ? normalized : ''
}

function looksLikeUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

function truncateValue(value) {
  if (!value || value === '-') return '-'
  return value.length > 80 ? `${value.slice(0, 77)}...` : value
}

function sanitizeSensitiveText(text) {
  return SENSITIVE_TEXT_PATTERNS.reduce(
    (current, pattern) => current.replace(pattern, '$1***$2'),
    text,
  )
}

function pickSnapshotValue(snapshot, key) {
  if (!isComparableObject(snapshot)) return null

  const value = snapshot[key]
  if (value === null || value === undefined || value === '') return null
  return value
}
