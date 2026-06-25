<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  CalendarCheck,
  Video,
  FileText,
  Mail,
  ShieldCheck,
  Users,
  ScrollText,
  Database,
  ArrowRight,
  Check,
} from '@lucide/vue'

const router = useRouter()

function goLogin() {
  router.push('/login')
}

// 핵심 기능 카드 — 제품의 실제 4축(예약→진행→회의록→공유)을 그대로 보여준다.
const features = [
  {
    icon: CalendarCheck,
    title: '회의실 예약',
    desc: '실시간 가용 현황과 충돌 검사로 빈 회의실을 즉시 잡습니다. 사이트·건물·층 단위로 관리.',
  },
  {
    icon: Video,
    title: '화상 회의 진행',
    desc: '예약된 회의를 그대로 화상으로 진행. 참석자 입장·실시간 피드백까지 한 화면에서.',
  },
  {
    icon: FileText,
    title: 'AI 자동 회의록',
    desc: '음성을 자동으로 텍스트로(STT) 변환하고 핵심을 요약해 회의록을 자동 생성합니다.',
  },
  {
    icon: Mail,
    title: '메일·공유 워크스페이스',
    desc: '완성된 회의록을 참석자에게 메일로 공유하고 문서를 함께 보관·협업합니다.',
  },
]

// 보안·거버넌스 — B2B 도입 결정의 핵심. 관리자 기능이 그대로 셀링 포인트.
const governance = [
  {
    icon: Users,
    title: '권한 · 역할 관리',
    desc: '임직원 역할(관리자/일반)과 접근 범위를 세밀하게 통제합니다.',
  },
  {
    icon: ShieldCheck,
    title: '조직 관리',
    desc: '조직도·부서 구조를 반영해 회의실과 자원을 권한에 맞게 운영합니다.',
  },
  {
    icon: ScrollText,
    title: '감사 로그',
    desc: '모든 주요 작업을 기록해 누가·언제·무엇을 했는지 추적합니다.',
  },
  {
    icon: Database,
    title: '데이터 보관 정책',
    desc: '회의록·녹음·메일의 보관 기간을 정책으로 일괄 관리합니다.',
  },
]

// 도입 효과 지표 — 대기업 회의 문화 맥락(기록 부담·회의실 충돌·의사결정 속도).
const outcomes = [
  { value: '↓', label: '회의록 작성 부담', note: 'AI 자동 생성으로 수기 정리 제거' },
  { value: '↓', label: '회의실 예약 충돌', note: '실시간 가용 현황·중복 검사' },
  { value: '↑', label: '의사결정 속도', note: '예약→진행→공유 단일 흐름' },
]

// === 도입 문의 폼 (C안: UI + 성공 메시지, 백엔드 미연동) ===
const form = ref({
  company: '',
  contactName: '',
  email: '',
  companySize: '',
  message: '',
})
const formError = ref('')
const submitted = ref(false)

const sizeOptions = ['1~50명', '51~200명', '201~1,000명', '1,000명 이상']

function submitInquiry() {
  formError.value = ''
  const { company, contactName, email } = form.value
  if (!company.trim() || !contactName.trim() || !email.trim()) {
    formError.value = '회사명, 담당자명, 이메일은 필수입니다.'
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    formError.value = '올바른 이메일 형식을 입력해 주세요.'
    return
  }

  // TODO(백엔드 연동): 문의 저장 API 신설 시 이 지점에서 POST 호출로 교체.
  //   await createSalesInquiry({ ...form.value })
  // 현재는 데모용으로 즉시 성공 처리만 한다.
  submitted.value = true
}

function resetInquiry() {
  form.value = { company: '', contactName: '', email: '', companySize: '', message: '' }
  formError.value = ''
  submitted.value = false
}
</script>

