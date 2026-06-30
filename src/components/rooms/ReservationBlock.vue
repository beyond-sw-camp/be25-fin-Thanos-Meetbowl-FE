<template>
  <button type="button" :class="['reservation-block', toneClass]" :style="style" @click.stop="$emit('select')">
    <strong>{{ titleLabel }}</strong>
    <span>{{ block.start }}-{{ block.end }}</span>
    <small>{{ metaLabel }}</small>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { blockStyle } from '../../utils/timeline'

const props = defineProps({
  block: { type: Object, required: true },
  nameMap: { type: Object, default: () => ({}) },
})
defineEmits(['select'])

const style = computed(() => blockStyle(props.block.start, props.block.end))
const titleLabel = computed(() => props.block.title || (props.block.mine ? '내 예약' : '예약됨'))
// 색상 톤: block.tone(inuse/booked/unavailable)이 있으면 상태별 색, 없으면 기존 mine/booked.
const toneClass = computed(() =>
  props.block.tone ? `tone-${props.block.tone}` : props.block.mine ? 'mine' : 'booked',
)
// 보조 라벨: block.metaLabel(예: 인원 수)이 있으면 우선, 없으면 예약자 이름.
const metaLabel = computed(
  () =>
    props.block.metaLabel ||
    props.nameMap[props.block.hostUserId] ||
    (props.block.mine ? '나' : '주최자'),
)
</script>
