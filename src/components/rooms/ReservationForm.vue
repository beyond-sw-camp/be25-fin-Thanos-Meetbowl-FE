<template>
  <form class="form-grid" @submit.prevent="$emit('submit')">
    <label>회의 제목<input v-model="form.title" required placeholder="회의 제목"></label>
    <label v-if="allowRemote" class="remote-toggle">
      <input type="checkbox" :checked="!form.roomId" @change="onRemoteToggle">
      <span>원격 회의 (회의실 선택은 선택 사항)</span>
    </label>
    <label>
      회의실
      <select v-model="form.roomId">
        <option v-if="allowRemote" value="">회의실 없음 (원격)</option>
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

    <UserSearchPicker v-model="form.attendees" />

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

const props = defineProps({
  form: { type: Object, required: true },
  rooms: { type: Array, default: () => [] },
  myUserId: { type: String, default: '' },
  actionError: { type: String, default: '' },
  // 원격 회의 토글 노출 여부. 회의 페이지에서만 true, 회의실 예약에서는 false.
  allowRemote: { type: Boolean, default: false },
})
defineEmits(['submit'])

// 토글은 회의실 선택값(roomId)에서 파생된다. 켜면 회의실 미선택(원격), 끄면 첫 사용 가능 회의실 선택.
function onRemoteToggle(event) {
  if (event.target.checked) {
    props.form.roomId = ''
  } else {
    const room = props.rooms.find((item) => item.isAvailable) || props.rooms[0]
    props.form.roomId = room?.roomId || ''
  }
}
</script>

<style scoped>
/* 전역 label은 display:grid라 체크박스가 위로 떠 가운데처럼 보인다. 한 줄 왼쪽 정렬로 맞춘다. */
.remote-toggle {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  margin: 0;
  cursor: pointer;
}
/* 전역 input은 width:100%/height:40px라 체크박스가 커진다. 체크박스 크기로 되돌린다. */
.remote-toggle input[type='checkbox'] {
  width: 16px;
  height: 16px;
  flex: none;
  margin: 0;
  padding: 0;
}
</style>
