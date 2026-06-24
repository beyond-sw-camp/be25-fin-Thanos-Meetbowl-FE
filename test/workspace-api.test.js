import assert from 'node:assert/strict'
import test from 'node:test'

import { getBackupDetail, searchBackups } from '../src/lib/workspace.js'

function createStorage() {
  return {
    getItem() { return null },
    setItem() {},
    removeItem() {},
  }
}

test('loads a backup detail by backup id', async () => {
  globalThis.localStorage = createStorage()
  let requestUrl = ''
  globalThis.fetch = async (url) => {
    requestUrl = String(url)
    return new Response(JSON.stringify({
      success: true,
      data: { backupId: 'backup-1', title: '백업 메일', body: '본문' },
      message: null,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  const result = await getBackupDetail('backup-1')

  assert.equal(requestUrl, '/api/v1/workspace/backups/backup-1')
  assert.equal(result.body, '본문')
})

test('encodes the backup mail search keyword', async () => {
  globalThis.localStorage = createStorage()
  let requestUrl = ''
  globalThis.fetch = async (url) => {
    requestUrl = String(url)
    return new Response(JSON.stringify({ success: true, data: [], message: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  await searchBackups('전략 회의')

  assert.equal(requestUrl, '/api/v1/workspace/backups/search?keyword=%EC%A0%84%EB%9E%B5+%ED%9A%8C%EC%9D%98')
})
