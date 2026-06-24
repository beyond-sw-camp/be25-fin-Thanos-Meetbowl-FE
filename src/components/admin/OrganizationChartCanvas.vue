<template>
  <section class="organization-chart-canvas">
    <div class="organization-chart-canvas__toolbar">
      <div>
        <strong>조직도 캔버스</strong>
        <p>전체 구조를 먼저 보여주고, 선택한 팀만 더 자세히 펼쳐서 확인할 수 있습니다.</p>
      </div>

      <div class="organization-chart-canvas__toolbar-actions">
        <div class="organization-chart-canvas__zoom-controls" aria-label="조직도 확대 축소">
          <button type="button" class="secondary-button small" @click="decreaseScale">-</button>
          <span>{{ scaleLabel }}</span>
          <button type="button" class="secondary-button small" @click="increaseScale">+</button>
          <button type="button" class="secondary-button small" @click="fitScale">화면 맞춤</button>
        </div>

        <button
          v-if="showDetailButton"
          type="button"
          class="secondary-button small"
          @click="$emit('toggle-detail')"
        >
          상세 정보
        </button>
      </div>
    </div>

    <div v-if="chartData.isEmpty" class="organization-chart-canvas__empty">
      조직도에 표시할 부서, 팀, 구성원 정보가 없습니다.
    </div>

    <div v-else ref="scrollContainerRef" class="organization-chart-canvas__scroll">
      <div class="organization-chart-canvas__stage-shell" :style="stageShellStyle">
        <div class="organization-chart-canvas__stage" :style="stageStyle">
          <div class="organization-chart-canvas__root-wrap">
            <button
              :ref="bindNodeRef(chartData.rootNode.key)"
              type="button"
              class="organization-chart-canvas__node organization-chart-canvas__node--root"
              :class="{ 'is-active': selectedNodeKey === chartData.rootNode.key }"
              :data-node-key="chartData.rootNode.key"
              @click="$emit('select', chartData.rootNode.key)"
            >
              <span class="organization-chart-canvas__node-label">ORGANIZATION</span>
              <strong>{{ chartData.rootNode.name }}</strong>
              <small>
                부서 {{ chartData.rootNode.departmentCount }}개 · 팀 {{ chartData.rootNode.teamCount }}개 ·
                구성원 {{ chartData.rootNode.memberCount }}명
              </small>
            </button>
          </div>

          <div class="organization-chart-canvas__departments">
            <article
              v-for="department in chartData.rootNode.departments"
              :key="department.key"
              class="organization-chart-canvas__department"
            >
              <button
                :ref="bindNodeRef(department.key)"
                type="button"
                class="organization-chart-canvas__node organization-chart-canvas__node--department"
                :class="{ 'is-active': selectedNodeKey === department.key }"
                :data-node-key="department.key"
                @click="$emit('select', department.key)"
              >
                <span class="organization-chart-canvas__node-label">DEPARTMENT</span>
                <strong>{{ department.name }}</strong>
                <small>총 {{ department.memberCount }}명 · 팀 {{ department.teamCount }}개</small>
              </button>

              <div v-if="department.teams.length" class="organization-chart-canvas__teams">
                <section
                  v-for="team in department.teams"
                  :key="team.key"
                  class="organization-chart-canvas__team-branch"
                >
                  <button
                    :ref="bindNodeRef(team.key)"
                    type="button"
                    class="organization-chart-canvas__node organization-chart-canvas__node--team"
                    :class="{ 'is-active': selectedNodeKey === team.key }"
                    :data-node-key="team.key"
                    @click="$emit('select', team.key)"
                  >
                    <span class="organization-chart-canvas__node-label">{{ team.isVirtual ? 'UNASSIGNED' : 'TEAM' }}</span>
                    <strong>{{ team.name }}</strong>
                    <small>{{ team.memberCount }}명</small>
                  </button>

                  <div v-if="team.members.length" class="organization-chart-canvas__members">
                    <button
                      v-for="member in visibleMembers(team)"
                      :key="member.key"
                      :ref="bindNodeRef(member.key)"
                      type="button"
                      class="organization-chart-canvas__node organization-chart-canvas__node--member"
                      :class="{ 'is-active': selectedNodeKey === member.key }"
                      :data-node-key="member.key"
                      @click="$emit('select', member.key)"
                    >
                      <strong>{{ member.name }}</strong>
                      <small>{{ member.position || '-' }}</small>
                    </button>

                    <button
                      v-if="hiddenMemberCount(team) > 0"
                      type="button"
                      class="organization-chart-canvas__node organization-chart-canvas__node--more"
                      @click="$emit('select', team.key)"
                    >
                      +{{ hiddenMemberCount(team) }}명
                    </button>
                  </div>

                  <div v-else class="organization-chart-canvas__member-empty">구성원 없음</div>
                </section>
              </div>

              <div v-else class="organization-chart-canvas__member-empty">하위 팀 없음</div>
            </article>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'

