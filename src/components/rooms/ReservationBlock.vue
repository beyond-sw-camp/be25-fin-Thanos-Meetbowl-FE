<template>
  <button type="button" :class="['reservation-block', block.mine ? 'mine' : 'booked']" :style="style" @click.stop="$emit('select')">
    <strong>{{ titleLabel }}</strong>
    <span>{{ block.start }}-{{ block.end }}</span>
    <small>{{ hostLabel }}</small>
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
// 예약자 이름은 보조 정보로만 표시한다.
const hostLabel = computed(
  () => props.nameMap[props.block.hostUserId] || (props.block.mine ? '나' : '주최자'),
)
</script>
