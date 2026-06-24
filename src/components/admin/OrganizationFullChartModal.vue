<template>
  <ModalShell modal-class="organization-full-chart-modal" @close="$emit('close')">
    <section
      class="organization-full-chart"
      role="dialog"
      aria-modal="true"
      aria-labelledby="organization-full-chart-title"
      aria-describedby="organization-full-chart-description"
    >
      <header class="organization-full-chart-header">
        <div>
          <h2 id="organization-full-chart-title">전체 조직도</h2>
          <p id="organization-full-chart-description">
            부서, 팀, 구성원 구조를 한눈에 확인할 수 있습니다.
          </p>
        </div>
        <button
          ref="closeButtonRef"
          type="button"
          class="organization-full-chart-close"
          aria-label="전체 조직도 닫기"
          @click="$emit('close')"
        >
          닫기
        </button>
      </header>

      <div class="organization-full-chart-body">
        <aside class="organization-full-chart-nav" aria-label="조직 탐색 패널">
          <div class="organization-full-chart-nav-head">
            <strong>조직 탐색</strong>
            <small>부서와 팀을 선택해 우측 조직도를 살펴보세요.</small>
          </div>

          <div v-if="chartData.isEmpty" class="organization-full-chart-empty">
            표시할 조직 데이터가 없습니다.
          </div>

          <div v-else class="organization-full-chart-tree" role="tree" aria-label="조직 탐색">
            <button
              type="button"
              class="organization-full-chart-tree-item organization-full-chart-tree-root"
              :class="{ active: selectedNode?.key === chartData.rootNode.key }"
              @click="selectNode(chartData.rootNode.key)"
            >
              <span>전체 조직</span>
              <small>{{ chartData.rootNode.name }}</small>
            </button>

            <div
              v-for="department in chartData.rootNode.departments"
              :key="department.key"
              class="organization-full-chart-branch"
            >
              <button
                type="button"
                class="organization-full-chart-tree-item"
                :class="{ active: selectedNode?.key === department.key }"
                @click="selectNode(department.key)"
              >
                <span>{{ department.name }}</span>
                <em>{{ department.memberCount }}명</em>
              </button>

              <div class="organization-full-chart-children">
                <button
                  v-for="team in department.teams"
                  :key="team.key"
                  type="button"
                  class="organization-full-chart-tree-item organization-full-chart-tree-child"
                  :class="{ active: selectedNode?.key === team.key }"
                  @click="selectNode(team.key)"
                >
                  <span>{{ team.name }}</span>
                  <em>{{ team.memberCount }}명</em>
                </button>
              </div>
            </div>
          </div>
        </aside>

        <div class="organization-full-chart-content">
          <div class="organization-full-chart-canvas-wrap">
            <div v-if="chartData.isEmpty" class="organization-full-chart-empty organization-full-chart-stage-empty">
              조직도에 표시할 부서, 팀, 구성원 정보가 없습니다.
            </div>

            <div v-else class="organization-full-chart-canvas">
              <button
                type="button"
                class="organization-full-node organization-full-node-root"
                :class="{ active: selectedNode?.key === chartData.rootNode.key }"
                @click="selectNode(chartData.rootNode.key)"
              >
                <strong>전체 조직</strong>
                <span>{{ chartData.rootNode.name }}</span>
                <small>
                  부서 {{ chartData.rootNode.departmentCount }}개 · 팀 {{ chartData.rootNode.teamCount }}개 · 구성원
                  {{ chartData.rootNode.memberCount }}명
                </small>
              </button>

              <div class="organization-full-chart-departments">
                <article
                  v-for="department in chartData.rootNode.departments"
                  :key="department.key"
                  class="organization-full-department-group"
                >
                  <button
                    type="button"
                    class="organization-full-node organization-full-node-department"
                    :class="{ active: selectedNode?.key === department.key }"
                    @click="selectNode(department.key)"
                  >
                    <strong>{{ department.name }}</strong>
                    <small>구성원 {{ department.memberCount }}명 · 하위 팀 {{ department.teamCount }}개</small>
                  </button>

                  <div v-if="department.teams.length" class="organization-full-team-grid">
                    <article
                      v-for="team in department.teams"
                      :key="team.key"
                      class="organization-full-team-group"
                    >
                      <button
                        type="button"
                        class="organization-full-node organization-full-node-team"
                        :class="{ active: selectedNode?.key === team.key }"
                        @click="selectNode(team.key)"
                      >
                        <strong>{{ team.name }}</strong>
                        <small>{{ team.memberCount }}명</small>
                      </button>

                      <div v-if="team.members.length" class="organization-full-member-grid">
                        <button
                          v-for="member in team.members"
                          :key="member.key"
                          type="button"
                          class="organization-full-node organization-full-node-member"
                          :class="{ active: selectedNode?.key === member.key }"
                          @click="selectNode(member.key)"
                        >
                          <strong>{{ member.name }}</strong>
                          <small>{{ member.position || '-' }}</small>
                        </button>
                      </div>

                      <div v-else class="organization-full-member-empty">배정된 구성원이 없습니다.</div>
                    </article>
                  </div>

                  <div v-else class="organization-full-member-empty">하위 팀이 없습니다.</div>
                </article>
              </div>
            </div>
          </div>

          <aside class="organization-full-chart-detail" aria-live="polite">
            <template v-if="selectedNode">
              <div class="organization-full-chart-detail-head">
                <strong>{{ detailTitle }}</strong>
                <span>{{ detailSubtitle }}</span>
              </div>

              <dl class="organization-full-chart-detail-list">
                <div v-for="item in detailItems" :key="item.label">
                  <dt>{{ item.label }}</dt>
                  <dd>{{ item.value }}</dd>
                </div>
              </dl>

              <div class="organization-full-chart-detail-actions">
                <button type="button" class="secondary-button" disabled>관리 기능 예정</button>
              </div>
            </template>

            <div v-else class="organization-full-chart-empty">
              선택된 조직 노드가 없습니다.
            </div>
          </aside>
        </div>
      </div>
    </section>
  </ModalShell>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ModalShell from '../common/ModalShell.vue'
