import { postJson } from './api-client'

export function askChatbot(question, messageHistory = []) {
  return postJson('/ai/chat/messages', { question, messageHistory })
}
