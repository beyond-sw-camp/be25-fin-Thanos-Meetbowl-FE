<template>
  <section class="organization-chart-canvas">
    <div class="organization-chart-canvas__toolbar">
      <div>
        <strong>조직도 캔버스</strong>
        <p>부서, 팀, 구성원 위계를 연결선과 카드로 한눈에 확인할 수 있습니다.</p>
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

    <div v-if="chartData.isEmpty" class="organization-chart-canvas__empty">
      조직도에 표시할 부서, 팀, 구성원 정보가 없습니다.
    </div>

    <div v-else ref="scrollContainerRef" class="organization-chart-canvas__scroll">
      <div class="organization-chart-canvas__stage">
        <div class="organization-chart-canvas__root-wrap">
          <button
            :ref="bindNodeRef(chartData.rootNode.key)"
            type="button"
            class="organization-chart-canvas__node organization-chart-canvas__node--root"
            :class="{ 'is-active': selectedNodeKey === chartData.rootNode.key }"
            :data-node-key="chartData.rootNode.key"
            @click="$emit('select', chartData.rootNode.key)"
          >
            <span class="organization-chart-canvas__node-label">전체 조직</span>
            <strong>{{ chartData.rootNode.name }}</strong>
            <small>
              부서 {{ chartData.rootNode.departmentCount }}개 · 팀 {{ chartData.rootNode.teamCount }}개 · 구성원
              {{ chartData.rootNode.memberCount }}명
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
              <span class="organization-chart-canvas__node-label">Department</span>
              <strong>{{ department.name }}</strong>
              <small>총 {{ department.memberCount }}명</small>
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
                  <span class="organization-chart-canvas__node-label">{{ team.isVirtual ? 'Unassigned' : 'Team' }}</span>
                  <strong>{{ team.name }}</strong>
                  <small>{{ team.memberCount }}명</small>
                </button>

                <div v-if="team.members.length" class="organization-chart-canvas__members">
                  <button
                    v-for="member in team.members"
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
                </div>

                <div v-else class="organization-chart-canvas__member-empty">배정된 구성원이 없습니다.</div>
              </section>
            </div>

            <div v-else class="organization-chart-canvas__member-empty">하위 팀이 없습니다.</div>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'

const props = defineProps({
  chartData: { type: Object, required: true },
  selectedNodeKey: { type: String, default: '' },
  showDetailButton: { type: Boolean, default: false },
})

defineEmits(['select', 'toggle-detail'])

const scrollContainerRef = ref(null)
const nodeElementMap = new Map()

function bindNodeRef(key) {
  return (element) => {
    if (element) {
      nodeElementMap.set(key, element)
      return
    }

    nodeElementMap.delete(key)
  }
}

async function scrollToSelectedNode(nodeKey) {
  if (!nodeKey) return
  await nextTick()
  const element = nodeElementMap.get(nodeKey)
  const container = scrollContainerRef.value

  if (!element || !container) return

  // 좌측 탐색이나 상세 패널에서 선택해도 중앙 캔버스에서 같은 노드를 바로 찾을 수 있게 중앙 정렬한다.
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
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
}

.organization-chart-canvas__toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
}

.organization-chart-canvas__toolbar strong {
  font-size: 15px;
}

.organization-chart-canvas__toolbar p {
  margin: 6px 0 0;
  color: var(--muted-foreground);
  font-size: 12px;
  line-height: 1.6;
}

.organization-chart-canvas__scroll {
  min-height: 0;
  overflow: auto;
  padding: 28px;
  background:
    radial-gradient(circle at top left, rgba(243, 115, 33, 0.08), transparent 20%),
    linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%);
}

.organization-chart-canvas__stage {
  min-width: max-content;
  min-height: 100%;
  display: grid;
  justify-items: center;
  gap: 34px;
}

.organization-chart-canvas__root-wrap {
  position: relative;
  padding-bottom: 8px;
}

.organization-chart-canvas__root-wrap::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -26px;
  width: 1px;
  height: 26px;
  background: #d8e2ee;
}

.organization-chart-canvas__departments {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 24px;
  padding-top: 26px;
}