import { buildOrganizationFullChart } from '../../lib/organization-full-chart'

const props = defineProps({
  affiliateName: { type: String, default: '' },
  departments: { type: Array, default: () => [] },
  teams: { type: Array, default: () => [] },
  users: { type: Array, default: () => [] },
  positions: { type: Array, default: () => [] },
})

const emit = defineEmits(['close'])

const closeButtonRef = ref(null)
const selectedNodeKey = ref('')

const chartData = computed(() =>
  buildOrganizationFullChart({
    affiliateName: props.affiliateName,
    departments: props.departments,
    teams: props.teams,
    users: props.users,
    positions: props.positions,
  }),
)

const selectedNode = computed(() => chartData.value.nodeMap.get(selectedNodeKey.value) || null)

const detailTitle = computed(() => {
  if (!selectedNode.value) return '-'
  if (selectedNode.value.type === 'root') return selectedNode.value.name
  return selectedNode.value.name
})

const detailSubtitle = computed(() => {
  if (!selectedNode.value) return ''

  if (selectedNode.value.type === 'department') return '부서 상세 정보'
  if (selectedNode.value.type === 'team') return '팀 상세 정보'
  if (selectedNode.value.type === 'member') return '구성원 상세 정보'
  return '전체 조직 개요'
})

const detailItems = computed(() => {
  if (!selectedNode.value) return []

  if (selectedNode.value.type === 'root') {
    return [
      { label: '대표 조직', value: selectedNode.value.name },
      { label: '부서 수', value: `${selectedNode.value.departmentCount}개` },
      { label: '팀 수', value: `${selectedNode.value.teamCount}개` },
      { label: '구성원 수', value: `${selectedNode.value.memberCount}명` },
    ]
  }

  if (selectedNode.value.type === 'department') {
    return [
      { label: '부서명', value: selectedNode.value.name },
      { label: '총 인원 수', value: `${selectedNode.value.memberCount}명` },
      {
        label: '하위 팀 목록',
        value: selectedNode.value.teams.length
          ? selectedNode.value.teams.map((team) => team.name).join(' / ')
          : '-',
      },
      {
        label: '구성원 요약',
        value: selectedNode.value.members.length
          ? selectedNode.value.members.map((member) => `${member.name} ${member.position}`.trim()).join(', ')
          : '-',
      },
    ]
  }

  if (selectedNode.value.type === 'team') {
    return [
      { label: '팀명', value: selectedNode.value.name },
      { label: '상위 부서', value: selectedNode.value.departmentName || '-' },
      { label: '팀 인원 수', value: `${selectedNode.value.memberCount}명` },
      {
        label: '구성원 목록',
        value: selectedNode.value.members.length
          ? selectedNode.value.members.map((member) => `${member.name} ${member.position}`.trim()).join(', ')
          : '-',
      },
    ]
  }

  return [
    { label: '이름', value: selectedNode.value.name },
    { label: '직급', value: selectedNode.value.position || '-' },
    { label: '이메일', value: selectedNode.value.email || '-' },
    {
      label: '소속',
      value: [selectedNode.value.departmentName, selectedNode.value.teamName].filter(Boolean).join(' / ') || '-',
    },
  ]
})

