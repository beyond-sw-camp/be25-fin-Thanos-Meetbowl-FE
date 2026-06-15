<template>
  <section v-if="inLobby" class="meeting-lobby">
    <header class="meeting-lobby-header">
      <RouterLink to="/app/meetings" class="brand meeting-lobby-brand">
        <span class="brand-mark">M</span>
        <span>Meetbowl</span>
      </RouterLink>
      <div class="meeting-lobby-actions">
        <button class="secondary-button small" type="button" @click="openGuestLinkDialog">
          공유
        </button>
        <button class="meeting-lobby-close" type="button" @click="router.push('/app/meetings')">
          대기실 나가기
        </button>
      </div>
    </header>

    <main class="meeting-lobby-main">
      <div class="meeting-lobby-intro">
        <span class="badge danger">진행 중</span>
        <h1>{{ meetingTitle }}</h1>
        <p>카메라와 오디오를 확인한 뒤 회의에 입장하세요.</p>
      </div>

      <div class="meeting-lobby-grid">
        <section class="meeting-preview-panel">
          <div class="camera-preview meeting-camera-preview">
            <video
              v-show="cam && hasVideoTrack"
              ref="previewVideo"
              autoplay
              muted
              playsinline
            />
            <div v-if="!cam || !hasVideoTrack" class="camera-placeholder">
              <span>{{ currentParticipantInitial }}</span>
              <p>{{ cameraPlaceholder }}</p>
            </div>

            <span class="preview-participant-name">{{ currentParticipantName }}</span>

            <div class="preview-controls">
              <button
                type="button"
                class="media-control"
                :class="{ off: !mic }"
                :aria-pressed="mic"
                @click="toggleMicrophone"
              >
                {{ mic ? '마이크 켜짐' : '마이크 꺼짐' }}
              </button>
              <button
                type="button"
                class="media-control"
                :class="{ off: !cam }"
                :aria-pressed="cam"
                @click="toggleCamera"
              >
                {{ cam ? '카메라 켜짐' : '카메라 꺼짐' }}
              </button>
            </div>
          </div>

          <p v-if="deviceStatus" class="device-status" :class="{ error: deviceError }">
            {{ deviceStatus }}
          </p>
        </section>

        <aside class="meeting-device-panel">
          <audio ref="speakerTestAudio" autoplay playsinline class="sr-only-audio" />

          <div class="device-panel-heading">
            <div>
              <h2>입장 설정</h2>
              <p>현재 기기에 연결된 장치를 선택하세요.</p>
            </div>
            <button
              type="button"
              class="secondary-button small"
              :disabled="loadingDevices"
              @click="initializeDevices"
            >
              {{ loadingDevices ? '검색 중' : '새로고침' }}
            </button>
          </div>

          <div class="device-fields">
            <label>
              표시 이름
              <input
                v-model="displayName"
                maxlength="30"
                autocomplete="name"
                placeholder="회의에서 표시할 이름"
              >
            </label>

            <label>
              마이크
              <select
                v-model="selectedAudioInput"
                :disabled="!audioInputs.length || loadingDevices"
                @change="restartPreview"
              >
                <option v-if="!audioInputs.length" value="">마이크를 찾을 수 없음</option>
                <option v-for="device in audioInputs" :key="device.deviceId" :value="device.deviceId">
                  {{ device.label }}
                </option>
              </select>
            </label>

            <div class="microphone-test">
              <div class="microphone-test-heading">
                <div>
                  <strong>마이크/스피커 테스트</strong>
                  <small>{{ audioTestMessage }}</small>
                </div>
                <button
                  type="button"
                  class="secondary-button small"
                  :disabled="!hasAudioTrack || !mic"
                  @click="toggleAudioTest"
                >
                  {{ testingAudio ? '테스트 중지' : '테스트 시작' }}
                </button>
              </div>
              <div
                class="microphone-level"
                role="meter"
                aria-label="마이크 입력 레벨"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-valuenow="microphoneLevel"
              >
                <span :style="{ width: `${microphoneLevel}%` }" />
              </div>
              <p class="audio-test-tip">스피커 확인은 이어폰을 연결한 상태에서 테스트하는 편이 안정적입니다.</p>
            </div>

            <label>
              스피커
              <select
                v-model="selectedAudioOutput"
                :disabled="!audioOutputs.length || !supportsSpeakerSelection"
                @change="applySpeaker"
              >
                <option v-if="!audioOutputs.length" value="">기본 스피커</option>
                <option v-for="device in audioOutputs" :key="device.deviceId" :value="device.deviceId">
                  {{ device.label }}
                </option>
              </select>
              <small v-if="!supportsSpeakerSelection">
                이 브라우저에서는 스피커 선택을 지원하지 않습니다.
              </small>
            </label>

            <label>
              카메라
              <select
                v-model="selectedVideoInput"
                :disabled="!videoInputs.length || loadingDevices"
                @change="restartPreview"
              >
                <option v-if="!videoInputs.length" value="">카메라를 찾을 수 없음</option>
                <option v-for="device in videoInputs" :key="device.deviceId" :value="device.deviceId">
                  {{ device.label }}
                </option>
              </select>
            </label>
          </div>

          <div class="selected-device-summary">
            <span>마이크 {{ mic ? '사용' : '음소거' }}</span>
            <span>카메라 {{ cam ? '사용' : '끔' }}</span>
          </div>

          <button
            class="primary-button meeting-enter-button"
            type="button"
            :disabled="loadingDevices || connectingMeeting"
            @click="enterMeeting"
          >
            {{ connectingMeeting ? '회의 연결 중' : '회의 입장' }}
          </button>
        </aside>
      </div>
    </main>
  </section>

  <section v-else class="meeting-room">
    <div class="meeting-main">
      <header class="meeting-room-header">
        <div class="meeting-room-title">
          <strong>{{ meetingTitle }}</strong>
          <small>{{ meetingConnectionStatus }}</small>
        </div>
        <div class="meeting-room-actions">
          <div class="meeting-room-meta">
            <span>{{ participantCount }}명 참여</span>
            <span>{{ elapsedTimeLabel }}</span>
          </div>
          <button class="secondary-button small" type="button" @click="openGuestLinkDialog">
            공유
          </button>
        </div>
      </header>

      <div class="video-grid" :class="{ 'video-grid-screening': hasScreenShareTile }">
        <article
          v-for="tile in participantMediaTiles"
          :key="tile.key"
          class="video-tile"
          :class="{
            'video-tile-screen': tile.type === 'screen',
            'video-tile-local': tile.isLocal,
            'video-tile-placeholder': !tile.track,
          }"
        >
          <video
            v-if="tile.track"
            :ref="setTileMediaRef(tile.key)"
            autoplay
            playsinline
            :muted="tile.isLocal"
          />
          <div v-else class="video-placeholder">
            <span>{{ tile.initials }}</span>
            <p>{{ tile.placeholder }}</p>
          </div>

          <div class="video-tile-badge-row">
            <span v-if="tile.type === 'screen'" class="video-badge accent">화면 공유</span>
            <span v-if="tile.isLocal" class="video-badge">나</span>
            <span v-if="tile.muted" class="video-badge muted">음소거</span>
          </div>
          <em>{{ tile.label }}</em>
        </article>
      </div>

      <footer class="meeting-controls">
        <button class="control" :class="{ off: !mic }" @click="toggleMicrophone">
          {{ mic ? '마이크 켜짐' : '음소거' }}
        </button>
        <button class="control" :class="{ off: !cam }" @click="toggleCamera">
          {{ cam ? '카메라 켜짐' : '카메라 꺼짐' }}
        </button>
        <button class="control" :class="{ active: screenShareEnabled }" @click="toggleScreenShare">
          {{ screenShareEnabled ? '공유 중지' : '화면 공유' }}
        </button>
        <button class="danger-button" @click="endMeeting">회의 종료</button>
      </footer>
    </div>

    <aside class="meeting-side">
      <nav>
        <button :class="{ active: tab === 'stt' }" @click="tab = 'stt'">회의 원문</button>
        <button :class="{ active: tab === 'people' }" @click="tab = 'people'">참석자</button>
        <button :class="{ active: tab === 'chat' }" @click="tab = 'chat'">채팅</button>
      </nav>

      <div v-if="tab === 'stt'" class="side-body meeting-caption-panel">
        <div class="toolbar meeting-caption-toolbar">
          <span class="chip active">원문 자막</span>
          <span class="meeting-caption-status">{{ meetingConnectionStatus }}</span>
        </div>
        <p v-if="sttStatusHint" class="meeting-caption-hint">
          {{ sttStatusHint }}
        </p>
        <div class="meeting-caption-scroll">
          <p
            v-for="caption in orderedCaptions"
            :key="caption.segmentId"
            class="transcript"
            :class="{ streaming: caption.status === 'STREAMING', finalized: caption.status === 'FINALIZED' }"
          >
            <small>
              {{ formatCaptionTime(caption.startedAtMs) }}
              · {{ caption.status === 'FINALIZED' ? '확정' : '말하는 중' }}
            </small>
            {{ caption.text }}
          </p>
          <p v-if="!orderedCaptions.length" class="meeting-caption-empty">
            {{ sttEmptyStateMessage }}
          </p>
        </div>
        <div class="ai-box">
          <strong>AI 실시간 피드백</strong>
          <p>{{ feedbackMessage }}</p>
        </div>
      </div>

      <div v-else-if="tab === 'people'" class="side-body meeting-people-body">
        <p v-for="participant in participantList" :key="participant.key" class="people-row">
          <span class="people-row-name">
            {{ participant.name }}
            <small v-if="participant.isLocal">나</small>
          </span>
          <span class="people-row-status">
            {{ participantStatusLabel(participant) }}
          </span>
        </p>
      </div>

      <div v-else class="side-body chat-body">
        <div ref="chatLog" class="chat-log">
          <article
            v-for="item in chatMessages"
            :key="item.id"
            class="chat-message"
            :class="{ self: item.isSelf, system: item.isSystem }"
          >
            <header>
              <strong>{{ item.senderName }}</strong>
              <small>{{ formatChatTime(item.sentAt) }}</small>
            </header>
            <p>{{ item.content }}</p>
          </article>
          <p v-if="!chatMessages.length" class="meeting-caption-empty">
            아직 채팅이 없습니다. 회의 참여자에게 첫 메시지를 보내보세요.
          </p>
        </div>
        <div class="chat-input">
          <input
            v-model="chatInput"
            placeholder="메시지를 입력하고 Enter로 전송하세요"
            maxlength="300"
            :disabled="!meetingRoom || sendingChat"
            @compositionstart="chatInputComposing = true"
            @compositionend="chatInputComposing = false"
            @keydown.enter="handleChatEnter"
          >
          <button :disabled="!meetingRoom || !chatInput.trim() || sendingChat" @click="sendChat">
            {{ sendingChat ? '전송 중' : '전송' }}
          </button>
        </div>
      </div>
    </aside>
  </section>

  <div v-if="guestLinkDialogOpen" class="modal-backdrop" @click.self="closeGuestLinkDialog">
    <section class="write-modal guest-link-modal" aria-label="게스트 링크">
      <header>
        <div>
          <h2>게스트 링크</h2>
          <p class="guest-link-note">
            로그인하지 않은 사용자가 회의에 들어올 수 있는 공개 링크를 복사합니다.
          </p>
        </div>
        <button type="button" @click="closeGuestLinkDialog">닫기</button>
      </header>

      <label class="guest-link-field">
        공유 링크
        <input ref="guestLinkInput" :value="guestMeetingLink" readonly @focus="$event.target.select()">
      </label>

      <p class="guest-link-note">
        이 링크는 현재 회의 ID를 기준으로 생성되며, 대기실과 회의실에서 같은 주소를 복사합니다.
      </p>

      <footer class="guest-link-footer">
        <span class="share-copy-status">{{ guestLinkCopyStatus }}</span>
        <div class="guest-link-actions">
          <button class="secondary-button" type="button" @click="closeGuestLinkDialog">취소</button>
          <button class="primary-button" type="button" @click="copyGuestMeetingLink">
            링크 복사
          </button>
        </div>
      </footer>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { Room, RoomEvent, Track } from 'livekit-client'
