export function formatChatbotSourceLabel(sources = []) {
  if (!sources.length) return ''
  const sorted = [...sources].sort(
    (sourceA, sourceB) => (sourceA.displayOrder ?? 0) - (sourceB.displayOrder ?? 0),
  )
  const titles = [
    ...new Set(
      sorted
        .map((source) => source.title || source.type)
        .filter((title) => typeof title === 'string' && title.trim()),
    ),
  ]
  if (!titles.length) return ''
  return `참고한 자료: ${titles.join(', ')}`
}
