<template>
  <button
    v-if="!open"
    type="button"
    class="chatbot-floating-button"
    :aria-label="hasCompletedResponse ? 'AI 챗봇 응답 완료, 열기' : 'AI 챗봇 열기'"
    :style="buttonStyle"
    @pointerdown="startButtonDrag"
    @click="openChatbot"
  >
    <MessageSquare :size="22" />
    <span v-if="hasCompletedResponse" class="chatbot-complete-indicator" aria-hidden="true"></span>
  </button>

  <div v-else class="chatbot-floating-layer">
    <div class="chatbot-floating-backdrop" @click="open = false"></div>
    <article class="chatbot-panel chatbot-floating-panel" :style="panelStyle">
      <header
        ref="panelHeader"
        class="chatbot-panel-header chatbot-draggable-header"
        @pointerdown="startPanelDrag"
      >
        <div class="chatbot-title">
          <span class="chatbot-title-icon"><Sparkles :size="17" /></span>
          <span>
            <strong>Monday</strong>
            <small>사내 자료 기반 · 업무 학습 지원</small>
          </span>
        </div>
        <div class="chatbot-header-actions">
          <button type="button" class="chatbot-clear-button" :disabled="!messages.length && !errorMessage" @click="clearThread">대화 지우기</button>
          <button type="button" class="chatbot-close-button" aria-label="AI 챗봇 닫기" @click="open = false"><X :size="17" /></button>
        </div>
      </header>

      <div class="chatbot-messages" ref="messageScroll">
        <div v-if="messages.length === 0" class="chatbot-message assistant">
          <div class="chatbot-avatar"><Sparkles :size="15" /></div>
          <div class="chatbot-bubble">
            <p class="chat-answer">안녕하세요. 저는 Monday예요. 열람 권한이 있는 회의록, 메일, 개인/공유 워크스페이스 자료를 기반으로 필요한 내용을 찾아드릴게요.</p>
          </div>
        </div>

        <div v-for="message in messages" :key="message.id" :class="['chatbot-message', message.role]">
          <div v-if="message.role === 'assistant'" class="chatbot-avatar"><Sparkles :size="15" /></div>
          <div class="chatbot-bubble">
            <p :class="{ 'chat-answer': message.role === 'assistant' }">{{ message.content }}</p>
            <div v-if="formatChatbotSourceLabel(message.sources)" class="chatbot-source-line">
              <FileText :size="14" />
              <span>{{ formatChatbotSourceLabel(message.sources) }}</span>
            </div>
          </div>
        </div>

        <div v-if="loading" class="chatbot-message assistant">
          <div class="chatbot-avatar"><Sparkles :size="15" /></div>
          <div class="chatbot-bubble chatbot-typing">
            <span></span><span></span><span></span>
          </div>
        </div>

        <div v-if="errorMessage" class="chatbot-error">{{ errorMessage }}</div>
      </div>

      <form class="chatbot-composer" @submit.prevent="sendQuestion">
        <input
          v-model="question"
          placeholder="질문을 입력하세요..."
          @keydown.enter.exact="handleComposerEnter"
        >
        <button type="submit" :disabled="loading || !question.trim()" aria-label="질문 보내기"><Send :size="17" /></button>
      </form>
    </article>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { FileText, MessageSquare, Send, Sparkles, X } from '@lucide/vue'
import { askChatbot } from '../lib/chatbot'
import { formatChatbotSourceLabel } from '../lib/chatbot-sources'

const open = ref(false)
const messages = ref([])
const question = ref('')
const loading = ref(false)
const errorMessage = ref('')
const messageScroll = ref(null)
const hasCompletedResponse = ref(false)
const panelHeader = ref(null)
const buttonPosition = ref(null)
const panelPosition = ref(null)
const dragState = ref(null)
const buttonDragState = ref(null)
const suppressNextOpen = ref(false)

const buttonStyle = computed(() => {
  if (!buttonPosition.value) return {}
  return {
    left: `${buttonPosition.value.left}px`,
    top: `${buttonPosition.value.top}px`,
    right: 'auto',
    bottom: 'auto',
  }
})

const panelStyle = computed(() => {
  if (!panelPosition.value) return {}
  return {
    left: `${panelPosition.value.left}px`,
    top: `${panelPosition.value.top}px`,
    right: 'auto',
    bottom: 'auto',
  }
})