import { useRoute, useRouter } from 'vue-router'
import { sortedCaptions, upsertCaption } from '../../lib/caption-store'
import { guestMeetingRoute } from '../../lib/meeting-route'
import { resolveLiveKitConnection } from '../../lib/livekit-meeting'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const inLobby = ref(true)
const mic = ref(true)
const cam = ref(true)
const tab = ref('stt')
const chatInput = ref('')
const displayName = ref(auth.user?.name || '')
const previewVideo = ref(null)
const speakerTestAudio = ref(null)
const chatLog = ref(null)
const chatInputComposing = ref(false)
const guestLinkDialogOpen = ref(false)
const guestLinkCopyStatus = ref('게스트 링크를 공유할 수 있습니다.')
const guestLinkInput = ref(null)
const previewStream = ref(null)
const audioInputs = ref([])
const audioOutputs = ref([])
const videoInputs = ref([])
const selectedAudioInput = ref('')
const selectedAudioOutput = ref('')
const selectedVideoInput = ref('')
const loadingDevices = ref(false)
const deviceStatus = ref('')
const deviceError = ref(false)
const testingAudio = ref(false)
const microphoneLevel = ref(0)
const connectingMeeting = ref(false)
const meetingRoom = ref(null)
const meetingConnectionStatus = ref('연결 대기')
const meetingConnectionError = ref('')
const feedbackMessage = ref('실시간 피드백이 도착하면 여기에 표시됩니다.')
const lastCaptionReceivedAt = ref(null)
const lastCaptionText = ref('')
const captionMap = ref(new Map())
const participantStateMap = ref(new Map())
const chatMessages = ref([])
const sendingChat = ref(false)
const connectedAt = ref(null)
const screenShareEnabled = ref(false)
const meetingConnection = ref(null)

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()
const tileMediaElements = new Map()
const tileTrackBindings = new Map()
const remoteAudioBindings = new Map()
let mediaSyncQueued = false
let audioContext = null
let microphoneAnalyser = null
let microphoneSource = null
let microphoneAnimationFrame = null
let speakerTestStream = null
let speakerTestTrack = null
let elapsedTimer = null
const elapsedSeconds = ref(0)

