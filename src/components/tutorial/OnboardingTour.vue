<template>
  <!-- 1단계: 환영 모달 -->
  <div v-if="stage === 'welcome'" class="tour-backdrop" @click.self="finish">
    <div class="tour-welcome card">
      <span class="tour-welcome-mark">M</span>
      <h2>Meetbowl에 오신 걸 환영합니다 👋</h2>
      <p>
        회의실 예약부터 회의 진행, 자동 회의록까지 한곳에서 처리할 수 있어요.<br />
        주요 메뉴를 30초 만에 둘러볼까요?
      </p>
      <div class="tour-welcome-actions">
        <button type="button" class="secondary-button" @click="finish">건너뛰기</button>
        <button type="button" class="primary-button" @click="startTour">둘러보기 시작</button>
      </div>
    </div>
  </div>

  <!-- 2단계: 스포트라이트 투어 -->
  <template v-else-if="stage === 'tour'">
    <!-- 앱 조작을 막는 투명 레이어 -->
    <div class="tour-blocker" />

    <!-- 대상 요소를 강조하는 스포트라이트(주변을 어둡게). 대상이 있을 때만. -->
    <div v-if="hasTarget" class="tour-spotlight" :style="spotlightStyle" />
    <!-- 대상을 못 찾으면 전체 화면을 어둡게 처리 -->
    <div v-else class="tour-backdrop-dim" />

    <!-- 안내 말풍선 -->
    <div class="tour-tooltip card" :class="{ centered: !hasTarget }" :style="tooltipStyle">
      <div class="tour-tooltip-head">
        <span class="tour-step-count">{{ stepIndex + 1 }} / {{ steps.length }}</span>
        <button type="button" class="tour-close" aria-label="닫기" @click="finish">✕</button>
      </div>
      <h3>{{ currentStep.title }}</h3>
      <p>{{ currentStep.description }}</p>
      <div class="tour-dots">
        <span
          v-for="(step, index) in steps"
          :key="step.target"
          class="tour-dot"
          :class="{ active: index === stepIndex }"
        />
      </div>
      <div class="tour-tooltip-actions">
        <button type="button" class="tour-skip" @click="finish">그만 보기</button>
        <div class="tour-nav">
          <button v-if="stepIndex > 0" type="button" class="secondary-button small" @click="prev">이전</button>
          <button type="button" class="primary-button small" @click="next">
            {{ isLastStep ? '완료' : '다음' }}
          </button>
        </div>
      </div>
    </div>
  </template>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { TOUR_STEPS } from '../../lib/tutorial'

const emit = defineEmits(['finish'])

const steps = TOUR_STEPS
const stage = ref('welcome')
const stepIndex = ref(0)

// 강조 대상의 화면 좌표. 대상을 못 찾으면 null → 가운데 안내로 대체한다.
const targetRect = ref(null)
const hasTarget = computed(() => targetRect.value !== null)
const currentStep = computed(() => steps[stepIndex.value])
const isLastStep = computed(() => stepIndex.value === steps.length - 1)

const SPOTLIGHT_PADDING = 8
const TOOLTIP_WIDTH = 300
const TOOLTIP_GAP = 14

const spotlightStyle = computed(() => {
  const rect = targetRect.value
  if (!rect) return {}
  return {
    top: `${rect.top - SPOTLIGHT_PADDING}px`,
    left: `${rect.left - SPOTLIGHT_PADDING}px`,
    width: `${rect.width + SPOTLIGHT_PADDING * 2}px`,
    height: `${rect.height + SPOTLIGHT_PADDING * 2}px`,
  }
})

// 대상 오른쪽에 붙이되, 오른쪽 공간이 부족하면 아래로 내린다. 항상 화면 안으로 보정한다.
const tooltipStyle = computed(() => {
  const rect = targetRect.value
  if (!rect) return {}

  const viewportW = window.innerWidth
  const viewportH = window.innerHeight
  let left = rect.right + TOOLTIP_GAP
  let top = rect.top

  if (left + TOOLTIP_WIDTH > viewportW - TOOLTIP_GAP) {
    // 오른쪽 공간 부족 → 대상 아래로
    top = rect.bottom + TOOLTIP_GAP
    left = rect.left
  }

  left = Math.min(Math.max(left, TOOLTIP_GAP), viewportW - TOOLTIP_WIDTH - TOOLTIP_GAP)
  top = Math.min(Math.max(top, TOOLTIP_GAP), viewportH - 200)

  return { top: `${top}px`, left: `${left}px` }
})

