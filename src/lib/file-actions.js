export function extractFileNameFromDisposition(contentDisposition) {
  if (!contentDisposition) return ''

  const encodedMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (encodedMatch?.[1]) return decodeURIComponent(encodedMatch[1].replace(/"/g, ''))

  const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
  return plainMatch?.[1] || ''
}

export function saveBlob(blob, fileName) {
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName || 'download'
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000)
}

export function resolveBlobFileName(headers, fallbackName) {
  return extractFileNameFromDisposition(headers?.get?.('Content-Disposition')) || fallbackName || 'download'
}

export function previewKind(contentType = '') {
  if (contentType.startsWith('image/')) return 'image'
  if (contentType.includes('application/pdf')) return 'pdf'
  if (contentType.startsWith('text/')) return 'text'
  return 'unsupported'
}