const meetingTitle = computed(() => {
  const titleFromRoute = typeof route.query.title === 'string' ? route.query.title.trim() : ''
  return titleFromRoute || 'Q2 캠페인 킥오프'
})
const meetingId = computed(() => String(route.params.meetingId || '').trim())
const guestMeetingLink = computed(() => {
  if (!meetingId.value) return ''
  const path = guestMeetingRoute(meetingId.value)
  if (typeof window === 'undefined') return path
  return new URL(path, window.location.origin).toString()
})
const hasVideoTrack = computed(() => Boolean(previewStream.value?.getVideoTracks().length))
const hasAudioTrack = computed(() => Boolean(previewStream.value?.getAudioTracks().length))
const currentParticipantName = computed(() => displayName.value.trim() || auth.user?.name || '참석자')
const currentParticipantInitial = computed(() => initialsFromName(currentParticipantName.value))
const orderedCaptions = computed(() => sortedCaptions(captionMap.value))
const supportsSpeakerSelection = computed(() =>
  typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype,
)
const cameraPlaceholder = computed(() => {
  if (!cam.value) return '카메라가 꺼져 있습니다.'
  if (loadingDevices.value) return '카메라를 연결하고 있습니다.'
  return '사용 가능한 카메라가 없습니다.'
})
const audioTestMessage = computed(() => {
  if (!mic.value) return '마이크를 켜야 테스트할 수 있습니다.'
  if (!hasAudioTrack.value) return '사용 가능한 마이크가 없습니다.'
  if (testingAudio.value) return '말하면 입력 레벨이 움직이고 선택한 스피커로 들립니다.'
  return '선택한 마이크 입력과 스피커 재생을 함께 확인합니다.'
})
const participantList = computed(() =>
  Array.from(participantStateMap.value.values()).sort((left, right) => {
    if (left.isLocal !== right.isLocal) return left.isLocal ? -1 : 1
    return left.name.localeCompare(right.name, 'ko')
  }),
)
const participantCount = computed(() => participantList.value.length)
const participantMediaTiles = computed(() => {
  const tiles = []

  participantList.value.forEach((participant) => {
    const base = {
      isLocal: participant.isLocal,
      initials: initialsFromName(participant.name),
      muted: !participant.micEnabled,
    }

    if (participant.screenTrack || participant.screenShareEnabled) {
      tiles.push({
        ...base,
        key: `${participant.key}:screen`,
        type: 'screen',
        track: participant.screenTrack,
        label: `${participant.name} 화면`,
        placeholder: '화면을 공유하는 중입니다.',
      })
    }

    if (participant.cameraTrack || participant.cameraEnabled) {
      tiles.push({
        ...base,
        key: `${participant.key}:camera`,
        type: 'camera',
        track: participant.cameraTrack,
        label: participant.name,
        placeholder: '카메라를 준비하는 중입니다.',
      })
    }

    if (!participant.screenTrack && !participant.screenShareEnabled && !participant.cameraTrack && !participant.cameraEnabled) {
      tiles.push({
        ...base,
        key: `${participant.key}:placeholder`,
        type: 'placeholder',
        track: null,
        label: participant.name,
        placeholder: '카메라가 꺼져 있습니다.',
      })
    }
  })

  return tiles
})
const hasScreenShareTile = computed(() => participantMediaTiles.value.some((tile) => tile.type === 'screen'))
const elapsedTimeLabel = computed(() => {
  const hours = String(Math.floor(elapsedSeconds.value / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((elapsedSeconds.value % 3600) / 60)).padStart(2, '0')
  const seconds = String(elapsedSeconds.value % 60).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
})
const sttEmptyStateMessage = computed(() => {
  if (meetingConnectionError.value) return meetingConnectionError.value
  if (!meetingRoom.value) return '회의 연결이 완료되면 원문 자막이 여기에 표시됩니다.'
  if (orderedCaptions.value.length > 0) return ''
  if (!mic.value) return '마이크가 꺼져 있어서 자막이 생성되지 않습니다.'
  if (lastCaptionReceivedAt.value) {
    return `마지막 자막 수신: ${formatCaptionReceivedTime(lastCaptionReceivedAt.value)}`
  }
  return 'STT 세션은 준비되었습니다. 아직 음성이 감지되지 않았거나 자막이 도착하지 않았습니다.'
})
const sttStatusHint = computed(() => {
  if (!meetingRoom.value) return ''
  if (orderedCaptions.value.length > 0) {
    return lastCaptionText.value ? `마지막 수신 문장: ${lastCaptionText.value}` : ''
  }
  if (!mic.value) return '마이크가 꺼져 있으면 STT가 문장을 만들 수 없습니다.'
  if (lastCaptionReceivedAt.value) return '자막은 수신됐지만 아직 화면에 고정된 문장이 없습니다.'
  return '마이크 입력을 기다리는 중입니다. 발화가 들어오면 자막이 표시됩니다.'
})

function initialsFromName(name) {
  return (name || '참석자').trim().slice(0, 1) || '참'
}

function normalizeParticipantIdentity(identity) {
  return String(identity || '').trim()
}

function currentParticipantIdentity() {
  return normalizeParticipantIdentity(meetingConnection.value?.participantIdentity || '')
}

function openGuestLinkDialog() {
  guestLinkCopyStatus.value = '게스트 링크를 확인하고 복사할 수 있습니다.'
  guestLinkDialogOpen.value = true
}

function closeGuestLinkDialog() {
  guestLinkDialogOpen.value = false
}

async function copyGuestMeetingLink() {
  if (!guestMeetingLink.value) {
    guestLinkCopyStatus.value = '회의 링크를 만들 수 없습니다.'
    return
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(guestMeetingLink.value)
    } else if (guestLinkInput.value) {
      guestLinkInput.value.focus()
      guestLinkInput.value.select()
      document.execCommand('copy')
    } else {
      throw new Error('clipboard unavailable')
    }
    guestLinkCopyStatus.value = '게스트 링크를 복사했습니다.'
  } catch {
    guestLinkCopyStatus.value = '복사에 실패했습니다. 링크를 직접 선택해 복사하세요.'
  }
}

