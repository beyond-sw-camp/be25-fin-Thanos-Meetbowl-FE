import assert from 'node:assert/strict'
import test from 'node:test'

import { setApiClientAuthHandlers } from '../src/lib/api-client.js'
import { writeStoredAuthSession } from '../src/lib/auth-session.js'
import { getAdminAuditLogDetail, getAdminAuditLogs } from '../src/lib/admin-audit-logs.js'
import {
  extractAuditLogTargetDisplay,
  formatActionTypeLabel,
  formatAuditResultLabel,
  formatTargetTypeLabel,
  sanitizeSnapshot,
  summarizeAuditLogChanges,
} from '../src/lib/admin-audit-log-utils.js'

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
  assert.equal(formatAuditResultLabel('SUCCESS'), '성공')
  assert.equal(formatAuditResultLabel('FAILED'), '실패')
  assert.equal(formatActionTypeLabel('USER_UPDATE'), '회원 수정')
  assert.equal(formatTargetTypeLabel('MAIL_RETENTION_POLICY'), '메일 보관 정책')
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
          ['11111111-1111-4111-8111-111111111111', '경영지원부'],
          ['44444444-4444-4444-8444-444444444444', '서비스개발부'],
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
      label: '이름',
      before: '로컬 관리자',
      after: '박관리',
      beforeTitle: '',
      afterTitle: '',
    },
    {
      key: 'departmentId',
      label: '부서',
      before: '경영지원부',
      after: '서비스개발부',
      beforeTitle: '11111111-1111-4111-8111-111111111111',
      afterTitle: '44444444-4444-4444-8444-444444444444',
    },
    {
      key: 'teamId',
      label: '팀',
      before: '운영관리팀',
      after: '-',
      beforeTitle: '22222222-2222-4222-8222-222222222222',
      afterTitle: '',
    },
    {
      key: 'positionId',
      label: '직급',
      before: '대리',
      after: '과장',
      beforeTitle: '33333333-3333-4333-8333-333333333333',
      afterTitle: '55555555-5555-4555-8555-555555555555',
    },
    {
      key: 'status',
      label: '상태',
      before: '활성',
      after: '비활성',
      beforeTitle: '',
      afterTitle: '',
    },
    {
      key: 'autoDeleteEnabled',
      label: '자동 삭제 여부',
      before: '사용 안 함',
      after: '사용',
      beforeTitle: '',
      afterTitle: '',
    },
  ])
})

test('audit log change summaries fall back safely when mapping is missing', () => {
  const changes = summarizeAuditLogChanges(
    {
      affiliateId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    },
    {
      affiliateId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    },
    {
      referenceMaps: {
        affiliateId: new Map(),
      },
    },
  )

  assert.deepEqual(changes, [
    {
      key: 'affiliateId',
      label: '계열사',
      before: '알 수 없는 항목',
      after: '알 수 없는 항목',
      beforeTitle: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      afterTitle: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
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

test('audit log target display prefers snapshot loginId and name, and avoids UUID fallback', () => {
  assert.deepEqual(
    extractAuditLogTargetDisplay(
      '00000000-0000-0000-0000-000000000204',
      { loginId: 'old-admin', name: '이전 관리자' },
      { loginId: 'park-admin', name: '박관리' },
    ),
    {
      loginId: 'park-admin',
      name: '박관리',
      rawTargetId: '00000000-0000-0000-0000-000000000204',
    },
  )

  assert.deepEqual(
    extractAuditLogTargetDisplay(
      '00000000-0000-0000-0000-000000000205',
      {},
      { name: '서비스개발부' },
    ),
    {
      loginId: '-',
      name: '서비스개발부',
      rawTargetId: '00000000-0000-0000-0000-000000000205',
    },
  )
})
