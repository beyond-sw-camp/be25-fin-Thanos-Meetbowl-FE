<template>
  <section class="page minutes-page-full">
    <header class="page-header"><h1>내 회의록</h1><p>AI가 자동 생성한 내 회의록을 확인·수정하고 내부 메일로 공유하세요.</p></header>
    <div class="minute-layout">
      <MinuteList v-model:query="q" :items="filtered" :selected-id="selectedId" :favorites="favorites" @select="selectMinute" />
      <MinuteDetail
        :minute="selected"
        :editing="editing"
        :favorites="favorites"
        :transcript-open="transcriptOpen"
        :transcript="mockTranscript"
        @toggle-favorite="toggleFavorite"
        @start-edit="editing = true"
        @cancel-edit="editing = false"
        @save-edit="saveEdit"
        @toggle-transcript="transcriptOpen = !transcriptOpen"
        @share="openShare"
      />
    </div>
    <ShareMailModal v-if="shareOpen" :draft="share" :members="members" @close="shareOpen = false" @send="shareOpen = false" />
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import MinuteDetail from '../../components/minutes/MinuteDetail.vue'
import MinuteList from '../../components/minutes/MinuteList.vue'
import ShareMailModal from '../../components/minutes/ShareMailModal.vue'
import { members, minutes } from '../../data/mockData'
import { onMinuteFavoritesChanged, readMinuteFavorites, toggleMinuteFavorite } from '../../lib/minute-favorites'

const mockTranscript = [
  { t: '00:00:08', who: '이지연', text: '오늘은 OKR 점검과 Q2 우선순위 재정렬을 진행하겠습니다.' },
  { t: '00:00:42', who: '박서연', text: '프로덕트팀 KR-1은 진행률 78%로, 6월 첫 주 완료 가능합니다.' },
  { t: '00:01:21', who: '정도현', text: '마케팅 측에서는 캠페인 일정을 한 주 당기는 것을 제안합니다.' },
  { t: '00:02:03', who: '이지연', text: '좋습니다. 일정 변경에 따른 리소스 영향은 박서연 책임이 정리해 주세요.' },
]

const minuteItems = ref(minutes.map((minute) => ({ ...minute })))
const selectedId = ref(minutes[0].id)
const q = ref('')
const shareOpen = ref(false)
const transcriptOpen = ref(false)
const editing = ref(false)
const favorites = ref(readMinuteFavorites())
const share = ref({ recipients: members.slice(4, 7), query: '', subject: '', body: '' })
let stopFavoriteSync = null

const filtered = computed(() => minuteItems.value.filter((minute) => minute.title.toLowerCase().includes(q.value.toLowerCase())))
const selected = computed(() => minuteItems.value.find((minute) => minute.id === selectedId.value) || minuteItems.value[0])

onMounted(() => {
  stopFavoriteSync = onMinuteFavoritesChanged((next) => {
    favorites.value = next
  })
})

onUnmounted(() => {
  stopFavoriteSync?.()
})

function selectMinute(id) {
  selectedId.value = id
  editing.value = false
}

function saveEdit(draft) {
  minuteItems.value = minuteItems.value.map((minute) => minute.id === selected.value.id ? { ...minute, title: draft.title || minute.title, summary: draft.summary } : minute)
  editing.value = false
}

function toggleFavorite(id) {
  favorites.value = toggleMinuteFavorite(id)
}

function openShare() {
  share.value.subject = `[회의록 공유] ${selected.value.title}`
  share.value.body = `안녕하세요,\n\n${selected.value.title} 회의록을 공유드립니다.\n\n[AI 요약]\n${selected.value.summary}\n\n확인 부탁드립니다.`
  shareOpen.value = true
}
</script>
