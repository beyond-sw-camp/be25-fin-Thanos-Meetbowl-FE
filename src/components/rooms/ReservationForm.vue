<template>
  <form class="form-grid" @submit.prevent="$emit('submit')">
    <label>회의 제목<input v-model="form.title" required placeholder="회의 제목"></label>
    <label>
      회의실
      <select v-model="form.roomId">
        <option v-for="room in rooms" :key="room.roomId" :value="room.roomId" :disabled="!room.isAvailable">
          {{ room.name }}{{ room.isAvailable ? '' : ' (사용 제한)' }}
        </option>
      </select>
    </label>
    <div class="form-row two">
      <label>시작 날짜<input type="date" v-model="form.date"></label>
      <label>종료 날짜<input type="date" v-model="form.endDate"></label>
    </div>
    <div class="form-row two">
      <label>시작 시간<input type="time" v-model="form.start"></label>
      <label>종료 시간<input type="time" v-model="form.end"></label>
    </div>

    <UserSearchPicker v-model="form.attendees" :exclude-user-id="myUserId" />

    <label>
      회의록 검토자
      <select v-model="form.reviewerUserId">
        <option value="">검토자 미지정</option>
        <option v-for="attendee in form.attendees" :key="attendee.userId" :value="attendee.userId">{{ attendee.name }}</option>
      </select>
      <small>참석자 중 회의록을 검토할 1명을 지정합니다.</small>
    </label>

    <label>회의 내용<textarea v-model="form.content" rows="4" placeholder="회의 목적과 안건"></textarea></label>

    <p v-if="actionError" class="warning-text">{{ actionError }}</p>
    <slot name="actions" />
  </form>
</template>

<script setup>
import UserSearchPicker from './UserSearchPicker.vue'

defineProps({
  form: { type: Object, required: true },
  rooms: { type: Array, default: () => [] },
  myUserId: { type: String, default: '' },
  actionError: { type: String, default: '' },
})
defineEmits(['submit'])
</script>
