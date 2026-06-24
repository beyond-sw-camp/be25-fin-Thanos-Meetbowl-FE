<template>
  <section class="page">
    <header class="page-header">
      <div>
        <h1>LiveKit STT 테스트</h1>
        <p>회의 페이지를 거치지 않고 room join, 마이크 publish, DataChannel 수신만 빠르게 확인합니다.</p>
      </div>
      <div class="toolbar">
        <button class="secondary-button" type="button" @click="refreshDevices">장치 새로고침</button>
        <button class="danger-button" type="button" @click="disconnect" :disabled="!connected">연결 해제</button>
      </div>
    </header>

    <div class="card grid">
      <form class="form-grid" @submit.prevent="connect">
        <label>LiveKit URL<input v-model.trim="form.url" placeholder="http://localhost:7880"></label>
        <label>Room Name<input v-model.trim="form.roomName" placeholder="stt-test-room"></label>
        <label>API Key<input v-model.trim="form.apiKey" placeholder="devkey"></label>
        <label>API Secret<input v-model.trim="form.apiSecret" type="password" placeholder="local-livekit-secret-change-me-123456"></label>
        <label>Identity<input v-model.trim="form.identity" placeholder="livekit-test"></label>
        <label>표시 이름<input v-model.trim="form.displayName" placeholder="테스트 사용자"></label>
        <label>마이크<AppSelect v-model="form.deviceId"><option value="">기본 마이크</option><option v-for="device in audioInputs" :key="device.deviceId" :value="device.deviceId">{{ device.label }}</option></AppSelect></label>
        <label>Access Token<textarea v-model.trim="form.token" rows="4" placeholder="자동 생성 또는 직접 붙여넣기"></textarea></label>

        <div class="toolbar">
          <button class="secondary-button" type="button" @click="generateToken" :disabled="!form.apiKey || !form.apiSecret || !form.roomName || !form.identity">
            토큰 생성
          </button>
          <button class="primary-button" type="submit" :disabled="connecting || connected">
            {{ connecting ? '연결 중...' : 'Room 연결' }}
          </button>
          <button class="secondary-button" type="button" @click="publishMic" :disabled="!connected || publishing">
            {{ publishing ? '마이크 publish 중...' : (micPublished ? '마이크 다시 publish' : '마이크 publish') }}
          </button>
        </div>
      </form>

      <aside class="card panel">
        <h2>상태</h2>
        <ul class="status-list">
          <li><strong>연결</strong><span>{{ connected ? 'CONNECTED' : 'DISCONNECTED' }}</span></li>
          <li><strong>Room</strong><span>{{ roomName || '-' }}</span></li>
          <li><strong>Local Identity</strong><span>{{ identity || '-' }}</span></li>
          <li><strong>Mic</strong><span>{{ micPublished ? 'PUBLISHED' : 'OFF' }}</span></li>
          <li><strong>DataChannel</strong><span>{{ dataChannelStatus }}</span></li>
        </ul>
      </aside>
    </div>

    <section class="card">
      <header class="section-header">
        <h2>수신 이벤트</h2>
        <button class="secondary-button small" type="button" @click="logs = []">지우기</button>
      </header>
      <div class="log-box">
        <p v-for="line in logs" :key="line.id" class="log-line">
          <small>{{ line.time }}</small>
          <code>{{ line.message }}</code>
        </p>
        <p v-if="!logs.length" class="empty-text">아직 수신된 이벤트가 없습니다.</p>
      </div>
    </section>

    <section class="card">
      <header class="section-header">
        <h2>원문 자막</h2>
        <button class="secondary-button small" type="button" @click="captionMap = new Map()">지우기</button>
      </header>
      <div class="log-box">
        <p
          v-for="caption in orderedCaptions"
          :key="caption.segmentId"
          class="log-line"
        >
          <small>{{ caption.status }}</small>
          <code>{{ caption.text }}</code>
        </p>
        <p v-if="!orderedCaptions.length" class="empty-text">아직 수신된 자막이 없습니다.</p>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import AppSelect from '../../components/common/AppSelect.vue'
import {
  LocalAudioTrack,
  Room,
  RoomEvent,
  Track,
  createLocalAudioTrack,
} from 'livekit-client'
import { sortedCaptions, upsertCaption } from '../../lib/caption-store'

const form = ref({
  url: 'http://localhost:7880',
  apiKey: 'devkey',
  apiSecret: 'local-livekit-secret-change-me-123456',
  token: '',
  roomName: 'stt-test-room',
  identity: 'livekit-test',
  displayName: 'livekit-test',
  deviceId: '',
})

const audioInputs = ref([])
const room = ref(null)
const connected = ref(false)
const connecting = ref(false)
const publishing = ref(false)
const micPublished = ref(false)
const identity = ref('')
const roomName = ref('')
const dataChannelStatus = ref('IDLE')
const logs = ref([])
const captionMap = ref(new Map())

const activeAudioTrack = ref(null)
const orderedCaptions = computed(() => sortedCaptions(captionMap.value))

const timestamp = () => new Date().toLocaleTimeString('ko-KR', { hour12: false })

function base64UrlEncode(input) {
  const bytes = input instanceof Uint8Array ? input : new TextEncoder().encode(String(input))
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

async function hmacSha256(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)))
}