onMounted(() => {
  window.addEventListener('pointermove', handleButtonDragMove)
  window.addEventListener('pointerup', stopButtonDrag)
  window.addEventListener('pointermove', handlePanelDragMove)
  window.addEventListener('pointerup', stopPanelDrag)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', handleButtonDragMove)
  window.removeEventListener('pointerup', stopButtonDrag)
  window.removeEventListener('pointermove', handlePanelDragMove)
  window.removeEventListener('pointerup', stopPanelDrag)
})

async function openChatbot() {
  if (suppressNextOpen.value) {
    suppressNextOpen.value = false
    return
  }
  open.value = true
  hasCompletedResponse.value = false
  await scrollToBottom()
}

async function sendQuestion() {
  const content = question.value.trim()
  if (!content || loading.value) return
  const userMessage = { id: crypto.randomUUID(), role: 'user', content }
  messages.value.push(userMessage)
  question.value = ''
  loading.value = true
  errorMessage.value = ''
  await scrollToBottom()

  try {
    const history = messages.value
      .slice(-20)
      .map((message) => ({ role: message.role, content: message.content }))
    const response = await askChatbot(content, history.slice(0, -1))
    messages.value.push({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: response.answer,
      sources: response.sources || [],
      model: response.model,
    })
    if (!open.value) hasCompletedResponse.value = true
  } catch (error) {
    errorMessage.value = error?.message || '챗봇 답변을 생성하지 못했습니다.'
  } finally {
    loading.value = false
    await scrollToBottom()
  }
}

function clearThread() {
  messages.value = []
  errorMessage.value = ''
  hasCompletedResponse.value = false
}

function handleComposerEnter(event) {
  if (event.isComposing) return
  event.preventDefault()
  sendQuestion()
}

async function scrollToBottom() {
  await nextTick()
  if (messageScroll.value) messageScroll.value.scrollTop = messageScroll.value.scrollHeight
}

function startButtonDrag(event) {
  if (window.innerWidth < 900) return
  const rect = event.currentTarget.getBoundingClientRect()
  buttonPosition.value = {
    left: rect.left,
    top: rect.top,
  }
  buttonDragState.value = {
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
    width: rect.width,
    height: rect.height,
    pointerId: event.pointerId,
    moved: false,
  }
}

function handleButtonDragMove(event) {
  if (!buttonDragState.value || event.pointerId !== buttonDragState.value.pointerId) return
  const maxLeft = Math.max(12, window.innerWidth - buttonDragState.value.width - 12)
  const maxTop = Math.max(12, window.innerHeight - buttonDragState.value.height - 12)
  const nextLeft = Math.min(Math.max(12, event.clientX - buttonDragState.value.offsetX), maxLeft)
  const nextTop = Math.min(Math.max(12, event.clientY - buttonDragState.value.offsetY), maxTop)
  if (Math.abs(nextLeft - buttonPosition.value.left) > 2 || Math.abs(nextTop - buttonPosition.value.top) > 2) {
    buttonDragState.value.moved = true
  }
  buttonPosition.value = {
    left: nextLeft,
    top: nextTop,
  }
}

function stopButtonDrag(event) {
  if (!buttonDragState.value) return
  if (event.pointerId !== undefined && event.pointerId !== buttonDragState.value.pointerId) return
  const moved = buttonDragState.value.moved
  buttonDragState.value = null
  suppressNextOpen.value = moved
}

function startPanelDrag(event) {
  if (window.innerWidth < 900) return
  if (event.target.closest('button')) return
  const panel = event.currentTarget?.closest('.chatbot-floating-panel')
  if (!panel) return
  const rect = panel.getBoundingClientRect()
  panelPosition.value = {
    left: rect.left,
    top: rect.top,
  }
  dragState.value = {
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
    width: rect.width,
    height: rect.height,
  }
}

function handlePanelDragMove(event) {
  if (!dragState.value) return
  const maxLeft = Math.max(12, window.innerWidth - dragState.value.width - 12)
  const maxTop = Math.max(12, window.innerHeight - dragState.value.height - 12)
  panelPosition.value = {
    left: Math.min(Math.max(12, event.clientX - dragState.value.offsetX), maxLeft),
    top: Math.min(Math.max(12, event.clientY - dragState.value.offsetY), maxTop),
  }
}

function stopPanelDrag() {
  dragState.value = null
}

</script>
