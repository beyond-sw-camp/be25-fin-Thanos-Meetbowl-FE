import { postJson } from './api-client'

// 챗봇은 BE→AI→Gemini 다단계라 multi-hop RAG 질의가 25초를 넘길 수 있다.
// BE의 AI read timeout(45초)보다 여유 있게 두어 브라우저가 먼저 끊지 않게 한다.
const CHAT_TIMEOUT_MS = 60000

function createTimeoutSignal(timeoutMs) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs)
  }

  const controller = new AbortController()
  window.setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}

export function askChatbot(question, messageHistory = []) {
  return postJson(
    '/ai/chat/messages',
    { question, messageHistory },
    { signal: createTimeoutSignal(CHAT_TIMEOUT_MS) },
  )
}