function stopAudioTest() {
  if (microphoneAnimationFrame) cancelAnimationFrame(microphoneAnimationFrame)
  microphoneAnimationFrame = null
  microphoneSource?.disconnect()
  microphoneAnalyser?.disconnect()
  microphoneSource = null
  microphoneAnalyser = null
  speakerTestTrack?.stop()
  speakerTestTrack = null
  speakerTestStream = null
  if (speakerTestAudio.value) {
    speakerTestAudio.value.pause()
    speakerTestAudio.value.srcObject = null
  }
  if (audioContext) audioContext.close()
  audioContext = null
  microphoneLevel.value = 0
  testingAudio.value = false
}

function formatCaptionReceivedTime(timestampMs) {
  return new Date(timestampMs).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function stopPreview() {
  stopAudioTest()
  previewStream.value?.getTracks().forEach((track) => track.stop())
  previewStream.value = null
  if (previewVideo.value) previewVideo.value.srcObject = null
}

function deviceLabel(device, index, fallback) {
  return device.label || `${fallback} ${index + 1}`
}

async function loadDeviceList() {
  const devices = await navigator.mediaDevices.enumerateDevices()
  audioInputs.value = devices
    .filter((device) => device.kind === 'audioinput')
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: deviceLabel(device, index, '마이크'),
    }))
  audioOutputs.value = devices
    .filter((device) => device.kind === 'audiooutput')
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: deviceLabel(device, index, '스피커'),
    }))
  videoInputs.value = devices
    .filter((device) => device.kind === 'videoinput')
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: deviceLabel(device, index, '카메라'),
    }))

  if (!audioInputs.value.some((device) => device.deviceId === selectedAudioInput.value)) {
    selectedAudioInput.value = audioInputs.value[0]?.deviceId || ''
  }
  if (!audioOutputs.value.some((device) => device.deviceId === selectedAudioOutput.value)) {
    selectedAudioOutput.value = audioOutputs.value[0]?.deviceId || ''
  }
  if (!videoInputs.value.some((device) => device.deviceId === selectedVideoInput.value)) {
    selectedVideoInput.value = videoInputs.value[0]?.deviceId || ''
  }
}

