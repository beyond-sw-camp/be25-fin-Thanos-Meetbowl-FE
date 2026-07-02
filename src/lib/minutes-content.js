const DEFAULT_DOC = Object.freeze({
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [],
    },
  ],
})

export function extractTiptapText(content) {
  const document = parseContent(content)
  if (!document) return ''

  const lines = []
  collectText(document, lines)
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function isValidTiptapDocument(content) {
  const document = parseContent(content)
  return Boolean(document && document.type === 'doc' && Array.isArray(document.content))
}

export function parseTiptapDocument(content) {
  const document = parseContent(content)
  if (isValidTiptapDocument(document)) return document
  if (typeof content === 'string' && shouldCreateTextDocument(content)) {
    return textTiptapDocument(content.trim())
  }
  return emptyTiptapDocument()
}

export function stringifyTiptapDocument(document) {
  return JSON.stringify(parseTiptapDocument(document))
}

export function emptyTiptapDocument() {
  return cloneDefaultDoc()
}

export function buildMinutesShareDocument({ title, summary, content, link } = {}) {
  const minuteTitle = String(title || '회의록').trim() || '회의록'
  const summaryText = String(summary || '').trim() || '요약이 없습니다.'
  const contentDocument = parseTiptapDocument(content)
  const contentNodes = hasMeaningfulContent(contentDocument)
    ? cloneNodes(contentDocument.content)
    : textToTiptapNodes('본문이 없습니다.')

  const nodes = [
    paragraphNode('안녕하세요,'),
    paragraphNode(`${minuteTitle} 회의록을 공유드립니다.`),
    headingNode('회의 요약', 2),
    ...textToTiptapNodes(summaryText),
    headingNode('회의록 본문', 2),
    ...contentNodes,
  ]

  const normalizedLink = String(link || '').trim()
  if (normalizedLink) {
    nodes.push(
      headingNode('회의록 링크', 2),
      paragraphNode(normalizedLink, linkMark(normalizedLink)),
    )
  }

  return stringifyTiptapDocument({ type: 'doc', content: nodes })
}

function textTiptapDocument(text) {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text,
          },
        ],
      },
    ],
  }
}

function textToTiptapNodes(text) {
  const paragraphs = String(text || '')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)

  if (!paragraphs.length) return [paragraphNode('')]
  return paragraphs.map((block) => paragraphNode(block.replace(/\n+/g, '\n')))
}

function paragraphNode(text, mark = null) {
  const node = { type: 'paragraph' }
  const value = String(text || '')
  if (value) {
    const textNode = { type: 'text', text: value }
    if (mark) textNode.marks = [mark]
    node.content = [textNode]
  }
  return node
}

function headingNode(text, level) {
  return {
    type: 'heading',
    attrs: { level },
    content: [{ type: 'text', text }],
  }
}

function linkMark(href) {
  if (!/^https?:\/\//i.test(href)) return null
  return {
    type: 'link',
    attrs: {
      href,
      target: '_blank',
      rel: 'noopener noreferrer',
      class: null,
    },
  }
}

function hasMeaningfulContent(document) {
  return Boolean(extractTiptapText(document).trim())
}

function cloneNodes(nodes) {
  return JSON.parse(JSON.stringify(Array.isArray(nodes) ? nodes : []))
}

function parseContent(content) {
  if (!content) return null
  if (typeof content === 'object') return content
  try {
    return JSON.parse(content)
  } catch {
    return null
  }
}

function shouldCreateTextDocument(content) {
  const text = content.trim()
  if (!text) return false

  if (/^[\[{]/.test(text)) return false
  return true
}

function cloneDefaultDoc() {
  if (typeof structuredClone === 'function') return structuredClone(DEFAULT_DOC)
  return JSON.parse(JSON.stringify(DEFAULT_DOC))
}

function collectText(node, lines) {
  if (!node || typeof node !== 'object') return ''
  if (node.type === 'text') return node.text || ''

  const children = Array.isArray(node.content) ? node.content : []
  const text = children.map((child) => collectText(child, lines)).join('')

  if (['paragraph', 'heading', 'listItem'].includes(node.type) && text.trim()) {
    lines.push(text.trim())
  }
  return text
}
