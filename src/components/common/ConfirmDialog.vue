<template>
  <div class="modal-backdrop confirm-dialog-backdrop" role="presentation" @click.self="$emit('cancel')">
    <article class="confirm-dialog" role="alertdialog" aria-modal="true" :aria-labelledby="titleId" :aria-describedby="messageId">
      <span :class="['confirm-dialog-icon', tone]"><AlertTriangle :size="22" /></span>
      <div class="confirm-dialog-copy">
        <h2 :id="titleId">{{ title }}</h2>
        <p :id="messageId">{{ message }}</p>
      </div>
      <div class="confirm-dialog-actions">
        <button type="button" class="ghost-button" @click="$emit('cancel')">{{ cancelLabel }}</button>
        <button type="button" :class="tone === 'danger' ? 'danger-button' : 'primary-button'" @click="$emit('confirm')">{{ confirmLabel }}</button>
      </div>
    </article>
  </div>
</template>

<script setup>
import { AlertTriangle } from '@lucide/vue'

defineProps({
  title: { type: String, default: '작업을 진행할까요?' },
  message: { type: String, required: true },
  confirmLabel: { type: String, default: '확인' },
  cancelLabel: { type: String, default: '취소' },
  tone: { type: String, default: 'danger' },
})

defineEmits(['cancel', 'confirm'])

const id = Math.random().toString(36).slice(2)
const titleId = `confirm-title-${id}`
const messageId = `confirm-message-${id}`
</script>
