<template>
  <ReservationsView
    role="host"
    header-title="내 회의실 예약 현황"
    header-description="다가오는 회의실 예약을 확인하고 관리합니다."
    count-label="예약된 회의"
    :allow-cancel="true"
  />
</template>

<script setup>
import ReservationsView from '../../components/reservations/ReservationsView.vue'
</script>
