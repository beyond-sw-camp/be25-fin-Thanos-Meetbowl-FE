import { reactive } from 'vue'
import { getUserSummary } from '../lib/users'

// 예약 블록의 hostUserId(UUID) → 이름을 백엔드 사용자 요약 API로 조회해 캐시한다.
// 같은 사용자는 한 번만 조회하고, 실패해도 화면은 막지 않는다(폴백은 호출부에서 처리).
export function useUserNames() {
  const nameMap = reactive({})

  async function resolveNames(userIds = []) {
    const targets = [...new Set(userIds)].filter((id) => id && !(id in nameMap))
    await Promise.all(
      targets.map(async (id) => {
        try {
          const summary = await getUserSummary(id)
          if (summary?.name) nameMap[id] = summary.name
        } catch (error) {
          // 이름 조회 실패는 무시하고 폴백 라벨(내 예약/예약됨)로 표시한다.
          console.warn(`[useUserNames] 유저 정보 조회 실패 (ID: ${id}):`, error)
        }
      }),
    )
  }

  return { nameMap, resolveNames }
}
