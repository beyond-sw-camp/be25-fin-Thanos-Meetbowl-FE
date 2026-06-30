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

          <div class="organization-chart-canvas__departments-section">
            <div class="organization-chart-canvas__root-connector" aria-hidden="true">
              <span class="organization-chart-canvas__root-connector-stem"></span>
              <span class="organization-chart-canvas__root-connector-rail"></span>
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

                <div v-if="department.teams.length" class="organization-chart-canvas__department-branch">
                  <div class="organization-chart-canvas__department-connector" aria-hidden="true">
                    <span class="organization-chart-canvas__department-connector-stem"></span>
                    <span class="organization-chart-canvas__department-connector-rail"></span>
                  </div>

                  <div class="organization-chart-canvas__teams">
                    <section
                      v-for="team in department.teams"
                      :key="team.key"
                      class="organization-chart-canvas__team-column"
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

                      <div class="organization-chart-canvas__team-members">
                        <span class="organization-chart-canvas__team-members-stem" aria-hidden="true"></span>

                        <div class="organization-chart-canvas__member-list" :class="{ 'is-active': isSelectedTeam(team.key) }">
                          <!-- 팀원 row는 팀 카드와 같은 세로 축을 따라 묶여 보이게 유지한다. -->
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
                      </div>
                    </section>
                  </div>
                </div>

                <div v-else class="organization-chart-canvas__member-empty">하위 팀 없음</div>
              </article>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'

const DEFAULT_SCALE = 0.95
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
  --org-line-color: #cbd5e1;
  --org-canvas-background: #fcfcfd;
  --org-text-strong: #1f2937;
  --org-text-muted: #6b7280;
  --org-canvas-side-padding: 8px;
  --org-root-border: #f97316;
  --org-root-background: #fff7ed;
  --org-department-border: #fdba74;
  --org-department-background: #fffdf9;
  --org-team-border: #fed7aa;
  --org-team-background: #ffffff;
  --org-member-border: #e5e7eb;
  --org-member-background: #ffffff;
  --org-hover-background: #fffaf5;
  --org-selected-background: #fff7ed;
  --org-selected-border: #ea580c;
  min-height: 0;
  min-width: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
}

.organization-chart-canvas__toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  height: var(--organization-panel-header-height, 62px);
  padding: var(--organization-panel-header-padding-y, 10px) var(--organization-panel-header-padding-x, 14px);
  border-bottom: 1px solid var(--border);
  background: #ffffff;
  box-sizing: border-box;
  overflow: hidden;
}

.organization-chart-canvas__toolbar strong {
  font-size: var(--organization-panel-title-size, 13px);
  color: var(--org-text-strong);
  line-height: 1.25;
}

.organization-chart-canvas__toolbar p {
  margin: 3px 0 0;
  color: var(--org-text-muted);
  font-size: var(--organization-panel-copy-size, 11px);
  line-height: 1.4;
}

.organization-chart-canvas__toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  align-self: stretch;
}

.organization-chart-canvas__zoom-controls {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.organization-chart-canvas__zoom-controls span {
  min-width: 42px;
  color: var(--org-text-muted);
  font-size: 11px;
  font-weight: 700;
  text-align: center;
}

.organization-chart-canvas__scroll {
  min-height: 0;
  min-width: 0;
  overflow: auto;
  padding: 14px var(--org-canvas-side-padding) 18px;
  background: var(--org-canvas-background);
}

.organization-chart-canvas__stage-shell {
  width: max-content;
  min-width: 100%;
  display: grid;
  justify-content: center;
  padding-inline: var(--org-canvas-side-padding);
  padding-bottom: 16px;
}

.organization-chart-canvas__stage {
  width: max-content;
  display: grid;
  justify-items: center;
  gap: 20px;
  transform-origin: top center;
}

.organization-chart-canvas__root-wrap {
  position: relative;
}

.organization-chart-canvas__departments-section {
  width: max-content;
  display: grid;
  gap: 0;
}

.organization-chart-canvas__root-connector {
  position: relative;
  height: 28px;
}

.organization-chart-canvas__root-connector-stem {
  position: absolute;
  top: 0;
  left: 50%;
  width: 2px;
  height: 14px;
  background: var(--org-line-color);
  transform: translateX(-50%);
}

.organization-chart-canvas__root-connector-rail {
  position: absolute;
  top: 14px;
  left: 137px;
  right: 137px;
  height: 2px;
  background: var(--org-line-color);
}

.organization-chart-canvas__departments {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 24px;
}

.organization-chart-canvas__department {
  position: relative;
  width: 274px;
  flex: 0 0 274px;
  display: grid;
  gap: 10px;
  justify-items: center;
  padding-top: 14px;
}

.organization-chart-canvas__department::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  width: 2px;
  height: 14px;
  background: var(--org-line-color);
  transform: translateX(-50%);
}

