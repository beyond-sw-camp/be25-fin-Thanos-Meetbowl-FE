<script>
import { defineComponent, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  Eye,
  Flame,
  Heart,
  Lightbulb,
  Megaphone,
    MessageCircle,
    MessageSquare,
    MoreVertical,
    Search,
    SendHorizontal,
    Shield,
  UserRound,
} from '@lucide/vue'
import AppSelect from '../../components/common/AppSelect.vue'
import ActionButton from '../../components/common/ActionButton.vue'
import MinutesEditor from '../../components/minutes/MinutesEditor.vue'
import {
  COMMUNITY_CATEGORIES,
  createComment,
  createPost,
  deleteComment,
  deletePost,
  getHotPosts,
  getPost,
  listComments,
  listPosts,
  toggleCommentLike,
  togglePostLike,
  updateComment,
  updatePost,
} from '../../lib/community'
import { emptyTiptapDocument, extractTiptapText, stringifyTiptapDocument } from '../../lib/minutes-content.js'
import { utcToKstClock, utcToKstDate } from '../../utils/dateTime'

export default defineComponent({
  components: {
    AppSelect,
    ActionButton,
    MinutesEditor,
    ArrowLeft,
    Eye,
    Flame,
    Heart,
    Lightbulb,
    Megaphone,
    MessageCircle,
    MessageSquare,
    MoreVertical,
    Search,
    SendHorizontal,
    Shield,
    UserRound,
  },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const categories = ['전체', ...COMMUNITY_CATEGORIES.map((item) => item.label), 'Hot']
    const writeCategories = COMMUNITY_CATEGORIES.map((item) => item.label)

    const posts = ref([])
    const hotPosts = ref([])
    const visibleHotPosts = ref([])
    const category = ref('전체')
    const keyword = ref('')
    const loading = ref(false)
    const loadError = ref('')
    const actionError = ref('')

    const PAGE_SIZE = 10
    const page = ref(1)
    const totalPages = ref(1)

    const openPost = ref(null)
    const writing = ref(false)
    const commentText = ref('')
    const commentSubmitting = ref(false)
    const editingCommentId = ref(null)
    const editText = ref('')
    const draft = ref({ title: '', content: createEmptyRichContent(), category: '자유' })
    const editingPost = ref(false)
    const postDraft = ref({ title: '', content: '', category: '자유' })
    const DRAFT_STORAGE_KEY = 'community-write-draft'

    function createEmptyRichContent() {
      return stringifyTiptapDocument(emptyTiptapDocument())
    }

    function getRichText(value) {
      return extractTiptapText(value).replace(/\s+/g, ' ').trim()
    }

    function summarizeRichText(value, maxLength = 90) {
      const text = getRichText(value)
      if (!text) return '내용 없음'
      return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text
    }

    function hasRichText(value) {
      return Boolean(getRichText(value))
    }

    function formatDateTime(instant) {
      if (!instant) return ''
      return `${utcToKstDate(instant)} ${utcToKstClock(instant)}`
    }

    function formatRelativeTime(instant) {
      if (!instant) return ''
      const diff = Date.now() - new Date(instant).getTime()
      if (!Number.isFinite(diff) || diff < 0) return formatDateTime(instant)
      const minutes = Math.floor(diff / 60000)
      if (minutes < 1) return '방금 전'
      if (minutes < 60) return `${minutes}분 전`
      const hours = Math.floor(minutes / 60)
      if (hours < 24) return `${hours}시간 전`
      const days = Math.floor(hours / 24)
      if (days < 7) return `${days}일 전`
      return formatDateTime(instant)
    }

    function categoryClass(label) {
      return `community-category-${String(label || '기타').replace(/\s+/g, '-').toLowerCase()}`
    }

    function syncKeywordFromRoute() {
      keyword.value = typeof route.query.q === 'string' ? route.query.q : ''
    }

    async function loadPosts() {
      loading.value = true
      loadError.value = ''
      try {
        const isHot = category.value === 'Hot'
        const data = await listPosts({
          category: category.value === '전체' || isHot ? '' : category.value,
          keyword: keyword.value.trim(),
          sort: 'latest',
          hot: isHot,
          page: page.value,
          size: PAGE_SIZE,
        })
        posts.value = data?.items || []
        totalPages.value = data?.totalPages || 1
      } catch (err) {
        loadError.value = err?.message || '게시글을 불러오지 못했습니다.'
        posts.value = []
        totalPages.value = 1
      } finally {
        loading.value = false
      }
    }

    async function loadHot() {
      try {
        hotPosts.value = (await getHotPosts()) || []
        visibleHotPosts.value = hotPosts.value.slice(0, 3)
      } catch {
        hotPosts.value = []
        visibleHotPosts.value = []
      }
    }

    function applyFilters() {
      const q = keyword.value.trim()
      router.replace({
        path: '/app/community',
        query: q ? { q } : {},
      })
    }

    function goToPage(target) {
      if (target < 1 || target > totalPages.value || target === page.value) return
      page.value = target
      loadPosts()
    }

    watch(category, () => {
      page.value = 1
      loadPosts()
    })

    watch(keyword, (value) => {
      if (!value.trim() && route.query.q) applyFilters()
    })

    watch(() => route.query.q, () => {
      syncKeywordFromRoute()
      page.value = 1
      loadPosts()
    })

    onMounted(() => {
      syncKeywordFromRoute()
      loadPosts()
      loadHot()
    })

    async function openPostDetail(post) {
      actionError.value = ''
      try {
        const [detail, comments] = await Promise.all([getPost(post.id), listComments(post.id)])
        openPost.value = { ...detail, comments }
        commentText.value = ''
        editingCommentId.value = null
      } catch (err) {
        actionError.value = err?.message || '게시글을 불러오지 못했습니다.'
      }
    }

    function closeDetail() {
      openPost.value = null
      commentText.value = ''
      editingCommentId.value = null
      editingPost.value = false
      actionError.value = ''
      loadPosts()
    }

    async function toggleLike(post) {
      actionError.value = ''
      try {
        const result = await togglePostLike(post.id)
        post.liked = result.liked
        post.likeCount = result.likeCount
      } catch (err) {
        actionError.value = err?.message || '좋아요 처리에 실패했습니다.'
      }
    }

    async function likeComment(comment) {
      actionError.value = ''
      try {
        const result = await toggleCommentLike(openPost.value.id, comment.id)
        comment.liked = result.liked
        comment.likeCount = result.likeCount
      } catch (err) {
        actionError.value = err?.message || '댓글 좋아요 처리에 실패했습니다.'
      }
    }

    async function refreshComments() {
      if (!openPost.value) return
      const comments = await listComments(openPost.value.id)
      openPost.value.comments = comments
      openPost.value.commentCount = comments.length
    }

    async function addComment() {
      if (!openPost.value || !commentText.value.trim() || commentSubmitting.value) return
      actionError.value = ''
      commentSubmitting.value = true
      try {
        await createComment(openPost.value.id, { content: commentText.value.trim() })
        commentText.value = ''
        await refreshComments()
      } catch (err) {
        actionError.value = err?.message || '댓글 등록에 실패했습니다.'
      } finally {
        commentSubmitting.value = false
      }
    }

    function addCommentOnEnter(event) {
      if (event?.isComposing || event?.keyCode === 229) return
      event?.preventDefault?.()
      addComment()
    }

    function startEditComment(comment) {
      editingCommentId.value = comment.id
      editText.value = comment.content
    }

    async function removeComment(comment) {
      if (!openPost.value) return
      if (!window.confirm('댓글을 삭제하시겠습니까?')) return
      actionError.value = ''
      try {
        await deleteComment(openPost.value.id, comment.id)
        await refreshComments()
      } catch (err) {
        actionError.value = err?.message || '댓글 삭제에 실패했습니다.'
      }
    }

    async function saveEditComment(comment) {
      const content = editText.value.trim()
      if (!content) return
      actionError.value = ''
      try {
        const result = await updateComment(openPost.value.id, comment.id, { content })
        comment.content = result.content
        editingCommentId.value = null
        editText.value = ''
      } catch (err) {
        actionError.value = err?.message || '댓글 수정에 실패했습니다.'
      }
    }

    function openWriteModal() {
      const savedDraft = loadDraft()
      draft.value = savedDraft || { title: '', content: createEmptyRichContent(), category: '자유' }
      actionError.value = ''
      writing.value = true
    }

    function closeWritePage() {
      writing.value = false
      actionError.value = ''
    }

    function loadDraft() {
      try {
        const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object') return null
        return {
          title: String(parsed.title || ''),
          content: String(parsed.content || createEmptyRichContent()),
          category: categories.includes(parsed.category) ? parsed.category : '자유',
        }
      } catch {
        return null
      }
    }

    function saveDraft() {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
        title: draft.value.title,
        content: draft.value.content,
        category: draft.value.category,
      }))
    }

    async function savePost() {
      const title = draft.value.title.trim()
      if (!title || !hasRichText(draft.value.content)) return
      actionError.value = ''
      try {
        await createPost({ category: draft.value.category, title, content: draft.value.content })
        localStorage.removeItem(DRAFT_STORAGE_KEY)
        writing.value = false
        page.value = 1
        await Promise.all([loadPosts(), loadHot()])
      } catch (err) {
        actionError.value = err?.message || '게시글 저장에 실패했습니다.'
      }
    }

    async function removePost() {
      if (!openPost.value) return
      if (!window.confirm('이 게시글을 삭제하시겠습니까? 댓글·좋아요도 함께 삭제됩니다.')) return
      actionError.value = ''
      try {
        await deletePost(openPost.value.id)
        closeDetail()
        await loadHot()
      } catch (err) {
        actionError.value = err?.message || '게시글 삭제에 실패했습니다.'
      }
    }

    function startEditPost() {
      if (!openPost.value) return
      postDraft.value = {
        title: openPost.value.title,
        content: openPost.value.content,
        category: openPost.value.categoryLabel,
      }
      actionError.value = ''
      editingPost.value = true
    }

    function cancelEditPost() {
      editingPost.value = false
      actionError.value = ''
    }

    async function savePostEdit() {
      const title = postDraft.value.title.trim()
      if (!title || !hasRichText(postDraft.value.content)) return
      actionError.value = ''
      try {
        const result = await updatePost(openPost.value.id, {
          category: postDraft.value.category,
          title,
          content: postDraft.value.content,
        })
        openPost.value = {
          ...openPost.value,
          category: result.category,
          categoryLabel: result.categoryLabel,
          title: result.title,
          content: result.content,
        }
        editingPost.value = false
        await Promise.all([loadPosts(), loadHot()])
      } catch (err) {
        actionError.value = err?.message || '게시글 수정에 실패했습니다.'
      }
    }

    return {
      categories,
      posts,
      hotPosts,
      visibleHotPosts,
      category,
      categoryClass,
      keyword,
      loading,
      loadError,
      actionError,
      writing,
      commentText,
      commentSubmitting,
      editingCommentId,
      editText,
      draft,
      writeCategories,
      editingPost,
      postDraft,
      summarizeRichText,
      filteredPosts: posts,
      page,
      totalPages,
      goToPage,
      applyFilters,
      openPost,
      formatDateTime,
      formatRelativeTime,
      openPostDetail,
      closeDetail,
      toggleLike,
      likeComment,
      addComment,
      addCommentOnEnter,
      startEditComment,
      saveEditComment,
      removeComment,
      openWriteModal,
      closeWritePage,
      savePost,
      saveDraft,
      removePost,
      startEditPost,
      cancelEditPost,
      savePostEdit,
    }
  },
  template: `
    <section v-if="writing" class="page community-write-page">
      <header class="page-header">
        <div class="community-write-breadcrumbs">
          <span>도파민</span>
          <span>글쓰기</span>
        </div>
        <h1>새 글 작성</h1>
        <p>도파민 커뮤니티에 익명으로 자유롭게 의견을 남겨주세요.</p>
      </header>

      <div class="community-write-layout">
        <article class="card community-write-card">
          <form class="community-write-form" @submit.prevent="savePost">
            <label class="community-write-field">
              <span>카테고리</span>
              <AppSelect v-model="draft.category">
                <option v-for="item in writeCategories" :key="item">{{ item }}</option>
              </AppSelect>
            </label>

            <label class="community-write-field">
              <span>제목</span>
              <input v-model="draft.title" placeholder="제목을 입력하세요">
            </label>

            <label class="community-write-field">
              <span>내용</span>
              <MinutesEditor v-model="draft.content" />
            </label>

            <p v-if="actionError" class="warning-text">{{ actionError }}</p>
            <p class="community-write-note">비방·인신공격 게시물은 관리자에 의해 삭제될 수 있습니다.</p>

            <div class="community-write-actions">
              <button type="button" class="ghost-button" @click="closeWritePage">취소</button>
              <button type="submit" class="primary-button small">등록</button>
            </div>
          </form>
        </article>

        <aside class="community-write-sidebar">
        <article class="card community-guide-card">
          <h2><Megaphone :size="18" /> 익명 게시 안내</h2>
          <ul class="community-guide-dash-list">
            <li>작성자는 익명으로 표시됩니다.</li>
            <li>개인 정보는 노출되지 않습니다.</li>
            <li>자유롭고 건설적인 소통을 지향합니다.</li>
          </ul>
        </article>

        <article class="card community-guide-card">
          <h2><Lightbulb :size="18" /> 카테고리 안내</h2>
          <ul class="community-guide-dash-list">
            <li>자유로운 주제의 이야기</li>
            <li>궁금한 점을 묻고 답해요</li>
            <li>유용한 정보를 공유해요</li>
            <li>기타 다양한 주제</li>
          </ul>
        </article>

        <article class="card community-guide-card">
          <h2><Shield :size="18" /> 작성 팁</h2>
          <ul class="community-guide-dash-list">
            <li>구체적인 내용을 작성하면 더 많은 공감을 받을 수 있어요.</li>
            <li>예외와 배경을 담은 표현을 사용해요.</li>
            <li>관련 태그를 활용하면 노출이 더 잘 될 수 있어요.</li>
          </ul>
        </article>
        </aside>
      </div>
    </section>

    <section v-else-if="!openPost" class="page community-page">
      <header class="page-header community-header">
        <div>
          <h1>도파민</h1>
          <p>익명으로 자유롭게 의견을 나눠보세요.</p>
        </div>
        <ActionButton variant="primary" class="community-write-button" @click="openWriteModal">글쓰기</ActionButton>
      </header>

      <article class="card community-hot">
        <div class="community-section-title">
          <span class="hot-icon"><Flame :size="16" /></span>
          <h2>HOT 게시글</h2>
        </div>
        <div class="hot-grid">
          <button v-for="(post, index) in visibleHotPosts" :key="post.id" class="hot-card" type="button" @click="openPostDetail(post)">
            <div class="hot-meta">
              <strong>#{{ index + 1 }}</strong>
              <span class="community-category-pill" :class="categoryClass(post.categoryLabel)">{{ post.categoryLabel }}</span>
            </div>
            <h3>{{ post.title }}</h3>
            <p class="community-hot-summary">{{ summarizeRichText(post.content, 60) }}</p>
            <div class="community-hot-footer">
              <div class="community-stats">
                <span class="community-stat"><Eye :size="14" /> {{ post.viewCount.toLocaleString() }}</span>
                <span class="community-stat" :class="{ liked: post.liked }"><Heart :size="14" :fill="post.liked ? 'currentColor' : 'none'" /> {{ post.likeCount }}</span>
                <span class="community-stat"><MessageSquare :size="14" /> {{ post.commentCount }}</span>
              </div>
              <small>{{ formatRelativeTime(post.createdAt) }}</small>
            </div>
          </button>
        </div>
      </article>

      <div class="community-controls">
        <div class="category-row">
          <button
            v-for="item in categories"
            :key="item"
            type="button"
            class="chip"
            :class="{ active: category === item }"
            @click="category = item"
          >{{ item }}</button>
        </div>
        <form class="community-search" @submit.prevent="applyFilters">
          <span>검색</span>
          <div class="community-search-box">
            <input v-model="keyword" placeholder="제목·내용 검색">
            <button type="submit">검색</button>
          </div>
        </form>
      </div>

      <article class="card community-list">
        <div v-if="loadError" class="empty-state">{{ loadError }}</div>
        <div v-else-if="loading" class="empty-state">불러오는 중...</div>
        <template v-else>
          <button v-for="post in filteredPosts" :key="post.id" class="community-row" type="button" @click="openPostDetail(post)">
            <div class="community-row-main">
              <div class="community-row-top">
                <span class="community-category-pill" :class="categoryClass(post.categoryLabel)">{{ post.categoryLabel }}</span>
                <span v-if="post.mine" class="community-mine-tag">내 글</span>
              </div>
              <strong>{{ post.title }}</strong>
              <small>{{ post.authorAlias }} · {{ formatDateTime(post.createdAt) }}</small>
            </div>
            <div class="community-row-side">
              <div class="community-row-stats">
                <span class="community-stat"><Eye :size="14" /> {{ post.viewCount.toLocaleString() }}</span>
                <span class="community-stat" :class="{ liked: post.liked }"><Heart :size="14" :fill="post.liked ? 'currentColor' : 'none'" /> {{ post.likeCount }}</span>
                <span class="community-stat"><MessageSquare :size="14" /> {{ post.commentCount }}</span>
              </div>
              <span class="community-row-more"><MoreVertical :size="16" /></span>
            </div>
          </button>
          <div v-if="filteredPosts.length === 0" class="empty-state">게시글이 없습니다.</div>
        </template>
      </article>

      <nav v-if="!loading && !loadError && totalPages > 1" class="community-pagination" aria-label="게시글 페이지">
        <button type="button" class="page-btn" :disabled="page <= 1" @click="goToPage(page - 1)">‹</button>
        <button
          v-for="p in totalPages"
          :key="p"
          type="button"
          class="page-btn"
          :class="{ active: p === page }"
          @click="goToPage(p)"
        >{{ p }}</button>
        <button type="button" class="page-btn" :disabled="page >= totalPages" @click="goToPage(page + 1)">›</button>
      </nav>
    </section>

    <section v-else class="page community-detail">
      <header class="page-header community-detail-header">
        <div class="community-write-breadcrumbs">
          <span>도파민</span>
          <span>게시글</span>
        </div>
        <button class="community-back-link" type="button" @click="closeDetail">
          <ArrowLeft :size="16" />
          목록으로
        </button>
      </header>

      <div class="community-detail-layout">
        <div class="community-detail-main">
          <article class="card post-detail-card">
            <template v-if="!editingPost">
              <div class="community-detail-badges">
                <span class="community-category-pill" :class="categoryClass(openPost.categoryLabel)">{{ openPost.categoryLabel }}</span>
                <span v-if="openPost.mine" class="community-mine-tag">내 글</span>
              </div>

              <h1>{{ openPost.title }}</h1>
              <div class="post-meta">
                <span><UserRound :size="15" /> {{ openPost.authorAlias }}</span>
                <span>{{ formatDateTime(openPost.createdAt) }}</span>
                <span><Eye :size="15" /> {{ openPost.viewCount.toLocaleString() }}</span>
                <span><MessageSquare :size="15" /> {{ openPost.comments.length }}</span>
              </div>

              <div class="post-body community-rich-content">
                <MinutesEditor :modelValue="openPost.content" readonly />
              </div>

              <div class="community-detail-actions">
                <button type="button" class="community-like-pill" :class="{ active: openPost.liked }" @click="toggleLike(openPost)">
                  <Heart :size="18" :fill="openPost.liked ? 'currentColor' : 'none'" />
                  {{ openPost.likeCount }}
                </button>

                <div class="community-detail-action-buttons">
                  <ActionButton v-if="openPost.mine" variant="secondary" class="community-detail-action-button" type="button" @click="startEditPost">수정</ActionButton>
                  <ActionButton v-if="openPost.mine" variant="secondary" class="community-detail-action-button community-danger-button" type="button" @click="removePost">삭제</ActionButton>
                </div>
              </div>
            </template>

            <form v-else class="community-edit-form" @submit.prevent="savePostEdit">
              <AppSelect v-model="postDraft.category">
                <option v-for="item in categories.filter((item) => item !== '전체' && item !== 'Hot')" :key="item">{{ item }}</option>
              </AppSelect>
              <input v-model="postDraft.title" placeholder="제목">
              <MinutesEditor v-model="postDraft.content" />
              <p v-if="actionError" class="warning-text">{{ actionError }}</p>
              <div class="community-edit-actions">
                <ActionButton variant="secondary" class="community-detail-action-button" type="button" @click="cancelEditPost">취소</ActionButton>
                <ActionButton variant="primary" class="community-detail-action-button" type="submit">수정 완료</ActionButton>
              </div>
            </form>
          </article>

          <article class="card comments-card">
            <div class="community-comments-head">
              <h2><MessageCircle :size="18" /> 댓글 {{ openPost.comments.length }}</h2>
            </div>
            <p v-if="actionError" class="warning-text">{{ actionError }}</p>

            <div v-if="openPost.comments.length === 0" class="community-comments-empty">
              <MessageCircle :size="52" />
              <strong>아직 댓글이 없습니다.</strong>
              <p>첫 댓글을 남겨보세요!</p>
            </div>

            <ul v-else class="comment-list">
              <li v-for="comment in openPost.comments" :key="comment.id">
                <div class="comment-meta">
                  <strong>{{ comment.authorAlias }}</strong>
                  <span>{{ formatDateTime(comment.createdAt) }}</span>
                  <button v-if="comment.mine && editingCommentId !== comment.id" type="button" @click="startEditComment(comment)">수정</button>
                  <button v-if="comment.mine && editingCommentId !== comment.id" type="button" class="community-danger" @click="removeComment(comment)">삭제</button>
                </div>
                <div v-if="editingCommentId === comment.id" class="comment-edit">
                  <input v-model="editText" @keydown.enter="saveEditComment(comment)">
                  <button type="button" class="primary-button small" @click="saveEditComment(comment)">저장</button>
                  <button type="button" class="ghost-button" @click="editingCommentId = null">취소</button>
                </div>
                <p v-else>{{ comment.content }}</p>
                <button type="button" class="community-comment-like" :class="{ active: comment.liked }" @click="likeComment(comment)">
                  <Heart :size="13" :fill="comment.liked ? 'currentColor' : 'none'" /> {{ comment.likeCount }}
                </button>
              </li>
            </ul>

            <div class="comment-composer">
              <span class="comment-composer-avatar"><UserRound :size="18" /></span>
              <input v-model="commentText" placeholder="익명으로 댓글 작성" @keydown.enter.exact.prevent="addCommentOnEnter">
              <button type="button" class="primary-button small" :disabled="commentSubmitting" @click="addComment">{{ commentSubmitting ? '등록 중...' : '등록' }}</button>
            </div>
          </article>
        </div>

        <aside class="community-detail-sidebar">
            <article class="card community-guide-card">
          <h2><Megaphone :size="18" /> 커뮤니티 이용 안내</h2>
            <ul class="community-guide-dash-list">
              <li>자유롭게 의견을 나누고 다양한 아이디어를 공유해요.</li>
              <li>서로 존중하는 문화를 만들어요.</li>
              <li>게시글은 모든 구성원이 볼 수 있어요.</li>
            </ul>
          </article>

          <article class="card community-guide-card community-guide-card-compact">
            <h2><Shield :size="18" /> 익명 게시 안내</h2>
            <p>익명으로 작성된 게시글입니다. 서로의 의견을 존중하며 건설적인 대화를 나눠주세요.</p>
          </article>
        </aside>
      </div>
    </section>
  `,
})
</script>

