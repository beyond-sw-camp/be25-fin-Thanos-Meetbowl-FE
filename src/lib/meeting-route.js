import { myMeetings } from '../data/mockData'

const defaultMeetingId = myMeetings.find((meeting) => meeting.status === 'live')?.id || myMeetings[0]?.id || ''
const MEETING_EARLY_JOIN_WINDOW_MINUTES = 15

/**
 * mock 화면 여러 곳에서 회의 입장 링크를 일관되게 만들기 위한 helper다.
 *
 * 회의 상세/알림/대시보드처럼 meetingId를 직접 들고 있지 않은 화면은 현재 진행 중 회의로 fallback한다.
 */
export function meetingRoute(meetingId = defaultMeetingId) {
  return meetingId ? `/app/meeting/${meetingId}` : '/app/meetings'
}

/**
 * 게스트가 로그인 없이 회의 화면으로 들어갈 수 있는 공개 링크다.
 *
 * 내부 사용자용 `/app/meeting/:meetingId`와 분리해, 공유 버튼에서 바로 복사할 수 있게 한다.
 */
export function guestMeetingRoute(meetingId) {
  return meetingId ? `/guest/meeting/${meetingId}` : '/join'
}

function parseScheduledAt(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  const timestamp = date.getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

export function getMeetingJoinBlockedMessage(scheduledAt) {
  const scheduledAtMs = parseScheduledAt(scheduledAt)
  if (!scheduledAtMs) return ''

  const earliestJoinAtMs = scheduledAtMs - (MEETING_EARLY_JOIN_WINDOW_MINUTES * 60 * 1000)
  if (Date.now() >= earliestJoinAtMs) return ''
  return `회의 시작 ${MEETING_EARLY_JOIN_WINDOW_MINUTES}분 전부터 입장할 수 있습니다.`
}

function meetingWindowName(meetingId) {
  return `meetbowl-meeting-${meetingId || 'live'}`
}

function buildAbsoluteUrl(path) {
  if (typeof window === 'undefined') return path
  return new URL(path, window.location.origin).toString()
}

export function openMeetingWindow(meetingId = defaultMeetingId, options = {}) {
  const path = meetingRoute(meetingId)
  if (!path || typeof window === 'undefined') return false

  const blockedMessage = getMeetingJoinBlockedMessage(options.scheduledAt)
  if (blockedMessage) {
    window.alert(blockedMessage)
    return false
  }

  const currentPath = `${window.location.pathname}${window.location.search}`
  const width = Math.min(window.screen?.availWidth || 1440, 1440)
  const height = Math.min(window.screen?.availHeight || 960, 960)
  const left = Math.max(0, Math.floor(((window.screen?.availWidth || width) - width) / 2))
  const top = Math.max(0, Math.floor(((window.screen?.availHeight || height) - height) / 2))
  const popupQuery = new URLSearchParams({
    popup: '1',
    returnTo: currentPath,
    popupSession: `${Date.now()}`,
  })
  const popupPath = `${path}?${popupQuery.toString()}`
  const features = [
    'popup=yes',
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    'resizable=yes',
    'scrollbars=yes',
  ].join(',')

  const popupWindow = window.open(
    buildAbsoluteUrl(popupPath),
    meetingWindowName(meetingId),
    features,
  )

  if (!popupWindow) {
    window.location.href = path
    return false
  }

  popupWindow.focus?.()
  return true
}