async function restartPreview() {
  if (!navigator.mediaDevices?.getUserMedia) return

  stopAudioTest()
  stopPreview()
  const constraints = {
    audio: selectedAudioInput.value
      ? { deviceId: { exact: selectedAudioInput.value } }
      : audioInputs.value.length > 0,
    video: selectedVideoInput.value
      ? { deviceId: { exact: selectedVideoInput.value } }
      : videoInputs.value.length > 0,
  }

  if (!constraints.audio && !constraints.video) {
    deviceError.value = true
    deviceStatus.value = '연결된 마이크와 카메라를 찾을 수 없습니다.'
    return
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    stream.getAudioTracks().forEach((track) => {
      track.enabled = mic.value
    })
    stream.getVideoTracks().forEach((track) => {
      track.enabled = cam.value
    })
    previewStream.value = stream
    await nextTick()
    if (previewVideo.value) {
      previewVideo.value.srcObject = stream
      await applySpeaker()
    }
    deviceError.value = false
    deviceStatus.value = '장치가 연결되었습니다.'
  } catch (error) {
    deviceError.value = true
    deviceStatus.value = mediaErrorMessage(error)
  }
}

async function initializeDevices() {
  if (!navigator.mediaDevices?.enumerateDevices || !navigator.mediaDevices?.getUserMedia) {
    deviceError.value = true
    deviceStatus.value = '이 브라우저에서는 미디어 장치 접근을 지원하지 않습니다.'
    return
  }

  loadingDevices.value = true
  deviceError.value = false
  deviceStatus.value = '마이크와 카메라 권한을 확인하고 있습니다.'

  try {
    const permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
    permissionStream.getTracks().forEach((track) => track.stop())
    await loadDeviceList()
    await restartPreview()
  } catch (error) {
    await loadDeviceList()
    deviceError.value = true
    deviceStatus.value = mediaErrorMessage(error)
  } finally {
    loadingDevices.value = false
  }
}

function mediaErrorMessage(error) {
  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
    return '마이크와 카메라 권한이 필요합니다. 브라우저 주소창의 권한 설정을 확인하세요.'
  }
  if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
    return '사용 가능한 마이크 또는 카메라를 찾을 수 없습니다.'
  }
  if (error?.name === 'NotReadableError' || error?.name === 'TrackStartError') {
    return '다른 앱에서 장치를 사용 중입니다. 장치를 닫고 다시 시도하세요.'
  }
  return '미디어 장치를 불러오지 못했습니다. 연결 상태를 확인하고 다시 시도하세요.'
}

async function applyOutputDevice(element) {
  if (!element || !supportsSpeakerSelection.value || !selectedAudioOutput.value) return
  try {
    await element.setSinkId(selectedAudioOutput.value)
  } catch {
    deviceError.value = true
    deviceStatus.value = '선택한 스피커를 사용할 수 없습니다. 브라우저 설정을 확인하세요.'
  }
}

async function applySpeaker() {
  await applyOutputDevice(previewVideo.value)
  await applyOutputDevice(speakerTestAudio.value)

  await Promise.all(
    Array.from(remoteAudioBindings.values()).map(({ element }) => applyOutputDevice(element)),
  )
}

async function toggleAudioTest() {
  if (testingAudio.value) {
    stopAudioTest()
    return
  }

  const audioTrack = previewStream.value?.getAudioTracks()[0]
  if (!audioTrack || !mic.value) return

  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) {
    deviceError.value = true
    deviceStatus.value = '이 브라우저에서는 오디오 테스트를 지원하지 않습니다.'
    return
  }

  speakerTestTrack = audioTrack.clone()
  speakerTestTrack.enabled = true
  speakerTestStream = new MediaStream([speakerTestTrack])
  audioContext = new AudioContextClass()
  await audioContext.resume()
  microphoneSource = audioContext.createMediaStreamSource(speakerTestStream)
  microphoneAnalyser = audioContext.createAnalyser()
  microphoneAnalyser.fftSize = 256
  microphoneAnalyser.smoothingTimeConstant = 0.75
  microphoneSource.connect(microphoneAnalyser)
  let started = true
  if (speakerTestAudio.value) {
    speakerTestAudio.value.srcObject = speakerTestStream
    await applyOutputDevice(speakerTestAudio.value)
    await speakerTestAudio.value.play().catch(() => {
      started = false
      deviceError.value = true
      deviceStatus.value = '오디오 테스트를 시작하지 못했습니다. 브라우저 자동 재생 설정을 확인하세요.'
    })
  }
  if (!started) {
    stopAudioTest()
    return
  }
  testingAudio.value = true

  const samples = new Uint8Array(microphoneAnalyser.fftSize)
  const updateLevel = () => {
    if (!microphoneAnalyser) return
    microphoneAnalyser.getByteTimeDomainData(samples)
    const sum = samples.reduce((total, sample) => {
      const normalized = (sample - 128) / 128
      return total + normalized * normalized
    }, 0)
    const rootMeanSquare = Math.sqrt(sum / samples.length)
    microphoneLevel.value = Math.min(100, Math.round(rootMeanSquare * 320))
    microphoneAnimationFrame = requestAnimationFrame(updateLevel)
  }
  updateLevel()
}

