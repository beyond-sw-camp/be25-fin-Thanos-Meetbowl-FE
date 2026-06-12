<template>
  <section v-if="inLobby" class="meeting-lobby">
    <header class="meeting-lobby-header">
      <RouterLink to="/app/meetings" class="brand meeting-lobby-brand">
        <span class="brand-mark">M</span>
        <span>Meetbowl</span>
      </RouterLink>
      <button class="meeting-lobby-close" type="button" @click="router.push('/app/meetings')">
        대기실 나가기
      </button>
    </header>

    <main class="meeting-lobby-main">
      <div class="meeting-lobby-intro">
        <span class="badge danger">진행 중</span>
        <h1>Q2 캠페인 킥오프</h1>
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
      <header><strong>Q2 캠페인 킥오프</strong><span>01:24:08</span></header>
      <div class="video-grid">
        <div v-for="name in participants" :key="name" class="video-tile">
          <span>{{ name[0] }}</span><em>{{ name }}</em>
        </div>
      </div>
      <footer>
        <button class="control" @click="toggleMicrophone">{{ mic ? '마이크' : '음소거' }}</button>
        <button class="control" @click="toggleCamera">{{ cam ? '카메라' : '카메라 꺼짐' }}</button>
        <button class="control">화면 공유</button>
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
            {{ meetingConnectionError || '말을 시작하면 원문 자막이 여기에 표시됩니다.' }}
          </p>
        </div>
        <div class="ai-box">
          <strong>AI 실시간 피드백</strong>
          <p>이전 결정과 충돌 가능성이 있습니다. 예산 증액 논의는 리스크 근거 확인 후 결정하는 편이 좋습니다.</p>
        </div>
      </div>
      <div v-else-if="tab === 'people'" class="side-body">
        <p v-for="name in participants" :key="name" class="people-row">{{ name }}<span>참석 중</span></p>
      </div>
      <div v-else class="side-body chat-body">
        <p v-for="item in chat" :key="item.text" class="chat-line"><strong>{{ item.who }}</strong>{{ item.text }}</p>
        <div class="chat-input"><input v-model="chatInput" @keydown.enter="sendChat"><button @click="sendChat">전송</button></div>
      </div>
    </aside>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { Room, RoomEvent, Track } from 'livekit-client'
import { useRouter } from 'vue-router'
import { sortedCaptions, upsertCaption } from '../../lib/caption-store'
import { resolveLiveKitConnection } from '../../lib/livekit-meeting'
import { useAuthStore } from '../../stores/auth'

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
const captionMap = ref(new Map())
let audioContext = null
let microphoneAnalyser = null
let microphoneSource = null
let microphoneAnimationFrame = null
let speakerTestStream = null
let speakerTestTrack = null
const otherParticipants = ['박서연', '정도현', '김민수', '최정훈']
const chat = ref([
  { who: '박서연', text: '회의록 공유 부탁드려요!' },
  { who: '정도현', text: '안건 자료 채팅에 올렸습니다.' },
])

const hasVideoTrack = computed(() => Boolean(previewStream.value?.getVideoTracks().length))
const hasAudioTrack = computed(() => Boolean(previewStream.value?.getAudioTracks().length))
const currentParticipantName = computed(() => displayName.value.trim() || auth.user?.name || '참석자')
const currentParticipantInitial = computed(() => currentParticipantName.value[0] || '참')
const participants = computed(() => [currentParticipantName.value, ...otherParticipants])
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
    stream.getAudioTracks().forEach((track) => { track.enabled = mic.value })
    stream.getVideoTracks().forEach((track) => { track.enabled = cam.value })
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

async function toggleMicrophone() {
  mic.value = !mic.value
  previewStream.value?.getAudioTracks().forEach((track) => { track.enabled = mic.value })
  if (meetingRoom.value?.localParticipant) {
    await meetingRoom.value.localParticipant.setMicrophoneEnabled(
      mic.value,
      selectedAudioInput.value ? { deviceId: selectedAudioInput.value } : undefined,
    ).catch((error) => {
      meetingConnectionError.value = error?.message || '마이크 상태를 변경하지 못했습니다.'
    })
  }
  if (!mic.value) stopAudioTest()
}

async function toggleCamera() {
  cam.value = !cam.value
  previewStream.value?.getVideoTracks().forEach((track) => { track.enabled = cam.value })
  if (meetingRoom.value?.localParticipant) {
    await meetingRoom.value.localParticipant.setCameraEnabled(
      cam.value,
      selectedVideoInput.value ? { deviceId: selectedVideoInput.value } : undefined,
    ).catch((error) => {
      meetingConnectionError.value = error?.message || '카메라 상태를 변경하지 못했습니다.'
    })
  }
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
  } finally {
    connectingMeeting.value = false
  }
}

async function connectMeetingRoom() {
  await disconnectMeetingRoom()
  const identity = auth.user?.id || `meeting-user-${Date.now()}`
  const connection = await resolveLiveKitConnection(identity, currentParticipantName.value)
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
  meetingConnectionStatus.value = '자막 연결됨'

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
}

function bindMeetingRoomEvents(room) {
  room.on(RoomEvent.DataReceived, (payload) => {
    try {
      const event = JSON.parse(new TextDecoder().decode(payload))
      if (event?.eventType === 'caption.updated') {
        captionMap.value = upsertCaption(captionMap.value, event)
      }
    } catch {
      // Ignore non-JSON DataChannel packets.
    }
  })
  room.on(RoomEvent.Reconnecting, () => {
    meetingConnectionStatus.value = '재연결 중'
  })
  room.on(RoomEvent.Reconnected, () => {
    meetingConnectionStatus.value = '자막 연결됨'
  })
  room.on(RoomEvent.Disconnected, () => {
    meetingConnectionStatus.value = '연결 종료'
  })
}

async function disconnectMeetingRoom() {
  const room = meetingRoom.value
  meetingRoom.value = null
  if (!room) return
  await room.localParticipant.setMicrophoneEnabled(false).catch(() => {})
  await room.localParticipant.setCameraEnabled(false).catch(() => {})
  room.disconnect()
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

function handleDeviceChange() {
  loadDeviceList().then(restartPreview).catch(() => {
    deviceError.value = true
    deviceStatus.value = '장치 목록을 갱신하지 못했습니다.'
  })
}

function sendChat() {
  if (!chatInput.value.trim()) return
  chat.value.push({ who: '나', text: chatInput.value.trim() })
  chatInput.value = ''
}

onMounted(() => {
  initializeDevices()
  navigator.mediaDevices?.addEventListener?.('devicechange', handleDeviceChange)
})

onBeforeUnmount(() => {
  navigator.mediaDevices?.removeEventListener?.('devicechange', handleDeviceChange)
  stopPreview()
  void disconnectMeetingRoom()
})
</script>
