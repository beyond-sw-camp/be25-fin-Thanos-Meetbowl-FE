// 첫 로그인 온보딩(환영 모달 + 스포트라이트 투어) 상태 관리와 스텝 정의.
// 완료 여부는 사용자별로 localStorage에 기록해, 같은 브라우저에서 한 번만 자동 노출되게 한다.

const COMPLETED_KEY_PREFIX = 'meetbowl.tutorial.completed.'

function completedKey(userId) {
  // 사용자 식별자가 없으면(비정상) 공용 키로 떨어뜨려 최소한 한 번만 뜨게 한다.
  return `${COMPLETED_KEY_PREFIX}${userId || 'anonymous'}`
}

export function isTutorialCompleted(userId) {
  try {
    return localStorage.getItem(completedKey(userId)) === 'true'
  } catch {
    // localStorage 접근 불가(프라이빗 모드 등)면 자동 노출하지 않는다.
    return true
  }
}

export function markTutorialCompleted(userId) {
  try {
    localStorage.setItem(completedKey(userId), 'true')
  } catch {
    // 저장 실패는 무시한다(다음 로그인에 다시 뜰 수 있을 뿐 기능엔 영향 없음).
  }
}

// 스포트라이트 투어 스텝. target은 AppShell 사이드바/상단바 요소의 data-tour 값과 매칭된다.
// target이 없거나 화면에서 못 찾으면(모바일 등) 해당 스텝은 가운데 안내로 자연스럽게 대체된다.
export const TOUR_STEPS = [
  {
    target: 'dashboard',
    title: '대시보드',
    description: '오늘의 회의·예약 현황과 주요 알림을 한눈에 확인하는 시작 화면이에요.',
  },
  {
    target: 'rooms',
    title: '회의실 예약',
    description: '회의실 빈 시간을 보고 바로 예약할 수 있어요. 내 예약과 참석 회의도 여기서 모아 봅니다.',
  },
  {
    target: 'meetings',
    title: '회의',
    description: '예정된 회의를 만들고 참석자를 초대해요. 시간이 겹치면 바로 알려드립니다.',
  },
  {
    target: 'minutes',
    title: '내 회의록',
    description: '회의가 끝나면 자동 생성된 회의록을 확인하고 공유할 수 있어요.',
  },
  {
    target: 'notifications',
    title: '알림',
    description: '회의 초대·변경 같은 소식이 여기로 와요. 종 아이콘에서 바로 확인하세요.',
  },
]