<style>
.community-page,
.community-detail,
.community-write-page {
  max-width: 1320px;
}

.community-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.community-write-button {
  min-width: 96px;
  justify-content: center;
}

.community-write-breadcrumbs {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  color: var(--muted-foreground);
  font-size: 14px;
  font-weight: 700;
}

.community-write-breadcrumbs span + span::before {
  content: '›';
  margin-right: 10px;
  color: #cbd5e1;
}

.community-hot {
  width: 100%;
  padding: 14px 14px 16px;
  border-color: #fed7aa;
  background: #fffaf6;
}

.community-section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.community-section-title h2 {
  margin: 0;
  color: var(--primary-dark);
  font-size: 19px;
}

.hot-icon {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
}

.hot-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  width: 100%;
}

.hot-card {
  display: grid;
  min-width: 0;
  min-height: 152px;
  gap: 10px;
  border: 1px solid #fed7aa;
  border-radius: 16px;
  background: white;
  padding: 16px 18px 14px;
  text-align: left;
}

.hot-card h3 {
  margin: 0;
  font-size: 15px;
  line-height: 1.45;
}

.hot-meta,
.community-hot-footer,
.community-row-top,
.community-row-side,
.community-detail-actions,
.community-detail-action-buttons,
.community-write-actions,
.community-edit-actions {
  display: flex;
  align-items: center;
}

