import { createRouter, createWebHistory } from 'vue-router'
import AppShell from '../components/AppShell.vue'
import { useAuthStore } from '../stores/auth'
import AdminDashboardPage from '../pages/admin/AdminDashboardPage.vue'
import AdminLogsPage from '../pages/admin/AdminLogsPage.vue'
import AdminReservationsPage from '../pages/admin/AdminReservationsPage.vue'
import AdminRoomsPage from '../pages/admin/AdminRoomsPage.vue'
import MembersPage from '../pages/admin/MembersPage.vue'
import OrganizationPage from '../pages/admin/OrganizationPage.vue'
import PolicyPage from '../pages/admin/PolicyPage.vue'
import JoinPage from '../pages/auth/JoinPage.vue'
import LoginPage from '../pages/auth/LoginPage.vue'
import CommunityPage from '../pages/community/CommunityPage.vue'
import DashboardPage from '../pages/dashboard/DashboardPage.vue'
import SimpleDocsPage from '../pages/docs/SimpleDocsPage.vue'
import { meetingRoute } from '../lib/meeting-route'
import MailPage from '../pages/mail/MailPage.vue'
import MeetingPage from '../pages/meeting/MeetingPage.vue'
import LiveKitTestPage from '../pages/livekit/LiveKitTestPage.vue'
import MeetingsPage from '../pages/meetings/MeetingsPage.vue'
import MinutesPage from '../pages/minutes/MinutesPage.vue'
import BackupDetailPage from '../pages/backup/BackupDetailPage.vue'
import MyReservationsPage from '../pages/reservations/MyReservationsPage.vue'
import RoomsPage from '../pages/rooms/RoomsPage.vue'
import SettingsPage from '../pages/settings/SettingsPage.vue'
import SharedDocsPage from '../pages/shared-docs/SharedDocsPage.vue'
import WorkspacePage from '../pages/workspace/WorkspacePage.vue'

const routes = [
  { path: '/', redirect: '/app/dashboard' },
  { path: '/login', component: LoginPage, meta: { public: true } },
  { path: '/join/:code', component: JoinPage, meta: { public: true } },
  { path: '/app/meeting', redirect: meetingRoute(), meta: { role: 'USER' } },
  { path: '/app/meeting/:meetingId', component: MeetingPage, meta: { role: 'USER' } },
  {
    path: '/',
    component: AppShell,
    meta: { requiresAuth: true },
    children: [
      { path: 'app/dashboard', component: DashboardPage, meta: { role: 'USER' } },
      { path: 'app/rooms', component: RoomsPage, meta: { role: 'USER' } },
      { path: 'app/my-reservations', component: MyReservationsPage, meta: { role: 'USER' } },
      { path: 'app/meetings', component: MeetingsPage, meta: { role: 'USER' } },
      { path: 'app/livekit-test', component: LiveKitTestPage, meta: { role: 'USER' } },
      { path: 'app/mail', component: MailPage, meta: { role: 'USER' } },
      { path: 'app/minutes', component: MinutesPage, meta: { role: 'USER' } },
      { path: 'app/recordings', redirect: '/app/minutes', meta: { role: 'USER' } },
      { path: 'app/workspace', component: WorkspacePage, meta: { role: 'USER' } },
      { path: 'app/shared-docs', component: SharedDocsPage, meta: { role: 'USER' } },
      { path: 'app/community', component: CommunityPage, meta: { role: 'USER' } },
      {
        path: 'app/backup/:id',
        component: BackupDetailPage,
        meta: { role: 'USER' },
      },
      {
        path: 'app/settings',
        component: SettingsPage,
        meta: { role: 'USER' },
      },
      { path: 'admin/dashboard', component: AdminDashboardPage, meta: { role: 'ADMIN' } },
      { path: 'admin/members', component: MembersPage, meta: { role: 'ADMIN' } },
      { path: 'admin/organization', component: OrganizationPage, meta: { role: 'ADMIN' } },
      { path: 'admin/rooms', component: AdminRoomsPage, meta: { role: 'ADMIN' } },
      {
        path: 'admin/reservations',
        component: AdminReservationsPage,
        meta: { role: 'ADMIN' },
      },
      {
        path: 'admin/mail-policy',
        component: PolicyPage,
        props: { title: '메일 정책 관리', description: '내부 메일 보관, 백업, 삭제 정책을 관리합니다.', kind: 'mail' },
        meta: { role: 'ADMIN' },
      },
      {
        path: 'admin/minutes-policy',
        component: PolicyPage,
        props: { title: '보관 정책 관리', description: '회의록과 녹음 파일의 보관 기간과 알림 정책을 관리합니다.', kind: 'minute' },
        meta: { role: 'ADMIN' },
      },
      {
        path: 'admin/recording-policy',
        redirect: '/admin/minutes-policy',
        meta: { role: 'ADMIN' },
      },
      { path: 'admin/logs', component: AdminLogsPage, meta: { role: 'ADMIN' } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/app/dashboard' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.public) {
    if (to.path === '/login' && auth.isAuthenticated) return auth.homePath
    return true
  }
  if (!auth.isAuthenticated) return '/login'
  const requiredRole = to.meta.role
  if (to.path === '/admin/dashboard' && requiredRole === 'ADMIN') return true
  if (requiredRole && auth.user?.role !== requiredRole) return auth.homePath
  return true
})

export default router
