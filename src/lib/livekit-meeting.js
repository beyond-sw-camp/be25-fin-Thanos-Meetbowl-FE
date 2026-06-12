import { postJson } from './api-client'

const CONNECTION_STORAGE_KEY = 'meetbowl.livekit.connection'

/**
 * 회의 입장에 필요한 LiveKit 접속 정보는 항상 meetbowl-be에서 발급받는다.
 *
 * 브라우저는 더 이상 API secret을 알지 못하며, 이전처럼 query/env 값으로 JWT를 합성하지 않는다.
 */
export async function resolveLiveKitConnection({ meetingId, participantIdentity, displayName }) {
  if (!meetingId) {
    throw new Error('회의 ID가 없어 접속 정보를 발급받을 수 없습니다.')
  }

  const stored = readStoredConnection()
  if (stored.meetingId === meetingId && stored.token && stored.url) {
    return stored
  }

  const connection = await postJson(`/meetings/${meetingId}/join`, {
    displayName,
    participantIdentity,
  })

  const resolved = {
    meetingId,
    roomName: connection.roomName,
    url: connection.livekitUrl,
    token: connection.token,
    participantIdentity: connection.participantIdentity,
    participantName: connection.participantName,
  }

  sessionStorage.setItem(CONNECTION_STORAGE_KEY, JSON.stringify(resolved))
  return resolved
}

function readStoredConnection() {
  try {
    return JSON.parse(sessionStorage.getItem(CONNECTION_STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}
