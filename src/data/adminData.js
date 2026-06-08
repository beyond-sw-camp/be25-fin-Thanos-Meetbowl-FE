export const adminTodayDate = '2026-05-22'

export const adminHourlyUsage = [
  { hour: '09', count: 12 },
  { hour: '10', count: 24 },
  { hour: '11', count: 21 },
  { hour: '12', count: 7 },
  { hour: '13', count: 15 },
  { hour: '14', count: 27 },
  { hour: '15', count: 23 },
  { hour: '16', count: 19 },
  { hour: '17', count: 13 },
  { hour: '18', count: 6 },
]

export const adminSites = [
  { name: '테헤란로', building: '본관' },
  { name: '봉은사로', building: '별관' },
  { name: '안양', building: '연구동' },
]

export const adminRoomUsage = [
  { room: '테헤란로(대 회의실)', site: '테헤란로', building: '본관', floor: '12F', rate: 88, hours: 126, peak: '14:00' },
  { room: '테헤란로(중 회의실)', site: '테헤란로', building: '본관', floor: '12F', rate: 81, hours: 114, peak: '10:00' },
  { room: '테헤란로(소 회의실)', site: '테헤란로', building: '본관', floor: '12F', rate: 73, hours: 98, peak: '16:00' },
  { room: '봉은사로(회의실 1)', site: '봉은사로', building: '별관', floor: '5F', rate: 67, hours: 82, peak: '15:00' },
  { room: '봉은사로(회의실 3)', site: '봉은사로', building: '별관', floor: '5F', rate: 61, hours: 74, peak: '11:00' },
  { room: '안양(대 : 도시계획부)', site: '안양', building: '연구동', floor: '3F', rate: 54, hours: 63, peak: '16:00' },
]

export const initialDepts = [
  { id: 'd1', name: '경영지원실', count: 8, children: ['인사팀', '재무팀', '법무팀', 'IT운영팀'] },
  { id: 'd2', name: '프로덕트본부', count: 24, children: ['프로덕트팀', '디자인팀', '개발팀'] },
  { id: 'd3', name: '전략기획팀', count: 5, children: [] },
  { id: 'd4', name: '마케팅팀', count: 7, children: [] },
  { id: 'd5', name: '영업본부', count: 31, children: ['영업 1팀', '영업 2팀', '영업 3팀'] },
]

export const initialRanks = [
  { id: 'r1', name: '사원', order: 1, count: 12 },
  { id: 'r2', name: '선임', order: 2, count: 8 },
  { id: 'r3', name: '책임', order: 3, count: 5 },
  { id: 'r4', name: '수석', order: 4, count: 3 },
  { id: 'r5', name: '이사', order: 5, count: 1 },
]

export const initialTitles = [
  { id: 't1', name: '팀원', count: 22 },
  { id: 't2', name: '파트장', count: 6 },
  { id: 't3', name: '팀장', count: 4 },
  { id: 't4', name: '본부장', count: 2 },
]

export function memberSeed(member, index) {
  return {
    ...member,
    hireOn: `202${Math.min(index + 1, 5)}-0${(index % 6) + 1}-01`,
    retireOn: member.status === '비활성' ? '2026-05-31' : '2999-01-01',
  }
}
