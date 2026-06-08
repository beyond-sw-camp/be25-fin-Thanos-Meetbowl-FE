<template>
  <div class="card mail-row-list">
    <button v-for="mail in items" :key="mail.id" class="mail-row-button" @click="$emit('open', mail)">
      <input type="checkbox" :checked="selectedIds.has(mail.id)" @click.stop @change="$emit('toggle', mail.id)">
      <span class="mail-from" :class="{ unread: mail.unread }">{{ mail.from }} <small>/ {{ mail.dept }}</small></span>
      <i :class="{ unread: mail.unread }"></i>
      <strong :class="{ unread: mail.unread }">{{ mail.subject }} <small v-if="mail.hasAttachment">첨부</small></strong>
      <time>{{ mail.date }}</time>
    </button>
    <p v-if="!items.length" class="empty-text">메일이 없습니다.</p>
  </div>
</template>

<script setup>
defineProps({
  items: { type: Array, required: true },
  selectedIds: { type: Object, required: true },
})

defineEmits(['open', 'toggle'])
</script>