.hot-meta,
.community-row-top,
.community-detail-badges,
.community-row-stats,
.community-stats {
  gap: 8px;
}

.community-hot-footer {
  justify-content: space-between;
  gap: 12px;
  margin-top: auto;
}

.community-hot-footer small {
  color: var(--muted-foreground);
  font-size: 12px;
  white-space: nowrap;
}

.community-hot-summary {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 12px;
  line-height: 1.5;
}

.community-category-pill {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  border-radius: 999px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 800;
}

.community-category-자유 { background: #fff3ea; color: var(--primary-dark); }
.community-category-회사생활 { background: #eef2ff; color: #4f46e5; }
.community-category-취미 { background: #fff7ed; color: #ea580c; }
.community-category-맛집 { background: #f5f3ff; color: #7c3aed; }
.community-category-hot { background: #fff3ea; color: var(--primary-dark); }

.community-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin: 18px 0 18px;
}

.category-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.chip {
  min-height: 40px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: white;
  padding: 0 16px;
  color: var(--muted-foreground);
  font-size: 14px;
  font-weight: 700;
}

.chip.active {
  border-color: #fdba74;
  background: #fff7ed;
  color: var(--primary-dark);
}

.community-search {
  margin-left: auto;
  width: min(420px, 100%);
  display: grid;
}

.community-search span {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.community-search-box {
  display: flex;
  align-items: center;
  gap: 12px;
}

.community-search-box input {
  flex: 1;
  min-width: 0;
  height: 44px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: white;
  padding: 0 14px;
  font-size: 14px;
}

.community-search-box button {
  height: 44px;
  border: 0;
  border-radius: 12px;
  background: var(--primary);
  padding: 0 18px;
  color: white;
  font-size: 14px;
  font-weight: 800;
}

.community-list {
  padding: 0;
  overflow: hidden;
}

.community-row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border: 0;
  border-top: 1px solid #eef2f7;
  background: white;
  padding: 18px 20px;
  text-align: left;
}

.community-row:first-child {
  border-top: 0;
}

.community-row-main {
  min-width: 0;
  display: grid;
  gap: 8px;
}

.community-row-main strong {
  font-size: 16px;
}

.community-row-main small {
  color: var(--muted-foreground);
  font-size: 13px;
}

.community-row-side {
  gap: 14px;
  color: var(--muted-foreground);
  white-space: nowrap;
}

.community-row-more {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.community-stat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.community-stat.liked,
.community-comment-like.active,
.community-like-pill.active {
  color: #e11d48;
}

.community-mine-tag {
  padding: 4px 9px;
  border-radius: 999px;
  background: #fff3ea;
  color: var(--primary-dark);
  font-size: 11px;
  font-weight: 800;
}

.community-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-top: 26px;
  flex-wrap: wrap;
}

.community-pagination .page-btn {
  min-width: 40px;
  height: 40px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: white;
  color: var(--foreground);
  font-size: 14px;
  font-weight: 700;
}

.community-pagination .page-btn.active {
  border-color: var(--primary);
  background: var(--primary);
  color: white;
}

.community-detail-header {
  margin-bottom: 18px;
}

.community-back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  background: transparent;
  padding: 0;
  color: var(--primary);
  font-size: 16px;
  font-weight: 800;
}

.community-detail-layout {
  display: grid;
  gap: 24px;
  align-items: start;
}

.community-detail-main {
  display: grid;
  gap: 24px;
}

.post-detail-card,
.comments-card,
.community-write-card,
.community-guide-card {
  border-radius: 24px;
}

.post-detail-card {
  padding: 28px 30px;
}

.community-detail-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
}

.post-detail-card h1 {
  margin: 0;
  font-size: 42px;
  line-height: 1.15;
}

.post-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  border-bottom: 1px solid var(--border);
  margin-top: 16px;
  padding-bottom: 18px;
  color: var(--muted-foreground);
  font-size: 14px;
}

.post-meta span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.community-rich-content {
  margin: 24px 0;
}

.community-rich-content .minutes-editor {
  border: 0;
  border-radius: 0;
}

.community-rich-content .minutes-editor-content {
  min-height: 0;
}

.community-rich-content .minutes-editor-content .ProseMirror {
  min-height: 120px;
  padding: 0;
}

.community-detail-actions {
  justify-content: space-between;
  gap: 16px;
}

.community-like-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 46px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: white;
  padding: 0 18px;
  font-size: 16px;
  font-weight: 700;
}

