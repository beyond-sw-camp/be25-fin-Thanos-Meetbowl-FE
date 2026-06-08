<template>
  <aside class="room-side-panel">
    <h3>{{ roomName }}</h3>
    <p v-if="room">{{ room.site }} · {{ room.floor }}층 · {{ room.capacity }}명</p>
    <p v-else>원격 회의</p>
    <div v-if="room" class="tag-row"><span v-for="item in room.equipment" :key="item">{{ item }}</span></div>
    <h4>{{ title }}</h4>
    <ul class="compact-list">
      <li v-for="item in reservations" :key="item.id"><strong>{{ item.start }}-{{ item.end }} {{ item.title }}</strong><span>{{ item.owner }}</span></li>
      <li v-if="!reservations.length"><span>예약 없음</span></li>
    </ul>
  </aside>
</template>

<script setup>
defineProps({
  room: { type: Object, default: null },
  roomName: { type: String, required: true },
  reservations: { type: Array, default: () => [] },
  title: { type: String, default: '오늘 예약' },
})
</script>
