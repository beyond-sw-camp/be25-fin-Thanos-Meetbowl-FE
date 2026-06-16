<template>
  <section class="page mail-detail-page">
    <div class="mail-detail-toolbar">
      <button @click="$emit('back')"><ArrowLeft :size="16" /> 뒤로</button>
      <button @click="$emit('backup', mail.mailId)"><Archive :size="16" /> 백업</button>
      <button v-if="mail.trashed" @click="$emit('restore', mail.mailId)"><RotateCcw :size="16" /> 복구</button>
      <button @click="$emit('delete', mail.mailId)"><Trash2 :size="16" /> {{ mail.trashed ? '영구 삭제' : '삭제' }}</button>
      <button><Printer :size="16" /> 인쇄</button>
      <button><MoreHorizontal :size="16" /> 더보기</button>
    </div>
    <article class="card mail-message-card">
      <header><h1>{{ mail.subject }}</h1><button @click="$emit('backup', mail.mailId)" aria-label="백업"><Archive :size="16" /></button></header>
      <div class="mail-sender-line">
        <span class="table-avatar">{{ (mail.senderName || '?').slice(0, 1) }}</span>
        <div><strong>{{ mail.senderName || mail.senderUserId }}</strong><small>{{ mail.senderMeta || '사용자' }} · 받는 사람 {{ mail.recipientUserIds?.length || 0 }}명 · {{ mail.displayDate }}</small></div>
      </div>
      <pre>{{ mail.body }}</pre>
      <div class="modal-actions"><button class="secondary-button"><Reply :size="16" /> 답장</button><button class="secondary-button"><Forward :size="16" /> 전달</button></div>
    </article>
  </section>
</template>

<script setup>
import { Archive, ArrowLeft, Forward, MoreHorizontal, Printer, Reply, RotateCcw, Trash2 } from '@lucide/vue'

defineProps({
  mail: { type: Object, required: true },
})

defineEmits(['back', 'backup', 'delete', 'restore'])
</script>