async function generateToken() {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    iss: form.value.apiKey,
    sub: form.value.identity,
    nbf: now - 30,
    exp: now + 60 * 60,
    video: {
      room: form.value.roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    },
  }
  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const unsignedToken = `${encodedHeader}.${encodedPayload}`
  const signature = await hmacSha256(form.value.apiSecret, unsignedToken)
  form.value.token = `${unsignedToken}.${base64UrlEncode(signature)}`
  pushLog(`Token generated room=${form.value.roomName} identity=${form.value.identity}`)
}

function pushLog(message) {
  logs.value.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    time: timestamp(),
    message,
  })
}

function clearActiveAudioTrack() {
  if (activeAudioTrack.value instanceof LocalAudioTrack) {
    activeAudioTrack.value.stop()
  }
  activeAudioTrack.value = null
  micPublished.value = false
}

function isRemoveTrackError(error) {
  const message = error?.message || String(error || '')
  return error?.name === 'InvalidAccessError' || message.includes('removeTrack')
}

async function tryUnpublishActiveAudioTrack() {
  if (!(room.value && activeAudioTrack.value instanceof LocalAudioTrack && micPublished.value)) {
    return false
  }

  try {
    await room.value.localParticipant.unpublishTrack(activeAudioTrack.value)
    return true
  } catch (error) {
    if (!isRemoveTrackError(error)) {
      throw error
    }
    pushLog(`Unpublish skipped: ${error?.message || error}`)
    return false
  }
}

async function refreshDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) return
  const devices = await navigator.mediaDevices.enumerateDevices()
  audioInputs.value = devices
    .filter((device) => device.kind === 'audioinput')
    .map((device, index) => ({ deviceId: device.deviceId, label: device.label || `마이크 ${index + 1}` }))
  if (!audioInputs.value.some((device) => device.deviceId === form.value.deviceId)) {
    form.value.deviceId = audioInputs.value[0]?.deviceId || ''
  }
}

function bindRoomEvents(currentRoom) {
  currentRoom.on(RoomEvent.Reconnecting, () => {
    pushLog('Room reconnecting')
  })
  currentRoom.on(RoomEvent.Reconnected, () => {
    pushLog('Room reconnected')
  })
  currentRoom.on(RoomEvent.ConnectionStateChanged, (state) => {
    pushLog(`ConnectionStateChanged state=${state}`)
  })
  currentRoom.on(RoomEvent.LocalTrackPublished, (publication) => {
    pushLog(`LocalTrackPublished sid=${publication.trackSid || publication.sid || '-'}`)
  })
  currentRoom.on(RoomEvent.LocalTrackUnpublished, (publication) => {
    pushLog(`LocalTrackUnpublished sid=${publication.trackSid || publication.sid || '-'}`)
  })
  currentRoom.on(RoomEvent.TrackSubscribed, (_track, publication, participant) => {
    pushLog(`TrackSubscribed participant=${participant.identity} kind=${publication.kind}`)
  })
  currentRoom.on(RoomEvent.TrackUnsubscribed, (_track, publication, participant) => {
    pushLog(`TrackUnsubscribed participant=${participant.identity} kind=${publication.kind}`)
  })
  currentRoom.on(RoomEvent.DataReceived, (payload, participant) => {
    const text = new TextDecoder().decode(payload)
    pushLog(`DataReceived from=${participant?.identity || 'unknown'} payload=${text}`)
    try {
      const parsed = JSON.parse(text)
      if (parsed?.eventType === 'caption.updated') {
        captionMap.value = upsertCaption(captionMap.value, parsed)
        dataChannelStatus.value = parsed.eventType
      } else if (parsed?.eventType === 'feedback.generated') {
        dataChannelStatus.value = parsed.eventType
      }
    } catch {
      // ignore non-JSON packets
    }
  })
  currentRoom.on(RoomEvent.Disconnected, () => {
    pushLog('Room disconnected')
    connected.value = false
    clearActiveAudioTrack()
    dataChannelStatus.value = 'DISCONNECTED'
  })
}

async function connect() {
  if (connecting.value || connected.value) return
  connecting.value = true
  try {
    if (!form.value.token) {
      await generateToken()
    }
    const nextRoom = new Room({
      adaptiveStream: true,
      dynacast: true,
    })
    bindRoomEvents(nextRoom)
    await nextRoom.connect(form.value.url, form.value.token, {
      autoSubscribe: true,
    })
    room.value = nextRoom
    connected.value = true
    identity.value = nextRoom.localParticipant.identity
    roomName.value = nextRoom.name
    pushLog(`Connected room=${roomName.value} identity=${identity.value}`)
  } catch (error) {
    pushLog(`Connect failed: ${error?.message || error}`)
  } finally {
    connecting.value = false
  }
}

async function publishMic() {
  if (!room.value || publishing.value) return
  publishing.value = true
  try {
    await tryUnpublishActiveAudioTrack()
    clearActiveAudioTrack()

    const track = await createLocalAudioTrack(
      form.value.deviceId ? { deviceId: form.value.deviceId } : undefined,
    )
    activeAudioTrack.value = track
    await room.value.localParticipant.publishTrack(track, {
      source: Track.Source.Microphone,
    })
    micPublished.value = true
    pushLog('Microphone track published')
  } catch (error) {
    clearActiveAudioTrack()
    pushLog(`Publish failed: ${error?.message || error}`)
  } finally {
    publishing.value = false
  }
}

async function disconnect() {
  if (!room.value) return
  try {
    clearActiveAudioTrack()
    room.value.disconnect()
  } finally {
    room.value = null
    connected.value = false
    clearActiveAudioTrack()
    identity.value = ''
    roomName.value = ''
  }
}

onBeforeUnmount(() => {
  disconnect()
})

refreshDevices()
</script>