function selectNode(nodeKey) {
  selectedNodeKey.value = nodeKey
}

function handleWindowKeydown(event) {
  if (event.key === 'Escape') emit('close')
}

watch(
  chartData,
  (nextData) => {
    if (nextData.nodeMap.has(selectedNodeKey.value)) return
    selectedNodeKey.value = nextData.defaultSelectedKey
  },
  { immediate: true },
)

onMounted(async () => {
  window.addEventListener('keydown', handleWindowKeydown)
  await nextTick()
  closeButtonRef.value?.focus()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleWindowKeydown)
})
</script>

<style scoped>
:deep(.organization-full-chart-modal) {
  width: min(1500px, calc(100vw - 32px));
  height: min(920px, calc(100vh - 32px));
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  padding: 0;
  overflow: hidden;
}

.organization-full-chart {
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
}

.organization-full-chart-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 24px 18px;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%);
}

.organization-full-chart-header h2 {
  margin: 0;
  font-size: 24px;
}

.organization-full-chart-header p {
  margin: 8px 0 0;
  color: var(--muted-foreground);
  font-size: 14px;
}

.organization-full-chart-close {
  min-height: 38px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: white;
  padding: 0 14px;
  color: var(--foreground);
  font-size: 13px;
  font-weight: 700;
}

.organization-full-chart-close:hover {
  background: var(--muted);
}

.organization-full-chart-body {
  min-height: 0;
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
}

.organization-full-chart-nav {
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  border-right: 1px solid var(--border);
  background: #fbfcfe;
}

.organization-full-chart-nav-head {
  display: grid;
  gap: 4px;
  padding: 20px 18px 14px;
  border-bottom: 1px solid var(--border);
}

.organization-full-chart-nav-head strong {
  font-size: 14px;
}

.organization-full-chart-nav-head small {
  color: var(--muted-foreground);
  font-size: 12px;
  line-height: 1.5;
}

.organization-full-chart-tree {
  min-height: 0;
  overflow-y: auto;
  display: grid;
  gap: 8px;
  padding: 16px;
}

.organization-full-chart-branch {
  display: grid;
  gap: 6px;
}

.organization-full-chart-children {
  display: grid;
  gap: 6px;
  padding-left: 14px;
}

.organization-full-chart-tree-item {
  width: 100%;
  min-height: 42px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: white;
  padding: 10px 12px;
  color: var(--foreground);
  text-align: left;
}

.organization-full-chart-tree-root {
  display: grid;
  justify-items: start;
}

.organization-full-chart-tree-root small {
  color: var(--muted-foreground);
  font-size: 11px;
}

.organization-full-chart-tree-child {
  background: #fcfcfd;
}

.organization-full-chart-tree-item span,
.organization-full-chart-tree-item em {
  min-width: 0;
}

.organization-full-chart-tree-item span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 700;
}

.organization-full-chart-tree-item em {
  flex: 0 0 auto;
  border-radius: 999px;
  background: #fff3ea;
  padding: 3px 8px;
  color: var(--primary-dark);
  font-size: 11px;
  font-style: normal;
  font-weight: 700;
}

.organization-full-chart-tree-item.active,
.organization-full-chart-tree-item:hover {
  border-color: rgba(243, 115, 33, 0.5);
  background: #fff7ed;
}

.organization-full-chart-content {
  min-height: 0;
  display: grid;
  grid-template-rows: minmax(0, 1fr) 260px;
  background: white;
}

.organization-full-chart-canvas-wrap {
  min-height: 0;
  overflow: auto;
  padding: 24px;
  background:
    radial-gradient(circle at top left, rgba(243, 115, 33, 0.08), transparent 22%),
    linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%);
}