<template>
  <div class="landing">
    <!-- 헤더 -->
    <header class="lp-header">
      <div class="lp-container lp-header-inner">
        <a class="lp-brand" href="#top">
          <span class="brand-mark">M</span><span>Meetbowl</span>
        </a>
        <nav class="lp-nav">
          <a href="#features">기능</a>
          <a href="#governance">보안</a>
          <a href="#contact">도입 문의</a>
        </nav>
        <div class="lp-header-actions">
          <button type="button" class="lp-ghost" @click="goLogin">로그인</button>
          <a class="lp-primary" href="#contact">도입 문의</a>
        </div>
      </div>
    </header>

    <main id="top">
      <!-- 히어로 -->
      <section class="lp-hero">
        <div class="lp-container lp-hero-inner">
          <div class="lp-hero-copy">
            <span class="lp-eyebrow">기업용 회의 운영 플랫폼</span>
            <h1>회의실 예약부터 자동 회의록까지,<br />회의의 모든 과정을 하나로.</h1>
            <p>
              예약 · 화상회의 · AI 회의록 · 메일 공유를 단일 흐름으로 연결합니다.
              사내 회의 운영을 표준화하고 기록 부담을 없애세요.
            </p>
            <div class="lp-hero-cta">
              <a class="lp-primary lg" href="#contact">도입 문의 신청 <ArrowRight :size="18" /></a>
              <button type="button" class="lp-ghost lg" @click="goLogin">로그인</button>
            </div>
            <div class="lp-hero-tags">
              <span>회의실 예약</span><span>AI 회의록</span><span>감사 로그</span><span>권한 관리</span>
            </div>
          </div>

          <!-- 제품 미리보기 목업(이미지 대신 CSS 카드) -->
          <div class="lp-hero-visual" aria-hidden="true">
            <div class="lp-mock">
              <div class="lp-mock-top"><span></span><span></span><span></span></div>
              <div class="lp-mock-body">
                <div class="lp-mock-row"><span class="dot live" />진행 중 · 2층 알파룸</div>
                <div class="lp-mock-row"><span class="dot up" />예정 14:00 · 주간 기획 회의</div>
                <div class="lp-mock-row"><span class="dot up" />예정 16:30 · 부서장 리뷰</div>
                <div class="lp-mock-note">AI 회의록 자동 생성 완료 ✓</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 핵심 기능 -->
      <section id="features" class="lp-section">
        <div class="lp-container">
          <div class="lp-section-head">
            <span class="lp-eyebrow">핵심 기능</span>
            <h2>회의의 처음부터 끝까지</h2>
            <p>흩어진 회의 도구 대신, 하나의 흐름으로 연결된 업무 플랫폼.</p>
          </div>
          <div class="lp-grid-4">
            <article v-for="f in features" :key="f.title" class="lp-card">
              <div class="lp-card-icon"><component :is="f.icon" :size="22" /></div>
              <h3>{{ f.title }}</h3>
              <p>{{ f.desc }}</p>
            </article>
          </div>
        </div>
      </section>

      <!-- 도입 효과 -->
      <section class="lp-section lp-outcomes">
        <div class="lp-container">
          <div class="lp-section-head">
            <span class="lp-eyebrow">도입 효과</span>
            <h2>대기업 회의 문화에 맞춘 운영</h2>
          </div>
          <div class="lp-grid-3">
            <div v-for="o in outcomes" :key="o.label" class="lp-outcome">
              <strong class="lp-outcome-value">{{ o.value }}</strong>
              <span class="lp-outcome-label">{{ o.label }}</span>
              <span class="lp-outcome-note">{{ o.note }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 보안·거버넌스 -->
      <section id="governance" class="lp-section">
        <div class="lp-container">
          <div class="lp-section-head">
            <span class="lp-eyebrow">보안 · 거버넌스</span>
            <h2>도입 결정을 뒷받침하는 관리 기능</h2>
            <p>권한·조직·감사·보관 정책을 관리자 화면에서 한 번에 통제합니다.</p>
          </div>
          <div class="lp-grid-4">
            <article v-for="g in governance" :key="g.title" class="lp-card governance">
              <div class="lp-card-icon navy"><component :is="g.icon" :size="22" /></div>
              <h3>{{ g.title }}</h3>
              <p>{{ g.desc }}</p>
            </article>
          </div>
        </div>
      </section>

      <!-- 도입 문의 폼 -->
      <section id="contact" class="lp-section lp-contact">
        <div class="lp-container lp-contact-inner">
          <div class="lp-contact-copy">
            <span class="lp-eyebrow">도입 문의</span>
            <h2>지금 도입을 검토 중이신가요?</h2>
            <p>회사 정보를 남겨 주시면 영업일 1일 내로 담당자가 회신드립니다. 데모도 함께 안내해 드려요.</p>
            <ul class="lp-contact-list">
              <li><Check :size="16" /> 조직 규모에 맞춘 도입 컨설팅</li>
              <li><Check :size="16" /> 실제 환경 데모 제공</li>
              <li><Check :size="16" /> 보안·거버넌스 요건 검토</li>
            </ul>
          </div>

          <div class="lp-form-wrap">
            <!-- 성공 상태 -->
            <div v-if="submitted" class="lp-form-success">
              <div class="lp-success-mark"><Check :size="28" /></div>
              <h3>문의가 접수되었습니다</h3>
              <p>영업일 1일 내로 담당자가 연락드리겠습니다. 감사합니다.</p>
              <button type="button" class="lp-ghost" @click="resetInquiry">새 문의 작성</button>
            </div>

            <!-- 입력 폼 -->
            <form v-else class="lp-form" @submit.prevent="submitInquiry">
              <h3>도입 문의 / 데모 신청</h3>
              <div class="lp-form-grid">
                <label>회사명 *<input v-model="form.company" type="text" placeholder="(주)한화" /></label>
                <label>담당자명 *<input v-model="form.contactName" type="text" placeholder="홍길동" /></label>
                <label>이메일 *<input v-model="form.email" type="email" placeholder="name@company.com" /></label>
                <label>회사 규모
                  <select v-model="form.companySize">
                    <option value="" disabled>선택</option>
                    <option v-for="s in sizeOptions" :key="s" :value="s">{{ s }}</option>
                  </select>
                </label>
              </div>
              <label class="lp-form-full">문의 내용
                <textarea v-model="form.message" rows="3" placeholder="도입 검토 배경이나 궁금한 점을 적어 주세요." />
              </label>
              <div v-if="formError" class="error-box">{{ formError }}</div>
              <button type="submit" class="lp-primary lg full">문의 보내기 <ArrowRight :size="18" /></button>
              <p class="lp-form-foot">이미 도입한 기업의 임직원이신가요? <button type="button" class="lp-link" @click="goLogin">로그인</button></p>
            </form>
          </div>
        </div>
      </section>
    </main>

    <!-- 푸터 -->
    <footer class="lp-footer">
      <div class="lp-container lp-footer-inner">
        <a class="lp-brand" href="#top"><span class="brand-mark">M</span><span>Meetbowl</span></a>
        <nav class="lp-footer-nav">
          <button type="button" class="lp-link" @click="goLogin">로그인</button>
          <a href="#contact">도입 문의</a>
        </nav>
        <small>© 2026 Meetbowl Inc.</small>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.landing {
  min-height: 100vh;
  background: var(--background);
  color: var(--foreground);
  scroll-behavior: smooth;
}
.lp-container {
  width: min(1120px, 100% - 40px);
  margin: 0 auto;
}

/* 헤더 */
.lp-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border);
}
.lp-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}
.lp-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  font-size: 18px;
  color: var(--foreground);
  text-decoration: none;
}
.lp-nav {
  display: flex;
  gap: 26px;
}
.lp-nav a {
  color: var(--muted-foreground);
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
}
.lp-nav a:hover {
  color: var(--foreground);
}
.lp-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 공통 버튼 */
.lp-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 16px;
  border: 0;
  border-radius: 8px;
  background: var(--primary);
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  text-decoration: none;
  cursor: pointer;
}
.lp-primary:hover {
  background: var(--primary-dark);
}
.lp-primary.lg {
  height: 48px;
  padding: 0 22px;
  font-size: 15px;
}
.lp-primary.full {
  width: 100%;
  justify-content: center;
}
.lp-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card);
  color: var(--foreground);
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
}
.lp-ghost:hover {
  border-color: var(--muted-foreground);
}
.lp-ghost.lg {
  height: 48px;
  padding: 0 22px;
  font-size: 15px;
}
.lp-link {
  border: 0;
  background: none;
  color: var(--primary);
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  font-size: inherit;
}
.lp-link:hover {
  text-decoration: underline;
}

