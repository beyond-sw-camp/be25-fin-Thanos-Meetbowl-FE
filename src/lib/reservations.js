import { getJson, patchJson, postJson } from './api-client'

function query(params = {}) {
  const q = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    q.set(key, value)
  }
  const queryString = q.toString()
  return queryString ? `?${queryString}` : ''
}

// 회의실 목록(예약 화면용, 사용자/관리자 공용 엔드포인트, PageResponse)
export function getRooms(params = {}) {
  return getJson(`/meeting-rooms${query(params)}`)
}

// 회의실 예약 타임라인. from/to는 필수이며 UTC ISO-8601, [from, to) 반개구간 겹침 조회.
export function getRoomReservations({ from, to, siteId, buildingId } = {}) {
  return getJson(`/meeting-rooms/reservations${query({ from, to, siteId, buildingId })}`)
}

// 내 회의실 예약 (role: all | host | invited)
export function getMyReservations(role = 'all') {
  return getJson(`/meeting-rooms/reservations/me${query({ role })}`)
}

// 내 회의 목록 (role: all | host | invited). 모든 상태 포함, from/to는 scheduledAt 범위(UTC ISO).
export function getMeetings({ role = 'all', from, to } = {}) {
  return getJson(`/meetings${query({ role, from, to })}`)
}

// 회의 상세. 주최자/참석자/Admin만 조회 가능(그 외 403). 참석자/검토자/내용 등 전체 정보 포함.
export function getMeeting(meetingId) {
  return getJson(`/meetings/${meetingId}`, { skipForbiddenHandler: true })
}

// 예약(회의) 생성. 충돌 시 백엔드가 409 MEETING_ROOM_ALREADY_RESERVED 반환.
export function createMeeting(payload) {
  return postJson('/meetings', payload)
}

// 예약(회의) 수정. 주최자만 가능. 생성과 동일 필드(참석자·검토자 전체 교체).
// 회의실 충돌 시 409 MEETING_ROOM_ALREADY_RESERVED, 사용제한 회의실은 MEETING_ROOM_UNAVAILABLE.
export function updateMeeting(meetingId, payload) {
  return patchJson(`/meetings/${meetingId}`, payload)
}

// 예약(회의) 취소. 주최자만 가능, soft cancel(상태 CANCELLED).
export function cancelMeeting(meetingId) {
  return postJson(`/meetings/${meetingId}/cancel`)
}
