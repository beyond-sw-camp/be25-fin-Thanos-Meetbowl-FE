const SENSITIVE_KEY_PATTERN =
  /(password|passwordHash|passwd|pwd|token|secret|api[-_]?key|authorization|credential|refresh|bearer|jwt|mailBody|비밀번호|토큰|인증|시크릿|메일본문)/i

const SENSITIVE_TEXT_PATTERNS = [
  /(bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi,
  /("(?:password|passwordHash|passwd|pwd|token|secret|apiKey|accessToken|refreshToken|authorization|resetToken|jwt)"\s*:\s*")[^"]*(")/gi,
]

const INTERNAL_FIELD_SET = new Set([
  'id',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'modifiedAt',
  'lastModifiedAt',
  'version',
  'createdBy',
  'updatedBy',
])

const USER_RELATED_ACTION_TYPES = new Set([
  'USER_CREATE',
  'USER_CREATED',
  'USER_UPDATE',
  'USER_UPDATED',
  'USER_DELETE',
  'USER_DELETED',
  'USER_STATUS_CHANGE',
  'USER_STATUS_CHANGED',
  'USER_ACTIVATE',
  'USER_DEACTIVATE',
  'USER_LOCK',
  'USER_UNLOCK',
  'PASSWORD_RESET',
  'USER_PASSWORD_RESET',
  'USER_PASSWORD_INITIALIZE',
  'ADMIN_PASSWORD_RESET',
])

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
  USER_CREATED: '회원 생성',
  USER_UPDATE: '회원 수정',
  USER_UPDATED: '회원 수정',
  USER_DELETE: '회원 삭제',
  USER_DELETED: '회원 삭제',
  USER_STATUS_CHANGE: '회원 상태 변경',
  USER_STATUS_CHANGED: '회원 상태 변경',
  USER_ACTIVATE: '회원 상태 변경',
  USER_DEACTIVATE: '회원 상태 변경',
  USER_LOCK: '회원 상태 변경',
  USER_UNLOCK: '회원 상태 변경',
  PASSWORD_RESET: '회원 비밀번호 초기화',
  USER_PASSWORD_RESET: '회원 비밀번호 초기화',
  USER_PASSWORD_INITIALIZE: '회원 비밀번호 초기화',
  ADMIN_PASSWORD_RESET: '회원 비밀번호 초기화',
  USER_PASSWORD_RESET_REQUEST: '비밀번호 재설정 요청',
  ORGANIZATION_MEMBER_EXCEL_IMPORT: '조직/회원 엑셀 업로드',
  ORGANIZATION_MEMBER_EXCEL_DOWNLOAD: '조직/회원 엑셀 다운로드',
  ORGANIZATION_EXCEL_IMPORT: '조직/회원 엑셀 업로드',
  ORGANIZATION_EXCEL_DOWNLOAD: '조직/회원 엑셀 다운로드',
  ORGANIZATION_CREATE: '조직 생성',
  ORGANIZATION_UPDATE: '조직 수정',
  ORGANIZATION_STATUS_CHANGE: '조직 상태 변경',
  AFFILIATE_CREATE: '조직 생성',
  AFFILIATE_UPDATE: '조직 수정',
  AFFILIATE_DELETE: '조직 삭제',
  AFFILIATE_STATUS_CHANGE: '조직 상태 변경',
  AFFILIATE_UPDATE_STATUS: '조직 상태 변경',
  DEPARTMENT_CREATE: '부서 생성',
  DEPARTMENT_UPDATE: '부서 수정',
  DEPARTMENT_DELETE: '부서 삭제',
  DEPARTMENT_STATUS_CHANGE: '부서 상태 변경',
  DEPARTMENT_UPDATE_STATUS: '부서 상태 변경',
  TEAM_CREATE: '팀 생성',
  TEAM_UPDATE: '팀 수정',
  TEAM_DELETE: '팀 삭제',
  TEAM_STATUS_CHANGE: '팀 상태 변경',
  TEAM_UPDATE_STATUS: '팀 상태 변경',
  POSITION_CREATE: '직급 생성',
  POSITION_UPDATE: '직급 수정',
  POSITION_DELETE: '직급 삭제',
  POSITION_STATUS_CHANGE: '직급 상태 변경',
  POSITION_UPDATE_STATUS: '직급 상태 변경',
  MEETING_ROOM_CREATE: '회의실 생성',
  MEETING_ROOM_UPDATE: '회의실 수정',
  MEETING_ROOM_DELETE: '회의실 삭제',
  MEETING_ROOM_STATUS_CHANGE: '회의실 상태 변경',
  RETENTION_POLICY_UPDATE: '회의록 보관 정책 수정',
  MAIL_POLICY_UPDATE: '메일 정책 수정',
  MAIL_RETENTION_POLICY_UPDATE: '메일 보관 정책 수정',
}

const ACTION_SUFFIX_LABELS = [
  ['STATUS_CHANGED', '\uc0c1\ud0dc \ubcc0\uacbd'],
  ['STATUS_CHANGE', '\uc0c1\ud0dc \ubcc0\uacbd'],
  ['UPDATE_STATUS', '\uc0c1\ud0dc \ubcc0\uacbd'],
  ['PASSWORD_INITIALIZE', '\ube44\ubc00\ubc88\ud638 \ucd08\uae30\ud654'],
  ['PASSWORD_RESET', '\ube44\ubc00\ubc88\ud638 \ucd08\uae30\ud654'],
  ['DOWNLOAD', '\ub2e4\uc6b4\ub85c\ub4dc'],
  ['IMPORT', '\uc5c5\ub85c\ub4dc'],
  ['EXPORT', '\ub2e4\uc6b4\ub85c\ub4dc'],
  ['APPROVED', '\uc2b9\uc778'],
  ['APPROVE', '\uc2b9\uc778'],
  ['REJECTED', '\uac70\uc808'],
  ['REJECT', '\uac70\uc808'],
  ['CREATED', '\uc0dd\uc131'],
  ['CREATE', '\uc0dd\uc131'],
  ['UPDATED', '\uc218\uc815'],
  ['UPDATE', '\uc218\uc815'],
  ['DELETED', '\uc0ad\uc81c'],
  ['DELETE', '\uc0ad\uc81c'],
]

const ACTION_SUBJECT_LABELS = {
  USER_PASSWORD_RESET_REQUEST: '\ube44\ubc00\ubc88\ud638 \uc7ac\uc124\uc815 \uc694\uccad',
  USER_PASSWORD_RESET: '\ud68c\uc6d0 \ube44\ubc00\ubc88\ud638 \ucd08\uae30\ud654',
  PASSWORD_RESET_REQUEST: '\ube44\ubc00\ubc88\ud638 \uc7ac\uc124\uc815 \uc694\uccad',
  PASSWORD_RESET: '\ube44\ubc00\ubc88\ud638 \ucd08\uae30\ud654',
  ORGANIZATION_MEMBER_EXCEL: '\uc870\uc9c1/\ud68c\uc6d0 \uc5d1\uc140',
  ORGANIZATION_EXCEL: '\uc870\uc9c1/\ud68c\uc6d0 \uc5d1\uc140',
  MAIL_RETENTION_POLICY: '\uba54\uc77c \ubcf4\uad00 \uc815\ucc45',
  RETENTION_POLICY: '\ubcf4\uad00 \uc815\ucc45',
  MEETING_ROOM: '\ud68c\uc758\uc2e4',
  AFFILIATE: '\uc870\uc9c1',
  DEPARTMENT: '\ubd80\uc11c',
  TEAM: '\ud300',
  POSITION: '\uc9c1\uae09',
  ORGANIZATION: '\uc870\uc9c1',
  USER: '\ud68c\uc6d0',
  AUTH: '\uc778\uc99d',
  ADMIN_PERMISSION: '\uad00\ub9ac\uc790 \uad8c\ud55c',
}

const ACTION_TOKEN_LABELS = {
  USER: '\ud68c\uc6d0',
  PASSWORD: '\ube44\ubc00\ubc88\ud638',
  RESET: '\uc7ac\uc124\uc815',
  REQUEST: '\uc694\uccad',
  ORGANIZATION: '\uc870\uc9c1',
  MEMBER: '\ud68c\uc6d0',
  EXCEL: '\uc5d1\uc140',
  MAIL: '\uba54\uc77c',
  RETENTION: '\ubcf4\uad00',
  POLICY: '\uc815\ucc45',
  MEETING: '\ud68c\uc758',
  ROOM: '\uc2e4',
  AFFILIATE: '\uc870\uc9c1',
  DEPARTMENT: '\ubd80\uc11c',
  TEAM: '\ud300',
  POSITION: '\uc9c1\uae09',
  STATUS: '\uc0c1\ud0dc',
  CHANGE: '\ubcc0\uacbd',
  AUTH: '\uc778\uc99d',
  ADMIN: '\uad00\ub9ac\uc790',
  PERMISSION: '\uad8c\ud55c',
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
  inboxRetentionDays: '보관 기간',
  autoDeleteEnabled: '자동 삭제',
  meetingStartReminderMinutes: '회의 시작 전 알림',
  minutesReviewReminderMinutes: '회의록 미검토 알림',
  fileName: '파일명',
  message: '실패 사유',
  failureReason: '실패 사유',
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
  { value: 'AFFILIATE_STATUS_CHANGE', label: '조직 상태 변경' },
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
  { value: 'RETENTION_POLICY_UPDATE', label: '회의록 보관 정책 수정' },
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
  const normalized = normalizeActionCode(actionType)
  if (!normalized) return '-'

  return ACTION_TYPE_LABELS[normalized] || buildActionTypeLabel(normalized)
}

export function formatTargetTypeLabel(targetType) {
  return TARGET_TYPE_LABELS[targetType] || targetType || '-'
}

export function isUserRelatedAuditAction(actionType) {
  return USER_RELATED_ACTION_TYPES.has(actionType)
}

export function getAuditActionDisplay(log) {
  if (log?.actionLabel) return formatAuditActionText(log.actionLabel, log?.actionType)
  if (log?.displayTitle) return formatAuditActionText(log.displayTitle, log?.actionType)
  return formatActionTypeLabel(log?.actionType)
}

export function getAuditTargetTypeDisplay(log) {
  if (log?.targetTypeLabel) return sanitizeSensitiveText(String(log.targetTypeLabel))
  return formatTargetTypeLabel(log?.targetType)
}

export function getAuditDisplayTitle(log) {
  if (log?.displayTitle) return formatAuditActionText(log.displayTitle, log?.actionType)
  if (log?.actionLabel) return formatAuditActionText(log.actionLabel, log?.actionType)
  return formatActionTypeLabel(log?.actionType)
}

export function getAuditTargetLoginId(log = {}) {
  const fallbackTarget = isComparableObject(log.target) ? log.target : null
  return (
    normalizePriorityValue(log.targetLoginId) ||
    normalizePriorityValue(log.targetUserLoginId) ||
    normalizePriorityValue(fallbackTarget?.loginId) ||
    '-'
  )
}

export function getAuditTargetName(log = {}) {
  const fallbackTarget = isComparableObject(log.target) ? log.target : null
  return (
    normalizePriorityValue(log.targetName) ||
    normalizePriorityValue(log.targetUserName) ||
    normalizePriorityValue(log.targetDisplayName) ||
    normalizePriorityValue(fallbackTarget?.name) ||
    '-'
  )
}

export function getAuditActorIp(log = {}) {
  return (
    normalizePriorityValue(log.actorIp) ||
    normalizePriorityValue(log.operatorIp) ||
    normalizePriorityValue(log.clientIp) ||
    normalizePriorityValue(log.ipAddress) ||
    normalizePriorityValue(log.requestIp) ||
    '-'
  )
}

export function getAuditDisplayChangeItems(log, options = {}) {
  if (Array.isArray(log?.displayChangeItems) && log.displayChangeItems.length) {
    // BE 표시용 작업 내용이 있으면 FE fallback보다 우선해서 그대로 렌더링한다.
    return log.displayChangeItems
      .map((item, index) => normalizeDisplayChangeItem(item, index))
      .filter(Boolean)
  }

  const summaryChanges = summarizeAuditLogChanges(log?.beforeSnapshot, log?.afterSnapshot, {
    ...options,
    actionType: log?.actionType,
    result: log?.result,
  })
  if (summaryChanges.length) {
    return summaryChanges.map((change, index) => ({
      key: change.key || `change-${index}`,
      label: change.label || '작업 내용',
      text:
        change.value !== undefined ? change.value : `${change.before} → ${change.after}`,
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
        .filter(([key]) => !isSensitiveKey(key))
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

  if (isExcelRelatedAction(options?.actionType)) {
    return summarizeExcelChangeItems(after, options)
  }

  if (!isComparableObject(before) || !isComparableObject(after)) {
    return []
  }

  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  const changes = []

  // 과거 raw snapshot fallback에서도 내부 필드와 민감정보는 기본 화면에서 숨긴다.
  for (const key of keys) {
    if (isSensitiveKey(key) || isInternalField(key)) continue

    const beforeValue = before[key]
    const afterValue = after[key]
    if (
      formatComparisonValue(beforeValue, key, options) ===
      formatComparisonValue(afterValue, key, options)
    ) {
      continue
    }

    const beforeDisplay = formatDisplayValue(beforeValue, key, options)
    const afterDisplay = formatDisplayValue(afterValue, key, options)
    if (beforeDisplay === '-' && afterDisplay === '-') continue

    changes.push({
      key,
      label: FIELD_LABELS[key] || key,
      before: beforeDisplay,
      after: afterDisplay,
      beforeTitle: formatDebugValue(beforeValue, key),
      afterTitle: formatDebugValue(afterValue, key),
    })
  }

  return changes
}

export function extractAuditLogTargetDisplay(log = {}, beforeSnapshot = null, afterSnapshot = null) {
  const before = sanitizeSnapshot(beforeSnapshot)
  const after = sanitizeSnapshot(afterSnapshot)

  const loginId =
    normalizePriorityValue(getAuditTargetLoginId(log)) ||
    pickSnapshotValue(after, 'loginId') ||
    pickSnapshotValue(before, 'loginId') ||
    '-'

  const targetName =
    normalizePriorityValue(getAuditTargetName(log)) ||
    pickSnapshotValue(after, 'name') ||
    pickSnapshotValue(before, 'name') ||
    '-'

  return {
    loginId: formatDisplayValue(loginId, 'loginId'),
    name: formatDisplayValue(targetName, 'name'),
    rawTargetId: log?.targetId ? String(log.targetId) : '',
  }
}

function normalizeDisplayChangeItem(item, index) {
  if (!item || typeof item !== 'object') return null
  if (isInternalField(item.label)) return null

  const label = sanitizeSensitiveText(String(item.label || '작업 내용'))
  const text = buildDisplayChangeItemText(item, label)
  if (!text) return null

  return {
    key: `${label}-${index}`,
    label,
    text,
    title: '',
  }
}

function buildDisplayChangeItemText(item, label = '') {
  if (isSensitiveKey(label)) {
    return '***'
  }

  const hasBeforeAfter = item.beforeValue !== undefined || item.afterValue !== undefined
  if (hasBeforeAfter) {
    const before = formatDisplayValue(item.beforeValue)
    const after = formatDisplayValue(item.afterValue)
    if (before === '-' && after === '-') return ''
    return `${before} → ${after}`
  }

  if (item.value !== undefined && item.value !== null && item.value !== '') {
    return formatDisplayValue(item.value, label)
  }

  return ''
}

function buildSnapshotFallbackItems(log, options) {
  const preferredSnapshot =
    sanitizeSnapshot(log?.afterSnapshot) ?? sanitizeSnapshot(log?.beforeSnapshot) ?? null

  if (isComparableObject(preferredSnapshot)) {
    const items = Object.entries(preferredSnapshot)
      .filter(([key]) => !isSensitiveKey(key) && !isInternalField(key))
      .map(([key, value], index) => ({
        key: `${key}-${index}`,
        label: FIELD_LABELS[key] || key,
        text: formatDisplayValue(value, key, options),
        title: formatDebugValue(value, key),
      }))
      .filter((item) => item.text && item.text !== '-')

    if (items.length) return items
  }

  const fallbackItems = []
  if (log?.result) {
    fallbackItems.push({
      key: 'result',
      label: '작업 결과',
      text: formatAuditResultLabel(log.result),
      title: '',
    })
  }
  if (log?.reason) {
    fallbackItems.push({
      key: 'reason',
      label: '실패 사유',
      text: formatDisplayValue(log.reason),
      title: '',
    })
  }
  return fallbackItems.filter((item) => item.text && item.text !== '-')
}

function summarizeExcelChangeItems(snapshot, options) {
  if (!isComparableObject(snapshot)) return []

  const items = []
  addSummaryItem(items, 'fileName', '파일명', snapshot.fileName, options)
  addSummaryItem(
    items,
    'result',
    '작업 결과',
    options?.result ? formatAuditResultLabel(options.result) : null,
    options,
  )
  addSummaryItem(
    items,
    'message',
    '실패 사유',
    snapshot.message || snapshot.failureReason,
    options,
  )
  addSummaryItem(items, 'errorCount', '오류 건수', snapshot.errorCount, options)

  if (isComparableObject(snapshot.result)) {
    const processedCount = [
      'createdAffiliates',
      'updatedAffiliates',
      'createdDepartments',
      'updatedDepartments',
      'createdTeams',
      'updatedTeams',
      'createdPositions',
      'updatedPositions',
      'createdUsers',
      'updatedUsers',
    ].reduce((sum, key) => sum + Number(snapshot.result[key] || 0), 0)

    addSummaryItem(items, 'processedCount', '처리 건수', processedCount || null, options)
  }

  return items
}

function addSummaryItem(items, key, label, value, options) {
  const text = formatDisplayValue(value, key, options)
  if (!text || text === '-') return

  items.push({
    key,
    label,
    value: text,
    beforeTitle: '',
    afterTitle: '',
  })
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
          .filter(([entryKey]) => !isSensitiveKey(entryKey) && !isInternalField(entryKey))
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
      .filter(([entryKey]) => !isSensitiveKey(entryKey) && !isInternalField(entryKey))
      .map(
        ([entryKey, entryValue]) =>
          `${FIELD_LABELS[entryKey] || entryKey}: ${formatDisplayValue(entryValue, entryKey, options)}`,
      )
      .filter(Boolean)
    return compactItems.length ? compactItems.join(', ') : '-'
  }

  const normalized = `${value}`.trim()
  if (!normalized) return '-'

  if (VALUE_LABELS[normalized] !== undefined) return VALUE_LABELS[normalized]

  if (isRetentionDayField(key) && /^\d+(\.\d+)?$/.test(normalized)) {
    return `${Number(normalized)}일`
  }

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
  if (isInternalField(key)) return null

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
  if (!/^\d{10,13}(\.\d+)?$/.test(value)) return false
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
    String(text),
  )
}

function pickSnapshotValue(snapshot, key) {
  if (!isComparableObject(snapshot)) return null

  const value = snapshot[key]
  if (value === null || value === undefined || value === '') return null
  return isSensitiveKey(key) || isInternalField(key) ? null : value
}

function normalizePriorityValue(value) {
  if (value === null || value === undefined) return ''
  const normalized = String(value).trim()
  return normalized && normalized !== '-' ? normalized : ''
}

function formatAuditActionText(primaryValue, fallbackActionType) {
  const primaryText = normalizePriorityValue(primaryValue)
  if (primaryText) {
    const normalizedPrimary = normalizeActionCode(primaryText)
    if (normalizedPrimary) {
      return formatActionTypeLabel(normalizedPrimary)
    }

    return sanitizeSensitiveText(primaryText)
  }

  const normalizedFallback = normalizeActionCode(fallbackActionType)
  if (normalizedFallback) {
    return formatActionTypeLabel(normalizedFallback)
  }

  return sanitizeSensitiveText(String(primaryValue))
}

function normalizeActionCode(value) {
  if (value === null || value === undefined) return ''
  const normalized = String(value).trim()
  return /^[A-Z0-9_]+$/.test(normalized) ? normalized : ''
}

function buildActionTypeLabel(actionType) {
  for (const [suffix, suffixLabel] of ACTION_SUFFIX_LABELS) {
    if (!actionType.endsWith(`_${suffix}`)) continue

    const subjectCode = actionType.slice(0, -(`_${suffix}`).length)
    const subjectLabel =
      ACTION_TYPE_LABELS[subjectCode] ||
      ACTION_SUBJECT_LABELS[subjectCode] ||
      formatActionSubjectLabel(subjectCode)

    if (!subjectLabel || subjectLabel === '-') {
      return suffixLabel
    }

    return `${subjectLabel} ${suffixLabel}`
  }

  return formatActionSubjectLabel(actionType)
}

function formatActionSubjectLabel(actionCode) {
  if (!actionCode) return '-'
  if (ACTION_SUBJECT_LABELS[actionCode]) return ACTION_SUBJECT_LABELS[actionCode]

  const parts = actionCode
    .split('_')
    .map((part) => ACTION_SUBJECT_LABELS[part] || ACTION_TOKEN_LABELS[part] || part)
    .filter(Boolean)

  return parts.length ? parts.join(' ') : actionCode
}

function isSensitiveKey(key) {
  return typeof key === 'string' && SENSITIVE_KEY_PATTERN.test(key)
}

function isInternalField(key) {
  return typeof key === 'string' && INTERNAL_FIELD_SET.has(key)
}

function isRetentionDayField(key) {
  return key === 'retentionDays' || key === 'inboxRetentionDays'
}

function isExcelRelatedAction(actionType) {
  return (
    actionType === 'ORGANIZATION_MEMBER_EXCEL_IMPORT' ||
    actionType === 'ORGANIZATION_MEMBER_EXCEL_DOWNLOAD' ||
    actionType === 'ORGANIZATION_EXCEL_IMPORT' ||
    actionType === 'ORGANIZATION_EXCEL_DOWNLOAD'
  )
}
