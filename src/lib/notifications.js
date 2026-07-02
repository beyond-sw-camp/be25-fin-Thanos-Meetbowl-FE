import { getJson, patchJson } from './api-client'
import { readStoredAuthSession } from './auth-session'

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api/v1'

function query(params = {}) {
  const q = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    q.set(key, value)
  }
  const queryString = q.toString()
  return queryString ? `?${queryString}` : ''
}

// 알림 목록(page는 1-base, size 1~100). 화면 배지용 unreadCount를 함께 반환한다.
export function getNotifications({ page = 1, size = 20 } = {}) {
  return getJson(`/notifications${query({ page, size })}`)
}

// 단건 읽음 처리. { notification, unreadCount } 반환.
export function markNotificationRead(notificationId) {
  return patchJson(`/notifications/${notificationId}/read`)
}

// 전체 읽음 처리. { updatedCount, unreadCount } 반환.
export function markAllNotificationsRead() {
  return patchJson('/notifications/read-all')
}

/**
 * 실시간 알림 SSE 구독.
 *
 * EventSource는 커스텀 헤더(Authorization)를 붙일 수 없어, 백엔드 규약대로 access token을 ?token= 쿼리로 넘긴다.
 * 'notification' 이벤트(JSON 본문)마다 onNotification을 호출하고, 정리(close)용 EventSource를 반환한다.
 * 토큰이 없거나 환경이 EventSource를 지원하지 않으면 null을 반환한다(전달 실패는 다음 목록 조회로 보강).
 */
export function subscribeNotifications({ onNotification, onError } = {}) {
  const token = readStoredAuthSession()?.accessToken
  if (!token || typeof window === 'undefined' || typeof window.EventSource === 'undefined') {
    return null
  }

  const base = API_BASE_URL.replace(/\/+$/, '')
  const source = new EventSource(`${base}/notifications/subscribe${query({ token })}`)

  source.addEventListener('notification', (event) => {
    try {
      onNotification?.(JSON.parse(event.data))
    } catch {
      // 본문 파싱 실패는 무시한다 — 다음 접속 시 목록 조회로 보강된다.
    }
  })

  if (onError) source.addEventListener('error', onError)
  return source
}

// 알림 종류별 이동할 목록 페이지. 특정 회의/회의록 상세(딥링크)가 아니라, 그 알림과 관련된 목록 화면으로 보낸다.
// 회의 알림은 수신자가 참석자라 "나의 참석 회의", 회의록 알림은 수신자가 검토자라 "내 회의록"으로 간다.
const ROUTE_BY_TYPE = {
  MAIL_RECEIVED: '/app/mail',
  MAIL_SHARED: '/app/mail',
  COMMUNITY_POST_COMMENTED: '/app/community',
  COMMUNITY_POST_LIKED: '/app/community',
  COMMUNITY_COMMENT_LIKED: '/app/community',
  MEETING_REMINDER: '/app/meetings',
  MEETING_UPDATED: '/app/my-attending',
  MEETING_CANCELLED: '/app/meetings',
  MINUTES_REVIEW_REQUEST: '/app/minutes',
  MINUTES_REVIEW_REMINDER: '/app/minutes',
}

/**
 * 알림 클릭 시 이동할 목록 페이지 경로.
 *
 * 알림 종류(type)로 목적지를 정하고, 알 수 없는 종류면 연결 리소스 종류(resourceType)로 추정한다.
 */
export function notificationRoute(notification) {
  const { type, resourceType } = notification || {}
  if (type && ROUTE_BY_TYPE[type]) return ROUTE_BY_TYPE[type]
  if (resourceType === 'MAIL' || String(type || '').includes('MAIL')) return '/app/mail'
  if (resourceType === 'COMMUNITY_POST' || String(type || '').includes('COMMUNITY')) return '/app/community'
  if (resourceType === 'MEETING_MINUTES') return '/app/minutes'
  if (resourceType === 'MEETING') return '/app/my-attending'
  return '/app/dashboard'
}

// createdAt(ISO-8601 UTC)을 '5분 전' 형태의 상대 시간 문자열로 변환한다.
export function formatNotificationTime(createdAt) {
  if (!createdAt) return ''
  const time = new Date(createdAt).getTime()
  if (Number.isNaN(time)) return ''

  const diffMin = Math.floor((Date.now() - time) / 60000)
  if (diffMin < 1) return '방금 전'
  if (diffMin < 60) return `${diffMin}분 전`

  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}시간 전`

  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) return `${diffDay}일 전`

  return new Date(createdAt).toLocaleDateString('ko-KR')
}
