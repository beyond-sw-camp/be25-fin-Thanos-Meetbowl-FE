import assert from 'node:assert/strict'
import test from 'node:test'

import { requestPasswordReset } from '../src/lib/auth.js'

test('requestPasswordReset trims loginId and email before sending', async () => {
  let capturedUrl = ''
  let capturedBody = null

  globalThis.fetch = async (url, options) => {
    capturedUrl = String(url)
    capturedBody = JSON.parse(options.body)

    return new Response(
      JSON.stringify({
        success: true,
        data: null,
        message: 'accepted',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }

  await requestPasswordReset({
    loginId: ' user1 ',
    email: ' user1@local.meetbowl ',
  })

  assert.match(capturedUrl, /\/auth\/password-reset\/request$/)
  assert.deepEqual(capturedBody, {
    loginId: 'user1',
    email: 'user1@local.meetbowl',
  })
})
