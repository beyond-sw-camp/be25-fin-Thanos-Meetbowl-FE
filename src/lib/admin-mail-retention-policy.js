import { getJson, patchJson } from './api-client.js'

const adminRequestOptions = {
  // 관리자 화면은 자체적으로 403 상태를 처리하므로 전역 권한 핸들러는 건너뛴다.
  skipForbiddenHandler: true,
}

export function getAdminMailRetentionPolicy() {
  // 관리자 메일 보관 정책은 단건 조회이므로 별도 파라미터 없이 현재 설정값만 가져온다.
  return getJson('/admin/mail/retention-policy', adminRequestOptions)
}

export function updateAdminMailRetentionPolicy(payload) {
  // PATCH payload는 BE 계약을 그대로 따르며, 화면용 변환은 호출 전에 끝낸다.
  return patchJson('/admin/mail/retention-policy', payload, adminRequestOptions)
}
