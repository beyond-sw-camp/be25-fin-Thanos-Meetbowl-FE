import assert from 'node:assert/strict'
import test from 'node:test'

import { setApiClientAuthHandlers } from '../src/lib/api-client.js'
import { writeStoredAuthSession } from '../src/lib/auth-session.js'
import { getAdminAuditLogDetail, getAdminAuditLogs } from '../src/lib/admin-audit-logs.js'
import {
  AUDIT_ACTION_TYPE_OPTIONS,
  AUDIT_TARGET_TYPE_OPTIONS,
  extractAuditLogTargetDisplay,
  formatActionTypeLabel,
  formatAuditResultLabel,
  formatTargetTypeLabel,
  getAuditActionDisplay,
  getAuditActorIp,
  getAuditDisplayChangeItems,
  getAuditDisplayTitle,
  getAuditTargetLoginId,
  getAuditTargetName,
  getAuditTargetTypeDisplay,
  isUserRelatedAuditAction,
  sanitizeSnapshot,
  summarizeAuditLogChanges,
} from '../src/lib/admin-audit-log-utils.js'

const K = {
  success: '성공',
  failed: '실패',
  userCreate: '회원 생성',
  userUpdate: '회원 수정',
  userDelete: '회원 삭제',
  userStatusChange: '회원 상태 변경',
  passwordReset: '회원 비밀번호 초기화',
  excelImport: '조직/회원 엑셀 업로드',
  organizationMemberExcel: '조직/회원 엑셀',
  mailRetentionPolicy: '메일 보관 정책',
  retentionPolicy: '보관 정책',
  user: '회원',
  name: '이름',
  department: '부서',
  team: '팀',
  position: '직급',
  status: '상태',
  active: '활성',
  inactive: '비활성',
  autoDelete: '자동 삭제',
  no: '아니오',
  yes: '예',
  fileName: '파일명',
  failureReason: '실패 사유',
  errorCount: '오류 건수',
  processedCount: '처리 건수',
  actionContent: '작업 내용',
}

function createStorage() {
  const values = new Map()

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null
    },
    setItem(key, value) {
      values.set(key, String(value))
    },
    removeItem(key) {
      values.delete(key)
    },
    clear() {
      values.clear()
    },
  }
}

test('admin audit log APIs send Authorization and preserve query parameters', async () => {
  globalThis.localStorage = createStorage()

  writeStoredAuthSession({
    accessToken: 'admin-audit-token',
    user: { role: 'ADMIN', name: 'Admin', loginId: 'admin' },
  })

  const requests = []

  globalThis.fetch = async (url, options) => {
    requests.push({
      url,
      method: options?.method,
      auth: options?.headers?.Authorization,
    })

    return {
      ok: true,
      async json() {
        return {
          success: true,
          data: {
            items: [],
            page: 2,
            size: 50,
            totalElements: 0,
            totalPages: 1,
            auditLogId: '00000000-0000-0000-0000-000000000111',
          },
        }
      },
    }
  }

  await getAdminAuditLogs({
    ipAddress: '203.0.113.10',
    actionType: 'USER_UPDATE',
    targetType: 'USER',
    targetId: '00000000-0000-0000-0000-000000000204',
    result: 'SUCCESS',
    from: '2026-06-01T00:00:00Z',
    to: '2026-06-13T00:00:00Z',
    page: 2,
    size: 50,
  })
  await getAdminAuditLogDetail('00000000-0000-0000-0000-000000000111')

  assert.equal(
    requests[0]?.url,
    '/api/v1/admin/audit-logs?ipAddress=203.0.113.10&actionType=USER_UPDATE&targetType=USER&targetId=00000000-0000-0000-0000-000000000204&result=SUCCESS&from=2026-06-01T00%3A00%3A00Z&to=2026-06-13T00%3A00%3A00Z&page=2&size=50',
  )
  assert.equal(requests[0]?.method, 'GET')
  assert.equal(requests[0]?.auth, 'Bearer admin-audit-token')
  assert.equal(
    requests[1]?.url,
    '/api/v1/admin/audit-logs/00000000-0000-0000-0000-000000000111',
  )
})

