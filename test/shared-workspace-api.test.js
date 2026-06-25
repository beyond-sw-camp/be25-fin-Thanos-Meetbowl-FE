import assert from 'node:assert/strict'
import test from 'node:test'

import { deleteSharedWorkspace } from '../src/lib/shared-workspace.js'

test('deletes the selected shared workspace through the owner-protected API', async () => {
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} }
  let requestUrl = ''
  let requestMethod = ''
  globalThis.fetch = async (url, options) => {
    requestUrl = String(url)
    requestMethod = options.method
    return new Response(JSON.stringify({ success: true, data: null, message: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  await deleteSharedWorkspace('space-1')

  assert.equal(requestUrl, '/api/v1/shared-workspaces/space-1')
  assert.equal(requestMethod, 'DELETE')
})