.organization-chart-canvas__departments::before {
  content: '';
  position: absolute;
  top: 0;
  left: 60px;
  right: 60px;
  height: 1px;
  background: #d8e2ee;
}

.organization-chart-canvas__department {
  position: relative;
  width: 320px;
  display: grid;
  gap: 18px;
  justify-items: center;
}

.organization-chart-canvas__department::before {
  content: '';
  position: absolute;
  top: -26px;
  left: 50%;
  width: 1px;
  height: 26px;
  background: #d8e2ee;
}

.organization-chart-canvas__teams {
  position: relative;
  width: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 16px;
  padding-top: 22px;
}

.organization-chart-canvas__teams::before {
  content: '';
  position: absolute;
  top: 0;
  left: 24px;
  right: 24px;
  height: 1px;
  background: #d8e2ee;
}

.organization-chart-canvas__team-branch {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  display: grid;
  gap: 14px;
  justify-items: center;
}

.organization-chart-canvas__team-branch::before {
  content: '';
  position: absolute;
  top: -22px;
  left: 50%;
  width: 1px;
  height: 22px;
  background: #d8e2ee;
}

.organization-chart-canvas__members {
  position: relative;
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  padding-top: 18px;
}

.organization-chart-canvas__members::before {
  content: '';
  position: absolute;
  top: 0;
  left: calc(50% - 0.5px);
  width: 1px;
  height: 18px;
  background: #d8e2ee;
}

.organization-chart-canvas__node {
  border: 1px solid var(--border);
  border-radius: 18px;
  background: #ffffff;
  color: var(--foreground);
  text-align: left;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.05);
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
}

.organization-chart-canvas__node:hover,
.organization-chart-canvas__node.is-active {
  border-color: rgba(243, 115, 33, 0.48);
  background: #fff7ed;
  box-shadow: 0 16px 34px rgba(243, 115, 33, 0.12);
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
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.organization-chart-canvas__node--root {
  width: 360px;
  padding: 18px 20px;
}

.organization-chart-canvas__node--root strong {
  margin-top: 6px;
  font-size: 22px;
}

.organization-chart-canvas__node--root small {
  margin-top: 10px;
  color: var(--muted-foreground);
  font-size: 12px;
}

.organization-chart-canvas__node--department {
  width: 100%;
  padding: 16px 18px;
  border-top: 4px solid var(--primary);
}

.organization-chart-canvas__node--department strong {
  margin-top: 8px;
  font-size: 16px;
}

.organization-chart-canvas__node--department small {
  margin-top: 10px;
  color: var(--muted-foreground);
  font-size: 12px;
}

.organization-chart-canvas__node--team {
  width: 100%;
  min-height: 108px;
  padding: 15px 16px;
  background: #fcfcfd;
}

.organization-chart-canvas__node--team strong {
  margin-top: 7px;
  font-size: 14px;
}

.organization-chart-canvas__node--team small {
  margin-top: 10px;
  color: var(--muted-foreground);
  font-size: 12px;
}

.organization-chart-canvas__node--member {
  min-width: 116px;
  padding: 11px 13px;
  border-radius: 14px;
}

.organization-chart-canvas__node--member strong {
  font-size: 13px;
}

.organization-chart-canvas__node--member small {
  margin-top: 5px;
  color: var(--muted-foreground);
  font-size: 11px;
}

.organization-chart-canvas__member-empty,
.organization-chart-canvas__empty {
  border: 1px dashed var(--border);
  border-radius: 16px;
  background: #f8fafc;
  padding: 20px;
  color: var(--muted-foreground);
  font-size: 13px;
  line-height: 1.6;
  text-align: center;
}

.organization-chart-canvas__member-empty {
  width: 100%;
}

.organization-chart-canvas__empty {
  margin: 24px;
}

@media (max-width: 960px) {
  .organization-chart-canvas__toolbar {
    padding: 16px;
  }

  .organization-chart-canvas__scroll {
    padding: 20px 16px 24px;
  }

  .organization-chart-canvas__department {
    width: 280px;
  }

  .organization-chart-canvas__node--root {
    width: 320px;
  }
}
</style>
