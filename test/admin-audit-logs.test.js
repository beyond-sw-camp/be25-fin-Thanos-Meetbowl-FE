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
  getAuditActionDisplay,
  getAuditDisplayChangeItems,
  getAuditDisplayTitle,
  getAuditTargetTypeDisplay,
  sanitizeSnapshot,
  summarizeAuditLogChanges,
} from '../src/lib/admin-audit-log-utils.js'

const K = {
  success: '\uC131\uACF5',
  failed: '\uC2E4\uD328',
  userUpdate: '\uD68C\uC6D0 \uC218\uC815',
  userDelete: '\uD68C\uC6D0 \uC0AD\uC81C',
  excelImport: '\uC870\uC9C1/\uD68C\uC6D0 \uC5D1\uC140 \uC5C5\uB85C\uB4DC',
  organizationMemberExcel: '\uC870\uC9C1/\uD68C\uC6D0 \uC5D1\uC140',
  mailRetentionPolicy: '\uBA54\uC77C \uBCF4\uAD00 \uC815\uCC45',
  user: '\uD68C\uC6D0',
  name: '\uC774\uB984',
  department: '\uBD80\uC11C',
  team: '\uD300',
  position: '\uC9C1\uAE09',
  status: '\uC0C1\uD0DC',
  active: '\uD65C\uC131',
  inactive: '\uBE44\uD65C\uC131',
  autoDelete: '\uC790\uB3D9 \uC0AD\uC81C',
  no: '\uC544\uB2C8\uC624',
  yes: '\uC608',
  unknownItem: '\uC54C \uC218 \uC5C6\uB294 \uD56D\uBAA9',
  fileName: '\uD30C\uC77C\uBA85',
  failureReason: '\uC2E4\uD328 \uC0AC\uC720',
  errorCount: '\uC624\uB958 \uAC74\uC218',
  actionContent: '\uC791\uC5C5 \uB0B4\uC6A9',
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
          message: '\uC811\uADFC \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.',
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
  assert.equal(formatActionTypeLabel('ORGANIZATION_MEMBER_EXCEL_IMPORT'), K.excelImport)
  assert.equal(formatTargetTypeLabel('MAIL_RETENTION_POLICY'), K.mailRetentionPolicy)
  assert.equal(formatTargetTypeLabel('ORGANIZATION_MEMBER_EXCEL'), K.organizationMemberExcel)
})

test('audit log action and target display prefer backend display fields', () => {
  const log = {
    actionType: 'USER_UPDATE',
    actionLabel: `${K.userUpdate}(BE)`,
    targetType: 'USER',
    targetTypeLabel: `${K.user}(BE)`,
    displayTitle: `${K.userUpdate}(BE \uC81C\uBAA9)`,
  }

  assert.equal(getAuditActionDisplay(log), `${K.userUpdate}(BE)`)
  assert.equal(getAuditTargetTypeDisplay(log), `${K.user}(BE)`)
  assert.equal(getAuditDisplayTitle(log), `${K.userUpdate}(BE \uC81C\uBAA9)`)
})

test('audit log action and target display fall back safely when mapping is missing', () => {
  const log = {
    actionType: 'UNKNOWN_ACTION',
    targetType: 'UNKNOWN_TARGET',
  }

  assert.equal(getAuditActionDisplay(log), 'UNKNOWN_ACTION')
  assert.equal(getAuditTargetTypeDisplay(log), 'UNKNOWN_TARGET')
  assert.equal(getAuditDisplayTitle(log), 'UNKNOWN_ACTION')
})

