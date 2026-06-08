<script>
import { computed, defineComponent, ref } from 'vue'
import { adminLogs } from '../../data/mockData'

export default defineComponent({
  setup() {
    const area = ref('전체')
    const q = ref('')
    const areas = ['전체', ...new Set(adminLogs.map((log) => log.area))]
    const filtered = computed(() => adminLogs.filter((log) => (area.value === '전체' || log.area === area.value) && (!q.value || `${log.actor} ${log.action} ${log.target} ${log.ip}`.toLowerCase().includes(q.value.toLowerCase()))))
    return { area, areas, filtered, q }
  },
  template: `<section class="page admin-page"><header class="page-header"><h1>관리자 작업 로그</h1><p>권한 변경, 정책 변경, 회의실 변경 이력을 확인합니다.</p></header><div class="card admin-toolbar"><input v-model="q" placeholder="작업자, 작업, 대상, IP 검색"><div class="toolbar"><button v-for="item in areas" :key="item" class="chip" :class="{ active: area === item }" @click="area = item">{{ item }}</button></div></div><div class="table-card admin-data-table"><table><thead><tr><th>시간</th><th>작업자</th><th>영역</th><th>작업</th><th>대상</th><th>결과</th><th>IP</th></tr></thead><tbody><tr v-for="log in filtered" :key="log.id"><td>{{ log.time }}</td><td>{{ log.actor }}</td><td>{{ log.area }}</td><td>{{ log.action }}</td><td>{{ log.target }}</td><td><span class="badge success">{{ log.result }}</span></td><td>{{ log.ip }}</td></tr></tbody></table></div></section>`,
})
</script>
