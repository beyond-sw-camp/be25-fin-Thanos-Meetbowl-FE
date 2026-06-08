<script>
import { computed, defineComponent, ref } from 'vue'
import { rooms } from '../../data/mockData'
import { adminSites } from '../../data/adminData'

export default defineComponent({
  setup() {
    const list = ref(rooms.map((room) => ({ ...room, building: adminSites.find((site) => site.name === room.site)?.building || '본관', active: !room.restricted })))
    const sites = ref([...adminSites])
    const siteFilter = ref('전체')
    const roomModal = ref(false)
    const siteModal = ref(false)
    const editingId = ref('')
    const roomForm = ref({ name: '', site: sites.value[0].name, building: sites.value[0].building, floor: 1, capacity: 6, equipment: 'TV', active: true, restrictReason: '', restrictUntil: '' })
    const siteForm = ref({ name: '', building: '' })
    const filteredRooms = computed(() => siteFilter.value === '전체' ? list.value : list.value.filter((room) => room.site === siteFilter.value))
    function openRoom(room) {
      editingId.value = room?.id || ''
      roomForm.value = room ? { ...room, equipment: room.equipment.join(', ') } : { name: '', site: sites.value[0].name, building: sites.value[0].building, floor: 1, capacity: 6, equipment: 'TV', active: true, restrictReason: '', restrictUntil: '' }
      roomModal.value = true
    }
    function saveRoom() {
      const payload = { ...roomForm.value, floor: Number(roomForm.value.floor), capacity: Number(roomForm.value.capacity), equipment: roomForm.value.equipment.split(',').map((item) => item.trim()).filter(Boolean), restricted: !roomForm.value.active }
      if (editingId.value) list.value = list.value.map((room) => room.id === editingId.value ? { ...room, ...payload } : room)
      else list.value.push({ id: `room-${Date.now()}`, ...payload })
      roomModal.value = false
    }
    function saveSite() {
      sites.value.push({ ...siteForm.value })
      siteForm.value = { name: '', building: '' }
      siteModal.value = false
    }
    return { filteredRooms, list, openRoom, roomForm, roomModal, saveRoom, saveSite, siteFilter, siteForm, siteModal, sites }
  },
  template: `
    <section class="page admin-page">
      <header class="page-header rooms-header"><div><h1>회의실 관리</h1><p>사이트·건물을 등록하고 회의실 운영 상태를 관리합니다.</p></div><div class="admin-actions"><button class="secondary-button" @click="siteModal = true">사이트/건물 추가</button><button class="primary-button" @click="openRoom()">회의실 등록</button></div></header>
      <article class="card admin-site-filter"><strong>사이트 / 건물</strong><div class="toolbar"><button class="chip" :class="{ active: siteFilter === '전체' }" @click="siteFilter = '전체'">전체 ({{ list.length }}실)</button><button v-for="site in sites" :key="site.name" class="chip" :class="{ active: siteFilter === site.name }" @click="siteFilter = siteFilter === site.name ? '전체' : site.name">{{ site.name }} · {{ site.building }} ({{ list.filter((room) => room.site === site.name).length }}실)</button></div></article>
      <div class="table-card admin-data-table"><table><thead><tr><th>회의실</th><th>사이트</th><th>건물</th><th>층</th><th>정원</th><th>장비</th><th>상태</th><th>액션</th></tr></thead><tbody><tr v-for="room in filteredRooms" :key="room.id"><td>{{ room.name }}</td><td>{{ room.site }}</td><td>{{ room.building }}</td><td>{{ room.floor }}F</td><td>{{ room.capacity }}명</td><td>{{ room.equipment.join(', ') }}</td><td><span :class="['badge', room.active ? 'success' : 'warning']">{{ room.active ? '운영 중' : '사용 제한' }}</span><small v-if="!room.active">{{ room.restrictReason }} {{ room.restrictUntil }}</small></td><td><button class="icon-text" @click="openRoom(room)">수정</button></td></tr></tbody></table></div>
      <div v-if="roomModal" class="modal-backdrop" @click.self="roomModal = false"><article class="card write-modal admin-modal"><header><h2>회의실 정보</h2><button @click="roomModal = false">닫기</button></header><form class="form-grid" @submit.prevent="saveRoom"><label>회의실 이름<input v-model="roomForm.name" required></label><div class="form-row two"><label>사이트<select v-model="roomForm.site"><option v-for="site in sites" :key="site.name">{{ site.name }}</option></select></label><label>건물<input v-model="roomForm.building"></label></div><div class="form-row two"><label>층<input type="number" v-model.number="roomForm.floor"></label><label>정원<input type="number" v-model.number="roomForm.capacity"></label></div><label>장비<input v-model="roomForm.equipment" placeholder="TV, 화상회의"></label><label class="settings-toggle-row"><span>운영 중</span><input type="checkbox" v-model="roomForm.active"></label><div v-if="!roomForm.active" class="admin-warning-box"><label>제한 종료 일시<input v-model="roomForm.restrictUntil" placeholder="2026-06-15 18:00"></label><label>제한 사유<textarea v-model="roomForm.restrictReason" rows="2"></textarea></label></div><div class="modal-actions"><button type="button" class="secondary-button" @click="roomModal = false">취소</button><button class="primary-button">저장</button></div></form></article></div>
      <div v-if="siteModal" class="modal-backdrop" @click.self="siteModal = false"><article class="card write-modal admin-modal"><header><h2>사이트 / 건물 추가</h2><button @click="siteModal = false">닫기</button></header><form class="form-grid" @submit.prevent="saveSite"><label>사이트<input v-model="siteForm.name" required placeholder="예: 판교"></label><label>건물<input v-model="siteForm.building" required placeholder="예: 본관"></label><div class="modal-actions"><button type="button" class="secondary-button" @click="siteModal = false">취소</button><button class="primary-button">추가</button></div></form></article></div>
    </section>
  `,
})
</script>