test('admin audit log APIs skip the global forbidden handler for 403 responses', async () => {
  globalThis.localStorage = createStorage()

  let forbiddenHandlerCalled = 0
  setApiClientAuthHandlers({
    onForbidden() {
      forbiddenHandlerCalled += 1
    },
  })

  globalThis.fetch = async () => ({
    ok: false,
    status: 403,
    async json() {
      return {
        success: false,
        error: {
          message: '접근 권한이 없습니다.',
          details: [],
        },
      }
    },
  })

  await assert.rejects(() => getAdminAuditLogs(), {
    name: 'ApiError',
    status: 403,
  })
  assert.equal(forbiddenHandlerCalled, 0)

  setApiClientAuthHandlers({})
})

test('audit log snapshot utilities mask sensitive keys and translate labels', () => {
  const sanitized = sanitizeSnapshot({
    user: 'admin01',
    password: 'plain-text-password',
    nested: {
      accessToken: 'secret-token',
      refreshToken: 'refresh-secret',
    },
    items: [{ apiKey: 'secret-key' }],
  })

  assert.deepEqual(sanitized, {
    user: 'admin01',
    nested: {},
    items: [{}],
  })
  assert.equal(formatAuditResultLabel('SUCCESS'), K.success)
  assert.equal(formatAuditResultLabel('FAILED'), K.failed)
  assert.equal(formatActionTypeLabel('USER_UPDATE'), K.userUpdate)
  assert.equal(formatActionTypeLabel('USER_DELETE'), K.userDelete)
  assert.equal(formatActionTypeLabel('USER_PASSWORD_RESET'), K.passwordReset)
  assert.equal(formatActionTypeLabel('ORGANIZATION_MEMBER_EXCEL_IMPORT'), K.excelImport)
  assert.notEqual(
    formatActionTypeLabel('USER_PASSWORD_RESET_REQUEST_APPROVE'),
    'USER_PASSWORD_RESET_REQUEST_APPROVE',
  )
  assert.notEqual(
    formatActionTypeLabel('USER_PASSWORD_RESET_REQUEST_REJECT'),
    'USER_PASSWORD_RESET_REQUEST_REJECT',
  )
  assert.equal(formatTargetTypeLabel('MAIL_RETENTION_POLICY'), K.mailRetentionPolicy)
  assert.equal(formatTargetTypeLabel('RETENTION_POLICY'), K.retentionPolicy)
  assert.equal(formatTargetTypeLabel('ORGANIZATION_MEMBER_EXCEL'), K.organizationMemberExcel)
})

test('audit log action and target display prefer backend display fields', () => {
  const log = {
    actionType: 'USER_UPDATE',
    actionLabel: `${K.userUpdate}(BE)`,
    targetType: 'USER',
    targetTypeLabel: `${K.user}(BE)`,
    displayTitle: `${K.userUpdate}(BE 제목)`,
  }

  assert.equal(getAuditActionDisplay(log), `${K.userUpdate}(BE)`)
  assert.equal(getAuditTargetTypeDisplay(log), `${K.user}(BE)`)
  assert.equal(getAuditDisplayTitle(log), `${K.userUpdate}(BE 제목)`)
})

test('audit log action display localizes raw action codes from backend fields', () => {
  const log = {
    actionType: 'USER_PASSWORD_RESET_REQUEST_APPROVE',
    actionLabel: 'USER_PASSWORD_RESET_REQUEST_APPROVE',
    displayTitle: 'USER_PASSWORD_RESET_REQUEST_APPROVE',
    targetType: 'UNKNOWN_TARGET',
  }

  assert.notEqual(getAuditActionDisplay(log), 'USER_PASSWORD_RESET_REQUEST_APPROVE')
  assert.equal(getAuditTargetTypeDisplay(log), 'UNKNOWN_TARGET')
  assert.notEqual(getAuditDisplayTitle(log), 'USER_PASSWORD_RESET_REQUEST_APPROVE')
})

test('user-related audit action helper recognizes the requested raw action types', () => {
  assert.equal(isUserRelatedAuditAction('USER_CREATE'), true)
  assert.equal(isUserRelatedAuditAction('USER_UPDATE'), true)
  assert.equal(isUserRelatedAuditAction('USER_DELETE'), true)
  assert.equal(isUserRelatedAuditAction('USER_STATUS_CHANGE'), true)
  assert.equal(isUserRelatedAuditAction('PASSWORD_RESET'), true)
  assert.equal(isUserRelatedAuditAction('MAIL_RETENTION_POLICY_UPDATE'), false)
})