.community-detail-action-buttons {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.community-detail-action-button {
  min-width: 112px;
  min-height: 48px;
  border-radius: 16px;
  font-size: 16px;
  justify-content: center;
}

.community-danger-button {
  color: var(--danger);
  border-color: #fecaca;
}

.icon-only {
  width: 44px;
  padding: 0;
}

.community-comments-head {
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 18px;
}

.community-comments-head h2 {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 22px;
}

.community-comments-empty {
  display: grid;
  justify-items: center;
  gap: 8px;
  min-height: 200px;
  padding: 36px 16px 32px;
  color: var(--muted-foreground);
  text-align: center;
}

.community-comments-empty strong {
  color: var(--foreground);
  font-size: 24px;
}

.comment-list {
  display: grid;
  gap: 18px;
  margin: 0;
  padding: 22px 0 0;
  list-style: none;
}

.comment-list li {
  border-top: 1px solid #eef2f7;
  padding-top: 18px;
}

.comment-list li:first-child {
  border-top: 0;
  padding-top: 0;
}

.comment-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
  color: var(--muted-foreground);
  font-size: 13px;
}

.comment-meta strong {
  color: var(--foreground);
}

.comment-meta button {
  border: 0;
  background: transparent;
  padding: 0;
  color: inherit;
  font-size: 13px;
}

