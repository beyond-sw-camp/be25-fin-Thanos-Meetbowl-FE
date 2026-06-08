<script>
import { defineComponent } from 'vue'
import { adminLogs, members, minutes, rooms } from '../../data/mockData'
import { adminHourlyUsage, adminRoomUsage, adminSites } from '../../data/adminData'

export default defineComponent({
  setup() {
    const activeMembers = members.filter((member) => member.status === '활성').length
    const inactiveMembers = members.length - activeMembers
    const totalUsage = adminHourlyUsage.reduce((sum, item) => sum + item.count, 0)
    const peak = adminHourlyUsage.reduce((top, item) => item.count > top.count ? item : top, adminHourlyUsage[0])
    const maxUsage = Math.max(...adminHourlyUsage.map((item) => item.count))
    const siteRates = adminSites.map((site) => ({
      ...site,
      rooms: rooms.filter((room) => room.site === site.name).length,
      rate: site.name === '테헤란로' ? 82 : site.name === '봉은사로' ? 64 : 47,
    }))
    const kpis = [
      { label: '전체 사용자', value: members.length, sub: `활성 ${activeMembers} · 비활성 ${inactiveMembers}` },
      { label: '운영 회의실', value: rooms.length, sub: `사용 제한 ${rooms.filter((room) => room.restricted).length}` },
      { label: '회의실 사용 30일', value: totalUsage, sub: `피크 ${peak.hour}시 · ${peak.count}건` },
      { label: '보관 회의록', value: minutes.length, sub: '이번 달 생성 86' },
    ]
    return { adminHourlyUsage, adminLogs, adminRoomUsage, inactiveMembers, kpis, maxUsage, peak, rooms, siteRates }
  },
  template: `
    <section class="page admin-page">
      <div class="admin-eyebrow"><span></span>Admin Console</div>
      <header class="page-header"><h1>관리자 대시보드</h1><p>플랫폼 운영 현황과 회의 활동을 한눈에 확인합니다.</p></header>
      <article class="card admin-alert">
        <div class="card-head"><h2>주의 항목</h2><span class="badge warning">점검 필요</span></div>
        <div class="admin-alert-grid">
          <p><strong>사용 제한 회의실 {{ rooms.filter((room) => room.restricted).length }}건</strong><span>{{ rooms.find((room) => room.restricted)?.name }} · {{ rooms.find((room) => room.restricted)?.restrictReason }}</span></p>
          <p><strong>비활성 사용자 {{ inactiveMembers }}명</strong><span>30일 이상 미접속 계정 검토 필요</span></p>
        </div>
      </article>
      <div class="metric-grid"><article v-for="kpi in kpis" :key="kpi.label" class="metric-card"><span>{{ kpi.label }}</span><strong>{{ kpi.value }}</strong><em>{{ kpi.sub }}</em></article></div>
      <div class="admin-dashboard-grid">
        <article class="card admin-chart-card">
          <div class="card-head"><div><h2>시간대별 회의실 사용 빈도</h2><p>최근 30일 기준 회의실 점유 횟수</p></div><span class="badge">30일</span></div>
          <div class="admin-bar-chart">
            <div v-for="item in adminHourlyUsage" :key="item.hour" class="admin-bar-item">
              <div class="admin-bar-track"><i :style="{ height: (item.count / maxUsage * 100) + '%' }"></i></div>
              <span>{{ item.hour }}시</span>
              <small>{{ item.count }}</small>
            </div>
          </div>
        </article>
        <article class="card admin-site-card">
          <div class="card-head"><h2>사이트/건물별 사용률</h2><span class="badge">이번 달</span></div>
          <ul class="admin-progress-list">
            <li v-for="site in siteRates" :key="site.name"><div><strong>{{ site.name }}</strong><span>{{ site.building }} · {{ site.rooms }}실 · {{ site.rate }}%</span></div><b><i :style="{ width: site.rate + '%' }"></i></b></li>
          </ul>
          <p>가장 붐비는 시간대는 <strong>{{ peak.hour }}시</strong>입니다.</p>
        </article>
      </div>
      <div class="admin-dashboard-grid">
        <article class="card admin-table-card wide">
          <div class="card-head"><h2>회의실별 사용률 상세</h2><span class="badge">최근 30일</span></div>
          <div class="table-card embedded-table"><table><thead><tr><th>회의실</th><th>사이트/건물</th><th>층</th><th>사용률</th><th>사용 시간</th><th>피크</th></tr></thead><tbody><tr v-for="room in adminRoomUsage" :key="room.room"><td>{{ room.room }}</td><td>{{ room.site }} · {{ room.building }}</td><td>{{ room.floor }}</td><td><span class="progress-cell"><i :style="{ width: room.rate + '%' }"></i></span>{{ room.rate }}%</td><td>{{ room.hours }}h</td><td>{{ room.peak }}</td></tr></tbody></table></div>
        </article>
        <article class="card admin-table-card">
          <div class="card-head"><h2>관리자 작업 로그</h2><span class="badge">최근</span></div>
          <ul class="compact-list"><li v-for="log in adminLogs.slice(0, 5)" :key="log.id"><strong>{{ log.action }}</strong><span>{{ log.actor }} · {{ log.time }}</span></li></ul>
        </article>
      </div>
    </section>
  `,
})
</script>
