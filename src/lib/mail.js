import { deleteJson, getBlob, getJson, patchJson, postForm, postJson } from './api-client'

export function listMails(mailbox, { page = 1, size = 20 } = {}) {
  return getJson(`/mails/${mailbox}?page=${page}&size=${size}`)
}

export function searchMails(query, { page = 1, size = 20 } = {}) {
  const params = new URLSearchParams({ q: query, page: String(page), size: String(size) })
  return getJson(`/mails/search?${params.toString()}`)
}

export function getMail(mailId) {
  return getJson(`/mails/${mailId}`)
}

export function sendMail(payload) {
  const idempotencyKey = payload.idempotencyKey || crypto.randomUUID()
  const files = (payload.attachments || []).map((attachment) => attachment.file).filter(Boolean)
  // 첨부가 있으면 본문 필드 + 파일을 multipart로, 없으면 기존 JSON으로 전송한다.
  if (files.length) {
    const form = new FormData()
    ;(payload.recipientUserIds || []).forEach((id) => form.append('recipientUserIds', id))
    form.append('subject', payload.subject)
    form.append('body', payload.body)
    form.append('bodyType', payload.bodyType || 'TEXT')
    if (payload.relatedResourceType) form.append('relatedResourceType', payload.relatedResourceType)
    if (payload.relatedResourceId) form.append('relatedResourceId', payload.relatedResourceId)
    form.append('idempotencyKey', idempotencyKey)
    files.forEach((file) => form.append('files', file))
    return postForm('/mails', form)
  }
  return postJson('/mails', {
    recipientUserIds: payload.recipientUserIds,
    subject: payload.subject,
    body: payload.body,
    bodyType: payload.bodyType || 'TEXT',
    relatedResourceType: payload.relatedResourceType || null,
    relatedResourceId: payload.relatedResourceId || null,
    idempotencyKey,
  })
}

export function downloadMailAttachment(mailId, attachmentId) {
  return getBlob(`/mails/${mailId}/attachments/${attachmentId}`)
}

export function changeMailRead(mailId, read) {
  return patchJson(`/mails/${mailId}/read`, { read })
}

export function moveMailToTrash(mailId) {
  return deleteJson(`/mails/${mailId}`)
}

export function restoreMail(mailId) {
  return postJson(`/mails/${mailId}/restore`, {})
}

export function permanentlyDeleteMail(mailId) {
  return deleteJson(`/mails/${mailId}/permanent`)
}

export function backupMails(mailIds) {
  return postJson('/mails/backup', { mailIds })
}
