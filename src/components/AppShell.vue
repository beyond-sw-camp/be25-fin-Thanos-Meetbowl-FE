<template>
  <div class="shell">
    <aside class="sidebar" :class="{ open: mobileOpen }">
      <RouterLink :to="homePath" class="brand" @click="mobileOpen = false">
        <span class="brand-mark">M</span>
        <span>Meetbowl</span>
      </RouterLink>

      <nav class="nav">
        <section v-for="section in visibleSections" :key="section.title" class="nav-section">
          <p class="nav-title">{{ section.title }}</p>
          <RouterLink
            v-for="item in section.items"
            :key="item.to"
            :to="item.to"
            class="nav-link"
            :class="{ active: isActive(item.to) }"
            @click="mobileOpen = false"
          >
            <span class="nav-icon">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </RouterLink>
        </section>
      </nav>
    </aside>

    <div v-if="mobileOpen" class="scrim" @click="mobileOpen = false" />

    <main class="main">
      <header class="topbar">
        <button class="icon-button mobile-menu" type="button" @click="mobileOpen = true">☰</button>
        <div class="search-box">검색</div>
        <div class="top-actions">
          <div class="dropdown-wrap">
            <button class="icon-button" type="button" @click="notificationsOpen = !notificationsOpen">●</button>
            <div v-if="notificationsOpen" class="dropdown panel">
              <p class="panel-title">알림</p>
              <RouterLink
                v-for="item in notifications"
                :key="item.title"
                :to="item.to"
                class="notification"
                @click="notificationsOpen = false"
              >
                <strong>{{ item.title }}</strong>
                <span>{{ item.desc }}</span>
                <small>{{ item.time }}</small>
              </RouterLink>
            </div>
          </div>

          <div class="dropdown-wrap">
            <button class="profile-button" type="button" @click="profileOpen = !profileOpen">
              <span class="avatar">{{ user?.avatar }}</span>
              <span class="profile-name">{{ user?.name }}</span>
            </button>
            <div v-if="profileOpen" class="dropdown profile-panel">
              <strong>{{ user?.name }}</strong>
              <span>{{ user?.department }} · {{ user?.position }}</span>
              <span>{{ user?.email }}</span>
              <RouterLink
                v-if="user?.role === 'USER'"
                to="/app/settings"
                class="profile-menu-link"
                @click="profileOpen = false"
              >
                설정
              </RouterLink>
              <button type="button" class="ghost-button" @click="handleLogout">로그아웃</button>
            </div>
          </div>
        </div>
      </header>
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { myMeetings } from '../data/mockData'
import { meetingRoute } from '../lib/meeting-route'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const mobileOpen = ref(false)
const notificationsOpen = ref(false)
const profileOpen = ref(false)

const user = computed(() => auth.user)
const homePath = computed(() => auth.homePath)
const liveMeetingPath = meetingRoute(myMeetings.find((meeting) => meeting.status === 'live')?.id)

const navSections = [
  {
    title: '개인 워크스페이스',
    roles: ['USER'],
    items: [
      { to: '/app/dashboard', label: '대시보드', icon: '▦' },
      { to: '/app/rooms', label: '회의실 예약', icon: '□' },
      { to: '/app/my-reservations', label: '내 예약', icon: '◷' },
      { to: '/app/meetings', label: '회의', icon: '▶' },
      { to: '/app/minutes', label: '내 회의록', icon: '≡' },
      { to: '/app/mail', label: '메일', icon: '✉' },
      { to: '/app/workspace', label: '개인 워크스페이스', icon: '▣' },
      { to: '/app/shared-docs', label: '공유 워크스페이스', icon: '▤' },
      { to: '/app/community', label: '도파민', icon: '◇' },
    ],
  },
  {
    title: '관리자',
    roles: ['ADMIN'],
    items: [
      { to: '/admin/dashboard', label: '관리자 대시보드', icon: '▦' },
      { to: '/admin/members', label: '회원 관리', icon: '◎' },
      { to: '/admin/organization', label: '조직/직급 관리', icon: '▧' },
      { to: '/admin/rooms', label: '회의실 관리', icon: '□' },
      { to: '/admin/reservations', label: '예약 현황', icon: '◷' },
      { to: '/admin/mail-policy', label: '메일 정책 관리', icon: '✉' },
      { to: '/admin/minutes-policy', label: '보관 정책 관리', icon: '◫' },
      { to: '/admin/logs', label: '관리자 작업 로그', icon: '≣' },
    ],
  },
]

const notifications = [
  { title: '새 메일 3건', desc: '김지연 외 2명에게 메일이 도착했습니다.', time: '5분 전', to: '/app/mail' },
  { title: '회의 시작 임박', desc: 'Q2 캠페인 킥오프가 10분 후 시작됩니다.', time: '10분 전', to: liveMeetingPath },
  { title: '회의실 예약 승인', desc: '테헤란로 대회의실 예약이 승인되었습니다.', time: '1시간 전', to: '/app/my-reservations' },
  { title: '회의록 공유 완료', desc: '주간 전략 회의 회의록이 공유되었습니다.', time: '3시간 전', to: '/app/minutes' },
]

const visibleSections = computed(() =>
  navSections
    .filter((section) => section.roles.includes(user.value?.role))
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.to.startsWith(user.value?.role === 'ADMIN' ? '/admin' : '/app')),
    })),
)

function isActive(to) {
  return route.path === to || route.path.startsWith(`${to}/`)
}

async function handleLogout() {
  profileOpen.value = false
  await auth.logout()
  router.push('/login')
}
</script>
