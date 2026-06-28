import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getMeetingJoinBlockedMessage,
  guestMeetingRoute,
  meetingRoute,
  openMeetingWindow,
} from '../src/lib/meeting-route.js'

function createWindowMock({
  pathname = '/app/meetings',
  search = '?page=1',
  openResult = { focus() {} },
} = {}) {
  const alerts = []
  const openCalls = []
  const location = {
    origin: 'https://meetbowl.test',
    pathname,
    search,
    href: `${pathname}${search}`,
  }

  return {
    alerts,
    openCalls,
    window: {
      location,
      screen: { availWidth: 1600, availHeight: 1200 },
      alert(message) {
        alerts.push(message)
      },
      open(url, name, features) {
        openCalls.push({ url, name, features })
        return openResult
      },
    },
  }
}

test('meetingRoute and guestMeetingRoute fall back when meeting id is empty', () => {
  assert.equal(meetingRoute('meeting-1'), '/app/meeting/meeting-1')
  assert.equal(meetingRoute(''), '/app/meetings')
  assert.equal(guestMeetingRoute('meeting-1'), '/guest/meeting/meeting-1')
  assert.equal(guestMeetingRoute(''), '/join')
})

test('getMeetingJoinBlockedMessage returns guidance before the early join window', () => {
  const originalNow = Date.now
  Date.now = () => new Date('2026-06-25T00:00:00Z').getTime()

  assert.equal(
    getMeetingJoinBlockedMessage('2026-06-25T00:20:00Z'),
    '회의 시작 15분 전부터 입장할 수 있습니다.',
  )
  assert.equal(getMeetingJoinBlockedMessage('2026-06-25T00:10:00Z'), '')
  assert.equal(getMeetingJoinBlockedMessage('not-a-date'), '')

  Date.now = originalNow
})

test('openMeetingWindow opens centered popup with title and return path', () => {
  const originalWindow = globalThis.window
  const originalNow = Date.now
  const { window, openCalls } = createWindowMock()
  globalThis.window = window
  Date.now = () => new Date('2026-06-25T00:05:00Z').getTime()

  const opened = openMeetingWindow('meeting-1', {
    scheduledAt: '2026-06-25T00:10:00Z',
    title: '  전략 회의  ',
  })

  assert.equal(opened, true)
  assert.equal(openCalls.length, 1)
  assert.match(openCalls[0].url, /^https:\/\/meetbowl\.test\/app\/meeting\/meeting-1\?/)
  assert.match(openCalls[0].url, /popup=1/)
  assert.match(openCalls[0].url, /returnTo=%2Fapp%2Fmeetings%3Fpage%3D1/)
  assert.match(openCalls[0].url, /title=%EC%A0%84%EB%9E%B5\+%ED%9A%8C%EC%9D%98/)
  assert.equal(openCalls[0].name, 'meetbowl-meeting-meeting-1')

  globalThis.window = originalWindow
  Date.now = originalNow
})

test('openMeetingWindow alerts and stops when join is blocked', () => {
  const originalWindow = globalThis.window
  const originalNow = Date.now
  const { window, alerts, openCalls } = createWindowMock()
  globalThis.window = window
  Date.now = () => new Date('2026-06-25T00:00:00Z').getTime()

  const opened = openMeetingWindow('meeting-2', {
    scheduledAt: '2026-06-25T00:20:00Z',
  })

  assert.equal(opened, false)
  assert.equal(openCalls.length, 0)
  assert.deepEqual(alerts, ['회의 시작 15분 전부터 입장할 수 있습니다.'])

  globalThis.window = originalWindow
  Date.now = originalNow
})

test('openMeetingWindow falls back to same-tab navigation when popup is blocked', () => {
  const originalWindow = globalThis.window
  const originalNow = Date.now
  const { window } = createWindowMock({ openResult: null })
  globalThis.window = window
  Date.now = () => new Date('2026-06-25T00:05:00Z').getTime()

  const opened = openMeetingWindow('meeting-3', {
    scheduledAt: '2026-06-25T00:10:00Z',
  })

  assert.equal(opened, false)
  assert.equal(window.location.href, '/app/meeting/meeting-3')

  globalThis.window = originalWindow
  Date.now = originalNow
})
