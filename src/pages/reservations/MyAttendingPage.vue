<template>
  <ReservationsView
    role="invited"
    header-title="내가 참석해야 하는 회의"
    header-description="참석자로 지정된 다가오는 회의를 확인합니다."
    count-label="참석 회의"
    :allow-cancel="false"
  />
</template>

<script setup>
import ReservationsView from '../../components/reservations/ReservationsView.vue'
</script>
