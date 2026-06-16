import { deleteJson, getJson, patchJson, postForm, postJson } from './api-client'

export function getWorkspaceCalendar(from, to) {
  const params = new URLSearchParams({ from, to })
  return getJson(`/workspace/calendar?${params.toString()}`)
}

export function createWorkspaceEvent(payload) {
  return postJson('/workspace/calendar/events', payload)
}

export function updateWorkspaceEvent(eventId, payload) {
  return patchJson(`/workspace/calendar/events/${eventId}`, payload)
}

export function deleteWorkspaceEvent(eventId) {
  return deleteJson(`/workspace/calendar/events/${eventId}`)
}

export function getCalendarSubscriptions() {
  return getJson('/workspace/calendar/subscriptions')
}

export function subscribeCalendar(targetUserId) {
  return postJson('/workspace/calendar/subscriptions', { targetUserId })
}

export function unsubscribeCalendar(subscriptionId) {
  return deleteJson(`/workspace/calendar/subscriptions/${subscriptionId}`)
}

export function getBackups() {
  return getJson('/workspace/backups')
}

export function searchBackups(keyword) {
  const params = new URLSearchParams({ keyword })
  return getJson(`/workspace/backups/search?${params.toString()}`)
}

export function addBackupBookmark(backupId) {
  return postJson(`/workspace/backups/${backupId}/bookmark`, {})
}

export function removeBackupBookmark(backupId) {
  return deleteJson(`/workspace/backups/${backupId}/bookmark`)
}

export function getDriveFiles() {
  return getJson('/workspace/drive/files')
}

export function uploadDriveFile(file) {
  const form = new FormData()
  form.append('file', file)
  return postForm('/workspace/drive/files', form)
}

export function deleteDriveFile(fileId) {
  return deleteJson(`/workspace/drive/files/${fileId}`)
}

export function getMemos() {
  return getJson('/workspace/memos')
}

export function createMemo(payload) {
  return postJson('/workspace/memos', payload)
}

export function updateMemo(memoId, payload) {
  return patchJson(`/workspace/memos/${memoId}`, payload)
}

export function deleteMemo(memoId) {
  return deleteJson(`/workspace/memos/${memoId}`)
}