function updateTargetRect() {
  const step = currentStep.value
  const el = step?.target ? document.querySelector(`[data-tour="${step.target}"]`) : null
  if (!el) {
    targetRect.value = null
    return
  }
  const rect = el.getBoundingClientRect()
  // 숨겨진 요소(모바일에서 접힌 사이드바 등)는 크기가 0이라 가운데 안내로 대체한다.
  if (rect.width === 0 || rect.height === 0) {
    targetRect.value = null
    return
  }
  targetRect.value = rect
}

function startTour() {
  stage.value = 'tour'
  nextTick(updateTargetRect)
}

function next() {
  if (isLastStep.value) {
    finish()
    return
  }
  stepIndex.value += 1
  nextTick(updateTargetRect)
}

function prev() {
  if (stepIndex.value === 0) return
  stepIndex.value -= 1
  nextTick(updateTargetRect)
}

function finish() {
  emit('finish')
}

function handleViewportChange() {
  if (stage.value === 'tour') updateTargetRect()
}

function handleKeydown(event) {
  if (event.key === 'Escape') finish()
  else if (stage.value === 'tour' && event.key === 'ArrowRight') next()
  else if (stage.value === 'tour' && event.key === 'ArrowLeft') prev()
}

onMounted(() => {
  window.addEventListener('resize', handleViewportChange)
  window.addEventListener('scroll', handleViewportChange, true)
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleViewportChange)
  window.removeEventListener('scroll', handleViewportChange, true)
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.tour-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.55);
  padding: 18px;
}

/* 환영 모달 */
.tour-welcome {
  width: min(440px, 100%);
  padding: 32px 28px;
  text-align: center;
}
.tour-welcome-mark {
  display: inline-grid;
  place-items: center;
  width: 52px;
  height: 52px;
  margin-bottom: 8px;
  border-radius: 14px;
  background: var(--primary);
  color: #fff;
  font-size: 24px;
  font-weight: 800;
}
.tour-welcome h2 {
  margin: 8px 0 12px;
  font-size: 20px;
}
.tour-welcome p {
  margin: 0 0 24px;
  color: var(--muted-foreground);
  line-height: 1.6;
}
.tour-welcome-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
}

/* 투어 레이어 */
.tour-blocker {
  position: fixed;
  inset: 0;
  z-index: 2000;
}
.tour-backdrop-dim {
  position: fixed;
  inset: 0;
  z-index: 2001;
  background: rgba(15, 23, 42, 0.55);
}
.tour-spotlight {
  position: fixed;
  z-index: 2001;
  border-radius: 10px;
  /* 큰 box-shadow로 강조 영역 바깥을 어둡게 — 대상은 그대로 보인다. */
  box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.55);
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  pointer-events: none;
  transition: top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease;
}

/* 안내 말풍선 */
.tour-tooltip {
  position: fixed;
  z-index: 2002;
  width: 300px;
  max-width: calc(100vw - 28px);
  padding: 16px 18px;
}
.tour-tooltip.centered {
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%);
}
.tour-tooltip-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.tour-step-count {
  font-size: 12px;
  font-weight: 700;
  color: var(--primary);
}
.tour-close {
  border: 0;
  background: none;
  color: var(--muted-foreground);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}
.tour-tooltip h3 {
  margin: 0 0 6px;
  font-size: 16px;
}
.tour-tooltip p {
  margin: 0 0 14px;
  color: var(--muted-foreground);
  font-size: 13px;
  line-height: 1.6;
}
.tour-dots {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
}
.tour-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--border);
}
.tour-dot.active {
  background: var(--primary);
}
.tour-tooltip-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.tour-skip {
  border: 0;
  background: none;
  color: var(--muted-foreground);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.tour-nav {
  display: flex;
  gap: 6px;
}
</style>
