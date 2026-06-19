import { deleteJson, getJson, patchJson, postJson } from './api-client.js'

const adminRequestOptions = {
  // 관리자 화면은 자체적으로 403 상태를 처리하므로 전역 권한 핸들러는 건너뛴다.
  skipForbiddenHandler: true,
}

function buildQuery(params = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    query.append(key, value)
  }
  const queryString = query.toString()
  return queryString ? `?${queryString}` : ''
}

// 회의실 목록은 사용자/관리자 공용 엔드포인트(PageResponse)를 그대로 사용한다.
export function getMeetingRooms(params = {}) {
  return getJson(`/meeting-rooms${buildQuery(params)}`, adminRequestOptions)
}

export function createMeetingRoom(payload) {
  return postJson('/admin/meeting-rooms', payload, adminRequestOptions)
}

export function updateMeetingRoom(roomId, payload) {
  return patchJson(`/admin/meeting-rooms/${roomId}`, payload, adminRequestOptions)
}

// 운영 가능 여부는 정보 수정과 분리된 전용 엔드포인트로 변경한다.
export function changeMeetingRoomAvailability(roomId, isAvailable) {
  return patchJson(
    `/admin/meeting-rooms/${roomId}/availability`,
    { isAvailable },
    adminRequestOptions,
  )
}

export function deleteMeetingRoom(roomId) {
  return deleteJson(`/admin/meeting-rooms/${roomId}`, adminRequestOptions)
}

export function getMeetingSites() {
  return getJson('/admin/meeting-sites', adminRequestOptions)
}

export function getMeetingBuildings(siteId) {
  return getJson(`/admin/meeting-buildings${buildQuery({ siteId })}`, adminRequestOptions)
}

export function createMeetingBuilding(payload) {
  return postJson('/admin/meeting-buildings', payload, adminRequestOptions)
}

export function updateMeetingBuilding(buildingId, payload) {
  return patchJson(`/admin/meeting-buildings/${buildingId}`, payload, adminRequestOptions)
}

// 사이트와 첫 건물을 한 번에 등록한다(백엔드 트랜잭션 보장).
export function createSiteWithBuilding(payload) {
  return postJson('/admin/meeting-sites-with-building', payload, adminRequestOptions)
}