function createParticipantState(participant, isLocal, previousState) {
  const videoPublications = Array.from(participant.videoTrackPublications.values())
  const audioPublications = Array.from(participant.audioTrackPublications.values())
  const cameraPublication = videoPublications.find((publication) => publication.source === Track.Source.Camera)
  const screenPublication = videoPublications.find((publication) => publication.source === Track.Source.ScreenShare)
  const microphonePublication = audioPublications.find((publication) => publication.source === Track.Source.Microphone)

  return {
    key: participant.identity || (isLocal ? 'local-participant' : crypto.randomUUID()),
    identity: participant.identity || previousState?.identity || '',
    name: participant.name || previousState?.name || '참석자',
    isLocal,
    joinedAt: previousState?.joinedAt || Date.now(),
    micEnabled: microphonePublication ? !microphonePublication.isMuted : (isLocal ? mic.value : false),
    cameraEnabled: cameraPublication ? !cameraPublication.isMuted : (isLocal ? cam.value : false),
    screenShareEnabled: screenPublication ? !screenPublication.isMuted : (isLocal ? screenShareEnabled.value : false),
    cameraTrack: cameraPublication?.videoTrack || null,
    screenTrack: screenPublication?.videoTrack || null,
  }
}

function syncParticipantsFromRoom(room = meetingRoom.value) {
  if (!room) {
    participantStateMap.value = new Map()
    screenShareEnabled.value = false
    queueMediaSync()
    return
  }

  const nextStateMap = new Map()
  const previousStateMap = participantStateMap.value

  const localIdentity = room.localParticipant.identity || meetingConnection.value?.participantIdentity || 'local-participant'
  const localPrevious = previousStateMap.get(localIdentity)
  nextStateMap.set(localIdentity, createParticipantState(room.localParticipant, true, localPrevious))

  Array.from(room.remoteParticipants.values()).forEach((participant) => {
    const previousState = previousStateMap.get(participant.identity)
    nextStateMap.set(participant.identity, createParticipantState(participant, false, previousState))
  })

  participantStateMap.value = nextStateMap
  screenShareEnabled.value = nextStateMap.get(localIdentity)?.screenShareEnabled || false
  queueMediaSync()
}

function cleanupTileBinding(tileKey) {
  const binding = tileTrackBindings.get(tileKey)
  const element = tileMediaElements.get(tileKey)
  if (binding?.track && element) {
    binding.track.detach(element)
  }
  tileTrackBindings.delete(tileKey)
}

function queueMediaSync() {
  if (mediaSyncQueued) return
  mediaSyncQueued = true
  nextTick(() => {
    mediaSyncQueued = false
    syncTileMediaElements()
  })
}

function syncTileMediaElements() {
  const currentTiles = new Map(participantMediaTiles.value.map((tile) => [tile.key, tile]))

  Array.from(tileTrackBindings.keys()).forEach((tileKey) => {
    if (!currentTiles.has(tileKey)) cleanupTileBinding(tileKey)
  })

  currentTiles.forEach((tile, tileKey) => {
    const element = tileMediaElements.get(tileKey)
    if (!element) return

    const previousBinding = tileTrackBindings.get(tileKey)
    if (!tile.track) {
      if (previousBinding?.track) previousBinding.track.detach(element)
      tileTrackBindings.delete(tileKey)
      element.srcObject = null
      return
    }

    const nextTrackId = tile.track.sid || tile.track.mediaStreamTrack.id
    if (previousBinding?.trackId === nextTrackId) return

    if (previousBinding?.track) previousBinding.track.detach(element)
    tile.track.attach(element)
    element.autoplay = true
    element.playsInline = true
    element.muted = tile.isLocal
    tileTrackBindings.set(tileKey, { track: tile.track, trackId: nextTrackId })
  })
}

function setTileMediaRef(tileKey) {
  return (element) => {
    if (!element) {
      cleanupTileBinding(tileKey)
      tileMediaElements.delete(tileKey)
      return
    }

    tileMediaElements.set(tileKey, element)
    queueMediaSync()
  }
}

async function attachRemoteAudioTrack(track) {
  const bindingKey = track.sid || track.mediaStreamTrack.id
  if (remoteAudioBindings.has(bindingKey)) return

  const element = track.attach()
  element.autoplay = true
  element.playsInline = true
  element.className = 'sr-only-audio'
  await applyOutputDevice(element)
  document.body.appendChild(element)
  remoteAudioBindings.set(bindingKey, { track, element })
}

function detachRemoteAudioTrack(track) {
  const bindingKey = track.sid || track.mediaStreamTrack.id
  const binding = remoteAudioBindings.get(bindingKey)
  if (!binding) return

  binding.track.detach(binding.element)
  binding.element.remove()
  remoteAudioBindings.delete(bindingKey)
}

function clearRemoteAudioBindings() {
  Array.from(remoteAudioBindings.values()).forEach(({ track, element }) => {
    track.detach(element)
    element.remove()
  })
  remoteAudioBindings.clear()
}

function resetMeetingSessionState() {
  captionMap.value = new Map()
  participantStateMap.value = new Map()
  chatMessages.value = []
  feedbackMessage.value = '실시간 피드백이 도착하면 여기에 표시됩니다.'
  lastCaptionReceivedAt.value = null
  lastCaptionText.value = ''
  meetingConnectionError.value = ''
  screenShareEnabled.value = false
  meetingConnection.value = null
  connectedAt.value = null
  elapsedSeconds.value = 0
  clearInterval(elapsedTimer)
  elapsedTimer = null
  Array.from(tileTrackBindings.keys()).forEach((tileKey) => cleanupTileBinding(tileKey))
  tileMediaElements.clear()
  clearRemoteAudioBindings()
}

