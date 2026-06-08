<script>
import { computed, defineComponent, ref } from 'vue'
import { members } from '../../data/mockData'
import { nextSharedVersion, sharedInitialDocs, sharedInitialProjects, sharedTeams, sharedTypeLabels } from '../../data/sharedDocsData'

export default defineComponent({
  setup() {
    const projects = ref(sharedInitialProjects.map((project) => ({ ...project, docIds: [...project.docIds], participants: project.participants ? [...project.participants] : undefined })))
    const docs = ref(sharedInitialDocs.map((doc) => ({ ...doc, history: doc.history.map((history) => ({ ...history })) })))
    const activeProject = ref('all')
    const keyword = ref('')
    const openId = ref(null)
    const createOpen = ref(false)
    const uploadOpen = ref(false)
    const projectDraft = ref({ name: '', query: '', participants: [] })
    const uploadDraft = ref({ mode: 'new', docId: sharedInitialDocs[0]?.id || '', title: '', dept: sharedTeams[0], note: '' })

    const filteredDocs = computed(() => docs.value.filter((doc) => {
      const project = projects.value.find((item) => item.id === activeProject.value)
      const inProject = activeProject.value === 'all' || (project?.docIds || []).includes(doc.id)
      return inProject && (!keyword.value.trim() || doc.title.includes(keyword.value.trim()))
    }))
    const openDoc = computed(() => docs.value.find((doc) => doc.id === openId.value))
    const projectCandidates = computed(() => members
      .filter((member) => !projectDraft.value.participants.includes(member.name))
      .filter((member) => {
        const q = projectDraft.value.query.trim().toLowerCase()
        return !q || `${member.name} ${member.company} ${member.dept} ${member.position} ${member.email}`.toLowerCase().includes(q)
      })
      .slice(0, 6))
    const uploadTarget = computed(() => docs.value.find((doc) => doc.id === uploadDraft.value.docId))

    function projectCount(project) {
      return project.id === 'all' ? docs.value.length : project.docIds.filter((id) => docs.value.some((doc) => doc.id === id)).length
    }

    function docTypeClass(type) {
      return `shared-type-${type}`
    }

    function resetCreateProject() {
      projectDraft.value = { name: '', query: '', participants: [] }
      createOpen.value = true
    }

    function addProjectParticipant(name) {
      if (!projectDraft.value.participants.includes(name)) {
        projectDraft.value.participants.push(name)
      }
      projectDraft.value.query = ''
    }

    function createProject() {
      const name = projectDraft.value.name.trim()
      if (!name) return
      const id = `proj${Date.now()}`
      projects.value.push({ id, label: name, docIds: [], participants: [...projectDraft.value.participants] })
      activeProject.value = id
      createOpen.value = false
    }

    function resetUpload() {
      uploadDraft.value = { mode: 'new', docId: docs.value[0]?.id || '', title: '', dept: sharedTeams[0], note: '' }
      uploadOpen.value = true
    }

    function uploadDocument() {
      const now = '2026-06-01 10:00'
      if (uploadDraft.value.mode === 'new') {
        const title = uploadDraft.value.title.trim()
        if (!title) return
        const id = `d${Date.now()}`
        docs.value.unshift({
          id,
          title,
          type: 'doc',
          dept: uploadDraft.value.dept,
          author: '이지연',
          uploaded: now,
          updated: now,
          version: 'v1.0',
          size: '0.1MB',
          preview: '(새 문서)',
          history: [{ v: 'v1.0', author: '이지연', date: now, note: uploadDraft.value.note.trim() || '최초 업로드' }],
        })
        if (activeProject.value !== 'all') {
          const project = projects.value.find((item) => item.id === activeProject.value)
          project?.docIds.unshift(id)
        }
      } else {
        const target = uploadTarget.value
        if (!target) return
        const version = nextSharedVersion(target.version)
        target.version = version
        target.updated = now
        target.history.unshift({ v: version, author: '이지연', date: now, note: uploadDraft.value.note.trim() || '새 버전 업로드' })
      }
      uploadOpen.value = false
    }

    return {
      projects,
      docs,
      activeProject,
      keyword,
      openId,
      createOpen,
      uploadOpen,
      projectDraft,
      uploadDraft,
      sharedTeams,
      sharedTypeLabels,
      filteredDocs,
      openDoc,
      projectCandidates,
      uploadTarget,
      nextSharedVersion,
      projectCount,
      docTypeClass,
      resetCreateProject,
      addProjectParticipant,
      createProject,
      resetUpload,
      uploadDocument,
    }
  },
  template: `
    <section class="page shared-page">
      <header class="page-header shared-header">
        <div>
          <h1>공유 워크스페이스</h1>
          <p>프로젝트별 공유 문서와 버전 관리를 한 곳에서 확인하세요.</p>
        </div>
        <div class="shared-header-actions">
          <button type="button" class="ghost-button" @click="resetCreateProject">프로젝트 생성</button>
          <button type="button" class="primary-button small" @click="resetUpload">문서 업로드</button>
        </div>
      </header>

      <div class="shared-layout">
        <aside class="card shared-projects">
          <div class="shared-section-title">공유 스페이스</div>
          <button v-for="project in projects" :key="project.id" type="button" class="shared-project-row" :class="{ active: activeProject === project.id }" @click="activeProject = project.id">
            <span>
              <strong>{{ project.label }}</strong>
              <small v-if="project.participants?.length">참여자 {{ project.participants.length }}명</small>
            </span>
            <em>{{ projectCount(project) }}</em>
          </button>
        </aside>

        <main class="shared-main">
          <div class="shared-toolbar">
            <label class="shared-search">
              <span>문서 검색</span>
              <input v-model="keyword" placeholder="문서 검색">
            </label>
            <small>총 {{ filteredDocs.length }}건</small>
          </div>

          <div class="table-card shared-table-card">
            <table>
              <thead>
                <tr>
                  <th>문서</th>
                  <th>부서</th>
                  <th>작성자</th>
                  <th>버전</th>
                  <th>최근 수정</th>
                  <th>더보기</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="doc in filteredDocs" :key="doc.id" @click="openId = doc.id">
                  <td>
                    <div class="shared-doc-cell">
                      <span :class="['shared-doc-icon', docTypeClass(doc.type)]">{{ sharedTypeLabels[doc.type] }}</span>
                      <div><strong>{{ doc.title }}</strong><small>{{ sharedTypeLabels[doc.type] }} · {{ doc.size }}</small></div>
                    </div>
                  </td>
                  <td>{{ doc.dept }}</td>
                  <td>{{ doc.author }}</td>
                  <td><span class="badge primary">{{ doc.version }}</span></td>
                  <td>{{ doc.updated }}</td>
                  <td><button type="button" class="more-button" @click.stop="openId = doc.id">•••</button></td>
                </tr>
                <tr v-if="filteredDocs.length === 0"><td colspan="6"><div class="empty-state">문서가 없습니다.</div></td></tr>
              </tbody>
            </table>
          </div>
        </main>
      </div>

      <div v-if="openDoc" class="drawer-backdrop" @click="openId = null">
        <aside class="shared-drawer" @click.stop>
          <header>
            <span :class="['shared-doc-icon', docTypeClass(openDoc.type)]">{{ sharedTypeLabels[openDoc.type] }}</span>
            <div>
              <strong>{{ openDoc.title }}</strong>
              <small>{{ openDoc.dept }} · {{ openDoc.author }} · {{ openDoc.version }}</small>
            </div>
            <button type="button" class="ghost-button">다운로드</button>
            <button type="button" class="drawer-close" @click="openId = null">닫기</button>
          </header>
          <section>
            <h2>버전 이력</h2>
            <article v-for="history in openDoc.history" :key="history.v" class="version-card">
              <div><span class="badge primary">{{ history.v }}</span><strong>{{ history.note }}</strong><small>{{ history.date }}</small></div>
              <p>{{ history.author }} · 이 버전으로 복원</p>
            </article>
          </section>
        </aside>
      </div>

      <div v-if="createOpen" class="modal-backdrop" @click="createOpen = false">
        <form class="write-modal" @submit.prevent="createProject" @click.stop>
          <header><h2>프로젝트 생성</h2><button type="button" @click="createOpen = false">닫기</button></header>
          <label>프로젝트 이름<input v-model="projectDraft.name" placeholder="예: Q3 신제품 TF"></label>
          <div class="participant-box">
            <div class="participant-chips">
              <span v-for="name in projectDraft.participants" :key="name">{{ name }} <button type="button" @click="projectDraft.participants = projectDraft.participants.filter((item) => item !== name)">×</button></span>
              <input v-model="projectDraft.query" placeholder="이름, 부서/팀 검색...">
            </div>
            <div v-if="projectDraft.query && projectCandidates.length" class="participant-results">
              <button v-for="candidate in projectCandidates" :key="candidate.id" type="button" @click="addProjectParticipant(candidate.name)">
                <strong>{{ candidate.name }} <small>{{ candidate.position }}</small></strong>
                <span>{{ candidate.company }} · {{ candidate.dept }} · {{ candidate.email }}</span>
              </button>
            </div>
          </div>
          <footer><button type="button" class="ghost-button" @click="createOpen = false">취소</button><button type="submit" class="primary-button small">생성</button></footer>
        </form>
      </div>

      <div v-if="uploadOpen" class="modal-backdrop" @click="uploadOpen = false">
        <form class="write-modal" @submit.prevent="uploadDocument" @click.stop>
          <header><h2>{{ uploadDraft.mode === 'new' ? '문서 등록' : '새 버전 업로드' }}</h2><button type="button" @click="uploadOpen = false">닫기</button></header>
          <div class="upload-mode-grid">
            <button type="button" :class="{ active: uploadDraft.mode === 'new' }" @click="uploadDraft.mode = 'new'"><strong>새 문서 등록</strong><span>처음 올리는 문서</span></button>
            <button type="button" :class="{ active: uploadDraft.mode === 'existing' }" @click="uploadDraft.mode = 'existing'"><strong>기존 문서 업데이트</strong><span>새 버전으로 추가</span></button>
          </div>
          <label v-if="uploadDraft.mode === 'existing'">업데이트할 문서
            <select v-model="uploadDraft.docId">
              <option v-for="doc in docs" :key="doc.id" :value="doc.id">{{ doc.title }} (현재 {{ doc.version }})</option>
            </select>
            <small v-if="uploadTarget">덮어쓰지 않고 {{ nextSharedVersion(uploadTarget.version) }}로 버전을 쌓습니다.</small>
          </label>
          <button type="button" class="shared-upload-zone"><strong>파일을 드래그하거나 클릭해 업로드</strong><span>DOC, XLSX, PDF, PPTX 지원 · 최대 50MB</span></button>
          <template v-if="uploadDraft.mode === 'new'">
            <label>문서 제목<input v-model="uploadDraft.title" placeholder="예: 신규 정책 안내"></label>
            <label>부서<select v-model="uploadDraft.dept"><option v-for="team in sharedTeams" :key="team">{{ team }}</option></select></label>
          </template>
          <label>변경 내용<textarea v-model="uploadDraft.note" rows="2" placeholder="이번 버전에서 바뀐 내용을 적어주세요"></textarea></label>
          <footer><button type="button" class="ghost-button" @click="uploadOpen = false">취소</button><button type="submit" class="primary-button small">{{ uploadDraft.mode === 'new' ? '문서 등록' : '새 버전 업로드' }}</button></footer>
        </form>
      </div>
    </section>
  `,
})
</script>
