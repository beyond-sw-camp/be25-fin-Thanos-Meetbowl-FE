<script>
import { defineComponent, onMounted, ref, watch } from 'vue'
import AppSelect from '../../components/common/AppSelect.vue'
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
import { Eye, Heart, MessageSquare } from '@lucide/vue'

export default defineComponent({
  components: { AppSelect, MinutesEditor, Eye, Heart, MessageSquare },
  setup() {
    // '전체'는 필터 미적용, 'Hot'은 카테고리가 아니라 hot=true(좋아요 N개 이상) 모드. 나머지는 백엔드 enum 라벨.
    const categories = ['전체', ...COMMUNITY_CATEGORIES.map((item) => item.label), 'Hot']

    const posts = ref([])
    const hotPosts = ref([])
    const category = ref('전체')
    const keyword = ref('')
    const loading = ref(false)
    const loadError = ref('')
    const actionError = ref('')

    // 목록 페이지네이션 상태. PAGE_SIZE는 백엔드 size 파라미터(허용 1~100)로 그대로 전달한다.
    const PAGE_SIZE = 10
    const page = ref(1)
    const totalPages = ref(1)
    const totalElements = ref(0)

    const openPost = ref(null) // 상세(getPost 결과 + comments 배열)
    const writing = ref(false)
    const commentText = ref('')
    const editingCommentId = ref(null)
    const editText = ref('')
    const draft = ref({ title: '', content: createEmptyRichContent(), category: '자유' }) // 새 글 작성 모달용
    const editingPost = ref(false) // 상세에서 인라인 수정 중 여부
    const postDraft = ref({ title: '', content: '', category: '자유' }) // 인라인 수정 입력값

    function formatDateTime(instant) {
      if (!instant) return ''
      return `${utcToKstDate(instant)} ${utcToKstClock(instant)}`
    }

    function createEmptyRichContent() {
      return stringifyTiptapDocument(emptyTiptapDocument())
    }

    function getRichText(value) {
      return extractTiptapText(value).replace(/\s+/g, ' ').trim()
    }

    function summarizeRichText(value, maxLength = 110) {
      const text = getRichText(value)
      if (!text) return '내용 없음'
      return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text
    }

    function hasRichText(value) {
      return Boolean(getRichText(value))
    }

    async function loadPosts() {
      loading.value = true
      loadError.value = ''
      try {
        // 'Hot' 탭은 카테고리 필터로 관리되는 게 아니라 hot=true(좋아요 N개 이상) 모드. category 필터는 비운다.
        const isHot = category.value === 'Hot'
        const data = await listPosts({
          category: category.value === '전체' || isHot ? '' : category.value,
          keyword: keyword.value.trim(),
          sort: 'latest', // 항상 최신순(createdAt DESC). Hot 모드도 백엔드가 최신순 고정.
          hot: isHot,
          page: page.value,
          size: PAGE_SIZE,
        })
        posts.value = data?.items || []
        totalPages.value = data?.totalPages || 1
        totalElements.value = data?.totalElements || 0
      } catch (err) {
        loadError.value = err?.message || '게시글을 불러오지 못했습니다.'
        posts.value = []
        totalPages.value = 1
        totalElements.value = 0
      } finally {
        loading.value = false
      }
    }

    async function loadHot() {
      try {
        hotPosts.value = (await getHotPosts()) || []
      } catch {
        hotPosts.value = []
      }
    }

    // 필터(카테고리/검색)가 바뀌면 항상 1페이지부터 다시 조회한다.
    function applyFilters() {
      page.value = 1
      loadPosts()
    }

    // 특정 페이지로 이동. 범위를 벗어나거나 같은 페이지면 무시한다.
    function goToPage(target) {
      if (target < 1 || target > totalPages.value || target === page.value) return
      page.value = target
      loadPosts()
    }

    // 카테고리 변경은 즉시 재조회. 검색은 버튼/Enter로 명시 실행하되,
    // 검색어를 비우면 자동으로 전체 목록으로 복귀한다. 셋 다 1페이지로 리셋한다.
    watch(category, applyFilters)
    watch(keyword, (value) => {
      if (!value.trim()) applyFilters()
    })

    onMounted(() => {
      loadPosts()
      loadHot()
    })

    async function openPostDetail(post) {
      actionError.value = ''
      try {
        // 상세는 조회수 +1·mine·liked 포함, 댓글은 별도 엔드포인트로 함께 받는다.
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
      // 상세에서 바뀐 조회수/좋아요를 목록에도 반영한다.
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
      if (!openPost.value || !commentText.value.trim()) return
      actionError.value = ''
      try {
        await createComment(openPost.value.id, { content: commentText.value.trim() })
        commentText.value = ''
        await refreshComments()
      } catch (err) {
        actionError.value = err?.message || '댓글 등록에 실패했습니다.'
      }
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
      draft.value = { title: '', content: createEmptyRichContent(), category: '자유' }
      actionError.value = ''
      writing.value = true
    }

    async function savePost() {
      const title = draft.value.title.trim()
      if (!title || !hasRichText(draft.value.content)) return
      actionError.value = ''
      try {
        await createPost({ category: draft.value.category, title, content: draft.value.content })
        writing.value = false
        page.value = 1 // 새 글은 최신순 맨 앞이므로 1페이지로 돌아가 보이게 한다.
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
        closeDetail() // 내부에서 목록 재조회
        await loadHot()
      } catch (err) {
        actionError.value = err?.message || '게시글 삭제에 실패했습니다.'
      }
    }

    // 상세에서 '수정'
    function startEditPost() {
      if (!openPost.value) return
      postDraft.value = {
        title: openPost.value.title,
        content: openPost.value.content,
        category: openPost.value.categoryLabel, // select는 라벨 기준
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
        // 상세 본문/카테고리를 갱신한다(조회수/좋아요/댓글·작성시각은 그대로 유지).
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
      category,
      keyword,
      loading,
      loadError,
      actionError,
      writing,
      commentText,
      editingCommentId,
      editText,
      draft,
      editingPost,
      postDraft,
      summarizeRichText,
      filteredPosts: posts,
      page,
      totalPages,
      totalElements,
      goToPage,
      applyFilters,
      openPost,
      formatDateTime,
      loadPosts,
      openPostDetail,
      closeDetail,
      toggleLike,
      likeComment,
      addComment,
      startEditComment,
      saveEditComment,
      removeComment,
      openWriteModal,
      savePost,
      removePost,
      startEditPost,
      cancelEditPost,
      savePostEdit,
    }
  },
  template: `
    <section v-if="!openPost" class="page community-page">
      <header class="page-header community-header">
        <div>
          <h1>도파민</h1>
          <p>익명으로 자유롭게 의견을 나누는 공간입니다. 인신공격과 비방은 금지됩니다.</p>
        </div>
        <button class="primary-button small" type="button" @click="openWriteModal">글쓰기</button>
      </header>

      <article class="card community-hot">
        <div class="community-section-title">
          <span class="hot-icon">HOT</span>
          <h2>HOT 게시글</h2>
          <small>실시간 인기</small>
        </div>
        <div class="hot-grid">
          <button v-for="(post, index) in hotPosts" :key="post.id" class="hot-card" type="button" @click="openPostDetail(post)">
            <div class="hot-meta"><strong>#{{ index + 1 }}</strong><span class="badge warning">{{ post.categoryLabel }}</span><span v-if="post.mine" class="community-mine-tag">내 글</span></div>
            <h3>{{ post.title }}</h3>
            <p class="community-hot-summary">{{ summarizeRichText(post.content, 72) }}</p>
            <div class="community-stats">
              <span class="community-stat"><Eye :size="14" /> {{ post.viewCount.toLocaleString() }}</span>
              <span class="community-stat" :class="{ liked: post.liked }"><Heart :size="14" :fill="post.liked ? 'currentColor' : 'none'" /> {{ post.likeCount }}</span>
              <span class="community-stat"><MessageSquare :size="14" /> {{ post.commentCount }}</span>
            </div>
          </button>
        </div>
      </article>

      <div class="community-controls">
        <div class="category-row">
          <button v-for="item in categories" :key="item" type="button" class="chip" :class="{ active: category === item }" @click="category = item">{{ item }}</button>
        </div>
        <label class="community-search">
          <span>검색</span>
          <div class="community-search-box">
            <input v-model="keyword" placeholder="제목·내용 검색" @keydown.enter="applyFilters">
            <button type="button" @click="applyFilters">검색</button>
          </div>
        </label>
      </div>

      <article class="card community-list">
        <div v-if="loadError" class="empty-state">{{ loadError }}</div>
        <div v-else-if="loading" class="empty-state">불러오는 중...</div>
        <template v-else>
          <button v-for="post in filteredPosts" :key="post.id" class="community-row" type="button" @click="openPostDetail(post)">
            <div class="community-row-main">
              <div class="community-row-top">
                <span class="badge">{{ post.categoryLabel }}</span>
                <span v-if="post.mine" class="community-mine-tag">내 글</span>
              </div>
              <strong>{{ post.title }}</strong>
              <p>{{ summarizeRichText(post.content) }}</p>
              <small>{{ post.authorAlias }} · {{ formatDateTime(post.createdAt) }}</small>
            </div>
            <div class="community-row-stats">
              <span class="community-stat"><Eye :size="14" /> {{ post.viewCount.toLocaleString() }}</span>
              <span class="community-stat" :class="{ liked: post.liked }"><Heart :size="14" :fill="post.liked ? 'currentColor' : 'none'" /> {{ post.likeCount }}</span>
              <span class="community-stat"><MessageSquare :size="14" /> {{ post.commentCount }}</span>
            </div>
          </button>
          <div v-if="filteredPosts.length === 0" class="empty-state">게시글이 없습니다.</div>
        </template>
      </article>

      <nav v-if="!loading && !loadError && totalPages > 1" class="community-pagination" aria-label="게시글 페이지">
        <button type="button" class="page-btn" :disabled="page <= 1" @click="goToPage(page - 1)">이전</button>
        <button
          v-for="p in totalPages"
          :key="p"
          type="button"
          class="page-btn"
          :class="{ active: p === page }"
          @click="goToPage(p)"
        >{{ p }}</button>
        <button type="button" class="page-btn" :disabled="page >= totalPages" @click="goToPage(page + 1)">다음</button>
      </nav>

      <div v-if="writing" class="modal-backdrop" @click="writing = false">
        <form class="write-modal" @submit.prevent="savePost" @click.stop>
          <header>
            <h2>새 글 작성 (익명)</h2>
            <button type="button" @click="writing = false">닫기</button>
          </header>
          <AppSelect v-model="draft.category">
            <option v-for="item in categories.filter((item) => item !== '전체' && item !== 'Hot')" :key="item">{{ item }}</option>
          </AppSelect>
          <input v-model="draft.title" placeholder="제목">
          <MinutesEditor v-model="draft.content" />
          <p v-if="actionError" class="warning-text">{{ actionError }}</p>
          <p class="modal-note">비방·인신공격 게시물은 관리자에 의해 삭제될 수 있습니다.</p>
          <footer>
            <button type="button" class="ghost-button" @click="writing = false">취소</button>
            <button type="submit" class="primary-button small">등록</button>
          </footer>
        </form>
      </div>
    </section>

    <section v-else class="page community-detail">
      <button class="back-button" type="button" @click="closeDetail">목록으로</button>

      <article class="card post-detail-card">
        <template v-if="!editingPost">
          <span class="badge">{{ openPost.categoryLabel }}</span>
          <span v-if="openPost.mine" class="community-mine-tag">내 글</span>
          <h1>{{ openPost.title }}</h1>
          <div class="post-meta">
            <span>{{ openPost.authorAlias }}</span>
            <span>{{ formatDateTime(openPost.createdAt) }}</span>
            <span class="community-stat"><Eye :size="14" /> {{ openPost.viewCount.toLocaleString() }}</span>
            <span class="community-stat"><MessageSquare :size="14" /> {{ openPost.comments.length }}</span>
          </div>
          <div class="post-body community-rich-content">
            <MinutesEditor :modelValue="openPost.content" readonly />
          </div>
          <div class="like-row">
            <button type="button" class="like-button" :class="{ active: openPost.liked }" @click="toggleLike(openPost)">
              <Heart :size="16" :fill="openPost.liked ? 'currentColor' : 'none'" /> {{ openPost.likeCount }}
            </button>
            <span v-if="openPost.mine" class="community-owner-actions">
              <button type="button" class="ghost-button" @click="startEditPost">수정</button>
              <button type="button" class="ghost-button community-danger" @click="removePost">삭제</button>
            </span>
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
            <button type="button" class="ghost-button" @click="cancelEditPost">취소</button>
            <button type="submit" class="primary-button small">수정 완료</button>
          </div>
        </form>
      </article>

      <article class="card comments-card">
        <div class="card-head"><h2>댓글 {{ openPost.comments.length }}</h2></div>
        <p v-if="actionError" class="warning-text">{{ actionError }}</p>
        <ul class="comment-list">
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
          <li v-if="openPost.comments.length === 0" class="empty-state">첫 댓글을 남겨보세요.</li>
        </ul>
        <div class="comment-composer">
          <input v-model="commentText" placeholder="익명으로 댓글 작성" @keydown.enter="addComment">
          <button type="button" class="primary-button small" @click="addComment">전송</button>
        </div>
      </article>
    </section>
  `,
})
</script>

<!-- 런타임 template 문자열이라 scoped가 적용되지 않으므로 community- 네임스페이스로 전역 스타일을 둔다. -->
<style>
.community-detail .like-row { gap: 10px; flex-wrap: wrap; }
.community-owner-actions { display: inline-flex; gap: 8px; }
.ghost-button.community-danger { color: var(--danger); border-color: #fecaca; }
.comment-meta button.community-danger { color: var(--danger); margin-left: 0; }
.community-comment-like { display: inline-flex; align-items: center; gap: 4px; border: 0; background: transparent; padding: 0; cursor: pointer; color: var(--muted-foreground); font-size: 12px; }
.community-comment-like.active { color: #e11d48; font-weight: 700; }
/* 조회/좋아요/댓글: 아이콘 + 숫자 한 줄 정렬. liked면 빨간 채움 하트(하트는 fill=currentColor라 색을 따라감) */
.community-stat { display: inline-flex; align-items: center; gap: 4px; }
.community-stat.liked { color: #e11d48; }
.community-detail .like-button { display: inline-flex; align-items: center; gap: 6px; }
.community-edit-form { display: grid; gap: 12px; }
.community-edit-form .minutes-editor,
.write-modal .minutes-editor { min-width: 0; }
.community-edit-form .minutes-editor-content,
.write-modal .minutes-editor-content { min-height: 0; }
.community-edit-form .minutes-editor-content .ProseMirror,
.write-modal .minutes-editor-content .ProseMirror { min-height: 220px; }
.community-edit-actions { display: flex; justify-content: flex-end; gap: 8px; }
.community-search-box { display: flex; align-items: center; gap: 6px; }
.community-search-box input { font-size: 14px; flex: 1; min-width: 0; }
.community-search-box button { flex: 0 0 auto; height: 40px; padding: 0 14px; border: 0; border-radius: 8px; background: var(--primary); color: #fff; font-weight: 700; font-size: 14px; cursor: pointer; white-space: nowrap; }
.community-mine-tag { margin-left: 6px; padding: 4px 9px; border-radius: 999px; background: #eef2ff; color: var(--primary-dark); font-size: 11px; font-weight: 700; vertical-align: middle; white-space: nowrap; }
.community-hot-summary { margin: 8px 0 0; color: var(--muted-foreground); font-size: 12px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.community-rich-content { margin: 22px 0; }
.community-rich-content .minutes-editor { border: 0; border-radius: 0; }
.community-rich-content .minutes-editor-content { min-height: 0; }
.community-rich-content .minutes-editor-content .ProseMirror { min-height: 0; padding: 0; }
/* 목록 페이지네이션: 가운데 정렬된 페이지 버튼 줄. active는 현재 페이지 강조. */
.community-pagination { display: flex; justify-content: center; align-items: center; gap: 6px; margin-top: 16px; flex-wrap: wrap; }
.community-pagination .page-btn { min-width: 36px; height: 36px; padding: 0 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--background); color: var(--foreground); font-size: 14px; font-weight: 600; cursor: pointer; }
.community-pagination .page-btn:hover:not(:disabled) { background: var(--muted); }
.community-pagination .page-btn.active { background: var(--primary); border-color: var(--primary); color: #fff; }
.community-pagination .page-btn:disabled { opacity: 0.45; cursor: default; }
</style>
