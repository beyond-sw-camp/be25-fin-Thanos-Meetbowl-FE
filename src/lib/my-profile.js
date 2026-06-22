import { getJson, patchJson } from './api-client'

// 내 정보 조회/수정과 개인 설정 조회/수정을 한 곳에서 관리한다.
export function getMyProfile() {
  return getJson('/users/me')
}

export function updateMyProfile(payload) {
  return patchJson('/users/me', payload)
}

export function getMySettings() {
  return getJson('/users/me/settings')
}

export function updateMySettings(payload) {
  return patchJson('/users/me/settings', payload)
}

export function changeMyPassword(payload) {
  return patchJson('/users/me/password', payload)
}
