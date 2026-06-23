const SENSITIVE_KEY_PATTERN =
  /(password|passwordHash|passwd|pwd|token|secret|api[-_]?key|authorization|credential|refresh|bearer)/i

const SENSITIVE_TEXT_PATTERNS = [
  /(bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi,
  /("(?:password|passwordHash|passwd|pwd|token|secret|apiKey|accessToken|refreshToken|authorization)"\s*:\s*")[^"]*(")/gi,
]

const DISPLAY_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

const DISPLAY_DATE_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const ACTION_TYPE_LABELS = {
  USER_CREATE: '회원 생성',
  USER_UPDATE: '회원 수정',
  USER_DELETE: '회원 삭제',
  USER_STATUS_CHANGE: '회원 상태 변경',
  USER_PASSWORD_RESET: '회원 비밀번호 초기화',
  USER_PASSWORD_RESET_REQUEST: '비밀번호 재설정 요청',
  ORGANIZATION_MEMBER_EXCEL_IMPORT: '조직/회원 엑셀 업로드',
  ORGANIZATION_MEMBER_EXCEL_DOWNLOAD: '조직/회원 엑셀 다운로드',
  ORGANIZATION_EXCEL_IMPORT: '조직/회원 엑셀 업로드',
  ORGANIZATION_EXCEL_DOWNLOAD: '조직/회원 엑셀 다운로드',
  ORGANIZATION_CREATE: '조직 생성',
  ORGANIZATION_UPDATE: '조직 수정',
  ORGANIZATION_STATUS_CHANGE: '조직 비활성화',
  AFFILIATE_CREATE: '조직 생성',
  AFFILIATE_UPDATE: '조직 수정',
  AFFILIATE_DELETE: '조직 삭제',
  AFFILIATE_STATUS_CHANGE: '조직 비활성화',
  DEPARTMENT_CREATE: '부서 생성',
  DEPARTMENT_UPDATE: '부서 수정',
  DEPARTMENT_DELETE: '부서 삭제',
  DEPARTMENT_STATUS_CHANGE: '부서 비활성화',
  TEAM_CREATE: '팀 생성',
  TEAM_UPDATE: '팀 수정',
  TEAM_DELETE: '팀 삭제',
  TEAM_STATUS_CHANGE: '팀 비활성화',
  POSITION_CREATE: '직급 생성',
  POSITION_UPDATE: '직급 수정',
  POSITION_DELETE: '직급 삭제',
  POSITION_STATUS_CHANGE: '직급 비활성화',
  MEETING_ROOM_CREATE: '회의실 생성',
  MEETING_ROOM_UPDATE: '회의실 수정',
  MEETING_ROOM_DELETE: '회의실 삭제',
  MEETING_ROOM_STATUS_CHANGE: '회의실 비활성화',
  RETENTION_POLICY_UPDATE: '보관 정책 수정',
  MAIL_POLICY_UPDATE: '메일 정책 수정',
  MAIL_RETENTION_POLICY_UPDATE: '메일 보관 정책 수정',
  ADMIN_PERMISSION_CREATE: '관리자 권한 생성',
  ADMIN_PERMISSION_UPDATE: '관리자 권한 수정',
  ADMIN_PERMISSION_DELETE: '관리자 권한 삭제',
}

const TARGET_TYPE_LABELS = {
  USER: '회원',
  ORGANIZATION: '조직',
  AFFILIATE: '조직',
  DEPARTMENT: '부서',
  TEAM: '팀',
  POSITION: '직급',
  MEETING_ROOM: '회의실',
  RETENTION_POLICY: '보관 정책',
  MAIL_POLICY: '메일 정책',
  MAIL_RETENTION_POLICY: '메일 보관 정책',
  ORGANIZATION_MEMBER_EXCEL: '조직/회원 엑셀',
  ORGANIZATION_EXCEL: '조직/회원 엑셀',
}

const FIELD_LABELS = {
  userId: '회원 ID',
  loginId: '로그인 ID',
  name: '이름',
  email: '이메일',
  role: '역할',
  status: '상태',
  affiliateId: '조직',
  departmentId: '부서',
  teamId: '팀',
  positionId: '직급',
  activeFrom: '활성 시작일',
  activeUntil: '활성 종료일',
  retentionDays: '보관 기간',
  autoDeleteEnabled: '자동 삭제',
  meetingStartReminderMinutes: '회의 시작 전 알림',
  minutesReviewReminderMinutes: '회의록 미검토 알림',
  fileName: '파일명',
  message: '실패 사유',
  errorCount: '오류 건수',
  requestSource: '요청 경로',
  initialPasswordChangeRequired: '초기 비밀번호 변경 필요',
  createdAffiliates: '생성 계열사 수',
  updatedAffiliates: '수정 계열사 수',
  createdDepartments: '생성 부서 수',
  updatedDepartments: '수정 부서 수',
  createdTeams: '생성 팀 수',
  updatedTeams: '수정 팀 수',
  createdPositions: '생성 직급 수',
  updatedPositions: '수정 직급 수',
  createdUsers: '생성 회원 수',
  updatedUsers: '수정 회원 수',
}

const VALUE_LABELS = {
  ADMIN: '관리자',
  USER: '회원',
  ACTIVE: '활성',
  INACTIVE: '비활성',
  LOCKED: '잠김',
  SUCCESS: '성공',
  FAILED: '실패',
  FAILURE: '실패',
  true: '예',
  false: '아니오',
}

const ORGANIZATION_FIELD_FALLBACK_LABEL = '알 수 없는 항목'
const DISPLAY_EMPTY_MESSAGE = '표시할 작업 내용이 없습니다.'

export const AUDIT_ACTION_TYPE_OPTIONS = [
  { value: '', label: '전체 작업' },
  { value: 'USER_CREATE', label: '회원 생성' },
  { value: 'USER_UPDATE', label: '회원 수정' },
  { value: 'USER_DELETE', label: '회원 삭제' },
  { value: 'USER_STATUS_CHANGE', label: '회원 상태 변경' },
  { value: 'USER_PASSWORD_RESET', label: '회원 비밀번호 초기화' },
  { value: 'ORGANIZATION_MEMBER_EXCEL_IMPORT', label: '조직/회원 엑셀 업로드' },
  { value: 'ORGANIZATION_MEMBER_EXCEL_DOWNLOAD', label: '조직/회원 엑셀 다운로드' },
  { value: 'AFFILIATE_CREATE', label: '조직 생성' },
  { value: 'AFFILIATE_UPDATE', label: '조직 수정' },
  { value: 'AFFILIATE_STATUS_CHANGE', label: '조직 비활성화' },
  { value: 'DEPARTMENT_CREATE', label: '부서 생성' },
  { value: 'DEPARTMENT_UPDATE', label: '부서 수정' },
  { value: 'DEPARTMENT_STATUS_CHANGE', label: '부서 비활성화' },
  { value: 'TEAM_CREATE', label: '팀 생성' },
  { value: 'TEAM_UPDATE', label: '팀 수정' },
  { value: 'TEAM_STATUS_CHANGE', label: '팀 비활성화' },
  { value: 'POSITION_CREATE', label: '직급 생성' },
  { value: 'POSITION_UPDATE', label: '직급 수정' },
  { value: 'POSITION_STATUS_CHANGE', label: '직급 비활성화' },
  { value: 'MAIL_RETENTION_POLICY_UPDATE', label: '메일 보관 정책 수정' },
]

export const AUDIT_TARGET_TYPE_OPTIONS = [
  { value: '', label: '전체 대상' },
  { value: 'USER', label: '회원' },
  { value: 'ORGANIZATION', label: '조직' },
  { value: 'AFFILIATE', label: '조직' },
  { value: 'DEPARTMENT', label: '부서' },
  { value: 'TEAM', label: '팀' },
  { value: 'POSITION', label: '직급' },
  { value: 'MEETING_ROOM', label: '회의실' },
  { value: 'RETENTION_POLICY', label: '보관 정책' },
  { value: 'MAIL_POLICY', label: '메일 정책' },
  { value: 'MAIL_RETENTION_POLICY', label: '메일 보관 정책' },
  { value: 'ORGANIZATION_MEMBER_EXCEL', label: '조직/회원 엑셀' },
]

export function formatAuditResultLabel(result) {
  return formatTranslatedValue(result)
}

export function formatActionTypeLabel(actionType) {
  return ACTION_TYPE_LABELS[actionType] || actionType || '-'
}

export function formatTargetTypeLabel(targetType) {
  return TARGET_TYPE_LABELS[targetType] || targetType || '-'
}

export function getAuditActionDisplay(log) {
  if (log?.actionLabel) return sanitizeSensitiveText(String(log.actionLabel))
  return formatActionTypeLabel(log?.actionType)
}

export function getAuditTargetTypeDisplay(log) {
  if (log?.targetTypeLabel) return sanitizeSensitiveText(String(log.targetTypeLabel))
  return formatTargetTypeLabel(log?.targetType)
}

export function getAuditDisplayTitle(log) {
  if (log?.displayTitle) return sanitizeSensitiveText(String(log.displayTitle))
  return getAuditActionDisplay(log)
}

export function getAuditDisplayChangeItems(log, options = {}) {
  if (Array.isArray(log?.displayChangeItems) && log.displayChangeItems.length) {
    // BE가 화면용 요약을 내려주면 FE에서 그대로 우선 사용한다.
    return log.displayChangeItems
      .map((item, index) => normalizeDisplayChangeItem(item, index))
      .filter(Boolean)
  }

  const summaryChanges = summarizeAuditLogChanges(log?.beforeSnapshot, log?.afterSnapshot, options)
  if (summaryChanges.length) {
    return summaryChanges.map((change, index) => ({
      key: change.key || `change-${index}`,
      label: change.label || '작업 내용',
      text: `${change.before} → ${change.after}`,
      title: formatChangeTitle(change.beforeTitle, change.afterTitle),
    }))
  }

  const fallbackItems = buildSnapshotFallbackItems(log, options)
  if (fallbackItems.length) return fallbackItems

  return [
    {
      key: 'empty',
      label: '작업 내용',
      text: DISPLAY_EMPTY_MESSAGE,
      title: '',
    },
  ]
}

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

export function summarizeAuditLogChanges(beforeSnapshot, afterSnapshot, options = {}) {
  const before = sanitizeSnapshot(beforeSnapshot)
  const after = sanitizeSnapshot(afterSnapshot)

  if (!isComparableObject(before) || !isComparableObject(after)) {
    if (formatComparisonValue(before) === formatComparisonValue(after)) return []
    return []
  }

  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  const changes = []

  for (const key of keys) {
    if (SENSITIVE_KEY_PATTERN.test(key)) continue

    const beforeValue = before[key]
    const afterValue = after[key]
    if (formatComparisonValue(beforeValue, key, options) === formatComparisonValue(afterValue, key, options)) continue

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

function normalizeDisplayChangeItem(item, index) {
  if (!item || typeof item !== 'object') return null

  const label = sanitizeSensitiveText(String(item.label || '작업 내용'))
  const text = buildDisplayChangeItemText(item)
  if (!text) return null

  return {
    key: `${label}-${index}`,
    label,
    text,
    title: '',
  }
}

function buildDisplayChangeItemText(item) {
  const hasBeforeAfter = item.beforeValue !== undefined || item.afterValue !== undefined
  if (hasBeforeAfter) {
    const before = formatDisplayValue(item.beforeValue)
    const after = formatDisplayValue(item.afterValue)
    return `${before} → ${after}`
  }

  if (item.value !== undefined && item.value !== null && item.value !== '') {
    return formatDisplayValue(item.value)
  }

  return ''
}

function buildSnapshotFallbackItems(log, options) {
  const preferredSnapshot =
    sanitizeSnapshot(log?.afterSnapshot) ?? sanitizeSnapshot(log?.beforeSnapshot) ?? null

  if (isComparableObject(preferredSnapshot)) {
    const items = Object.entries(preferredSnapshot)
      .filter(([key]) => !SENSITIVE_KEY_PATTERN.test(key))
      .map(([key, value], index) => ({
        key: `${key}-${index}`,
        label: FIELD_LABELS[key] || key,
        text: formatDisplayValue(value, key, options),
        title: formatDebugValue(value, key),
      }))
      .filter((item) => item.text && item.text !== '-')

    if (items.length) return items
  }

  const fallbackTexts = []
  if (log?.result) {
    fallbackTexts.push({
      key: 'result',
      label: '작업 결과',
      text: formatAuditResultLabel(log.result),
      title: '',
    })
  }
  if (log?.reason) {
    fallbackTexts.push({
      key: 'reason',
      label: '실패 사유',
      text: formatDisplayValue(log.reason),
      title: '',
    })
  }
  return fallbackTexts
}

function isComparableObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function formatDisplayValue(value, key = '', options = {}) {
  const translated = formatTranslatedValue(value, key, options)
  return truncateValue(translated)
}

function formatComparisonValue(value, key = '', options = {}) {
  if (value === null || value === undefined || value === '') return '-'
  if (Array.isArray(value)) {
    return JSON.stringify(value.map((item) => formatComparisonValue(item, key, options)))
  }
  if (typeof value === 'object') {
    return JSON.stringify(
      Object.fromEntries(
        Object.entries(value)
          .filter(([entryKey]) => !SENSITIVE_KEY_PATTERN.test(entryKey))
          .map(([entryKey, entryValue]) => [
            entryKey,
            formatComparisonValue(entryValue, entryKey, options),
          ]),
      ),
    )
  }
  return String(formatTranslatedValue(value, key, options))
}

function formatTranslatedValue(value, key = '', options = {}) {
  if (value === null || value === undefined || value === '') return '-'

  if (typeof value === 'boolean') return VALUE_LABELS[String(value)]

  if (Array.isArray(value)) {
    if (!value.length) return '-'
    return value.map((item) => formatDisplayValue(item, key, options)).join(', ')
  }

  if (typeof value === 'object') {
    const compactItems = Object.entries(value)
      .filter(([entryKey]) => !SENSITIVE_KEY_PATTERN.test(entryKey))
      .map(([entryKey, entryValue]) => `${FIELD_LABELS[entryKey] || entryKey}: ${formatDisplayValue(entryValue, entryKey, options)}`)
    return compactItems.length ? compactItems.join(', ') : '-'
  }

  const normalized = `${value}`.trim()
  if (!normalized) return '-'

  if (VALUE_LABELS[normalized] !== undefined) return VALUE_LABELS[normalized]

  const formattedDate = formatDateLikeValue(normalized, key)
  if (formattedDate) return formattedDate

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

function formatDateLikeValue(value, key) {
  if (looksLikeIsoDateTime(value)) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return isDateOnlyField(key) ? formatDateOnly(date) : DISPLAY_DATE_TIME_FORMATTER.format(date)
    }
  }

  if (looksLikeEpoch(value, key)) {
    const numeric = Number(value)
    const millis = numeric >= 1_000_000_000_000 ? numeric : numeric * 1000
    const date = new Date(millis)
    if (!Number.isNaN(date.getTime())) {
      return isDateOnlyField(key) ? formatDateOnly(date) : DISPLAY_DATE_TIME_FORMATTER.format(date)
    }
  }

  return null
}

function isDateOnlyField(key) {
  return (
    key.endsWith('From') ||
    key.endsWith('Until') ||
    key.endsWith('Date') ||
    key === 'activeFrom' ||
    key === 'activeUntil'
  )
}

function looksLikeIsoDateTime(value) {
  return value.includes('T') && (value.endsWith('Z') || /\+\d{2}:\d{2}$/.test(value))
}

function looksLikeEpoch(value, key) {
  if (!/(At|From|Until|Date|Time)$/.test(key)) return false
  if (!/^\d{10,13}$/.test(value)) return false
  return true
}

function formatDebugValue(value, key) {
  if (value === null || value === undefined || value === '') return ''
  if (!key.endsWith('Id')) return ''

  const normalized = String(value).trim()
  return looksLikeUuid(normalized) ? normalized : ''
}

function formatChangeTitle(beforeTitle, afterTitle) {
  const parts = []
  if (beforeTitle) parts.push(`이전 ID: ${beforeTitle}`)
  if (afterTitle) parts.push(`이후 ID: ${afterTitle}`)
  return parts.join('\n')
}

function formatDateOnly(date) {
  const parts = DISPLAY_DATE_FORMATTER.formatToParts(date)
  const year = parts.find((part) => part.type === 'year')?.value || ''
  const month = parts.find((part) => part.type === 'month')?.value || ''
  const day = parts.find((part) => part.type === 'day')?.value || ''
  return `${year}.${month}.${day}`
}

function looksLikeUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

function truncateValue(value) {
  if (!value || value === '-') return '-'
  return value.length > 120 ? `${value.slice(0, 117)}...` : value
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
