export function buildMinutesPdfFileName(title) {
  const normalized = String(title || '회의록')
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return `${normalized || '회의록'}.pdf`
}

export async function downloadMinutesPdf({ minute, contentElement }) {
  if (!contentElement) {
    throw new Error('PDF로 변환할 회의록 본문을 찾을 수 없습니다.')
  }

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  const exportElement = createExportElement(minute, contentElement)
  document.body.appendChild(exportElement)

  try {
    await document.fonts?.ready
    const canvas = await html2canvas(exportElement, {
      backgroundColor: '#ffffff',
      logging: false,
      scale: 2,
      useCORS: true,
    })
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    })
    appendCanvasPages(pdf, canvas)
    pdf.save(buildMinutesPdfFileName(minute?.title))
  } finally {
    exportElement.remove()
  }
}

function createExportElement(minute, contentElement) {
  const root = document.createElement('article')
  root.className = 'minutes-pdf-export'

  const title = document.createElement('h1')
  title.textContent = minute?.title || '회의록'
  root.appendChild(title)

  const metadata = document.createElement('p')
  metadata.className = 'minutes-pdf-metadata'
  metadata.textContent = [
    minute?.date,
    minute?.duration,
    minute?.attendees === undefined ? null : `참석자 ${minute.attendees}명`,
    minute?.reviewer ? `검토자 ${minute.reviewer}` : null,
  ].filter(Boolean).join(' · ')
  root.appendChild(metadata)

  const summaryTitle = document.createElement('h2')
  summaryTitle.textContent = '회의 요약'
  root.appendChild(summaryTitle)

  const summary = document.createElement('p')
  summary.textContent = minute?.summary || '요약이 없습니다.'
  root.appendChild(summary)

  const bodyTitle = document.createElement('h2')
  bodyTitle.textContent = '회의록 본문'
  root.appendChild(bodyTitle)

  const renderedDocument = contentElement.querySelector('.ProseMirror')
  if (renderedDocument) {
    const body = renderedDocument.cloneNode(true)
    body.classList.add('minutes-pdf-content')
    body.removeAttribute('contenteditable')
    removeGeneratedDocumentPreamble(body)
    root.appendChild(body)
  } else {
    const empty = document.createElement('p')
    empty.textContent = '본문이 없습니다.'
    root.appendChild(empty)
  }

  return root
}

function removeGeneratedDocumentPreamble(body) {
  const firstHeading = body.firstElementChild
  if (firstHeading?.tagName === 'H1' && firstHeading.textContent?.trim() === '회의록') {
    firstHeading.remove()
  }

  const summaryHeading = body.firstElementChild
  if (summaryHeading?.tagName !== 'H2' || summaryHeading.textContent?.trim() !== '회의 요약') {
    return
  }

  const summaryParagraph = summaryHeading.nextElementSibling
  summaryHeading.remove()
  if (summaryParagraph?.tagName === 'P') {
    summaryParagraph.remove()
  }
}

function appendCanvasPages(pdf, canvas) {
  const pageWidthMm = 210
  const pageHeightMm = 297
  const marginMm = 14
  const contentWidthMm = pageWidthMm - marginMm * 2
  const contentHeightMm = pageHeightMm - marginMm * 2
  const mmPerPixel = contentWidthMm / canvas.width
  const pageHeightPx = Math.max(1, Math.floor(contentHeightMm / mmPerPixel))

  for (let offsetY = 0, pageIndex = 0; offsetY < canvas.height; offsetY += pageHeightPx, pageIndex += 1) {
    const sliceHeight = Math.min(pageHeightPx, canvas.height - offsetY)
    const pageCanvas = document.createElement('canvas')
    pageCanvas.width = canvas.width
    pageCanvas.height = sliceHeight

    const context = pageCanvas.getContext('2d')
    if (!context) throw new Error('PDF 페이지를 생성할 수 없습니다.')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
    context.drawImage(
      canvas,
      0,
      offsetY,
      canvas.width,
      sliceHeight,
      0,
      0,
      canvas.width,
      sliceHeight,
    )

    if (pageIndex > 0) pdf.addPage()
    pdf.addImage(
      pageCanvas.toDataURL('image/jpeg', 0.92),
      'JPEG',
      marginMm,
      marginMm,
      contentWidthMm,
      sliceHeight * mmPerPixel,
      undefined,
      'FAST',
    )
  }
}
