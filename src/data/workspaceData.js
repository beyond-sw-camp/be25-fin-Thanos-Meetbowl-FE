export const workspaceEvents = [
  { date: '2026-05-21', start: '09:00', end: '10:00', title: '주간 전략 회의', where: '오로라 (12F)', address: '서울 중구 세종대로 110', who: '나', kind: 'mine' },
  { date: '2026-05-21', start: '11:30', end: '12:00', title: '1:1 박서연', where: '한라 (10F)', who: '나', kind: 'mine' },
  { date: '2026-05-21', start: '15:00', end: '16:00', title: '제품 디자인 리뷰', where: '오로라 (12F)', who: '나', kind: 'mine' },
  { date: '2026-05-21', start: '14:00', end: '15:00', title: '스프린트 리뷰', who: '박서연', kind: 'team' },
  { date: '2026-05-22', start: '10:00', end: '11:30', title: 'Q2 캠페인 킥오프', where: '에버레스트', who: '나', kind: 'mine' },
  { date: '2026-05-22', start: '16:00', end: '17:00', title: '광고 운영 미팅', who: '정도현', kind: 'team' },
  { date: '2026-05-25', start: '09:30', end: '10:30', title: '월간 OKR 리뷰', where: '백두 (10F)', who: '나', kind: 'mine' },
  { date: '2026-05-25', start: '13:00', end: '14:00', title: '사용성 테스트', who: '김민수', kind: 'team' },
  { date: '2026-05-27', start: '11:00', end: '12:00', title: '디자인 시스템 워크샵', who: '나', kind: 'mine' },
  { date: '2026-05-28', start: '15:00', end: '16:30', title: '고객 인터뷰', who: '박서연', kind: 'team' },
  { date: '2026-05-29', start: '10:00', end: '11:00', title: '전사 공유회', where: '백두 (10F)', who: '나', kind: 'mine' },
]

export const workspaceBackupMails = [
  { id: 'bm1', from: '박서연', title: '[회의록 공유] 5월 전략 회의', date: '2026-05-20', preview: '5월 전략 회의 회의록 AI 요약을 공유드립니다.' },
  { id: 'bm2', from: '정도현', title: 'Q2 캠페인 후속 액션', date: '2026-05-19', preview: 'Q2 캠페인 킥오프 후속 액션 아이템과 일정 정리해 드립니다.' },
  { id: 'bm3', from: '김지연', title: '[HR] 2분기 평가 기준 안내', date: '2026-05-10', preview: '2분기 평가 기준 변경 사항을 안내드립니다.' },
]

export const workspaceDriveFiles = [
  { name: 'OKR_Q2_2026.xlsx', size: '1.2MB', time: '오늘' },
  { name: '디자인_시안_v3.fig', size: '8.4MB', time: '어제' },
  { name: '회의록_5월_3주차.pdf', size: '320KB', time: '5/19' },
  { name: '캠페인_브리프.pdf', size: '2.1MB', time: '5/15' },
]

export const colleagueInfo = {
  박서연: { dept: '프로덕트팀', position: '선임', email: 'seo@meetbowl.co', phone: '010-2841-9023', status: 'online' },
  정도현: { dept: '마케팅팀', position: '책임', email: 'doh@meetbowl.co', phone: '010-7720-1158', status: 'busy' },
  김민수: { dept: '디자인팀', position: '선임', email: 'min@meetbowl.co', phone: '010-3392-4471', status: 'away' },
  윤정윤: { dept: '전략기획팀', position: '주임', email: 'yjy@meetbowl.co', phone: '010-1124-3344', status: 'online' },
  최정훈: { dept: '영업팀', position: '팀장', email: 'choi@meetbowl.co', phone: '010-6021-8893', status: 'online' },
  한유진: { dept: 'HR팀', position: '선임', email: 'han@meetbowl.co', phone: '010-3322-1188', status: 'away' },
}

export const favoriteRecordings = [
  { title: '월간 전사 공유 회의록', meta: '5/2 · 47명' },
  { title: '임원 라운드 테이블', meta: '5/12 · 12명' },
  { title: '주간 전략 회의', meta: '5/20 · 5명' },
]

export const initialMemos = [
  { id: 'm1', title: 'Q2 캠페인 메모', body: '- 타겟: 30대 직장인\n- 채널: 인스타, 네이버, 카카오\n- 런칭: 6월 1일\n- 예산: 1.2억', updated: '2026-05-20 15:32', pinned: true },
  { id: 'm2', title: '주간 회의 액션', body: '1. OKR 재정렬\n2. 디자인 시스템 v3 토큰화\n3. 사용자 인터뷰 일정 잡기', updated: '2026-05-19 09:12', pinned: false },
  { id: 'm3', title: '면담 노트', body: '박서연 선임: 사이드 프로젝트 관심. 기술 사례 공유 요청.', updated: '2026-05-15 17:00', pinned: false },
]

export function workspaceDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function workspaceMonthCells(year, month) {
  const first = new Date(year, month, 1)
  const start = new Date(year, month, 1 - first.getDay())
  return Array.from({ length: 42 }, (_, index) => {
    const d = new Date(start)
    d.setDate(start.getDate() + index)
    return d
  })
}

export function workspaceNow() {
  return '2026-05-21 10:00'
}
