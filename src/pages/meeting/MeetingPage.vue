<template>
  <section v-if="inLobby" class="page narrow">
    <article class="card lobby-card">
      <div class="card-head"><div><h2>화상회의 입장 준비</h2><p>Q2 캠페인 킥오프 · 진행 중</p></div></div>
      <div class="lobby-grid">
        <div class="camera-preview">
          <span>이</span>
          <div><button class="control" @click="mic = !mic">{{ mic ? 'Mic On' : 'Mic Off' }}</button><button class="control" @click="cam = !cam">{{ cam ? 'Cam On' : 'Cam Off' }}</button></div>
        </div>
        <div class="stack">
          <label class="toggle-row"><span>입장 시 카메라 ON</span><input type="checkbox" v-model="cam"></label>
          <div class="copy-box">https://meetbowl.local/join/Q2-KICK-0522</div>
          <button class="primary-button" @click="inLobby = false">회의 입장</button>
        </div>
      </div>
    </article>
  </section>
  <section v-else class="meeting-room">
    <div class="meeting-main">
      <header><strong>Q2 캠페인 킥오프</strong><span>01:24:08</span></header>
      <div class="video-grid"><div v-for="name in participants" :key="name" class="video-tile"><span>{{ name[0] }}</span><em>{{ name }}</em></div></div>
      <footer><button class="control" @click="mic = !mic">{{ mic ? '마이크' : '음소거' }}</button><button class="control" @click="cam = !cam">{{ cam ? '카메라' : '카메라 꺼짐' }}</button><button class="control">화면 공유</button><button class="danger-button" @click="router.push('/app/recordings')">회의 종료</button></footer>
    </div>
    <aside class="meeting-side">
      <nav><button :class="{ active: tab === 'stt' }" @click="tab = 'stt'">회의 원문</button><button :class="{ active: tab === 'people' }" @click="tab = 'people'">참석자</button><button :class="{ active: tab === 'chat' }" @click="tab = 'chat'">채팅</button></nav>
      <div v-if="tab === 'stt'" class="side-body">
        <div class="toolbar"><button class="chip" :class="{ active: lang === 'kor' }" @click="lang = 'kor'">Kor</button><button class="chip" :class="{ active: lang === 'eng' }" @click="lang = 'eng'">Eng</button></div>
        <p v-for="(line, index) in transcripts[lang]" :key="line" class="transcript"><small>13:4{{ index }}:0{{ index }}</small>{{ line }}</p>
        <div class="ai-box"><strong>AI 실시간 피드백</strong><p>이전 결정과 충돌 가능성이 있습니다. 예산 증액 논의는 리스크 근거 확인 후 결정하는 편이 좋습니다.</p></div>
      </div>
      <div v-else-if="tab === 'people'" class="side-body"><p v-for="name in participants" :key="name" class="people-row">{{ name }}<span>참석 중</span></p></div>
      <div v-else class="side-body chat-body"><p v-for="item in chat" :key="item.text" class="chat-line"><strong>{{ item.who }}</strong>{{ item.text }}</p><div class="chat-input"><input v-model="chatInput" @keydown.enter="sendChat"><button @click="sendChat">전송</button></div></div>
    </aside>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const inLobby = ref(true)
const mic = ref(true)
const cam = ref(true)
const tab = ref('stt')
const lang = ref('kor')
const chatInput = ref('')
const participants = ['이지연', '박서연', '정도현', '김민수', '최정훈']
const chat = ref([{ who: '박서연', text: '회의록 공유 부탁드려요!' }, { who: '정도현', text: '안건 자료 채팅에 올렸습니다.' }])
const transcripts = {
  kor: ['오늘 안건은 Q2 캠페인 일정 확정과 예산 재분배입니다.', '디자인 리소스 일정은 5월 마지막 주에 마무리될 것 같습니다.', '광고 채널별 분배안은 두 가지로 압축했고, A안을 추천합니다.', '좋습니다. A안으로 진행하되 예산은 10% 보수적으로 잡죠.'],
  eng: ['Today agenda is to confirm the Q2 campaign schedule and redistribute the budget.', 'The design resource schedule should wrap up in the last week of May.', 'We narrowed the media allocation plan down to two options and recommend option A.', 'Let us proceed with option A, but keep the budget 10% conservative.'],
}

function sendChat() {
  if (!chatInput.value.trim()) return
  chat.value.push({ who: '나', text: chatInput.value.trim() })
  chatInput.value = ''
}
</script>