const DEFAULT_SCALE = 0.9
const MIN_SCALE = 0.75
const MAX_SCALE = 1.1
const SCALE_STEP = 0.05
const MEMBER_PREVIEW_LIMIT = 4

const props = defineProps({
  chartData: { type: Object, required: true },
  selectedNodeKey: { type: String, default: '' },
  selectedNode: { type: Object, default: null },
  showDetailButton: { type: Boolean, default: false },
})

defineEmits(['select', 'toggle-detail'])

const scrollContainerRef = ref(null)
const nodeElementMap = new Map()
const currentScale = ref(DEFAULT_SCALE)

const scaleLabel = computed(() => `${Math.round(currentScale.value * 100)}%`)
const stageStyle = computed(() => ({
  transform: `scale(${currentScale.value})`,
}))
const stageShellStyle = computed(() => ({
  paddingBottom: `${Math.max(0, (1 - currentScale.value) * 120)}px`,
}))

function bindNodeRef(key) {
  return (element) => {
    if (element) {
      nodeElementMap.set(key, element)
      return
    }

    nodeElementMap.delete(key)
  }
}

function clampScale(value) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(value.toFixed(2))))
}

function decreaseScale() {
  currentScale.value = clampScale(currentScale.value - SCALE_STEP)
}

function increaseScale() {
  currentScale.value = clampScale(currentScale.value + SCALE_STEP)
}

function fitScale() {
  currentScale.value = DEFAULT_SCALE
}

function isExpandedTeam(team) {
  if (!props.selectedNode) return false
  if (props.selectedNode.type === 'team') return props.selectedNode.key === team.key
  if (props.selectedNode.type === 'member') return props.selectedNode.parentKey === team.key
  return false
}

function visibleMembers(team) {
  // 기본 상태에서는 조직 전체 구조가 먼저 보이도록 팀원 미리보기만 노출하고, 선택한 팀만 모두 펼친다.
  if (isExpandedTeam(team)) return team.members
  return team.members.slice(0, MEMBER_PREVIEW_LIMIT)
}

function hiddenMemberCount(team) {
  if (isExpandedTeam(team)) return 0
  return Math.max(team.members.length - MEMBER_PREVIEW_LIMIT, 0)
}

async function scrollToSelectedNode(nodeKey) {
  if (!nodeKey) return
  await nextTick()
  const element = nodeElementMap.get(nodeKey)
  const container = scrollContainerRef.value

  if (!element || !container) return

  // 좌측 탐색과 우측 상세 정보에서 선택해도 중앙 캔버스가 같은 노드를 중심으로 보여주도록 맞춘다.
  element.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'center',
  })
}

watch(
  () => props.selectedNodeKey,
  (nodeKey) => {
    scrollToSelectedNode(nodeKey)
  },
)
</script>

<style scoped>
.organization-chart-canvas {
  min-height: 0;
  min-width: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
}

.organization-chart-canvas__toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px 12px;
  border-bottom: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(10px);
}

.organization-chart-canvas__toolbar strong {
  font-size: 14px;
}

.organization-chart-canvas__toolbar p {
  margin: 4px 0 0;
  color: var(--muted-foreground);
  font-size: 11px;
  line-height: 1.5;
}

.organization-chart-canvas__toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.organization-chart-canvas__zoom-controls {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.organization-chart-canvas__zoom-controls span {
  min-width: 42px;
  color: var(--muted-foreground);
  font-size: 11px;
  font-weight: 700;
  text-align: center;
}

.organization-chart-canvas__scroll {
  min-height: 0;
  min-width: 0;
  overflow: auto;
  padding: 18px;
  background:
    radial-gradient(circle at top left, rgba(243, 115, 33, 0.08), transparent 20%),
    linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%);
}

.organization-chart-canvas__stage-shell {
  width: max-content;
  min-width: 100%;
  display: grid;
  justify-content: center;
}

.organization-chart-canvas__stage {
  width: max-content;
  min-height: 100%;
  display: grid;
  justify-items: center;
  gap: 30px;
  transform-origin: top center;
}

.organization-chart-canvas__root-wrap {
  position: relative;
  padding-bottom: 4px;
}

.organization-chart-canvas__root-wrap::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -24px;
  width: 1px;
  height: 24px;
  background: #d8e2ee;
}

.organization-chart-canvas__departments {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 28px;
  padding-top: 24px;
}

