export const rooms = [
  { id: 'r1', name: '테헤란로(대 회의실)', floor: 12, capacity: 14, site: '테헤란로', equipment: ['프로젝터', '화상회의'] },
  { id: 'r2', name: '테헤란로(중 회의실)', floor: 12, capacity: 10, site: '테헤란로', equipment: ['TV', '화상회의'] },
  { id: 'r3', name: '테헤란로(소 회의실)', floor: 12, capacity: 6, site: '테헤란로', equipment: ['TV'] },
  { id: 'r4', name: '테헤란로(1층 미팅룸)', floor: 1, capacity: 4, site: '테헤란로', equipment: ['TV'] },
  { id: 'r5', name: '봉은사로(회의실 1)', floor: 5, capacity: 8, site: '봉은사로', equipment: ['TV', '화상회의'], restricted: true, restrictReason: '공조 설비 점검', restrictUntil: '2026-06-15 18:00' },
  { id: 'r6', name: '봉은사로(회의실 2)', floor: 5, capacity: 6, site: '봉은사로', equipment: ['TV'] },
  { id: 'r7', name: '봉은사로(회의실 3)', floor: 5, capacity: 12, site: '봉은사로', equipment: ['프로젝터', '화상회의'] },
  { id: 'r8', name: '안양(대 : 도시계획부)', floor: 3, capacity: 16, site: '안양', equipment: ['프로젝터', '화상회의', '마이크'] },
  { id: 'r9', name: '안양(중 : 단지설계부)', floor: 3, capacity: 8, site: '안양', equipment: ['TV', '화상회의'] },
]

export const todayReservations = [
  { id: 'b1', roomId: 'r1', title: '권성환 회의', owner: '권성환', start: '10:00', end: '12:00', status: 'booked', attendees: ['이지연', '박서연'] },
  { id: 'b2', roomId: 'r1', title: '민경정 리뷰', owner: '민경정', start: '14:30', end: '16:00', status: 'booked', attendees: [] },
  { id: 'b3', roomId: 'r2', title: '탁호균 종일 사용', owner: '탁호균', start: '06:00', end: '23:30', status: 'booked', attendees: [] },
  { id: 'b4', roomId: 'r3', title: '이경필 작업', owner: '이경필', start: '13:00', end: '16:00', status: 'booked', attendees: ['이지연'] },
  { id: 'b5', roomId: 'r3', title: '장병욱 미팅', owner: '장병욱', start: '16:00', end: '18:00', status: 'booked', attendees: [] },
  { id: 'b6', roomId: 'r6', title: '곽준호 1on1', owner: '곽준호', start: '10:00', end: '11:30', status: 'mine', attendees: ['이지연'] },
  { id: 'b7', roomId: 'r7', title: '김재욱 종일 사용', owner: '김재욱', start: '06:00', end: '23:30', status: 'booked', attendees: [] },
  { id: 'b8', roomId: 'r8', title: '박헌일 검토', owner: '박헌일', start: '16:00', end: '18:00', status: 'booked', attendees: [] },
  { id: 'b9', roomId: 'r9', title: '한유진 단지 회의', owner: '한유진', start: '08:00', end: '10:00', status: 'mine', attendees: ['이지연', '박서연'] },
]

export const mails = [
  { id: 'm1', from: '김지연', dept: '프로덕트팀', subject: '[회의록 공유] 5월 제품 전략 회의', preview: '5월 제품 전략 회의 회의록과 결정 사항을 공유드립니다.', date: '2026-05-22', unread: true, hasAttachment: true, category: 'inbox', body: '5월 제품 전략 회의 회의록을 공유드립니다.\n\n주요 결정 사항\n- Q2 캠페인 일정을 한 주 앞당기기로 합의\n- 신규 제품 라인 PoC 즉시 시작\n- 리소스 영향 분석은 5/24까지 정리' },
  { id: 'm2', from: '현재진', dept: '운영팀', subject: '보안 정책 변경 안내', preview: '5월 25일부터 적용되는 보안 정책 변경 사항을 안내드립니다.', date: '2026-05-21', unread: true, hasAttachment: false, category: 'inbox', body: '사내 시스템 비밀번호 90일 주기 변경, 외부 메일 첨부파일 자동 암호화, VPN 2차 인증이 적용됩니다.' },
  { id: 'm3', from: '윤정윤', dept: '디자인팀', subject: '디자인 리뷰 일정 조정', preview: '다음 주 디자인 리뷰 일정 변경 요청드립니다.', date: '2026-05-20', unread: false, hasAttachment: false, category: 'inbox', body: '다음 주 화요일 예정된 디자인 리뷰 일정을 수요일 오후 2시로 조정하고자 합니다.' },
  { id: 'm4', from: '이지연', dept: '전략기획팀', subject: '주간 전략 회의 자료 공유', preview: '이번 주 전략 회의 사전 자료입니다.', date: '2026-05-19', unread: false, hasAttachment: true, category: 'sent', body: '전략 회의 사전 자료를 공유드립니다. 회의 전 검토 부탁드립니다.' },
  { id: 'm5', from: '박서연', dept: '프로덕트팀', subject: '[백업] Q1 회의록 모음', preview: 'Q1 분기 주요 회의록을 백업 공유드립니다.', date: '2026-05-10', unread: false, hasAttachment: true, category: 'backup', body: 'Q1 주요 회의록을 정리하여 공유드립니다.' },
  { id: 'm6', from: '경영지원실', dept: '경영지원실', subject: '[공지] 6월 휴무일 안내', preview: '6월 6일은 공휴일로 전사 휴무입니다.', date: '2026-05-18', unread: false, hasAttachment: false, category: 'notice', body: '6월 휴무일과 전후 근무 시 사전 결재 기준을 안내드립니다.' },
]

