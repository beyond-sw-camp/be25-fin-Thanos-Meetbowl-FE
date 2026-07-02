<template>
  <ModalShell modal-class="room-modal compact" @close="$emit('close')">
    <header class="quick-meeting-header">
      <div class="quick-meeting-title">
        <h2>빠른 회의 생성</h2>
        <p>원격 회의를 바로 만들고 곧바로 입장합니다.</p>
      </div>
      <button class="modal-close" type="button" aria-label="닫기" @click="$emit('close')">×</button>
    </header>

    <form class="quick-meeting-form" @submit.prevent="submit">
      <label>
        회의 제목
        <input v-model="form.title" type="text" placeholder="예: 긴급 협의" required>
      </label>

      <section class="quick-meeting-section">
        <div class="quick-meeting-section-title">
          <strong>참석자</strong>
          <small>{{ form.attendees.length }}명 선택</small>
        </div>
        <div class="participant-chips shared-selected-members quick-meeting-selected">
          <template v-if="visibleAttendees.length">
            <span v-for="member in visibleAttendees" :key="member.userId" class="member-chip">
              <span class="member-chip-label">{{ memberChipLabel(member) }}</span>
              <button type="button" @click="removeAttendee(member.userId)">×</button>
            </span>
            <button
              v-if="form.attendees.length > 3"
              type="button"
              class="quick-meeting-more"
              @click="expandedAttendees = !expandedAttendees"
            >
              {{ expandedAttendees ? '접기' : `+${hiddenAttendeeCount} 더보기` }}
            </button>
          </template>
          <small v-else>빠르게 함께 들어갈 참석자를 추가하세요.</small>
        </div>
        <MemberPicker
          :selected-names="form.attendees.map((attendee) => attendee.name)"
          :selected-user-ids="form.attendees.map((attendee) => attendee.userId)"
          placeholder="이름, 부서, 이메일 검색"
          @select="addAttendee"
        />
      </section>

      <label>
        검토자
        <AppSelect v-model="form.reviewerUserId">
          <option value="">검토자를 선택하세요</option>
          <option v-for="option in reviewerOptions" :key="option.userId" :value="option.userId">
            {{ option.name }}
          </option>
        </AppSelect>
      </label>

      <p v-if="errorMessage" class="reservation-inline-warning" role="alert">
        <span class="reservation-inline-warning__icon">!</span>
        <span>{{ errorMessage }}</span>
      </p>

      <div class="modal-actions">
        <button type="button" class="secondary-button" @click="$emit('close')">취소</button>
        <button class="primary-button" :disabled="saving">
          {{ saving ? '회의 생성 중...' : '생성 후 입장' }}
        </button>
      </div>
    </form>
  </ModalShell>
</template>

<script setup>
import { computed, ref } from 'vue'
import ModalShell from '../common/ModalShell.vue'
import AppSelect from '../common/AppSelect.vue'
import MemberPicker from '../common/MemberPicker.vue'
import { createMeeting } from '../../lib/reservations'
import { openMeetingWindow } from '../../lib/meeting-route'
import { formatUserChipLabel as memberChipLabel } from '../../utils/userLabel'

const props = defineProps({
  currentUser: { type: Object, default: null },
})

const emit = defineEmits(['close', 'saved'])

const saving = ref(false)
const errorMessage = ref('')
const expandedAttendees = ref(false)
const form = ref({
  title: '',
  attendees: [],
  reviewerUserId: '',
})

const reviewerOptions = computed(() => {
  const host = props.currentUser?.userId
    ? [{
        userId: props.currentUser.userId,
        name: props.currentUser.name || '나',
      }]
    : []
  return [...host, ...form.value.attendees.map((attendee) => ({ userId: attendee.userId, name: attendee.name }))]
})

const visibleAttendees = computed(() => expandedAttendees.value ? form.value.attendees : form.value.attendees.slice(0, 3))
const hiddenAttendeeCount = computed(() => Math.max(form.value.attendees.length - visibleAttendees.value.length, 0))

function addAttendee(member) {
  if (!member?.userId || form.value.attendees.some((attendee) => attendee.userId === member.userId)) return
      form.value.attendees = [
    ...form.value.attendees,
    {
      userId: member.userId,
      name: member.name || '이름 미확인',
      department: member.department || '',
      team: member.team || '',
      position: member.position || '',
      email: member.email || '',
    },
  ]
}

function removeAttendee(userId) {
  form.value.attendees = form.value.attendees.filter((attendee) => attendee.userId !== userId)
  if (form.value.reviewerUserId === userId) form.value.reviewerUserId = ''
  if (expandedAttendees.value && form.value.attendees.length <= 3) expandedAttendees.value = false
}

async function submit() {
  if (saving.value) return
  errorMessage.value = ''

  const title = form.value.title.trim()
  if (!title) {
    errorMessage.value = '회의 제목을 입력해 주세요.'
    return
  }
  if (!form.value.reviewerUserId) {
    errorMessage.value = '검토자를 선택해 주세요.'
    return
  }
  if (!form.value.attendees.length) {
    errorMessage.value = '참석자를 최소 1명 선택해 주세요.'
    return
  }

  const scheduledAt = new Date()
  scheduledAt.setSeconds(0, 0)
  const scheduledEndAt = new Date(scheduledAt.getTime() + 60 * 60 * 1000)

  saving.value = true
  try {
    const created = await createMeeting({
      title,
      scheduledAt: scheduledAt.toISOString(),
      scheduledEndAt: scheduledEndAt.toISOString(),
      meetingRoomId: null,
      attendeeUserIds: form.value.attendees.map((attendee) => attendee.userId),
      reviewerUserId: form.value.reviewerUserId,
      description: null,
    })
    emit('saved', created)
    openMeetingWindow(created.meetingId, {
      scheduledAt: created.scheduledAt,
      title: created.title,
    })
  } catch (error) {
    errorMessage.value = error?.message || '빠른 회의 생성에 실패했습니다.'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.quick-meeting-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.quick-meeting-title {
  display: grid;
  gap: 6px;
}

.quick-meeting-title h2,
.quick-meeting-title p {
  margin: 0;
}

.quick-meeting-title p {
  color: var(--muted-foreground);
  font-size: 14px;
}

.quick-meeting-form {
  display: grid;
  gap: 16px;
}

.quick-meeting-form > label,
.quick-meeting-section {
  display: grid;
  gap: 8px;
}

.quick-meeting-form > label {
  color: var(--foreground);
  font-size: 14px;
  font-weight: 700;
}

.quick-meeting-form input,
.quick-meeting-form :deep(.app-select) {
  min-height: 46px;
  border-radius: 12px;
}

.quick-meeting-section-title {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}

.quick-meeting-section-title small {
  color: var(--muted-foreground);
  font-size: 12px;
}

.quick-meeting-selected {
  min-height: 52px;
}

.quick-meeting-more {
  border: 0;
  background: transparent;
  color: var(--primary);
  font-size: 12px;
  font-weight: 700;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
}

.modal-actions .secondary-button,
.modal-actions .primary-button {
  min-width: 132px;
  min-height: 46px;
  border-radius: 12px;
}
</style>