/* 히어로 */
.lp-hero {
  padding: 72px 0 64px;
  background: linear-gradient(180deg, #fff 0%, var(--background) 100%);
}
.lp-hero-inner {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 48px;
  align-items: center;
}
.lp-eyebrow {
  display: inline-block;
  color: var(--primary);
  font-weight: 800;
  font-size: 13px;
  letter-spacing: 0.02em;
  margin-bottom: 14px;
}
.lp-hero-copy h1 {
  font-size: 38px;
  line-height: 1.25;
  margin: 0 0 18px;
  letter-spacing: -0.01em;
}
.lp-hero-copy > p {
  color: var(--muted-foreground);
  font-size: 16px;
  line-height: 1.7;
  margin: 0 0 26px;
  max-width: 520px;
}
.lp-hero-cta {
  display: flex;
  gap: 12px;
  margin-bottom: 22px;
}
.lp-hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.lp-hero-tags span {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 6px 12px;
  background: var(--card);
  color: var(--muted-foreground);
  font-size: 12px;
  font-weight: 600;
}

/* 히어로 목업 */
.lp-hero-visual {
  display: flex;
  justify-content: center;
}
.lp-mock {
  width: 100%;
  max-width: 380px;
  border-radius: 16px;
  background: var(--card);
  border: 1px solid var(--border);
  box-shadow: 0 24px 60px -28px rgba(39, 50, 76, 0.45);
  overflow: hidden;
}
.lp-mock-top {
  display: flex;
  gap: 6px;
  padding: 12px 14px;
  background: var(--navy);
}
.lp-mock-top span {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.35);
}
.lp-mock-body {
  padding: 16px;
  display: grid;
  gap: 10px;
}
.lp-mock-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--foreground);
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  flex: 0 0 auto;
}
.dot.live {
  background: var(--danger);
}
.dot.up {
  background: var(--primary);
}
.lp-mock-note {
  margin-top: 2px;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--muted);
  color: var(--success);
  font-size: 12px;
  font-weight: 700;
}

