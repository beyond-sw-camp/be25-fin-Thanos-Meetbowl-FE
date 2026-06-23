<template>
  <div class="card mail-row-list">
    <button v-for="mail in items" :key="mail.mailId" type="button" class="mail-row-button" @click="$emit('open', mail)">
      <input type="checkbox" :checked="selectedIds.has(mail.mailId)" @click.stop @change="$emit('toggle', mail.mailId)">
      <span class="mail-from" :class="{ unread: !mail.read }">{{ mail.senderName || mail.senderUserId }} <small v-if="mail.senderMeta">/ {{ mail.senderMeta }}</small></span>
      <i :class="{ unread: !mail.read }"></i>
      <strong :class="{ unread: !mail.read }"><Paperclip v-if="mail.hasAttachments || mail.attachmentCount" :size="14" />{{ mail.subject }}</strong>
      <time>{{ mail.displayDate }}</time>
    </button>
    <p v-if="!items.length" class="empty-text">메일이 없습니다.</p>
  </div>
</template>

<script setup>
import { Paperclip } from '@lucide/vue'

defineProps({
  items: { type: Array, required: true },
  selectedIds: { type: Object, required: true },
})

defineEmits(['open', 'toggle'])
</script>
