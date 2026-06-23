import assert from 'node:assert/strict'
import test from 'node:test'

import { shareMeetingMinutes } from '../src/lib/minutes.js'

function createStorage() {
  return {
    getItem() {
      return null
    },
    setItem() {},
    removeItem() {},
  }
}

test('shareMeetingMinutes posts recipients and idempotency key to the meeting minutes share API', async () => {
  globalThis.localStorage = createStorage()

  let requestUrl = ''
  let requestOptions = null
  globalThis.fetch = async (url, options) => {
    requestUrl = String(url)
    requestOptions = options
    return new Response(JSON.stringify({
      success: true,
      data: { meetingId: 'meeting-1', status: 'SHARED' },
      message: null,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const result = await shareMeetingMinutes('meeting-1', {
    recipientUserIds: ['user-1', 'user-2'],
    subject: '회의록 공유',
    body: '본문',
    idempotencyKey: '00000000-0000-4000-8000-000000000000',
  })

  assert.equal(requestUrl, '/api/v1/meetings/meeting-1/minutes/share')
  assert.equal(requestOptions.method, 'POST')
  assert.deepEqual(JSON.parse(requestOptions.body), {
    recipientUserIds: ['user-1', 'user-2'],
    subject: '회의록 공유',
    body: '본문',
    idempotencyKey: '00000000-0000-4000-8000-000000000000',
  })
  assert.deepEqual(result, { meetingId: 'meeting-1', status: 'SHARED' })
})
