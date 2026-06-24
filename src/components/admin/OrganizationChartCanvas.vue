<template>
  <section class="organization-chart-canvas">
    <div class="organization-chart-canvas__toolbar">
      <div>
        <strong>조직도 캔버스</strong>
        <p>기본 화면에서는 루트, 부서, 팀 구조를 우선 보여주고 상세 정보는 우측 패널에서 확인합니다.</p>
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
      <div class="organization-chart-canvas__stage-shell">
        <div class="organization-chart-canvas__stage" :style="stageStyle">
          <div class="organization-chart-canvas__root-wrap">
            <button
              :ref="bindNodeRef(chartData.rootNode.key)"
              type="button"
              class="organization-chart-canvas__node organization-chart-canvas__node--root"
              :class="{ 'is-active': selectedNodeKey === chartData.rootNode.key }"
              @click="$emit('select', chartData.rootNode.key)"
            >
              <strong>{{ chartData.rootNode.name }}</strong>
              <small>{{ chartData.rootNode.memberCount }}명</small>
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
                @click="$emit('select', department.key)"
              >
                <div class="organization-chart-canvas__department-main">
                  <strong>{{ department.name }}</strong>
                  <span>{{ department.memberCount }}명</span>
                </div>
                <small>팀 {{ department.teamCount }}개</small>
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
                    @click="$emit('select', team.key)"
                  >
                    <strong>{{ team.name }}</strong>
                    <span>{{ team.memberCount }}명</span>
                  </button>

                  <div
                    class="organization-chart-canvas__member-list"
                    :class="{ 'is-active': isSelectedTeam(team.key) }"
                  >
                    <!-- 직원은 팀 아래 세로 리스트로 고정해 부서별 묶음 구조를 한눈에 파악하게 한다. -->
                    <button
                      v-for="member in team.members"
                      :key="member.key"
                      :ref="bindNodeRef(member.key)"
                      type="button"
                      class="organization-chart-canvas__member-row"
                      :class="{ 'is-active': selectedNodeKey === member.key }"
                      @click="$emit('select', member.key)"
                    >
                      <strong>{{ member.name }}</strong>
                      <span>{{ member.position || '-' }}</span>
                    </button>

                    <div v-if="!team.members.length" class="organization-chart-canvas__member-empty">
                      구성원 없음
                    </div>
                  </div>
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
const MIN_SCALE = 0.8
const MAX_SCALE = 1.05
const SCALE_STEP = 0.05

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

function isSelectedTeam(teamKey) {
  if (!props.selectedNode) return false
  if (props.selectedNode.type === 'team') return props.selectedNode.key === teamKey
  if (props.selectedNode.type === 'member') return props.selectedNode.parentKey === teamKey
  return false
}

async function scrollToSelectedNode(nodeKey) {
  if (!nodeKey) return
  await nextTick()
  const element = nodeElementMap.get(nodeKey)
  if (!element || !scrollContainerRef.value) return

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
  line-height: 1.45;
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
  padding: 16px;
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
  display: grid;
  justify-items: center;
  gap: 28px;
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
  bottom: -22px;
  width: 1px;
  height: 22px;
  background: #d8e2ee;
}

.organization-chart-canvas__departments {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 24px;
  padding-top: 22px;
}

.organization-chart-canvas__departments::before {
  content: '';
  position: absolute;
  top: 0;
  left: 36px;
  right: 36px;
  height: 1px;
  background: #d8e2ee;
}

.organization-chart-canvas__department {
  position: relative;
  width: max-content;
  min-width: 156px;
  display: grid;
  gap: 12px;
  justify-items: stretch;
}

.organization-chart-canvas__department::before {
  content: '';
  position: absolute;
  top: -22px;
  left: 50%;
  width: 1px;
  height: 22px;
  background: #d8e2ee;
}

.organization-chart-canvas__teams {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding-top: 16px;
}

.organization-chart-canvas__teams::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  width: 1px;
  height: 16px;
  background: #d8e2ee;
}

.organization-chart-canvas__team-branch {
  min-width: 134px;
  max-width: 148px;
  display: grid;
  gap: 8px;
  align-content: start;
}

.organization-chart-canvas__node {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #ffffff;
  color: var(--foreground);
  text-align: left;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
}

.organization-chart-canvas__node:hover,
.organization-chart-canvas__node.is-active {
  border-color: rgba(243, 115, 33, 0.45);
  background: #fff7ed;
  box-shadow: 0 10px 22px rgba(243, 115, 33, 0.1);
}

.organization-chart-canvas__node:focus-visible {
  outline: 2px solid rgba(243, 115, 33, 0.32);
  outline-offset: 2px;
}

.organization-chart-canvas__node--root {
  min-width: 240px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
}

.organization-chart-canvas__node--root strong {
  font-size: 14px;
}

.organization-chart-canvas__node--root small {
  color: var(--muted-foreground);
  font-size: 12px;
  white-space: nowrap;
}

.organization-chart-canvas__node--department {
  min-height: 54px;
  display: grid;
  gap: 5px;
  padding: 8px 10px;
  border-top: 3px solid var(--primary);
}

.organization-chart-canvas__department-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.organization-chart-canvas__node--department strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}

.organization-chart-canvas__node--department span,
.organization-chart-canvas__node--department small {
  color: var(--muted-foreground);
  font-size: 10px;
  white-space: nowrap;
}

.organization-chart-canvas__node--team {
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  background: #fcfcfd;
}

.organization-chart-canvas__node--team strong,
.organization-chart-canvas__node--team span {
  font-size: 11px;
  line-height: 1.2;
}

.organization-chart-canvas__node--team strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.organization-chart-canvas__node--team span {
  color: var(--muted-foreground);
  white-space: nowrap;
}

.organization-chart-canvas__member-list {
  display: grid;
  gap: 4px;
  padding: 6px 0 0 0;
}

.organization-chart-canvas__member-list.is-active {
  border-top-color: rgba(243, 115, 33, 0.28);
}

.organization-chart-canvas__member-row {
  min-height: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  padding: 3px 4px;
  color: var(--foreground);
  text-align: left;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.organization-chart-canvas__member-row:hover,
.organization-chart-canvas__member-row.is-active {
  background: #fff7ed;
}

.organization-chart-canvas__member-row:focus-visible {
  outline: 2px solid rgba(243, 115, 33, 0.28);
  outline-offset: 1px;
}

.organization-chart-canvas__member-row strong,
.organization-chart-canvas__member-row span {
  font-size: 11px;
  line-height: 1.25;
}

.organization-chart-canvas__member-row strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.organization-chart-canvas__member-row span {
  color: var(--muted-foreground);
  white-space: nowrap;
}

.organization-chart-canvas__member-empty,
.organization-chart-canvas__empty {
  border: 1px dashed var(--border);
  border-radius: 10px;
  background: #f8fafc;
  padding: 10px 12px;
  color: var(--muted-foreground);
  font-size: 11px;
  text-align: center;
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