.comment-meta button.community-danger {
  color: var(--danger);
}

.comment-list p {
  margin: 0;
  color: var(--foreground);
  line-height: 1.7;
}

.community-comment-like {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 0;
  background: transparent;
  margin-top: 10px;
  padding: 0;
  color: var(--muted-foreground);
  font-size: 12px;
}

.comment-edit {
  display: flex;
  gap: 8px;
}

.comment-edit input,
.community-write-field input,
.community-edit-form input,
.comment-composer input {
  flex: 1;
  min-width: 0;
  height: 46px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: white;
  padding: 0 14px;
  font: inherit;
}

.comment-composer {
  display: flex;
  align-items: center;
  gap: 12px;
  border-top: 1px solid var(--border);
  margin-top: 24px;
  padding-top: 18px;
}

.comment-composer-avatar {
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f1f5f9;
  color: #64748b;
}

.community-detail-sidebar,
.community-write-sidebar {
  display: grid;
  gap: 18px;
}

.community-guide-card {
  padding: 22px 20px;
}

.community-guide-card h2 {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 18px;
  font-size: 18px;
}

.community-guide-card p {
  margin: 0;
  color: var(--muted-foreground);
  line-height: 1.7;
}

.community-guide-card ul {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
  color: var(--muted-foreground);
}

