import { deleteJson, getJson, patchJson, postJson } from './api-client.js'

function query(params = {}) {
  const q = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    q.set(key, value)
  }
  const queryString = q.toString()
  return queryString ? `?${queryString}` : ''
}

export function listMinutes({ keyword } = {}) {
  return getJson(`/minutes${query({ keyword })}`)
}

export function getMeetingMinutes(meetingId) {
  return getJson(`/meetings/${meetingId}/minutes`)
}

export function reviseMeetingMinutes(meetingId, payload) {
  return patchJson(`/meetings/${meetingId}/minutes`, {
    summary: payload.summary,
    content: payload.content,
  })
}

export function approveMeetingMinutes(meetingId) {
  return postJson(`/meetings/${meetingId}/minutes/approve`, {})
}

export function shareMeetingMinutes(meetingId, payload) {
  return postJson(`/meetings/${meetingId}/minutes/share`, {
    recipientUserIds: payload.recipientUserIds,
    subject: payload.subject,
    body: payload.body,
    idempotencyKey: payload.idempotencyKey,
  })
}

export function addMinutesFavorite(minutesId) {
  return postJson(`/minutes/${minutesId}/favorite`, {})
}

export function removeMinutesFavorite(minutesId) {
  return deleteJson(`/minutes/${minutesId}/favorite`)
}

export function getMeetingTranscript(meetingId) {
  return getJson(`/meetings/${meetingId}/transcripts`)
}
