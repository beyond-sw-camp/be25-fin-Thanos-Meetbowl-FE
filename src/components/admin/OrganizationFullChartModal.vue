<template>
  <ModalShell modal-class="organization-full-chart-modal" @close="$emit('close')">
    <section
      class="organization-full-chart"
      role="dialog"
      aria-modal="true"
      aria-labelledby="organization-full-chart-title"
      aria-describedby="organization-full-chart-description"
    >
      <header class="organization-full-chart__header">
        <div>
          <h2 id="organization-full-chart-title">전체 조직도</h2>
          <p id="organization-full-chart-description">
            부서, 팀, 구성원 구조를 한눈에 확인할 수 있습니다.
          </p>
        </div>

        <div class="organization-full-chart__header-actions">
          <button
            v-if="isCompactLayout"
            type="button"
            class="secondary-button small"
            @click="mobileDetailOpen = !mobileDetailOpen"
          >
            상세 정보
          </button>
          <button
            ref="closeButtonRef"
            type="button"
            class="organization-full-chart__close"
            aria-label="전체 조직도 닫기"
            @click="$emit('close')"
          >
            닫기
          </button>
        </div>
      </header>

      <div class="organization-full-chart__body">
        <OrganizationTreeNavigation
          :chart-data="chartData"
          :selected-node-key="selectedNodeKey"
          @select="selectNode"
        />

        <OrganizationChartCanvas
          :chart-data="chartData"
          :selected-node-key="selectedNodeKey"
          :show-detail-button="isCompactLayout"
          @select="selectNode"
          @toggle-detail="mobileDetailOpen = true"
        />

        <aside class="organization-full-chart__detail">
          <OrganizationDetailPanel :selected-node="selectedNode" />
        </aside>
      </div>

      <div
        v-if="isCompactLayout && mobileDetailOpen"
        class="organization-full-chart__drawer-backdrop"
        @click.self="mobileDetailOpen = false"
      >
        <div class="organization-full-chart__drawer">
          <div class="organization-full-chart__drawer-head">
            <strong>상세 정보</strong>
            <button
              type="button"
              class="organization-full-chart__drawer-close"
              aria-label="상세 정보 닫기"
              @click="mobileDetailOpen = false"
            >
              닫기
            </button>
          </div>
          <OrganizationDetailPanel :selected-node="selectedNode" drawer />
        </div>
      </div>
    </section>
  </ModalShell>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ModalShell from '../common/ModalShell.vue'
import OrganizationChartCanvas from './OrganizationChartCanvas.vue'
import OrganizationDetailPanel from './OrganizationDetailPanel.vue'
import OrganizationTreeNavigation from './OrganizationTreeNavigation.vue'
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
const mobileDetailOpen = ref(false)
const isCompactLayout = ref(false)

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

function selectNode(nodeKey) {
  selectedNodeKey.value = nodeKey

  if (isCompactLayout.value) {
    mobileDetailOpen.value = true
  }
}

function syncCompactLayout() {
  isCompactLayout.value = window.innerWidth <= 1180

  if (!isCompactLayout.value) {
    mobileDetailOpen.value = false
  }
}

function handleWindowKeydown(event) {
  if (event.key === 'Escape') emit('close')
}

watch(
  chartData,
  (nextData) => {
    if (!selectedNodeKey.value) return
    if (nextData.nodeMap.has(selectedNodeKey.value)) return
    selectedNodeKey.value = ''
  },
  { immediate: true },
)

onMounted(async () => {
  window.addEventListener('keydown', handleWindowKeydown)
  window.addEventListener('resize', syncCompactLayout)
  syncCompactLayout()
  await nextTick()
  closeButtonRef.value?.focus()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleWindowKeydown)
  window.removeEventListener('resize', syncCompactLayout)
})
</script>

<style scoped>
:deep(.organization-full-chart-modal) {
  width: min(1680px, calc(100vw - 24px));
  height: min(960px, calc(100vh - 24px));
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  padding: 0;
  overflow: hidden;
}

.organization-full-chart {
  position: relative;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  background: #ffffff;
}

.organization-full-chart__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 24px 18px;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%);
}

.organization-full-chart__header h2 {
  margin: 0;
  font-size: 24px;
}

.organization-full-chart__header p {
  margin: 8px 0 0;
  color: var(--muted-foreground);
  font-size: 14px;
}

.organization-full-chart__header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.organization-full-chart__close,
.organization-full-chart__drawer-close {
  min-height: 38px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #ffffff;
  padding: 0 14px;
  color: var(--foreground);
  font-size: 13px;
  font-weight: 700;
}

.organization-full-chart__close:hover,
.organization-full-chart__drawer-close:hover {
  background: var(--muted);
}

.organization-full-chart__close:focus-visible,
.organization-full-chart__drawer-close:focus-visible {
  outline: 2px solid rgba(243, 115, 33, 0.35);
  outline-offset: 2px;
}

.organization-full-chart__body {
  min-height: 0;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr) 320px;
}

.organization-full-chart__detail {
  min-height: 0;
  overflow-y: auto;
  border-left: 1px solid var(--border);
  background: #fbfcfe;
}

.organization-full-chart__drawer-backdrop {
  position: absolute;
  inset: 0;
  display: grid;
  align-items: end;
  background: rgba(15, 23, 42, 0.22);
}

.organization-full-chart__drawer {
  max-height: min(62vh, 520px);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  border-top: 1px solid var(--border);
  border-radius: 22px 22px 0 0;
  background: #ffffff;
  box-shadow: 0 -20px 48px rgba(15, 23, 42, 0.16);
  overflow: hidden;
}

.organization-full-chart__drawer-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--border);
}

.organization-full-chart__drawer-head strong {
  font-size: 15px;
}

@media (max-width: 1180px) {
  :deep(.organization-full-chart-modal) {
    width: calc(100vw - 20px);
    height: calc(100vh - 20px);
  }

  .organization-full-chart__body {
    grid-template-columns: 260px minmax(0, 1fr);
  }

  .organization-full-chart__detail {
    display: none;
  }
}

@media (max-width: 960px) {
  .organization-full-chart__body {
    grid-template-columns: 1fr;
    grid-template-rows: 260px minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .organization-full-chart__header {
    padding: 18px 16px 14px;
  }

  .organization-full-chart__header h2 {
    font-size: 20px;
  }

  .organization-full-chart__header-actions {
    align-self: flex-start;
  }
}
</style>
