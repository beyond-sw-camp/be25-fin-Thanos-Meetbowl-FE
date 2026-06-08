<script>
import { defineComponent, ref } from 'vue'

export default defineComponent({
  setup() {
    const name = ref('')
    const joined = ref(false)
    return { name, joined }
  },
  template: `<section v-if="!joined" class="page narrow"><article class="card lobby-card"><h1>게스트 회의 참여</h1><p>초대받은 회의에 게스트로 입장합니다.</p><label>표시 이름<input v-model="name" placeholder="이름"></label><button class="primary-button" @click="joined = true">입장</button></article></section><section v-else class="meeting-room guest"><div class="meeting-main"><header><strong>게스트 회의</strong><span>초대 코드 입장</span></header><div class="video-grid"><div class="video-tile"><span>{{ (name || '게')[0] }}</span><em>{{ name || '게스트' }}</em></div></div><footer><button class="danger-button" @click="joined = false">회의 나가기</button></footer></div></section>`,
})
</script>