test('audit log target field priority prefers direct backend fields', () => {
  const log = {
    targetLoginId: 'user7',
    targetName: '유리',
    targetUserLoginId: 'wrong-login',
    targetUserName: 'wrong-name',
    targetDisplayName: 'wrong-display',
    target: {
      loginId: 'wrong-target-login',
      name: 'wrong-target-name',
    },
  }

  assert.equal(getAuditTargetLoginId(log), 'user7')
  assert.equal(getAuditTargetName(log), '유리')
})

test('audit log target field priority falls back through legacy fields and dash', () => {
  assert.equal(
    getAuditTargetLoginId({
      targetUserLoginId: 'legacy-user',
    }),
    'legacy-user',
  )
  assert.equal(
    getAuditTargetName({
      targetDisplayName: '레거시 이름',
    }),
    '레거시 이름',
  )
  assert.equal(getAuditTargetLoginId({ target: { loginId: 'nested-user' } }), 'nested-user')
  assert.equal(getAuditTargetName({ target: { name: '중첩 이름' } }), '중첩 이름')
  assert.equal(getAuditTargetLoginId({}), '-')
  assert.equal(getAuditTargetName({}), '-')
})

test('audit log target display prefers backend target fields over snapshots', () => {
  assert.deepEqual(
    extractAuditLogTargetDisplay(
      {
        targetId: '00000000-0000-0000-0000-000000000204',
        targetLoginId: 'user7',
        targetName: '유리',
      },
      { loginId: 'old-user', name: '이전 이름' },
      { loginId: 'deleted-raw', name: '톰브스톤 이름' },
    ),
    {
      loginId: 'user7',
      name: '유리',
      rawTargetId: '00000000-0000-0000-0000-000000000204',
    },
  )
})

test('audit log target display falls back to snapshots and dash for older logs', () => {
  assert.deepEqual(
    extractAuditLogTargetDisplay(
      {
        targetId: '00000000-0000-0000-0000-000000000205',
      },
      {},
      { name: '서비스개발팀' },
    ),
    {
      loginId: '-',
      name: '서비스개발팀',
      rawTargetId: '00000000-0000-0000-0000-000000000205',
    },
  )
})

test('audit log actor IP priority prefers direct backend fields and falls back to dash', () => {
  assert.equal(
    getAuditActorIp({
      actorIp: '198.51.100.1',
      operatorIp: '198.51.100.2',
      clientIp: '198.51.100.3',
      ipAddress: '198.51.100.4',
      requestIp: '198.51.100.5',
    }),
    '198.51.100.1',
  )
  assert.equal(getAuditActorIp({ operatorIp: '198.51.100.2' }), '198.51.100.2')
  assert.equal(getAuditActorIp({ clientIp: '198.51.100.3' }), '198.51.100.3')
  assert.equal(getAuditActorIp({ ipAddress: '198.51.100.4' }), '198.51.100.4')
  assert.equal(getAuditActorIp({ requestIp: '198.51.100.5' }), '198.51.100.5')
  assert.equal(getAuditActorIp({}), '-')
})

