import { minutes } from '../data/mockData'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const fallbackStore = new Map(
  minutes.map((minute) => [
    minute.meetingId,
    {
      minutesId: minute.id,
      meetingId: minute.meetingId,
      reviewerUserId: null,
      status: mapReviewStatus(minute.reviewStatus),
      summary: minute.summary,
      content: minute.content,
      approvedAt: null,
    },
  ]),
)

export async function fetchMinuteDetail(meetingId) {
  try {
    return await request(`/api/v1/meetings/${meetingId}/minutes`)
  } catch {
    return clone(fallbackStore.get(meetingId))
  }
}

export async function reviseMinuteDetail(meetingId, payload) {
  try {
    return await request(`/api/v1/meetings/${meetingId}/minutes`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  } catch {
    const existing = fallbackStore.get(meetingId)
    const updated = {
      ...existing,
      ...payload,
      status: 'IN_REVIEW',
    }
    fallbackStore.set(meetingId, updated)
    return clone(updated)
  }
}

async function request(path, init = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    ...init,
  })
  const body = await response.json()
  if (!response.ok || body.success === false) {
    throw new Error(body?.error?.message || '회의록 요청에 실패했습니다.')
  }
  return body.data
}

function mapReviewStatus(status) {
  return {
    accepted: 'APPROVED',
    reviewing: 'IN_REVIEW',
    draft: 'DRAFT',
    sent: 'SHARED',
  }[status] || 'DRAFT'
}

function clone(value) {
  return value ? JSON.parse(JSON.stringify(value)) : null
}
