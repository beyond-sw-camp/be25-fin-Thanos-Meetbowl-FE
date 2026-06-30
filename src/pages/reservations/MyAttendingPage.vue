<template>
  <ReservationsView
    role="all"
    header-title="참석 회의 현황"
    header-description="참석자로 지정된 다가오는 회의를 확인합니다."
    count-label="참석 예정 회의"
    :allow-cancel="false"
    :room-only="true"
  />
</template>

<script setup>
import ReservationsView from '../../components/reservations/ReservationsView.vue'
</script>
