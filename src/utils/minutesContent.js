export function createMinutesDocument({
  summary = '',
  agendas = [],
  decisions = [],
  actionItems = [],
} = {}) {
  const content = [
    heading('회의록', 1),
    heading('회의 요약', 2),
    paragraph(summary || '요약이 아직 없습니다.'),
  ]

  if (agendas.length) {
    content.push(heading('안건별 논의', 2))
    agendas.forEach((agenda) => {
      content.push(heading(agenda.title, 3))
      content.push(paragraph(agenda.discussion))
      if (agenda.decision) content.push(paragraph(`결정: ${agenda.decision}`))
    })
  }

  if (decisions.length) {
    content.push(heading('결정사항', 2))
    content.push(bulletList(decisions))
  }

  if (actionItems.length) {
    content.push(heading('후속 조치', 2))
    content.push(bulletList(actionItems))
  }

  return { type: 'doc', content }
}

export function serializeMinutesDocument(document) {
  return JSON.stringify(document)
}

export function parseMinutesContent(content) {
  if (!content) return createMinutesDocument()
  try {
    const parsed = typeof content === 'string' ? JSON.parse(content) : content
    if (parsed?.type === 'doc') return parsed
  } catch {
    return createMinutesDocument({ summary: String(content) })
  }
  return createMinutesDocument({ summary: String(content) })
}

function heading(text, level) {
  return {
    type: 'heading',
    attrs: { level },
    content: [{ type: 'text', text }],
  }
}

function paragraph(text) {
  return {
    type: 'paragraph',
    content: [{ type: 'text', text }],
  }
}

function bulletList(items) {
  return {
    type: 'bulletList',
    content: items.map((item) => ({
      type: 'listItem',
      content: [paragraph(item)],
    })),
  }
}