function startElapsedTimer() {
  clearInterval(elapsedTimer)
  elapsedTimer = setInterval(() => {
    if (!connectedAt.value) return
    elapsedSeconds.value = Math.max(0, Math.floor((Date.now() - connectedAt.value) / 1000))
  }, 1000)
}

async function toggleMicrophone() {
  mic.value = !mic.value
  previewStream.value?.getAudioTracks().forEach((track) => {
    track.enabled = mic.value
  })

  if (!meetingRoom.value?.localParticipant) {
    if (!mic.value) stopAudioTest()
    return
  }

  await meetingRoom.value.localParticipant.setMicrophoneEnabled(
    mic.value,
    selectedAudioInput.value ? { deviceId: selectedAudioInput.value } : undefined,
  ).catch((error) => {
    meetingConnectionError.value = error?.message || '마이크 상태를 변경하지 못했습니다.'
  })
  syncParticipantsFromRoom()

  if (!mic.value) stopAudioTest()
}

async function toggleCamera() {
  cam.value = !cam.value
  previewStream.value?.getVideoTracks().forEach((track) => {
    track.enabled = cam.value
  })

  if (!meetingRoom.value?.localParticipant) return

  await meetingRoom.value.localParticipant.setCameraEnabled(
    cam.value,
    selectedVideoInput.value ? { deviceId: selectedVideoInput.value } : undefined,
    { source: Track.Source.Camera },
  ).catch((error) => {
    meetingConnectionError.value = error?.message || '카메라 상태를 변경하지 못했습니다.'
  })
  syncParticipantsFromRoom()
}

async function toggleScreenShare() {
  if (!meetingRoom.value?.localParticipant) return

  meetingConnectionError.value = ''
  const nextEnabled = !screenShareEnabled.value
  await meetingRoom.value.localParticipant.setScreenShareEnabled(
    nextEnabled,
    { audio: false },
    { source: Track.Source.ScreenShare },
  ).catch((error) => {
    meetingConnectionError.value = error?.message || '화면 공유를 변경하지 못했습니다.'
  })
  syncParticipantsFromRoom()
}

async function enterMeeting() {
  if (connectingMeeting.value) return
  connectingMeeting.value = true
  meetingConnectionError.value = ''
  stopPreview()
  inLobby.value = false

  try {
    await connectMeetingRoom()
  } catch (error) {
    meetingConnectionStatus.value = '연결 실패'
    meetingConnectionError.value = error?.message || '회의 연결에 실패했습니다.'
    inLobby.value = true
    await restartPreview().catch(() => {})
  } finally {
    connectingMeeting.value = false
  }
}

async function connectMeetingRoom() {
  await disconnectMeetingRoom()
  const connection = await resolveLiveKitConnection({
    meetingId: meetingId.value,
    participantIdentity: auth.user?.id || '',
    displayName: currentParticipantName.value,
  })

  meetingConnection.value = connection
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
  })
  bindMeetingRoomEvents(room)
  meetingConnectionStatus.value = '연결 중'
  await room.connect(connection.url, connection.token, {
    autoSubscribe: true,
  })

  meetingRoom.value = room
  connectedAt.value = Date.now()
  startElapsedTimer()

  if (mic.value) {
    await room.localParticipant.setMicrophoneEnabled(
      true,
      selectedAudioInput.value ? { deviceId: selectedAudioInput.value } : undefined,
      { source: Track.Source.Microphone },
    )
  }

  if (cam.value) {
    await room.localParticipant.setCameraEnabled(
      true,
      selectedVideoInput.value ? { deviceId: selectedVideoInput.value } : undefined,
      { source: Track.Source.Camera },
    )
  }

  syncParticipantsFromRoom(room)
  meetingConnectionStatus.value = '회의 연결됨'
  pushSystemChat('회의에 입장했습니다.')
}

function bindMeetingRoomEvents(room) {
  room.on(RoomEvent.ParticipantConnected, () => {
    syncParticipantsFromRoom(room)
  })
  room.on(RoomEvent.ParticipantDisconnected, () => {
    syncParticipantsFromRoom(room)
  })
  room.on(RoomEvent.LocalTrackPublished, () => {
    syncParticipantsFromRoom(room)
  })
  room.on(RoomEvent.LocalTrackUnpublished, () => {
    syncParticipantsFromRoom(room)
  })
  room.on(RoomEvent.TrackSubscribed, async (track) => {
    if (track.kind === Track.Kind.Audio) {
      await attachRemoteAudioTrack(track).catch(() => {})
    }
    syncParticipantsFromRoom(room)
  })
  room.on(RoomEvent.TrackUnsubscribed, (track) => {
    if (track.kind === Track.Kind.Audio) {
      detachRemoteAudioTrack(track)
    }
    syncParticipantsFromRoom(room)
  })
  room.on(RoomEvent.TrackMuted, () => {
    syncParticipantsFromRoom(room)
  })
  room.on(RoomEvent.TrackUnmuted, () => {
    syncParticipantsFromRoom(room)
  })
  room.on(RoomEvent.DataReceived, (payload, participant) => {
    handleDataChannelMessage(payload, participant)
  })
  room.on(RoomEvent.Reconnecting, () => {
    meetingConnectionStatus.value = '재연결 중'
  })
  room.on(RoomEvent.Reconnected, () => {
    meetingConnectionStatus.value = '회의 연결됨'
    syncParticipantsFromRoom(room)
  })
  room.on(RoomEvent.Disconnected, () => {
    meetingConnectionStatus.value = '연결 종료'
    resetMeetingSessionState()
  })
}