test('audit log change summaries replace organization UUIDs with names', () => {
  const changes = summarizeAuditLogChanges(
    {
      name: '로컬 관리자',
      departmentId: '11111111-1111-4111-8111-111111111111',
      teamId: '22222222-2222-4222-8222-222222222222',
      positionId: '33333333-3333-4333-8333-333333333333',
      status: 'ACTIVE',
      autoDeleteEnabled: false,
      password: 'secret-password',
      authorization: 'Bearer old-token',
    },
    {
      name: '박관리',
      departmentId: '44444444-4444-4444-8444-444444444444',
      teamId: null,
      positionId: '55555555-5555-4555-8555-555555555555',
      status: 'INACTIVE',
      autoDeleteEnabled: true,
      password: 'new-secret-password',
      authorization: 'Bearer new-token',
    },
    {
      referenceMaps: {
        affiliateId: new Map(),
        departmentId: new Map([
          ['11111111-1111-4111-8111-111111111111', '경영지원팀'],
          ['44444444-4444-4444-8444-444444444444', '서비스개발팀'],
        ]),
        teamId: new Map([['22222222-2222-4222-8222-222222222222', '운영관리팀']]),
        positionId: new Map([
          ['33333333-3333-4333-8333-333333333333', '대리'],
          ['55555555-5555-4555-8555-555555555555', '과장'],
        ]),
      },
    },
  )

  assert.deepEqual(changes, [
    {
      key: 'name',
      label: K.name,
      before: '로컬 관리자',
      after: '박관리',
      beforeTitle: '',
      afterTitle: '',
    },
    {
      key: 'departmentId',
      label: K.department,
      before: '경영지원팀',
      after: '서비스개발팀',
      beforeTitle: '11111111-1111-4111-8111-111111111111',
      afterTitle: '44444444-4444-4444-8444-444444444444',
    },
    {
      key: 'teamId',
      label: K.team,
      before: '운영관리팀',
      after: '-',
      beforeTitle: '22222222-2222-4222-8222-222222222222',
      afterTitle: '',
    },
    {
      key: 'positionId',
      label: K.position,
      before: '대리',
      after: '과장',
      beforeTitle: '33333333-3333-4333-8333-333333333333',
      afterTitle: '55555555-5555-4555-8555-555555555555',
    },
    {
      key: 'status',
      label: K.status,
      before: K.active,
      after: K.inactive,
      beforeTitle: '',
      afterTitle: '',
    },
    {
      key: 'autoDeleteEnabled',
      label: K.autoDelete,
      before: K.no,
      after: K.yes,
      beforeTitle: '',
      afterTitle: '',
    },
  ])
})

test('audit log change summaries filter internal fields from raw fallback data', () => {
  const changes = summarizeAuditLogChanges(
    {
      retentionDays: 365,
      autoDeleteEnabled: false,
      updatedAt: 1781675159.420096,
      createdAt: 1781000000,
      version: 1,
      id: 'policy-id',
    },
    {
      retentionDays: 372,
      autoDeleteEnabled: true,
      updatedAt: 1781681227.5482714,
      createdAt: 1781000000,
      version: 2,
      id: 'policy-id',
    },
  )

  assert.deepEqual(changes, [
    {
      key: 'retentionDays',
      label: '보관 기간',
      before: '365일',
      after: '372일',
      beforeTitle: '',
      afterTitle: '',
    },
    {
      key: 'autoDeleteEnabled',
      label: K.autoDelete,
      before: K.no,
      after: K.yes,
      beforeTitle: '',
      afterTitle: '',
    },
  ])
})

test('audit log change summaries report no changes when values match after sanitizing', () => {
  const changes = summarizeAuditLogChanges(
    {
      accessToken: 'token-a',
      result: 'SUCCESS',
      status: 'ACTIVE',
    },
    {
      accessToken: 'token-b',
      result: 'SUCCESS',
      status: 'ACTIVE',
    },
  )

  assert.deepEqual(changes, [])
})

test('audit log display change items use backend display list when present', () => {
  const items = getAuditDisplayChangeItems({
    displayChangeItems: [
      {
        label: K.status,
        beforeValue: K.active,
        afterValue: K.inactive,
      },
      {
        label: K.failureReason,
        value: '필수값이 비어 있습니다.',
      },
    ],
  })

  assert.deepEqual(items, [
    {
      key: `${K.status}-0`,
      label: K.status,
      text: `${K.active} → ${K.inactive}`,
      title: '',
    },
    {
      key: `${K.failureReason}-1`,
      label: K.failureReason,
      text: '필수값이 비어 있습니다.',
      title: '',
    },
  ])
})

test('audit log display change items convert user timestamps into readable dates', () => {
  const items = getAuditDisplayChangeItems({
    actionType: 'USER_STATUS_CHANGE',
    beforeSnapshot: {
      status: 'ACTIVE',
      activeFrom: 1780531200,
      activeUntil: null,
    },
    afterSnapshot: {
      status: 'INACTIVE',
      activeFrom: 1781827200,
      activeUntil: 1782000000,
    },
  })

  assert.deepEqual(items, [
    {
      key: 'status',
      label: K.status,
      text: `${K.active} → ${K.inactive}`,
      title: '',
    },
    {
      key: 'activeFrom',
      label: '활성 시작일',
      text: '2026.06.04 → 2026.06.19',
      title: '',
    },
    {
      key: 'activeUntil',
      label: '활성 종료일',
      text: '- → 2026.06.21',
      title: '',
    },
  ])
})

