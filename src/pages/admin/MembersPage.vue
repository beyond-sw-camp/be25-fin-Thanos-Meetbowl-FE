<script>
import { computed, defineComponent, ref } from 'vue'
import { companies, members } from '../../data/mockData'
import { memberSeed } from '../../data/adminData'
import { downloadCsv, parseCsv } from '../../utils/csv'

export default defineComponent({
  setup() {
    const list = ref(members.map(memberSeed))
    const q = ref('')
    const filter = ref('전체')
    const modal = ref(false)
    const detail = ref(null)
    const editingId = ref('')
    const fileInput = ref(null)
    const form = ref({ name: '', emailLocal: '', company: companies[0], dept: '프로덕트팀', position: '사원', hireOn: '2026-01-01', retireOn: '2999-01-01', role: 'User' })
    const filtered = computed(() => list.value.filter((member) => {
      const employed = member.retireOn === '2999-01-01'
      const matchesStatus = filter.value === '전체' || (filter.value === '재직' ? employed : !employed)
      const matchesQuery = !q.value || `${member.name} ${member.email} ${member.company} ${member.dept}`.toLowerCase().includes(q.value.toLowerCase())
      return matchesStatus && matchesQuery
    }))
    function openModal(member) {
      editingId.value = member?.id || ''
      form.value = member ? { ...member, emailLocal: member.email.split('@')[0] } : { name: '', emailLocal: '', company: companies[0], dept: '프로덕트팀', position: '사원', hireOn: '2026-01-01', retireOn: '2999-01-01', role: 'User' }
      modal.value = true
    }
    function saveMember() {
      const payload = { ...form.value, email: `${form.value.emailLocal || 'user'}@meetbowl.co`, status: form.value.retireOn === '2999-01-01' ? '활성' : '비활성', title: form.value.role === 'Admin' ? '관리자' : '팀원' }
      delete payload.emailLocal
      if (editingId.value) list.value = list.value.map((member) => member.id === editingId.value ? { ...member, ...payload } : member)
      else list.value.push({ id: `u${Date.now()}`, ...payload })
      modal.value = false
    }
    function removeMember(id) {
      list.value = list.value.filter((member) => member.id !== id)
      detail.value = null
    }
    function downloadMembers() {
      downloadCsv('회원.csv', ['이름', '이메일', '계열사', '부서', '직급', '입사일', '퇴사일'], list.value.map((member) => [member.name, member.email, member.company, member.dept, member.position, member.hireOn, member.retireOn]))
    }
    function uploadMembers(event) {
      const file = event.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const rows = parseCsv(String(reader.result || '').replace(/^\uFEFF/, '')).filter((row) => row.some((cell) => cell.trim()))
        list.value = rows.slice(1).map((row, index) => ({ id: `csv-${Date.now()}-${index}`, name: row[0] || '', email: row[1] || '', company: row[2] || companies[0], dept: row[3] || '', position: row[4] || '사원', hireOn: row[5] || '2026-01-01', retireOn: row[6] || '2999-01-01', role: 'User', status: row[6] && row[6] !== '2999-01-01' ? '비활성' : '활성', title: '팀원' })).filter((member) => member.name)
      }
      reader.readAsText(file, 'utf-8')
      event.target.value = ''
    }
    return { companies, detail, downloadMembers, fileInput, filter, filtered, form, list, modal, openModal, q, removeMember, saveMember, uploadMembers }
  },
  template: `
    <section class="page admin-page">
      <header class="page-header rooms-header"><div><h1>회원 관리</h1><p>사용자 계정, 계열사, 부서·직급, 입사일과 퇴사일을 관리합니다.</p></div><div class="admin-actions"><input ref="fileInput" type="file" accept=".csv,text/csv" hidden @change="uploadMembers"><button class="secondary-button" @click="fileInput.click()">엑셀 업로드</button><button class="secondary-button" @click="downloadMembers">엑셀 다운로드</button><button class="primary-button" @click="openModal()">회원 추가</button></div></header>
      <div class="card admin-toolbar"><input v-model="q" placeholder="이름, 이메일, 계열사, 부서 검색"><div class="toolbar"><button v-for="item in ['전체','재직','퇴직']" :key="item" class="chip" :class="{ active: filter === item }" @click="filter = item">{{ item }}</button></div></div>
      <div class="table-card admin-data-table"><table><thead><tr><th>이름</th><th>이메일</th><th>계열사</th><th>부서</th><th>직급</th><th>입사일</th><th>퇴사일</th><th>액션</th></tr></thead><tbody><tr v-for="member in filtered" :key="member.id" @click="detail = member"><td><span class="table-avatar">{{ member.name[0] }}</span>{{ member.name }}</td><td>{{ member.email }}</td><td>{{ member.company }}</td><td>{{ member.dept }}</td><td>{{ member.position }}</td><td>{{ member.hireOn }}</td><td><span :class="['badge', member.retireOn === '2999-01-01' ? 'success' : 'warning']">{{ member.retireOn === '2999-01-01' ? '활성' : '비활성' }}</span> {{ member.retireOn }}</td><td><button class="icon-text" @click.stop="openModal(member)">수정</button><button class="icon-text danger-text" @click.stop="removeMember(member.id)">삭제</button></td></tr></tbody></table></div>
      <div v-if="modal" class="modal-backdrop" @click.self="modal = false"><article class="card write-modal admin-modal"><header><h2>{{ form.id ? '회원 정보 수정' : '회원 추가' }}</h2><button @click="modal = false">닫기</button></header><form class="form-grid" @submit.prevent="saveMember"><label>이름<input v-model="form.name" required></label><label>이메일<div class="email-input"><input v-model="form.emailLocal" placeholder="user"><span>@meetbowl.co</span></div></label><label>계열사<select v-model="form.company"><option v-for="company in companies" :key="company">{{ company }}</option></select></label><div class="form-row two"><label>부서<input v-model="form.dept"></label><label>직급<select v-model="form.position"><option v-for="rank in ['사원','선임','책임','수석','팀장','이사']" :key="rank">{{ rank }}</option></select></label></div><div class="form-row two"><label>입사일<input type="date" v-model="form.hireOn"></label><label>퇴사일<input type="date" v-model="form.retireOn"></label></div><label>권한<select v-model="form.role"><option>User</option><option>Admin</option></select></label><div class="modal-actions"><button type="button" class="secondary-button" @click="modal = false">취소</button><button class="primary-button">저장</button></div></form></article></div>
      <div v-if="detail" class="modal-backdrop" @click.self="detail = null"><article class="card write-modal detail-modal"><header><div><h2>{{ detail.name }}</h2><p>{{ detail.dept }} · {{ detail.position }}</p></div><button @click="detail = null">닫기</button></header><dl class="detail-list"><div><dt>이메일</dt><dd>{{ detail.email }}</dd></div><div><dt>계열사</dt><dd>{{ detail.company }}</dd></div><div><dt>입사일</dt><dd>{{ detail.hireOn }}</dd></div><div><dt>퇴사일</dt><dd>{{ detail.retireOn }}</dd></div></dl><div class="modal-actions"><button class="secondary-button" @click="openModal(detail); detail = null">정보 수정</button></div></article></div>
    </section>
  `,
})
</script>