.community-guide-dash-list {
  gap: 10px;
}

.community-guide-dash-list li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  line-height: 1.65;
}

.community-guide-dash-list li::before {
  content: '-';
  color: var(--primary);
  font-weight: 800;
  line-height: 1.2;
}

.community-guide-icon-list li {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  align-items: center;
  column-gap: 12px;
  line-height: 1.6;
}

.community-guide-item-icon {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #fff3ea;
  color: var(--primary);
  font-size: 12px;
  font-weight: 800;
}

.community-guide-icon-list li svg {
  margin-top: 0;
}

.community-guide-card-compact {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
}

.community-guide-card-compact p {
  max-width: none;
  font-size: 16px;
  line-height: 1.75;
}

.community-write-layout {
  display: grid;
  gap: 24px;
  align-items: start;
}

.community-write-card {
  padding: 22px;
}

.community-write-form {
  display: grid;
  gap: 22px;
}

.community-write-field {
  display: grid;
  gap: 10px;
}

.community-write-field > span {
  color: var(--foreground);
  font-size: 14px;
  font-weight: 800;
}

.community-write-field .app-select {
  width: 100%;
}

.community-write-field .app-select-wrap {
  width: min(240px, 100%);
}

.community-write-form .minutes-editor,
.community-edit-form .minutes-editor {
  min-width: 0;
}