export const minutes = [
  { id: 'min1', title: '주간 전략 회의', date: '2026-05-20', duration: '58분', attendees: 5, summary: 'OKR 진행률 점검 및 Q2 우선순위 재정렬. 신규 제품 라인 PoC 시작 결정.', expireDays: 30, reviewer: '박서연', reviewStatus: 'accepted' },
  { id: 'min2', title: 'Q2 캠페인 킥오프', date: '2026-05-19', duration: '1시간 24분', attendees: 8, summary: '타겟 세그먼트 확정, 6월 1일 런칭 일정 합의.', expireDays: 21, reviewer: '이지연', reviewStatus: 'reviewing' },
  { id: 'min3', title: '제품 디자인 리뷰', date: '2026-05-15', duration: '42분', attendees: 4, summary: '메인 대시보드 IA 변경안 승인. 컴포넌트 토큰화 진행.', expireDays: 7, reviewer: '이지연', reviewStatus: 'draft' },
  { id: 'min4', title: '월간 전사 공유', date: '2026-05-02', duration: '1시간 12분', attendees: 47, summary: '전사 매출 현황 공유 및 분기 전략 발표.', expireDays: 60, reviewer: '정도현', reviewStatus: 'sent' },
]

export const reviewMeta = {
  draft: { label: '초안', tone: 'muted' },
  reviewing: { label: '검토중', tone: 'warning' },
  edited: { label: '수정됨', tone: 'navy' },
  accepted: { label: '공유 수락', tone: 'primary' },
  sent: { label: '발송완료', tone: 'success' },
}

export const myMeetings = [
  { id: 'mt1', title: '주간 전략 회의', role: 'host', start: '2026-05-22 10:00', status: 'live', attendees: ['박서연', '정도현', '김민수'], room: '테헤란로(대 회의실)', reviewer: '박서연' },
  { id: 'mt2', title: '디자인 리뷰', role: 'attendee', start: '2026-05-22 14:00', status: 'upcoming', attendees: ['윤정윤', '김민수'], room: '원격' },
  { id: 'mt3', title: 'Q2 캠페인 킥오프 후속', role: 'host', start: '2026-05-23 11:00', status: 'upcoming', attendees: ['정도현', '박서연'], room: '봉은사로(회의실 1)', reviewer: '정도현' },
  { id: 'mt4', title: '신규 입사자 OJT', role: 'attendee', start: '2026-05-20 14:00', status: 'ended', attendees: ['HR팀'], room: '테헤란로(중 회의실)' },
  { id: 'mt5', title: '월간 전사 공유', role: 'attendee', start: '2026-05-02 16:00', status: 'ended', attendees: ['전사'], room: '원격' },
]

export const companies = ['Meetbowl 본사', 'R&D 센터', 'Japan Office', 'US Branch', 'Shanghai Office']

export const members = [
  { id: '1', name: '김인사', email: 'hr@meetbowl.co', company: 'Meetbowl 본사', dept: '경영지원실', position: '이사', title: '본부장', role: 'Admin', status: '활성' },
  { id: '2', name: '박관리', email: 'admin@meetbowl.co', company: 'Meetbowl 본사', dept: 'IT운영팀', position: '팀장', title: '팀장', role: 'Admin', status: '활성' },
  { id: '3', name: '이지연', email: 'user@meetbowl.co', company: 'Meetbowl 본사', dept: '전략기획팀', position: '선임', title: '팀원', role: 'User', status: '활성' },
  { id: '4', name: '정도현', email: 'doh@meetbowl.co', company: 'Meetbowl 본사', dept: '마케팅팀', position: '책임', title: '파트장', role: 'User', status: '활성' },
  { id: '5', name: '박서연', email: 'seo@meetbowl.co', company: 'R&D 센터', dept: '프로덕트팀', position: '수석', title: '파트장', role: 'User', status: '활성' },
  { id: '6', name: '김민수', email: 'min@meetbowl.co', company: 'R&D 센터', dept: '디자인팀', position: '선임', title: '팀원', role: 'User', status: '활성' },
  { id: '7', name: '최정훈', email: 'choi@meetbowl.co', company: 'US Branch', dept: '영업팀', position: '사원', title: '팀원', role: 'User', status: '비활성' },
]

