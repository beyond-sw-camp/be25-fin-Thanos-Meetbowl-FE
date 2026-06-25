// 유저 선택 칩의 한 줄 표기: "이름/직급/부서 <이메일>".
// 직급·부서가 비어 있으면 자연스럽게 빼고, 부서가 없으면 팀으로 대체한다.
export function formatUserChipLabel(user) {
  if (!user) return ''
  const head = [user.name, user.position, user.department || user.team]
    .filter(Boolean)
    .join('/')
  const label = head || user.email || user.userId || user.id || ''
  return user.email ? `${label} <${user.email}>` : label
}
