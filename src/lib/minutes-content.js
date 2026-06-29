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
  if (typeof content === 'string' && content.trim()) {
    return textTiptapDocument(content.trim())
  }
  return emptyTiptapDocument()
}

export function stringifyTiptapDocument(document) {
  return JSON.stringify(parseTiptapDocument(document))
}

export function emptyTiptapDocument() {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [],
      },
    ],
  }
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

function parseContent(content) {
  if (!content) return null
  if (typeof content === 'object') return content
  try {
    return JSON.parse(content)
  } catch {
    return null
  }
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
