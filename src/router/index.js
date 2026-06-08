import { createRouter, createWebHistory } from 'vue-router'
import AppShell from '../components/AppShell.vue'
import { useAuthStore } from '../stores/auth'
import {
  AdminDashboardPage,
  AdminLogsPage,
  AdminRoomsPage,
  CommunityPage,
  DashboardPage,
  JoinPage,
  LoginPage,
  MailPage,
  MeetingPage,
  MeetingsPage,
  MembersPage,
  MyReservationsPage,
  OrganizationPage,
  PolicyPage,
  RecordingsPage,
  RoomsPage,
  SharedDocsPage,
  SimpleDocsPage,
  WorkspacePage,
} from '../pages'

const routes = [
  { path: '/', redirect: '/app/dashboard' },
  { path: '/login', component: LoginPage, meta: { public: true } },
  { path: '/join/:code', component: JoinPage, meta: { public: true } },
  {
    path: '/',
    component: AppShell,
    meta: { requiresAuth: true },
    children: [
      { path: 'app/dashboard', component: DashboardPage, meta: { role: 'user' } },
      { path: 'app/rooms', component: RoomsPage, meta: { role: 'user' } },
      { path: 'app/my-reservations', component: MyReservationsPage, meta: { role: 'user' } },
      { path: 'app/meetings', component: MeetingsPage, meta: { role: 'user' } },
      { path: 'app/meeting', component: MeetingPage, meta: { role: 'user' } },
      { path: 'app/mail', component: MailPage, meta: { role: 'user' } },
      { path: 'app/recordings', component: RecordingsPage, meta: { role: 'user' } },
      { path: 'app/workspace', component: WorkspacePage, meta: { role: 'user' } },
      { path: 'app/shared-docs', component: SharedDocsPage, meta: { role: 'user' } },
      { path: 'app/community', component: CommunityPage, meta: { role: 'user' } },
      {
        path: 'app/backup/:id?',
        component: SimpleDocsPage,
        props: { title: '백업 문서', description: '보관 중인 회의록과 공유 문서를 확인합니다.' },
        meta: { role: 'user' },
      },
      {
        path: 'app/settings',
        component: SimpleDocsPage,
        props: { title: '설정', description: '알림, 표시, 회의 기본 설정을 확인합니다.' },
        meta: { role: 'user' },
      },
      { path: 'admin/dashboard', component: AdminDashboardPage, meta: { role: 'admin' } },
      { path: 'admin/members', component: MembersPage, meta: { role: 'admin' } },
      { path: 'admin/organization', component: OrganizationPage, meta: { role: 'admin' } },
      { path: 'admin/rooms', component: AdminRoomsPage, meta: { role: 'admin' } },
      {
        path: 'admin/reservations',
        component: SimpleDocsPage,
        props: { title: '예약 현황', description: '전체 회의실 예약 상태와 사용 제한 현황을 확인합니다.' },
        meta: { role: 'admin' },
      },
      {
        path: 'admin/mail-policy',
        component: PolicyPage,
        props: { title: '메일 정책 관리', description: '내부 메일 보관, 백업, 삭제 정책을 관리합니다.' },
        meta: { role: 'admin' },
      },
      {
        path: 'admin/recording-policy',
        component: PolicyPage,
        props: { title: '보관 정책 관리', description: '회의록과 녹음 파일의 보관 기간과 알림 정책을 관리합니다.' },
        meta: { role: 'admin' },
      },
      { path: 'admin/logs', component: AdminLogsPage, meta: { role: 'admin' } },
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
  if (requiredRole && auth.user?.role !== requiredRole) return auth.homePath
  return true
})

export default router