.community-write-form .minutes-editor-content,
.community-edit-form .minutes-editor-content {
  min-height: 0;
}

.community-write-form .minutes-editor-content .ProseMirror,
.community-edit-form .minutes-editor-content .ProseMirror {
  min-height: 240px;
}

.community-write-note {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 13px;
  line-height: 1.6;
}

.community-write-actions {
  justify-content: flex-end;
  gap: 12px;
  margin-top: 4px;
}

.community-edit-actions {
  justify-content: flex-end;
  gap: 18px;
  margin-top: 12px;
}

.community-write-actions .ghost-button,
.community-write-actions .secondary-button,
.community-write-actions .primary-button {
  min-width: 92px;
}

.warning-text {
  margin: 0;
  color: var(--danger);
  font-size: 13px;
  font-weight: 700;
}

@media (min-width: 1080px) {
  .community-detail-layout,
  .community-write-layout {
    grid-template-columns: minmax(0, 1fr) 320px;
  }

  .community-detail-sidebar {
    position: sticky;
    top: 110px;
  }
}

@media (max-width: 899px) {
  .community-header,
  .community-controls,
  .community-row,
  .community-detail-actions,
  .community-detail-action-buttons,
  .comment-composer,
  .comment-edit {
    flex-direction: column;
    align-items: stretch;
  }

  .post-detail-card h1 {
    font-size: 32px;
  }

  .community-search,
  .community-write-field .app-select {
    width: 100%;
  }

  .hot-grid {
    grid-template-columns: 1fr;
  }
}
</style>
