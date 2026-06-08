<template>
  <section class="page">
    <header class="page-header"><h1>내 회의실 예약 현황</h1><p>내가 예약한 회의실과 참석자, 시간을 확인합니다.</p></header>
    <div class="table-card">
      <table>
        <thead><tr><th>회의</th><th>회의실</th><th>시간</th><th>참석자</th><th>상태</th></tr></thead>
        <tbody>
          <tr v-for="item in reservations" :key="item.id">
            <td>{{ item.title }}</td>
            <td>{{ rooms.find((room) => room.id === item.roomId)?.name }}</td>
            <td>{{ item.start }}-{{ item.end }}</td>
            <td>{{ item.attendees.join(', ') || '-' }}</td>
            <td><span class="badge primary">내 예약</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { rooms, todayReservations } from '../../data/mockData'

const reservations = todayReservations.filter((reservation) => reservation.status === 'mine')
</script>