function handleDataChannelMessage(payload, participant) {
  try {
    const event = JSON.parse(textDecoder.decode(payload))

    if (event?.eventType === 'caption.updated') {
      captionMap.value = upsertCaption(captionMap.value, event)
      lastCaptionReceivedAt.value = Date.now()
      lastCaptionText.value = event.text || event.sourceText || event.sourceTranscript || ''
      return
    }

    if (event?.eventType === 'chat.message.sent') {
      // DataChannel sender identity와 payload 값이 다를 수 있어 현재 room participant identity를 기준으로 자기 메시지를 판별한다.
      const senderIdentity = normalizeParticipantIdentity(
        participant?.identity || event.senderParticipantIdentity || event.senderUserId,
      )
      const isSelf = senderIdentity === currentParticipantIdentity()
      pushChatMessage({
        id: event.messageId,
        senderName: event.senderName || '참석자',
        senderUserId: event.senderUserId || senderIdentity,
        content: event.content || '',
        sentAt: event.sentAt || new Date().toISOString(),
        isSelf,
        isSystem: false,
      })
      return
    }

    if (event?.eventType === 'feedback.generated' || event?.eventType === 'meeting.feedback.generated') {
      feedbackMessage.value = event.payload?.message || event.message || feedbackMessage.value
      return
    }

    if (event?.eventType === 'stt.status.changed') {
      const nextStatus = event.payload?.status || event.status
      if (nextStatus) {
        meetingConnectionStatus.value = `STT ${nextStatus}`
      }
    }
  } catch {
    // Ignore non-JSON DataChannel packets.
  }
}

function pushChatMessage(message) {
  if (!message.content?.trim()) return

  if (chatMessages.value.some((item) => item.id === message.id)) return

  chatMessages.value.push(message)
  nextTick(() => {
    if (!chatLog.value) return
    chatLog.value.scrollTop = chatLog.value.scrollHeight
  })
}

function pushSystemChat(content) {
  pushChatMessage({
    id: `system-${Date.now()}`,
    senderName: '시스템',
    senderUserId: 'system',
    content,
    sentAt: new Date().toISOString(),
    isSelf: false,
    isSystem: true,
  })
}

async function sendChat() {
  const content = chatInput.value.trim()
  if (!content || !meetingRoom.value?.localParticipant || sendingChat.value) return

  sendingChat.value = true
  const message = {
    eventType: 'chat.message.sent',
    messageId: crypto.randomUUID(),
    meetingId: meetingId.value,
    senderUserId: auth.user?.id || meetingConnection.value?.participantIdentity || 'guest',
    senderParticipantIdentity: currentParticipantIdentity(),
    senderName: currentParticipantName.value,
    content,
    sentAt: new Date().toISOString(),
  }

  // 같은 입력이 enter/click으로 거의 동시에 두 번 들어오는 상황을 막기 위해 입력창은 전송 전에 비운다.
  chatInput.value = ''
  await meetingRoom.value.localParticipant.publishData(
    textEncoder.encode(JSON.stringify(message)),
    { reliable: true },
  ).then(() => {
    pushChatMessage({
      id: message.messageId,
      senderName: message.senderName,
      senderUserId: message.senderUserId,
      content: message.content,
      sentAt: message.sentAt,
      isSelf: true,
      isSystem: false,
    })
  }).catch((error) => {
    chatInput.value = content
    meetingConnectionError.value = error?.message || '채팅을 전송하지 못했습니다.'
  }).finally(() => {
    sendingChat.value = false
  })
}

function handleChatEnter(event) {
  // 한글 IME 조합 중 Enter는 입력 확정이므로 전송으로 해석하지 않는다.
  if (chatInputComposing.value || event.isComposing || event.keyCode === 229) {
    return
  }
  event.preventDefault()
  void sendChat()
}

async function disconnectMeetingRoom() {
  const room = meetingRoom.value
  meetingRoom.value = null
  if (!room) {
    resetMeetingSessionState()
    return
  }

  await room.localParticipant.setScreenShareEnabled(false).catch(() => {})
  await room.localParticipant.setMicrophoneEnabled(false).catch(() => {})
  await room.localParticipant.setCameraEnabled(false).catch(() => {})
  room.disconnect()
  resetMeetingSessionState()
}

async function endMeeting() {
  await disconnectMeetingRoom()
  router.push('/app/minutes')
}

function formatCaptionTime(startedAtMs) {
  const totalSeconds = Math.max(0, Math.floor((startedAtMs || 0) / 1000))
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

function formatChatTime(timestamp) {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function participantStatusLabel(participant) {
  const statuses = []
  statuses.push(participant.micEnabled ? '마이크 켜짐' : '음소거')
  statuses.push(participant.cameraEnabled ? '카메라 켜짐' : '카메라 꺼짐')
  if (participant.screenShareEnabled) statuses.push('화면 공유')
  return statuses.join(' · ')
}

function handleDeviceChange() {
  loadDeviceList().then(() => {
    if (inLobby.value) {
      return restartPreview()
    }
    return undefined
  }).catch(() => {
    deviceError.value = true
    deviceStatus.value = '장치 목록을 갱신하지 못했습니다.'
  })
}

onMounted(() => {
  initializeDevices()
  navigator.mediaDevices?.addEventListener?.('devicechange', handleDeviceChange)
})

onBeforeUnmount(() => {
  navigator.mediaDevices?.removeEventListener?.('devicechange', handleDeviceChange)
  clearInterval(elapsedTimer)
  stopPreview()
  void disconnectMeetingRoom()
})
</script>
