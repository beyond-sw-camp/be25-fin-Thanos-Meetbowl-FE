<template>
  <button type="button" :class="['reservation-block', block.mine ? 'mine' : 'booked']" :style="style" @click.stop="$emit('select')">
    <strong>{{ label }}</strong><span>{{ block.start }}-{{ block.end }}</span>
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
// 예약자 이름은 백엔드 사용자 조회로 채워지며, 아직 없으면 내/타인 폴백 라벨을 쓴다.
const label = computed(
  () => props.nameMap[props.block.hostUserId] || (props.block.mine ? '내 예약' : '예약됨'),
)
</script>