test('audit log display change items summarize retention policy changes without internal fields', () => {
  const items = getAuditDisplayChangeItems({
    actionType: 'MAIL_RETENTION_POLICY_UPDATE',
    beforeSnapshot: {
      retentionDays: 365,
      autoDeleteEnabled: false,
      updatedAt: 1781675159.420096,
      version: 1,
    },
    afterSnapshot: {
      retentionDays: 372,
      autoDeleteEnabled: true,
      updatedAt: 1781681227.5482714,
      version: 2,
    },
  })

  assert.deepEqual(items, [
    {
      key: 'retentionDays',
      label: '보관 기간',
      text: '365일 → 372일',
      title: '',
    },
    {
      key: 'autoDeleteEnabled',
      label: K.autoDelete,
      text: `${K.no} → ${K.yes}`,
      title: '',
    },
  ])
})

test('audit log display change items summarize excel failure without raw json', () => {
  const items = getAuditDisplayChangeItems({
    actionType: 'ORGANIZATION_MEMBER_EXCEL_IMPORT',
    targetType: 'ORGANIZATION_MEMBER_EXCEL',
    afterSnapshot: {
      fileName: 'meetbowl_organization_members_template_v2.xlsx',
      message: '이메일은 필수입니다.',
      errorCount: 3,
      result: {
        createdUsers: 1,
        updatedUsers: 2,
      },
    },
    result: 'FAILED',
    reason: '{"message":"raw-json"}',
  })

  assert.deepEqual(items, [
    {
      key: 'fileName',
      label: K.fileName,
      text: 'meetbowl_organization_members_template_v2.xlsx',
      title: '',
    },
    {
      key: 'result',
      label: '작업 결과',
      text: K.failed,
      title: '',
    },
    {
      key: 'message',
      label: K.failureReason,
      text: '이메일은 필수입니다.',
      title: '',
    },
    {
      key: 'errorCount',
      label: K.errorCount,
      text: '3',
      title: '',
    },
    {
      key: 'processedCount',
      label: K.processedCount,
      text: '3',
      title: '',
    },
  ])
})

test('audit log display change items hide sensitive values from backend display items and raw fallback', () => {
  const backendItems = getAuditDisplayChangeItems({
    displayChangeItems: [
      { label: '토큰', value: 'Bearer secret-token' },
      { label: '비밀번호', value: '1234' },
    ],
  })

  assert.equal(backendItems[0].text.includes('secret-token'), false)
  assert.equal(backendItems[1].text.includes('1234'), false)

  const rawFallbackItems = getAuditDisplayChangeItems({
    beforeSnapshot: {
      status: 'ACTIVE',
      passwordHash: 'hash-value',
      resetToken: 'reset-token',
    },
    afterSnapshot: {
      status: 'INACTIVE',
      passwordHash: 'another-hash',
      resetToken: 'another-token',
    },
  })

  assert.deepEqual(rawFallbackItems, [
    {
      key: 'status',
      label: K.status,
      text: `${K.active} → ${K.inactive}`,
      title: '',
    },
  ])
})

test('audit log option labels are localized while keeping raw values', () => {
  assert.deepEqual(
    AUDIT_ACTION_TYPE_OPTIONS.find((option) => option.value === 'USER_UPDATE'),
    {
      value: 'USER_UPDATE',
      label: K.userUpdate,
    },
  )
  assert.deepEqual(
    AUDIT_ACTION_TYPE_OPTIONS.find(
      (option) => option.value === 'ORGANIZATION_MEMBER_EXCEL_IMPORT',
    ),
    {
      value: 'ORGANIZATION_MEMBER_EXCEL_IMPORT',
      label: K.excelImport,
    },
  )
  assert.deepEqual(
    AUDIT_TARGET_TYPE_OPTIONS.find((option) => option.value === 'ORGANIZATION_MEMBER_EXCEL'),
    {
      value: 'ORGANIZATION_MEMBER_EXCEL',
      label: K.organizationMemberExcel,
    },
  )
})