test('audit log change summaries replace organization UUIDs with names', () => {
  const changes = summarizeAuditLogChanges(
    {
      name: '\uB85C\uCEEC \uAD00\uB9AC\uC790',
      departmentId: '11111111-1111-4111-8111-111111111111',
      teamId: '22222222-2222-4222-8222-222222222222',
      positionId: '33333333-3333-4333-8333-333333333333',
      status: 'ACTIVE',
      autoDeleteEnabled: false,
      password: 'secret-password',
      authorization: 'Bearer old-token',
    },
    {
      name: '\uBC15\uAD00\uB9AC',
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
          ['11111111-1111-4111-8111-111111111111', '\uACBD\uC601\uC9C0\uC6D0\uD300'],
          ['44444444-4444-4444-8444-444444444444', '\uC11C\uBE44\uC2A4\uAC1C\uBC1C\uD300'],
        ]),
        teamId: new Map([['22222222-2222-4222-8222-222222222222', '\uC6B4\uC601\uAD00\uB9AC\uD300']]),
        positionId: new Map([
          ['33333333-3333-4333-8333-333333333333', '\uB300\uB9AC'],
          ['55555555-5555-4555-8555-555555555555', '\uACFC\uC7A5'],
        ]),
      },
    },
  )

  assert.deepEqual(changes, [
    {
      key: 'name',
      label: K.name,
      before: '\uB85C\uCEEC \uAD00\uB9AC\uC790',
      after: '\uBC15\uAD00\uB9AC',
      beforeTitle: '',
      afterTitle: '',
    },
    {
      key: 'departmentId',
      label: K.department,
      before: '\uACBD\uC601\uC9C0\uC6D0\uD300',
      after: '\uC11C\uBE44\uC2A4\uAC1C\uBC1C\uD300',
      beforeTitle: '11111111-1111-4111-8111-111111111111',
      afterTitle: '44444444-4444-4444-8444-444444444444',
    },
    {
      key: 'teamId',
      label: K.team,
      before: '\uC6B4\uC601\uAD00\uB9AC\uD300',
      after: '-',
      beforeTitle: '22222222-2222-4222-8222-222222222222',
      afterTitle: '',
    },
    {
      key: 'positionId',
      label: K.position,
      before: '\uB300\uB9AC',
      after: '\uACFC\uC7A5',
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

  assert.deepEqual(changes, [])
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
      { loginId: 'old-admin', name: '\uC774\uC804 \uAD00\uB9AC\uC790' },
      { loginId: 'park-admin', name: '\uBC15\uAD00\uB9AC' },
    ),
    {
      loginId: 'park-admin',
      name: '\uBC15\uAD00\uB9AC',
      rawTargetId: '00000000-0000-0000-0000-000000000204',
    },
  )

  assert.deepEqual(
    extractAuditLogTargetDisplay(
      '00000000-0000-0000-0000-000000000205',
      {},
      { name: '\uC11C\uBE44\uC2A4\uAC1C\uBC1C\uD300' },
    ),
    {
      loginId: '-',
      name: '\uC11C\uBE44\uC2A4\uAC1C\uBC1C\uD300',
      rawTargetId: '00000000-0000-0000-0000-000000000205',
    },
  )
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
        value: '\uD544\uC218\uAC12\uC774 \uBE44\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.',
      },
    ],
  })

  assert.deepEqual(items, [
    {
      key: `${K.status}-0`,
      label: K.status,
      text: `${K.active} \u2192 ${K.inactive}`,
      title: '',
    },
    {
      key: `${K.failureReason}-1`,
      label: K.failureReason,
      text: '\uD544\uC218\uAC12\uC774 \uBE44\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.',
      title: '',
    },
  ])
})

test('audit log display change items convert user timestamps into readable dates', () => {
  const items = getAuditDisplayChangeItems({
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
      text: `${K.active} \u2192 ${K.inactive}`,
      title: '',
    },
    {
      key: 'activeFrom',
      label: '\uD65C\uC131 \uC2DC\uC791\uC77C',
      text: '2026.06.04 \u2192 2026.06.19',
      title: '',
    },
    {
      key: 'activeUntil',
      label: '\uD65C\uC131 \uC885\uB8CC\uC77C',
      text: '- \u2192 2026.06.21',
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
      message: '\uC774\uBA54\uC77C\uC740 \uD544\uC218\uC785\uB2C8\uB2E4.',
      errorCount: 3,
    },
    result: 'FAILED',
    reason: '{"message":"raw-json"}',
  })

  assert.deepEqual(items, [
    {
      key: 'fileName-0',
      label: K.fileName,
      text: 'meetbowl_organization_members_template_v2.xlsx',
      title: '',
    },
    {
      key: 'message-1',
      label: K.failureReason,
      text: '\uC774\uBA54\uC77C\uC740 \uD544\uC218\uC785\uB2C8\uB2E4.',
      title: '',
    },
    {
      key: 'errorCount-2',
      label: K.errorCount,
      text: '3',
      title: '',
    },
  ])
})