.organization-chart-canvas__department-branch {
  position: relative;
  width: 100%;
  display: grid;
  gap: 0;
}

.organization-chart-canvas__department-connector {
  position: relative;
  height: 24px;
}

.organization-chart-canvas__department-connector-stem {
  position: absolute;
  top: 0;
  left: 50%;
  width: 2px;
  height: 12px;
  background: var(--org-line-color);
  transform: translateX(-50%);
}

.organization-chart-canvas__department-connector-rail {
  position: absolute;
  top: 12px;
  left: 66px;
  right: 66px;
  height: 2px;
  background: var(--org-line-color);
}

.organization-chart-canvas__teams {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  justify-content: center;
  width: 100%;
}

.organization-chart-canvas__team-column {
  position: relative;
  width: 132px;
  min-width: 132px;
  max-width: 132px;
  flex: 0 0 132px;
  display: grid;
  gap: 6px;
  align-content: start;
}

.organization-chart-canvas__team-column::before {
  content: '';
  position: absolute;
  top: -12px;
  left: 50%;
  width: 2px;
  height: 12px;
  background: var(--org-line-color);
  transform: translateX(-50%);
}

.organization-chart-canvas__node {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #ffffff;
  color: var(--org-text-strong);
  text-align: left;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}

.organization-chart-canvas__node:hover {
  background: var(--org-hover-background);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.organization-chart-canvas__node.is-active {
  border-color: var(--org-selected-border);
  background: var(--org-selected-background);
  box-shadow: 0 0 0 1px rgba(249, 115, 22, 0.08);
}

.organization-chart-canvas__node:focus-visible {
  outline: 2px solid rgba(249, 115, 22, 0.24);
  outline-offset: 2px;
}

.organization-chart-canvas__node--root {
  min-width: 156px;
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  border-width: 2px;
  border-color: var(--org-root-border);
  background: var(--org-root-background);
  box-shadow: 0 1px 2px rgba(249, 115, 22, 0.06);
}

.organization-chart-canvas__node--root strong {
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.organization-chart-canvas__node--root small {
  color: var(--org-text-muted);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.organization-chart-canvas__node--department {
  width: 140px;
  justify-self: center;
  min-height: 50px;
  display: grid;
  gap: 4px;
  padding: 8px 10px;
  border-color: var(--org-department-border);
  background: var(--org-department-background);
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
  color: var(--org-text-muted);
  font-size: 10px;
  white-space: nowrap;
}

.organization-chart-canvas__node--team {
  width: 100%;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 9px;
  border-color: var(--org-team-border);
  background: var(--org-team-background);
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
  color: var(--org-text-muted);
  white-space: nowrap;
}

.organization-chart-canvas__team-members {
  position: relative;
  width: 100%;
  display: grid;
  justify-items: center;
  padding-top: 8px;
}

.organization-chart-canvas__team-members-stem {
  position: absolute;
  top: 0;
  left: 50%;
  width: 2px;
  height: 8px;
  background: var(--org-line-color);
  transform: translateX(-50%);
}

.organization-chart-canvas__member-list {
  position: relative;
  width: 100%;
  display: grid;
  gap: 5px;
}

.organization-chart-canvas__member-row {
  width: 100%;
  min-height: 29px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid var(--org-member-border);
  border-radius: 8px;
  background: var(--org-member-background);
  padding: 4px 8px;
  color: var(--org-text-strong);
  text-align: left;
  box-shadow: none;
  transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}

.organization-chart-canvas__member-row:hover {
  border-color: #d1d5db;
  background: #fffaf7;
}

.organization-chart-canvas__member-row.is-active {
  border-color: var(--org-selected-border);
  background: var(--org-selected-background);
}

.organization-chart-canvas__member-row:focus-visible {
  outline: 2px solid rgba(249, 115, 22, 0.24);
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
  color: var(--org-text-muted);
  white-space: nowrap;
}

.organization-chart-canvas__member-empty,
.organization-chart-canvas__empty {
  border: 1px dashed var(--border);
  border-radius: 10px;
  background: #ffffff;
  padding: 10px 12px;
  color: var(--org-text-muted);
  font-size: 11px;
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
    padding: var(--organization-panel-header-padding-y, 10px) var(--organization-panel-header-padding-x, 14px);
  }

  .organization-chart-canvas__toolbar-actions {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .organization-chart-canvas__scroll {
    padding: 14px var(--org-canvas-side-padding);
  }

  .organization-chart-canvas__teams {
    gap: 12px;
  }
}
</style>
