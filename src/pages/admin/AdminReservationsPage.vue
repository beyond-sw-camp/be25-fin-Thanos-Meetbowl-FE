<script>
import { computed, defineComponent, ref } from 'vue'
import { rooms, todayReservations } from '../../data/mockData'
import { adminTodayDate } from '../../data/adminData'

const statusLabel = { mine: '내 예약', booked: '예약됨' }

export default defineComponent({
  setup() {
    const list = ref(todayReservations.map((reservation) => ({ ...reservation, date: adminTodayDate })))
    const site = ref('전체')
    const status = ref('전체')
    const selected = ref(null)
    const filtered = computed(() => list.value.filter((reservation) => {
      const room = rooms.find((item) => item.id === reservation.roomId)
      const siteMatch = site.value === '전체' || room?.site === site.value
      const statusMatch = status.value === '전체' || reservation.status === status.value
      return siteMatch && statusMatch
    }))
    function cancel(id) {
      list.value = list.value.filter((reservation) => reservation.id !== id)
      selected.value = null
    }
    return { cancel, filtered, list, rooms, selected, site, sites: ['전체', ...new Set(rooms.map((room) => room.site))], status, statusLabel }
  },
  template: `
    <section class="page admin-page">
      <header class="page-header"><h1>예약 현황 관리</h1><p>전사 회의실 예약을 조회하고 필요 시 강제 취소합니다.</p></header>
      <div class="card admin-toolbar"><div class="toolbar"><button v-for="item in sites" :key="item" class="chip" :class="{ active: site === item }" @click="site = item">{{ item }}</button></div><div class="toolbar"><button v-for="item in ['전체','mine','booked']" :key="item" class="chip" :class="{ active: status === item }" @click="status = item">{{ item === '전체' ? '전체 상태' : statusLabel[item] }}</button></div></div>
      <div class="table-card admin-data-table"><table><thead><tr><th>회의 제목</th><th>주최자</th><th>회의실</th><th>날짜</th><th>시간</th><th>상태</th><th>액션</th></tr></thead><tbody><tr v-for="item in filtered" :key="item.id" @click="selected = item"><td>{{ item.title }}</td><td>{{ item.owner }}</td><td>{{ rooms.find((room) => room.id === item.roomId)?.name }}</td><td>{{ item.date }}</td><td>{{ item.start }}-{{ item.end }}</td><td><span :class="['badge', item.status === 'mine' ? 'primary' : 'navy']">{{ statusLabel[item.status] }}</span></td><td><button class="icon-text danger-text" @click.stop="cancel(item.id)">강제 취소</button></td></tr></tbody></table></div>
      <div v-if="selected" class="modal-backdrop" @click.self="selected = null"><article class="card write-modal detail-modal"><header><div><h2>{{ selected.title }}</h2><p>{{ selected.start }}-{{ selected.end }} · {{ rooms.find((room) => room.id === selected.roomId)?.name }}</p></div><button @click="selected = null">닫기</button></header><dl class="detail-list"><div><dt>주최자</dt><dd>{{ selected.owner }}</dd></div><div><dt>참석자</dt><dd>{{ selected.attendees.join(', ') || '-' }}</dd></div><div><dt>상태</dt><dd>{{ statusLabel[selected.status] }}</dd></div><div><dt>회의실</dt><dd>{{ rooms.find((room) => room.id === selected.roomId)?.site }}</dd></div></dl><div class="modal-actions"><button class="danger-button" @click="cancel(selected.id)">강제 취소</button></div></article></div>
    </section>
  `,
})
</script>
