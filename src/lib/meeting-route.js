import { myMeetings } from '../data/mockData'

const defaultMeetingId = myMeetings.find((meeting) => meeting.status === 'live')?.id || myMeetings[0]?.id || ''

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

function meetingWindowName(meetingId) {
  return `meetbowl-meeting-${meetingId || 'live'}`
}

function buildAbsoluteUrl(path) {
  if (typeof window === 'undefined') return path
  return new URL(path, window.location.origin).toString()
}

export function openMeetingWindow(meetingId = defaultMeetingId) {
  const path = meetingRoute(meetingId)
  if (!path || typeof window === 'undefined') return false

  const currentPath = `${window.location.pathname}${window.location.search}`
  const width = Math.min(window.screen?.availWidth || 1440, 1440)
  const height = Math.min(window.screen?.availHeight || 960, 960)
  const left = Math.max(0, Math.floor(((window.screen?.availWidth || width) - width) / 2))
  const top = Math.max(0, Math.floor(((window.screen?.availHeight || height) - height) / 2))
  const popupPath = `${path}${path.includes('?') ? '&' : '?'}popup=1&returnTo=${encodeURIComponent(currentPath)}`
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
