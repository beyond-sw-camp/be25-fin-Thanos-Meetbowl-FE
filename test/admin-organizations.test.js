import assert from 'node:assert/strict'
import test from 'node:test'

import { setApiClientAuthHandlers } from '../src/lib/api-client.js'
import { writeStoredAuthSession } from '../src/lib/auth-session.js'
import {
  buildOrganizationNameMaps,
  createAdminDepartment,
  downloadOrganizationMembersExcel,
  getAdminAffiliates,
  importOrganizationMembersExcel,
  updateAdminTeamStatus,
} from '../src/lib/admin-organizations.js'

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

test('organization APIs use the stored access token and actual affiliate list path', async () => {
  globalThis.localStorage = createStorage()

  writeStoredAuthSession({
    accessToken: 'admin-org-token',
    user: { role: 'ADMIN', name: 'Admin', loginId: 'admin' },
  })

  let requestUrl = ''
  let requestOptions = null

  globalThis.fetch = async (url, options) => {
    requestUrl = url
    requestOptions = options

    return {
      ok: true,
      async json() {
        return {
          success: true,
          data: {
            items: [],
          },
        }
      },
    }
  }

  const result = await getAdminAffiliates()

  assert.equal(requestUrl, '/api/v1/admin/organizations/affiliates')
  assert.equal(requestOptions?.method, 'GET')
  assert.equal(requestOptions?.headers?.Authorization, 'Bearer admin-org-token')
  assert.deepEqual(result, { items: [] })
})

test('organization mutation APIs send the expected request body and skip the global forbidden handler', async () => {
  globalThis.localStorage = createStorage()

  let forbiddenHandlerCalled = 0
  let requestUrl = ''
  let requestOptions = null

  setApiClientAuthHandlers({
    onForbidden() {
      forbiddenHandlerCalled += 1
    },
  })

  globalThis.fetch = async (url, options) => {
    requestUrl = url
    requestOptions = options

    return {
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
    }
  }

  await assert.rejects(
    () =>
      createAdminDepartment({
        affiliateId: '00000000-0000-0000-0000-000000000001',
        name: 'Platform',
        code: 'PLATFORM',
        status: 'ACTIVE',
        sortOrder: 2,
      }),
    {
      name: 'ApiError',
      status: 403,
    },
  )

  assert.equal(requestUrl, '/api/v1/admin/organizations/departments')
  assert.equal(requestOptions?.method, 'POST')
  assert.deepEqual(JSON.parse(requestOptions?.body || '{}'), {
    affiliateId: '00000000-0000-0000-0000-000000000001',
    name: 'Platform',
    code: 'PLATFORM',
    status: 'ACTIVE',
    sortOrder: 2,
  })
  assert.equal(forbiddenHandlerCalled, 0)

  globalThis.fetch = async (url, options) => {
    requestUrl = url
    requestOptions = options

    return {
      ok: true,
      async json() {
        return {
          success: true,
          data: {
            teamId: '00000000-0000-0000-0000-000000000010',
            departmentId: '00000000-0000-0000-0000-000000000002',
            name: 'Core',
            code: 'CORE',
            status: 'INACTIVE',
            sortOrder: 1,
          },
        }
      },
    }
  }

  const updated = await updateAdminTeamStatus(
    '00000000-0000-0000-0000-000000000010',
    'INACTIVE',
  )

  assert.equal(
    requestUrl,
    '/api/v1/admin/organizations/teams/00000000-0000-0000-0000-000000000010/status',
  )
  assert.equal(requestOptions?.method, 'PATCH')
  assert.deepEqual(JSON.parse(requestOptions?.body || '{}'), {
    status: 'INACTIVE',
  })
  assert.equal(updated.status, 'INACTIVE')

  setApiClientAuthHandlers({})
})

test('organization excel download returns blob data and prefers server filename', async () => {
  globalThis.localStorage = createStorage()

  writeStoredAuthSession({
    accessToken: 'admin-org-token',
    user: { role: 'ADMIN', name: 'Admin', loginId: 'admin' },
  })

  let requestUrl = ''
  let requestOptions = null
  const blob = new Blob(['excel'])

  globalThis.fetch = async (url, options) => {
    requestUrl = url
    requestOptions = options

    return {
      ok: true,
      headers: new Headers({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="organization-members.xlsx"',
      }),
      async blob() {
        return blob
      },
    }
  }

  const result = await downloadOrganizationMembersExcel()

  assert.equal(requestUrl, '/api/v1/admin/organization-members/excel')
  assert.equal(requestOptions?.method, 'GET')
  assert.equal(result.fileName, 'organization-members.xlsx')
  assert.equal(result.blob, blob)
})

test('organization excel import sends multipart file field with xlsx file', async () => {
  globalThis.localStorage = createStorage()

  const file = new File(['excel'], 'organization-members.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  let requestUrl = ''
  let requestOptions = null

  globalThis.fetch = async (url, options) => {
    requestUrl = url
    requestOptions = options

    return {
      ok: true,
      async json() {
        return {
          success: true,
          data: {
            createdAffiliates: 1,
            updatedAffiliates: 2,
            createdDepartments: 3,
            updatedDepartments: 4,
            createdTeams: 5,
            updatedTeams: 6,
            createdPositions: 7,
            updatedPositions: 8,
            createdUsers: 9,
            updatedUsers: 10,
          },
        }
      },
    }
  }

  const result = await importOrganizationMembersExcel(file)
  const sentFile = requestOptions?.body?.get('file')

  assert.equal(requestUrl, '/api/v1/admin/organization-members/excel/import')
  assert.equal(requestOptions?.method, 'POST')
  assert.equal(sentFile?.name, 'organization-members.xlsx')
  assert.equal(sentFile?.type, file.type)
  assert.equal(result.createdUsers, 9)
  assert.equal(result.updatedUsers, 10)
})

test('organization helpers build UUID to name maps from master data', () => {
  const maps = buildOrganizationNameMaps({
    affiliates: [{ affiliateId: 'a1', name: '서비스' }],
    departments: [{ departmentId: 'd1', name: '경영지원' }],
    teams: [{ teamId: 't1', name: '운영관리' }],
    positions: [{ positionId: 'p1', name: '과장' }],
  })

  assert.equal(maps.affiliateId.get('a1'), '서비스')
  assert.equal(maps.departmentId.get('d1'), '경영지원')
  assert.equal(maps.teamId.get('t1'), '운영관리')
  assert.equal(maps.positionId.get('p1'), '과장')
})
