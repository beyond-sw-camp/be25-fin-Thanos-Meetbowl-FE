// 공유 워크스페이스는 실제 BE 데이터를 사용하므로 더미 시드는 비워 둔다(빈 배열이면 fallback이 아무것도 표시하지 않음).
export const sharedInitialDocs = []

export const sharedInitialProjects = []

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
