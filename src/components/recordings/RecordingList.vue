<template>
  <aside class="card recording-list-panel">
    <input :value="query" placeholder="내 회의록 검색" @input="$emit('update:query', $event.target.value)">
    <button v-for="recording in items" :key="recording.id" :class="{ active: selectedId === recording.id }" @click="$emit('select', recording.id)">
      <strong><span v-if="favorites[recording.id]">★</span>{{ recording.title }}</strong>
      <small>{{ recording.date }} · {{ recording.duration }} · 참석 {{ recording.attendees }}명</small>
    </button>
  </aside>
</template>

<script setup>
defineProps({
  items: { type: Array, required: true },
  selectedId: { type: String, required: true },
  query: { type: String, default: '' },
  favorites: { type: Object, default: () => ({}) },
})

defineEmits(['select', 'update:query'])
</script>