/* 섹션 공통 */
.lp-section {
  padding: 72px 0;
}
.lp-section-head {
  text-align: center;
  max-width: 640px;
  margin: 0 auto 40px;
}
.lp-section-head h2 {
  font-size: 30px;
  margin: 0 0 12px;
  letter-spacing: -0.01em;
}
.lp-section-head p {
  color: var(--muted-foreground);
  font-size: 15px;
  line-height: 1.6;
  margin: 0;
}

/* 카드 그리드 */
.lp-grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
}
.lp-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}
.lp-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 24px 20px;
}
.lp-card h3 {
  font-size: 16px;
  margin: 14px 0 8px;
}
.lp-card p {
  color: var(--muted-foreground);
  font-size: 13.5px;
  line-height: 1.6;
  margin: 0;
}
.lp-card-icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: rgba(243, 115, 33, 0.1);
  color: var(--primary);
}
.lp-card-icon.navy {
  background: rgba(39, 50, 76, 0.08);
  color: var(--navy);
}

/* 도입 효과 */
.lp-outcomes {
  background: var(--navy);
  color: var(--navy-foreground);
}
.lp-outcomes .lp-section-head h2 {
  color: #fff;
}
.lp-outcome {
  text-align: center;
  padding: 28px 18px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
}
.lp-outcome-value {
  display: block;
  font-size: 40px;
  font-weight: 800;
  color: var(--primary);
  line-height: 1;
}
.lp-outcome-label {
  display: block;
  margin: 12px 0 6px;
  font-size: 16px;
  font-weight: 700;
}
.lp-outcome-note {
  display: block;
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
}