export const adminLogs = [
  { id: 'l1', time: '2026-05-21 09:12', actor: '박관리', area: '회원 관리', action: '회원 비활성화', target: '최정훈', result: '성공', ip: '10.20.13.5' },
  { id: 'l2', time: '2026-05-21 08:48', actor: '김인사', area: '권한 관리', action: 'Admin 권한 부여', target: '박관리', result: '성공', ip: '10.20.10.2' },
  { id: 'l3', time: '2026-05-20 17:22', actor: '박관리', area: '회의실 관리', action: '회의실 수정', target: '테헤란로(대 회의실)', result: '성공', ip: '10.20.11.42' },
  { id: 'l4', time: '2026-05-20 14:05', actor: '박관리', area: '보관 정책', action: '회의록 보관 기간 변경', target: '기본 30일 -> 60일', result: '성공', ip: '10.20.11.42' },
  { id: 'l5', time: '2026-05-19 11:30', actor: '박관리', area: '메일 정책', action: '자동 삭제 기준 변경', target: '휴지통 14일', result: '성공', ip: '172.16.4.9' },
]

export const workspaceDocs = [
  { id: 'w1', title: 'Q2 캠페인 실행 계획', owner: '이지연', type: '문서', updatedAt: '2026-05-22', tags: ['전략', '캠페인'] },
  { id: 'w2', title: '제품 디자인 리뷰 회의록', owner: '윤정윤', type: '회의록', updatedAt: '2026-05-20', tags: ['디자인', '회의록'] },
  { id: 'w3', title: '신규 제품 PoC 체크리스트', owner: '박서연', type: '체크리스트', updatedAt: '2026-05-19', tags: ['PoC', '제품'] },
  { id: 'w4', title: '보안 정책 변경 가이드', owner: '운영팀', type: '공지', updatedAt: '2026-05-18', tags: ['보안', '운영'] },
]

export const communityPosts = [
  {
    id: 'p1',
    title: '재택근무 일주일에 며칠이 적당할까요?',
    category: '회사생활',
    body: '다들 재택 며칠 하시나요? 저희 팀은 주 2회인데 너무 짧은 것 같아서요. 의견 궁금합니다.',
    createdAt: '2026-05-22 13:42',
    views: 1342,
    likes: 87,
    comments: [
      { id: 'c1', text: '주 3회가 가장 균형이 좋은 것 같아요.', createdAt: '2026-05-22 13:55', likes: 12 },
      { id: 'c2', text: '저는 집중 업무가 많아서 전면 재택도 괜찮다고 봅니다.', createdAt: '2026-05-22 14:01', likes: 8 },
    ],
  },
  {
    id: 'p2',
    title: '이번 분기 회식 너무 많지 않나요?',
    category: '회사생활',
    body: '팀 회식, 본부 회식, 전사 회식까지 겹치니 평일 저녁이 사라지고 있어요.',
    createdAt: '2026-05-22 11:08',
    views: 982,
    likes: 64,
    comments: [{ id: 'c3', text: '공감합니다. 선택 참석이면 좋겠어요.', createdAt: '2026-05-22 11:20', likes: 5 }],
  },
  {
    id: 'p3',
    title: '회사 근처 점심 추천 좀 해주세요',
    category: '맛집',
    body: '테헤란로 근처에서 1만원대로 든든하게 먹을 수 있는 곳 있을까요?',
    createdAt: '2026-05-22 09:30',
    views: 540,
    likes: 41,
    comments: [{ id: 'c4', text: '역삼역 뒤쪽 백반집 괜찮습니다.', createdAt: '2026-05-22 09:45', likes: 22 }],
  },
  {
    id: 'p4',
    title: '코딩 인터뷰 준비 같이 하실 분',
    category: '자유',
    body: '주 2회 스터디 모집합니다. 알고리즘 위주로 진행할 예정입니다.',
    createdAt: '2026-05-21 22:14',
    views: 312,
    likes: 28,
    comments: [],
  },
  {
    id: 'p5',
    title: '익명 제보 - 회의실 예약 매너',
    category: '익명제보',
    body: '예약 시간 끝나도 안 비우시는 분들... 다음 회의 사람도 생각해주세요.',
    createdAt: '2026-05-21 17:55',
    views: 1208,
    likes: 152,
    comments: [
      { id: 'c5', text: '다음 예약 알림이 더 잘 보이면 좋겠습니다.', createdAt: '2026-05-21 18:00', likes: 30 },
      { id: 'c6', text: '공감합니다. 종료 5분 전 안내가 필요해요.', createdAt: '2026-05-21 18:15', likes: 14 },
      { id: 'c7', text: '예약 현황판도 같이 개선되면 좋겠습니다.', createdAt: '2026-05-21 19:01', likes: 9 },
    ],
  },
  {
    id: 'p6',
    title: '주말 등산 모임 있나요?',
    category: '취미',
    body: '이번 주말 가볍게 같이 다녀올 분 찾습니다.',
    createdAt: '2026-05-20 20:11',
    views: 174,
    likes: 19,
    comments: [],
  },
]
