import { deleteJson, getJson, patchJson, postJson } from './api-client'

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
  return postJson('/mails', {
    recipientUserIds: payload.recipientUserIds,
    subject: payload.subject,
    body: payload.body,
    bodyType: payload.bodyType || 'TEXT',
    relatedResourceType: payload.relatedResourceType || null,
    relatedResourceId: payload.relatedResourceId || null,
    idempotencyKey: crypto.randomUUID(),
  })
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