/* 도입 문의 */
.lp-contact {
  background: linear-gradient(180deg, var(--background) 0%, #fff 100%);
}
.lp-contact-inner {
  display: grid;
  grid-template-columns: 0.85fr 1.15fr;
  gap: 48px;
  align-items: start;
}
.lp-contact-copy h2 {
  font-size: 28px;
  margin: 0 0 14px;
}
.lp-contact-copy > p {
  color: var(--muted-foreground);
  line-height: 1.7;
  margin: 0 0 22px;
}
.lp-contact-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 12px;
}
.lp-contact-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--foreground);
}
.lp-contact-list svg {
  color: var(--success);
  flex: 0 0 auto;
}

/* 폼 */
.lp-form-wrap {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 24px 60px -32px rgba(39, 50, 76, 0.4);
}
.lp-form h3 {
  font-size: 18px;
  margin: 0 0 18px;
}
.lp-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}
.lp-form label,
.lp-form-full {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--foreground);
}
.lp-form-full {
  margin-bottom: 16px;
}
.lp-form input,
.lp-form select,
.lp-form textarea {
  height: 42px;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0 12px;
  font-size: 14px;
  font-weight: 500;
  background: var(--card);
  color: var(--foreground);
  font-family: inherit;
}
.lp-form textarea {
  height: auto;
  padding: 10px 12px;
  resize: vertical;
}
.lp-form input:focus,
.lp-form select:focus,
.lp-form textarea:focus {
  outline: none;
  border-color: var(--primary);
}
.lp-form-foot {
  text-align: center;
  margin: 14px 0 0;
  font-size: 13px;
  color: var(--muted-foreground);
}

/* 성공 */
.lp-form-success {
  text-align: center;
  padding: 24px 12px;
}
.lp-success-mark {
  display: grid;
  place-items: center;
  width: 60px;
  height: 60px;
  margin: 0 auto 16px;
  border-radius: 999px;
  background: rgba(5, 150, 105, 0.12);
  color: var(--success);
}
.lp-form-success h3 {
  font-size: 18px;
  margin: 0 0 8px;
}
.lp-form-success p {
  color: var(--muted-foreground);
  margin: 0 0 18px;
  line-height: 1.6;
}

/* 푸터 */
.lp-footer {
  border-top: 1px solid var(--border);
  background: var(--card);
  padding: 28px 0;
}
.lp-footer-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.lp-footer-nav {
  display: flex;
  gap: 18px;
  align-items: center;
}
.lp-footer-nav a {
  color: var(--muted-foreground);
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
}
.lp-footer small {
  color: var(--muted-foreground);
}

/* 반응형 */
@media (max-width: 900px) {
  .lp-hero-inner,
  .lp-contact-inner {
    grid-template-columns: 1fr;
    gap: 32px;
  }
  .lp-grid-4 {
    grid-template-columns: repeat(2, 1fr);
  }
  .lp-grid-3 {
    grid-template-columns: 1fr;
  }
  .lp-nav {
    display: none;
  }
  .lp-hero-copy h1 {
    font-size: 32px;
  }
}
@media (max-width: 560px) {
  .lp-grid-4,
  .lp-form-grid {
    grid-template-columns: 1fr;
  }
  .lp-hero-cta {
    flex-direction: column;
  }
  .lp-hero-cta .lp-primary,
  .lp-hero-cta .lp-ghost {
    justify-content: center;
  }
}
</style>
