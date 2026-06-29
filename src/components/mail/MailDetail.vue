<template>
  <section class="page mail-detail-page">
    <div class="mail-detail-toolbar">
      <button class="mail-back-button" type="button" aria-label="목록으로 돌아가기" @click="$emit('back')"><ArrowLeft :size="16" /></button>
      <button type="button" @click="$emit('reply', mail)"><Reply :size="16" /> 답장</button>
      <button type="button" @click="$emit('backup', mail.mailId)"><Archive :size="16" /> 백업</button>
      <button type="button" @click="$emit('delete', mail.mailId)"><Trash2 :size="16" /> {{ mail.trashed ? '영구 삭제' : '삭제' }}</button>
      <button v-if="mail.trashed" type="button" @click="$emit('restore', mail.mailId)"><RotateCcw :size="16" /> 복구</button>
      <button type="button" @click="$emit('print')"><Printer :size="16" /> 인쇄</button>
    </div>
    <article class="card mail-message-card">
      <header>
        <h1>{{ mail.subject }}</h1>
      </header>
      <dl class="mail-message-meta">
        <div class="mail-message-meta-sender">
          <dt>보낸 사람</dt>
          <dd>
            <span class="mail-sender-chip">
              {{ mail.senderName || mail.senderUserId }}
              <small v-if="mail.senderEmail">&lt;{{ mail.senderEmail }}&gt;</small>
            </span>
          </dd>
        </div>
        <div>
          <dt>받는 사람</dt>
          <dd class="mail-recipient-chips">
            <span v-for="recipient in recipients" :key="recipient.userId" class="mail-sender-chip">
              {{ recipient.name }}
              <small v-if="recipient.email">&lt;{{ recipient.email }}&gt;</small>
            </span>
            <span v-if="!recipients.length">{{ mail.recipientUserIds?.length || 0 }}명</span>
          </dd>
        </div>
        <div>
          <dt>보낸 날짜</dt>
          <dd><time class="mail-date-text">{{ mail.displayDateTime || mail.displayDate }}</time></dd>
        </div>
      </dl>
      <div class="mail-body-rich">
        <MinutesEditor :modelValue="mail.body" readonly />
      </div>
      <div v-if="attachmentCount" class="mail-attachments">
        <strong>첨부파일 {{ attachmentCount }}개</strong>
        <div v-if="attachments.length" class="mail-attachments-list">
          <button v-for="attachment in attachments" :key="attachment.attachmentId || attachment.id || attachment.objectKey || attachment.name" type="button" @click="$emit('download-attachment', attachment)">
            <span><Paperclip :size="16" /> {{ attachmentName(attachment) }}</span>
            <small>{{ attachmentSize(attachment) }} · 다운로드</small>
          </button>
        </div>
        <p v-if="!attachments.length">첨부파일 메타데이터가 아직 상세 응답에 포함되지 않았습니다.</p>
      </div>
      <div class="mail-message-actions">
        <button class="secondary-button" type="button" @click="$emit('forward', mail)"><Forward :size="16" /> 전달</button>
      </div>
    </article>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { Archive, ArrowLeft, Forward, Paperclip, Printer, Reply, RotateCcw, Trash2 } from '@lucide/vue'
import MinutesEditor from '../minutes/MinutesEditor.vue'

const props = defineProps({
  mail: { type: Object, required: true },
})

defineEmits(['back', 'backup', 'delete', 'download-attachment', 'forward', 'print', 'reply', 'restore'])

const recipients = computed(() => props.mail.recipients || [])
const attachments = computed(() => props.mail.attachments || props.mail.attachmentSummaries || [])
const attachmentCount = computed(() => attachments.value.length || props.mail.attachmentCount || (props.mail.hasAttachments ? 1 : 0))

function attachmentName(attachment) {
  return attachment.originalFileName || attachment.fileName || attachment.name || attachment.storedFileName || '첨부파일'
}

function attachmentSize(attachment) {
  const bytes = normalizeAttachmentBytes(attachment)
  if (!bytes && bytes !== 0) return attachment.mimeType || ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function normalizeAttachmentBytes(attachment) {
  const candidates = [
    attachment.actualSizeBytes,
    attachment.file?.size,
    attachment.sizeBytes,
    attachment.size,
    attachment.fileSize,
    attachment.contentLength,
  ]
  for (const candidate of candidates) {
    const parsed = parseByteValue(candidate)
    if (parsed !== null) return parsed
  }
  return null
}

function parseByteValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  const normalized = value.trim().replace(/\s+/g, '').toUpperCase()
  const numeric = Number.parseFloat(normalized)
  if (!Number.isFinite(numeric)) return null
  if (normalized.endsWith('GB')) return Math.round(numeric * 1024 * 1024 * 1024)
  if (normalized.endsWith('MB')) return Math.round(numeric * 1024 * 1024)
  if (normalized.endsWith('KB')) return Math.round(numeric * 1024)
  return Math.round(numeric)
}
</script>
