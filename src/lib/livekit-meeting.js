const CONNECTION_STORAGE_KEY = 'meetbowl.livekit.connection'

export async function resolveLiveKitConnection(identity, displayName) {
  const params = new URLSearchParams(window.location.search)
  const stored = readStoredConnection()
  const url = params.get('livekitUrl')
    || stored.url
    || import.meta.env.VITE_LIVEKIT_URL
    || 'http://localhost:7880'
  const roomName = params.get('roomName')
    || stored.roomName
    || import.meta.env.VITE_LIVEKIT_ROOM
    || 'stt-test-room'
  let token = params.get('livekitToken')
    || stored.token
    || import.meta.env.VITE_LIVEKIT_TOKEN

  if (!token && import.meta.env.DEV) {
    token = await createDevelopmentToken({
      apiKey: import.meta.env.VITE_LIVEKIT_DEV_API_KEY || 'devkey',
      apiSecret: import.meta.env.VITE_LIVEKIT_DEV_API_SECRET
        || 'local-livekit-secret-change-me-123456',
      roomName,
      identity,
      displayName,
    })
  }
  if (!token) {
    throw new Error('LiveKit 접속 토큰이 없습니다. 회의 접속 정보를 다시 발급받아 주세요.')
  }

  sessionStorage.setItem(
    CONNECTION_STORAGE_KEY,
    JSON.stringify({ url, roomName, token }),
  )
  return { url, roomName, token }
}

function readStoredConnection() {
  try {
    return JSON.parse(sessionStorage.getItem(CONNECTION_STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

async function createDevelopmentToken({
  apiKey,
  apiSecret,
  roomName,
  identity,
  displayName,
}) {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    iss: apiKey,
    sub: identity,
    name: displayName,
    nbf: now - 30,
    exp: now + 60 * 60,
    video: {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    },
  }
  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const unsignedToken = `${encodedHeader}.${encodedPayload}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(unsignedToken)),
  )
  return `${unsignedToken}.${base64UrlEncode(signature)}`
}

function base64UrlEncode(input) {
  const bytes = input instanceof Uint8Array ? input : new TextEncoder().encode(String(input))
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}