.organization-chart-canvas__departments::before {
  content: '';
  position: absolute;
  top: 0;
  left: 40px;
  right: 40px;
  height: 1px;
  background: #d8e2ee;
}

.organization-chart-canvas__department {
  position: relative;
  width: 206px;
  display: grid;
  gap: 14px;
  justify-items: center;
}

.organization-chart-canvas__department::before {
  content: '';
  position: absolute;
  top: -24px;
  left: 50%;
  width: 1px;
  height: 24px;
  background: #d8e2ee;
}

.organization-chart-canvas__teams {
  position: relative;
  width: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 18px;
  padding-top: 20px;
}

.organization-chart-canvas__teams::before {
  content: '';
  position: absolute;
  top: 0;
  left: 18px;
  right: 18px;
  height: 1px;
  background: #d8e2ee;
}

.organization-chart-canvas__team-branch {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  display: grid;
  gap: 10px;
  justify-items: center;
}

.organization-chart-canvas__team-branch::before {
  content: '';
  position: absolute;
  top: -20px;
  left: 50%;
  width: 1px;
  height: 20px;
  background: #d8e2ee;
}

.organization-chart-canvas__members {
  position: relative;
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  padding-top: 14px;
}

.organization-chart-canvas__members::before {
  content: '';
  position: absolute;
  top: 0;
  left: calc(50% - 0.5px);
  width: 1px;
  height: 14px;
  background: #d8e2ee;
}

.organization-chart-canvas__node {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #ffffff;
  color: var(--foreground);
  text-align: left;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
}

.organization-chart-canvas__node:hover,
.organization-chart-canvas__node.is-active {
  border-color: rgba(243, 115, 33, 0.48);
  background: #fff7ed;
  box-shadow: 0 12px 26px rgba(243, 115, 33, 0.11);
}

.organization-chart-canvas__node:focus-visible {
  outline: 2px solid rgba(243, 115, 33, 0.35);
  outline-offset: 3px;
}

.organization-chart-canvas__node strong,
.organization-chart-canvas__node small,
.organization-chart-canvas__node span {
  display: block;
}

.organization-chart-canvas__node-label {
  color: var(--muted-foreground);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.organization-chart-canvas__node--root {
  width: 290px;
  padding: 14px 16px;
}

.organization-chart-canvas__node--root strong {
  margin-top: 4px;
  font-size: 18px;
}

.organization-chart-canvas__node--root small {
  margin-top: 8px;
  color: var(--muted-foreground);
  font-size: 11px;
}

.organization-chart-canvas__node--department {
  width: 100%;
  min-height: 68px;
  padding: 12px 14px;
  border-top: 3px solid var(--primary);
}

.organization-chart-canvas__node--department strong {
  margin-top: 5px;
  font-size: 14px;
  line-height: 1.25;
}

.organization-chart-canvas__node--department small {
  margin-top: 8px;
  color: var(--muted-foreground);
  font-size: 11px;
}

.organization-chart-canvas__node--team {
  width: 150px;
  min-height: 60px;
  padding: 10px 12px;
  background: #fcfcfd;
}

.organization-chart-canvas__node--team strong {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.25;
}

.organization-chart-canvas__node--team small {
  margin-top: 6px;
  color: var(--muted-foreground);
  font-size: 10px;
}

.organization-chart-canvas__node--member,
.organization-chart-canvas__node--more {
  min-width: 108px;
  min-height: 46px;
  padding: 8px 10px;
  border-radius: 12px;
}

.organization-chart-canvas__node--member strong,
.organization-chart-canvas__node--more {
  font-size: 11px;
}

.organization-chart-canvas__node--member small {
  margin-top: 4px;
  color: var(--muted-foreground);
  font-size: 10px;
}

.organization-chart-canvas__node--more {
  display: grid;
  place-items: center;
  background: #fffaf5;
  color: var(--primary-dark);
  font-weight: 700;
}

.organization-chart-canvas__member-empty,
.organization-chart-canvas__empty {
  border: 1px dashed var(--border);
  border-radius: 12px;
  background: #f8fafc;
  padding: 12px;
  color: var(--muted-foreground);
  font-size: 11px;
  line-height: 1.5;
  text-align: center;
}

.organization-chart-canvas__member-empty {
  width: 100%;
}

.organization-chart-canvas__empty {
  margin: 16px;
}

@media (max-width: 960px) {
  .organization-chart-canvas__toolbar {
    padding: 12px 14px 10px;
  }

  .organization-chart-canvas__toolbar-actions {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .organization-chart-canvas__scroll {
    padding: 14px;
  }
}
</style>