.organization-full-chart-canvas {
  min-width: max-content;
  display: grid;
  justify-items: center;
  gap: 22px;
}

.organization-full-chart-departments {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 18px;
  align-items: start;
}

.organization-full-department-group,
.organization-full-team-group {
  display: grid;
  gap: 12px;
}

.organization-full-team-grid {
  display: grid;
  gap: 12px;
}

.organization-full-member-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
}

.organization-full-node {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: white;
  padding: 14px 16px;
  color: var(--foreground);
  text-align: left;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
  transition: border-color 0.15s ease, transform 0.15s ease, background-color 0.15s ease;
}

.organization-full-node:hover {
  transform: translateY(-1px);
  border-color: rgba(243, 115, 33, 0.5);
}

.organization-full-node.active {
  border-color: rgba(243, 115, 33, 0.7);
  background: #fff7ed;
  box-shadow: 0 12px 28px rgba(243, 115, 33, 0.12);
}

.organization-full-node strong,
.organization-full-node span,
.organization-full-node small {
  display: block;
  min-width: 0;
  overflow-wrap: anywhere;
}

.organization-full-node strong {
  font-size: 14px;
}

.organization-full-node span,
.organization-full-node small {
  margin-top: 6px;
  color: var(--muted-foreground);
  font-size: 12px;
  line-height: 1.5;
}

.organization-full-node-root {
  width: min(420px, 100%);
  justify-self: center;
  border-color: rgba(243, 115, 33, 0.45);
}

.organization-full-node-root strong {
  color: var(--primary-dark);
}

.organization-full-node-department {
  border-left: 4px solid var(--primary);
}

.organization-full-node-team {
  background: #fcfcfd;
}

.organization-full-node-member {
  padding: 12px 13px;
  border-radius: 12px;
  background: #ffffff;
}

.organization-full-node-member strong {
  font-size: 13px;
}

.organization-full-member-empty,
.organization-full-chart-empty {
  border: 1px dashed var(--border);
  border-radius: 12px;
  background: #f8fafc;
  padding: 18px;
  color: var(--muted-foreground);
  font-size: 13px;
  line-height: 1.6;
  text-align: center;
}

.organization-full-chart-stage-empty {
  min-height: 320px;
  display: grid;
  place-items: center;
}

.organization-full-chart-detail {
  display: grid;
  align-content: start;
  gap: 16px;
  border-top: 1px solid var(--border);
  background: #fbfcfe;
  padding: 20px 24px 24px;
  overflow-y: auto;
}

.organization-full-chart-detail-head {
  display: grid;
  gap: 6px;
}

.organization-full-chart-detail-head strong {
  font-size: 18px;
}

.organization-full-chart-detail-head span {
  color: var(--muted-foreground);
  font-size: 13px;
}

.organization-full-chart-detail-list {
  display: grid;
  gap: 12px;
  margin: 0;
}

.organization-full-chart-detail-list div {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  gap: 8px 12px;
}

.organization-full-chart-detail-list dt {
  color: var(--muted-foreground);
  font-size: 12px;
  font-weight: 700;
}

.organization-full-chart-detail-list dd {
  margin: 0;
  color: var(--foreground);
  font-size: 13px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.organization-full-chart-detail-actions {
  padding-top: 4px;
}

@media (max-width: 1100px) {
  :deep(.organization-full-chart-modal) {
    width: calc(100vw - 20px);
    height: calc(100vh - 20px);
  }

  .organization-full-chart-body {
    grid-template-columns: 260px minmax(0, 1fr);
  }

  .organization-full-chart-content {
    grid-template-rows: minmax(0, 1fr) 300px;
  }
}

@media (max-width: 900px) {
  .organization-full-chart-body {
    grid-template-columns: 1fr;
    grid-template-rows: 240px minmax(0, 1fr);
  }

  .organization-full-chart-nav {
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }

  .organization-full-chart-content {
    grid-template-rows: minmax(0, 1fr) 260px;
  }
}

@media (max-width: 640px) {
  .organization-full-chart-header {
    padding: 18px 16px 14px;
  }

  .organization-full-chart-header h2 {
    font-size: 20px;
  }

  .organization-full-chart-canvas-wrap,
  .organization-full-chart-detail {
    padding: 16px;
  }

  .organization-full-chart-departments {
    grid-template-columns: minmax(0, 1fr);
  }

  .organization-full-chart-detail-list div {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>
