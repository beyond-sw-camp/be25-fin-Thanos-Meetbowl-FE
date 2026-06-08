<template>
  <aside class="card minute-list-panel">
    <input :value="query" placeholder="내 회의록 검색" @input="$emit('update:query', $event.target.value)">
    <button v-for="minute in items" :key="minute.id" :class="{ active: selectedId === minute.id }" @click="$emit('select', minute.id)">
      <strong><span v-if="favorites[minute.id]">★</span>{{ minute.title }}</strong>
      <small>{{ minute.date }} · {{ minute.duration }} · 참석 {{ minute.attendees }}명</small>
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
