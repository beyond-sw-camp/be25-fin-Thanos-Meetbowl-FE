<script>
import { computed, defineComponent, ref } from 'vue'
import { members } from '../../data/mockData'
import { initialDepts, initialRanks, initialTitles } from '../../data/adminData'

export default defineComponent({
  setup() {
    const tab = ref('dept')
    const depts = ref([...initialDepts])
    const ranks = ref([...initialRanks])
    const titles = ref([...initialTitles])
    const editing = ref(null)
    const form = ref({ name: '', count: 0, order: 1 })
    const rows = computed(() => tab.value === 'dept' ? depts.value : tab.value === 'rank' ? ranks.value : titles.value)
    function openEdit(row = null) {
      editing.value = row
      form.value = row ? { ...row } : { name: '', count: 0, order: rows.value.length + 1 }
    }
    function saveItem() {
      const target = tab.value === 'dept' ? depts : tab.value === 'rank' ? ranks : titles
      if (editing.value) target.value = target.value.map((item) => item.id === editing.value.id ? { ...item, ...form.value } : item)
      else target.value.push({ id: `${tab.value}-${Date.now()}`, ...form.value, children: tab.value === 'dept' ? [] : undefined })
      editing.value = null
    }
    function removeItem(id) {
      const target = tab.value === 'dept' ? depts : tab.value === 'rank' ? ranks : titles
      target.value = target.value.filter((item) => item.id !== id)
    }
    return { depts, editing, form, members, openEdit, ranks, removeItem, rows, saveItem, tab, titles }
  },
  template: `
    <section class="page admin-page">
      <header class="page-header rooms-header"><div><h1>조직/직급 관리</h1><p>부서, 직급, 직책을 분리해 관리하고 조직도를 확인합니다.</p></div><button class="primary-button" @click="openEdit()">{{ tab === 'dept' ? '부서 추가' : tab === 'rank' ? '직급 추가' : '직책 추가' }}</button></header>
      <div class="admin-tabs"><button v-for="item in [{key:'dept',label:'조직 관리'},{key:'rank',label:'직급 관리'},{key:'title',label:'직책 관리'}]" :key="item.key" :class="{ active: tab === item.key }" @click="tab = item.key">{{ item.label }}</button></div>
      <div v-if="tab === 'dept'" class="admin-org-layout">
        <article class="card admin-org-tree"><h2>Meetbowl</h2><div v-for="dept in depts" :key="dept.id" class="org-node"><strong>{{ dept.name }}</strong><span>{{ dept.count }}명</span><p v-if="dept.children?.length">{{ dept.children.join(' · ') }}</p></div></article>
        <article class="card admin-org-members"><h2>조직도</h2><div v-for="dept in depts" :key="dept.id" class="org-member-group"><strong>{{ dept.name }}</strong><span v-for="member in members.filter((item) => item.dept === dept.name || dept.children?.includes(item.dept))" :key="member.id">{{ member.name }} · {{ member.position }}</span></div></article>
      </div>
      <div class="table-card admin-data-table"><table><thead><tr><th>이름</th><th v-if="tab === 'rank'">순서</th><th>인원</th><th>액션</th></tr></thead><tbody><tr v-for="row in rows" :key="row.id"><td>{{ row.name }}</td><td v-if="tab === 'rank'">{{ row.order }}</td><td>{{ row.count }}명</td><td><button class="icon-text" @click="openEdit(row)">수정</button><button class="icon-text danger-text" @click="removeItem(row.id)">삭제</button></td></tr></tbody></table></div>
      <div v-if="editing !== null" class="modal-backdrop" @click.self="editing = null"><article class="card write-modal admin-modal"><header><h2>항목 저장</h2><button @click="editing = null">닫기</button></header><form class="form-grid" @submit.prevent="saveItem"><label>이름<input v-model="form.name" required></label><label v-if="tab === 'rank'">순서<input type="number" v-model.number="form.order"></label><label>인원<input type="number" v-model.number="form.count"></label><div class="modal-actions"><button type="button" class="secondary-button" @click="editing = null">취소</button><button class="primary-button">저장</button></div></form></article></div>
    </section>
  `,
})
</script>
