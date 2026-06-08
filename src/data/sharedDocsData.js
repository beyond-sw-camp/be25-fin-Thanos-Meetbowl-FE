export const sharedInitialDocs = [
  {
    id: 'd1',
    title: 'Q2 OKR 마스터 시트',
    type: 'sheet',
    dept: '전략기획팀',
    author: '이지연',
    uploaded: '2026-04-01',
    updated: '2026-05-21 09:18',
    version: 'v4.2',
    size: '1.2MB',
    preview: 'Objective 1 | KR 1.1 | 진행률 78% ...',
    history: [
      { v: 'v4.2', author: '이지연', date: '2026-05-21 09:18', note: '5월 셋째주 진행률 반영' },
      { v: 'v4.1', author: '박서연', date: '2026-05-18 14:00', note: '프로덕트 OKR 항목 추가' },
      { v: 'v4.0', author: '이지연', date: '2026-05-10 10:00', note: 'Q2 KR 재정렬' },
    ],
  },
  {
    id: 'd2',
    title: '디자인 시스템 가이드',
    type: 'doc',
    dept: '디자인팀',
    author: '김민수',
    uploaded: '2026-03-12',
    updated: '2026-05-19 18:32',
    version: 'v2.0',
    size: '640KB',
    preview: '색상, 타이포, 간격은 모두 의미 기반 토큰으로 ...',
    history: [
      { v: 'v2.0', author: '김민수', date: '2026-05-19 18:32', note: '토큰 구조 v3 정리' },
      { v: 'v1.4', author: '김민수', date: '2026-04-22 11:14', note: '컴포넌트 가이드 보강' },
    ],
  },
  {
    id: 'd3',
    title: 'Q2 캠페인 브리프',
    type: 'slide',
    dept: '마케팅팀',
    author: '정도현',
    uploaded: '2026-05-05',
    updated: '2026-05-19 11:02',
    version: 'v1.3',
    size: '4.4MB',
    preview: 'Q2 캠페인 / 타겟 / 채널 / KPI ...',
    history: [
      { v: 'v1.3', author: '정도현', date: '2026-05-19 11:02', note: 'A안 채택 반영' },
      { v: 'v1.2', author: '최정훈', date: '2026-05-12 16:48', note: '예산 항목 정정' },
    ],
  },
  {
    id: 'd4',
    title: '회의실 운영 매뉴얼',
    type: 'pdf',
    dept: 'IT운영팀',
    author: '박관리',
    uploaded: '2026-02-08',
    updated: '2026-05-10 09:00',
    version: 'v1.0',
    size: '820KB',
    preview: '예약 방법, 입장 절차, 장비 사용법 ...',
    history: [{ v: 'v1.0', author: '박관리', date: '2026-05-10 09:00', note: '최초 배포' }],
  },
]

export const sharedInitialProjects = [
  { id: 'all', label: '전체 문서', docIds: sharedInitialDocs.map((doc) => doc.id) },
  { id: 'q2', label: 'Q2 캠페인', docIds: ['d1', 'd3'], participants: ['이지연', '정도현'] },
  { id: 'strategy', label: '전략 운영', docIds: ['d1'], participants: ['이지연'] },
  { id: 'product', label: '제품 개선', docIds: ['d1', 'd2'], participants: ['박서연', '김민수'] },
  { id: 'design', label: '디자인 시스템', docIds: ['d2'], participants: ['김민수'] },
  { id: 'marketing', label: '마케팅 캠페인', docIds: ['d3'], participants: ['정도현'] },
  { id: 'ops', label: '회의실 운영', docIds: ['d4'], participants: ['박관리'] },
]

export const sharedTeams = ['전략기획팀', '마케팅팀', '디자인팀', '프로덕트팀', 'IT운영팀', 'HR팀']

export const sharedTypeLabels = {
  doc: '문서',
  sheet: '스프레드시트',
  slide: '프레젠테이션',
  pdf: 'PDF',
}

export function nextSharedVersion(version) {
  const [major = '1', minor = '0'] = version.replace(/^v/i, '').split('.')
  return `v${Number(major)}.${Number(minor) + 1}`
}
