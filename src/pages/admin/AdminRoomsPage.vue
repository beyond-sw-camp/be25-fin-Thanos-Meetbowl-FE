<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import ActionButton from '../../components/common/ActionButton.vue'
import AppSelect from '../../components/common/AppSelect.vue'
import ModalShell from '../../components/common/ModalShell.vue'
import {
  changeMeetingRoomAvailability,
  createMeetingBuilding,
  createMeetingRoom,
  createSiteWithBuilding,
  deleteMeetingBuilding,
  deleteMeetingRoom,
  deleteMeetingSite,
  getMeetingBuildings,
  getMeetingRooms,
  getMeetingSites,
  updateMeetingBuilding,
  updateMeetingRoom,
  updateMeetingSite,
} from '../../lib/admin-rooms'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()

const loading = ref(true)
const saving = ref(false)
const forbidden = ref(false)
const errorMessage = ref('')
const actionError = ref('')
const successMessage = ref('')

const rooms = ref([])
const sites = ref([])
const buildings = ref([])

const buildingFilter = ref('all')
const roomModal = ref(false)
const siteModal = ref(false)
const editingRoom = ref(null)

const roomForm = ref(createEmptyRoomForm())
const siteForm = ref({ siteName: '', buildingName: '' })
// 사이트 관리 모달 내 인라인 수정 상태. editingSite가 있으면 그 사이트 행이 수정 폼으로 바뀐다.
const editingSite = ref(null)
const siteEditForm = ref({ name: '', address: '' })

const isAdmin = computed(() => auth.user?.role === 'ADMIN')

const filteredRooms = computed(() =>
  buildingFilter.value === 'all'
    ? rooms.value
    : rooms.value.filter((room) => room.buildingId === buildingFilter.value),
)

// "사이트 - 건물" 목록(건물 단위). 데이터상 사이트는 1개여도 건물 수만큼 줄이 나온다(사이트명 반복).
const siteBuildingList = computed(() => {
  const siteNameOf = (siteId) => sites.value.find((site) => site.siteId === siteId)?.name || '-'
  return buildings.value
    .map((building) => ({
      buildingId: building.buildingId,
      siteId: building.siteId,
      siteName: siteNameOf(building.siteId),
      name: building.name,
    }))
    .sort((a, b) => a.siteName.localeCompare(b.siteName, 'ko') || a.name.localeCompare(b.name, 'ko'))
})

// 회의실 폼에서 선택한 사이트에 속한 건물 목록(직접 입력 시 자동완성/안내용).
const formBuildings = computed(() =>
  buildings.value.filter((building) => building.siteId === roomForm.value.siteId),
)

// 수정 폼(텍스트 입력)에서 입력한 건물명이 그 사이트의 기존 건물과 다른지 안내용으로 판단한다.
const isRenamedBuilding = computed(() => {
  if (!editingRoom.value) return false
  const name = roomForm.value.buildingName.trim()
  if (!name) return false
  return !formBuildings.value.some((building) => building.name === name)
})

watch(
  () => roomForm.value.siteId,
  () => {
    if (editingRoom.value) {
      // 수정 폼(텍스트): 사이트를 바꾸면 해당 사이트의 건물명으로 기본 채운다.
      if (formBuildings.value.some((building) => building.name === roomForm.value.buildingName.trim())) return
      roomForm.value.buildingName = formBuildings.value[0]?.name || ''
    } else {
      // 등록 폼(셀렉트): 사이트를 바꾸면 이전 건물 선택이 다른 사이트 소속일 수 있어 유효한 값만 유지한다.
      if (formBuildings.value.some((building) => building.buildingId === roomForm.value.buildingId)) return
      roomForm.value.buildingId = formBuildings.value[0]?.buildingId || ''
    }
  },
)

onMounted(() => {
  loadPage()
})

async function loadPage() {
  if (!isAdmin.value) {
    forbidden.value = true
    loading.value = false
    return
  }

  loading.value = true
  await reloadAllData()
  loading.value = false
}

async function reloadAllData() {
  forbidden.value = false
  errorMessage.value = ''

  try {
    const [siteData, buildingData, roomData] = await Promise.all([
      getMeetingSites(),
      getMeetingBuildings(),
      fetchAllRooms(),
    ])

    sites.value = (siteData || []).map(normalizeSite)
    buildings.value = (buildingData || []).map(normalizeBuilding)
    rooms.value = roomData.map(normalizeRoom)
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      return
    }

    errorMessage.value =
      error?.message || '회의실 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
  }
}

// 회의실 목록은 페이지네이션 응답이므로 관리 화면에서는 전체 페이지를 모아서 보여준다.
async function fetchAllRooms() {
  const all = []
  let page = 1
  const size = 100

  // 페이지 수가 늘어나도 무한 루프에 빠지지 않도록 totalPages를 기준으로 종료한다.
  while (true) {
    const data = await getMeetingRooms({ page, size })
    const items = data?.items || []
    all.push(...items)

    const totalPages = data?.totalPages || 1
    if (page >= totalPages || items.length === 0) break
    page += 1
  }

  return all
}

function roomCountByBuilding(buildingId) {
  return rooms.value.filter((room) => room.buildingId === buildingId).length
}

function openCreateRoom() {
  editingRoom.value = null
  actionError.value = ''
  successMessage.value = ''

  const firstSiteId = sites.value[0]?.siteId || ''
  const firstBuilding = buildings.value.find((building) => building.siteId === firstSiteId)

  roomForm.value = {
    name: '',
    siteId: firstSiteId,
    buildingId: firstBuilding?.buildingId || '',
    buildingName: '',
    floor: 1,
    capacity: 6,
    isAvailable: true,
  }
  roomModal.value = true
}

function openEditRoom(room) {
  editingRoom.value = room
  actionError.value = ''
  successMessage.value = ''

  roomForm.value = {
    name: room.name || '',
    siteId: room.siteId || '',
    buildingId: room.buildingId || '',
    buildingName: room.buildingName === '-' ? '' : room.buildingName || '',
    floor: room.floor ?? '',
    capacity: room.capacity ?? 0,
    isAvailable: room.isAvailable,
  }
  roomModal.value = true
}

function closeRoomModal() {
  roomModal.value = false
}

function openSiteModal() {
  actionError.value = ''
  successMessage.value = ''
  siteForm.value = { siteName: '', buildingName: '' }
  editingSite.value = null
  siteModal.value = true
}

function closeSiteModal() {
  siteModal.value = false
  editingSite.value = null
}

// 사이트 행의 '수정' → 그 행을 인라인 수정 폼으로 전환(이름·주소 채움).
function openEditSite(site) {
  actionError.value = ''
  successMessage.value = ''
  editingSite.value = site
  siteEditForm.value = {
    name: site.name && site.name !== '-' ? site.name : '',
    address: site.address || '',
  }
}

function cancelEditSite() {
  editingSite.value = null
  actionError.value = ''
}

// 사이트 수정 저장. name(필수)·address(선택)만 PATCH → siteId 유지라 건물·회의실 관계는 그대로.
// 성공 시 전체 재조회로 회의실 목록의 사이트 컬럼·상단 필터 칩에도 바뀐 이름이 반영된다.
async function saveSiteEdit() {
  if (saving.value || !editingSite.value) return
  const name = siteEditForm.value.name.trim()
  if (!name) {
    actionError.value = '사이트명을 입력해 주세요.'
    return
  }

  saving.value = true
  actionError.value = ''
  successMessage.value = ''

  try {
    await updateMeetingSite(editingSite.value.siteId, {
      name,
      address: siteEditForm.value.address.trim(),
    })
    successMessage.value = '사이트 정보를 수정했습니다.'
    editingSite.value = null
    await reloadAllData()
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      closeSiteModal()
      return
    }

    actionError.value = error?.message || '사이트 수정에 실패했습니다.'
  } finally {
    saving.value = false
  }
}

// 특정 사이트에 속한 건물 목록(사이트 관리 모달에서 사이트별로 건물·삭제 버튼을 보여주기 위함).
function buildingsOfSite(siteId) {
  return buildings.value.filter((building) => building.siteId === siteId)
}

// 사이트 삭제. 하위 건물이 있으면 백엔드가 차단하므로 프론트에서 먼저 막아 명확히 안내한다.
async function removeSite(site) {
  if (saving.value) return

  const childBuildings = buildingsOfSite(site.siteId)
  if (childBuildings.length) {
    actionError.value = `'${site.name}' 사이트에 건물이 ${childBuildings.length}개 있어 삭제할 수 없습니다. 건물을 먼저 삭제하세요.`
    return
  }
  if (!window.confirm(`'${site.name}' 사이트를 삭제하시겠습니까?`)) return

  saving.value = true
  actionError.value = ''
  successMessage.value = ''

  try {
    await deleteMeetingSite(site.siteId)
    successMessage.value = '사이트를 삭제했습니다.'
    if (editingSite.value?.siteId === site.siteId) editingSite.value = null
    await reloadAllData()
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      closeSiteModal()
      return
    }

    actionError.value = error?.message || '사이트 삭제에 실패했습니다.'
  } finally {
    saving.value = false
  }
}

// 건물 삭제. 하위 회의실이 있으면 백엔드가 차단하므로 프론트에서 먼저 막아 명확히 안내한다.
async function removeBuilding(building) {
  if (saving.value) return

  const roomCount = roomCountByBuilding(building.buildingId)
  if (roomCount) {
    actionError.value = `'${building.name}' 건물에 회의실이 ${roomCount}개 있어 삭제할 수 없습니다. 회의실을 먼저 삭제하세요.`
    return
  }
  if (!window.confirm(`'${building.name}' 건물을 삭제하시겠습니까?`)) return

  saving.value = true
  actionError.value = ''
  successMessage.value = ''

  try {
    await deleteMeetingBuilding(building.buildingId)
    successMessage.value = '건물을 삭제했습니다.'
    await reloadAllData()
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      closeSiteModal()
      return
    }

    actionError.value = error?.message || '건물 삭제에 실패했습니다.'
  } finally {
    saving.value = false
  }
}

async function saveRoom() {
  if (saving.value) return

  const siteId = roomForm.value.siteId
  if (!siteId) {
    actionError.value = '사이트를 먼저 선택해 주세요.'
    return
  }

  // 등록 폼은 셀렉트로 기존 건물을 고르고, 수정 폼은 텍스트로 건물명을 직접 바꾼다.
  if (editingRoom.value) {
    if (!roomForm.value.buildingName.trim()) {
      actionError.value = '건물명을 입력해 주세요.'
      return
    }
  } else if (!roomForm.value.buildingId) {
    actionError.value = '건물을 선택해 주세요. 사이트에 건물이 없으면 사이트/건물을 추가하세요.'
    return
  }

  saving.value = true
  actionError.value = ''
  successMessage.value = ''

  try {
    const buildingId = editingRoom.value
      ? await resolveEditBuildingId(siteId, roomForm.value.buildingName.trim())
      : roomForm.value.buildingId

    const rawFloor = roomForm.value.floor
    const floorValue = rawFloor === '' || rawFloor === null || rawFloor === undefined ? null : Number(rawFloor)
    const payload = {
      buildingId,
      name: roomForm.value.name.trim(),
      floor: floorValue,
      capacity: Number(roomForm.value.capacity),
    }

    if (editingRoom.value) {
      await updateMeetingRoom(editingRoom.value.roomId, payload)
      // 운영 상태는 별도 엔드포인트로 관리되므로 값이 바뀐 경우에만 추가 호출한다.
      if (roomForm.value.isAvailable !== editingRoom.value.isAvailable) {
        await changeMeetingRoomAvailability(editingRoom.value.roomId, roomForm.value.isAvailable)
      }
      successMessage.value = '회의실 정보를 수정했습니다.'
    } else {
      await createMeetingRoom({ ...payload, isAvailable: roomForm.value.isAvailable })
      successMessage.value = '회의실을 등록했습니다.'
    }

    closeRoomModal()
    await reloadAllData()
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      closeRoomModal()
      return
    }

    actionError.value = error?.message || '저장에 실패했습니다.'
  } finally {
    saving.value = false
  }
}

// 수정 폼에서 건물명 텍스트를 buildingId로 해석한다.
// - 그대로면 기존 건물 유지 / 같은 사이트에 동일 이름 건물이 있으면 그쪽으로 이동
// - 같은 사이트에서 이름만 바뀌면 그 건물 레코드 이름을 변경(rename, 행 추가 없음)
// - 사이트가 바뀌어 대상 건물이 없을 때만 새로 생성
async function resolveEditBuildingId(siteId, buildingName) {
  const current = buildings.value.find((building) => building.buildingId === editingRoom.value.buildingId)

  if (current && current.siteId === siteId && current.name === buildingName) {
    return current.buildingId
  }

  const sameNameBuilding = buildings.value.find(
    (building) => building.siteId === siteId && building.name === buildingName,
  )
  if (sameNameBuilding) return sameNameBuilding.buildingId

  if (current && current.siteId === siteId) {
    await updateMeetingBuilding(current.buildingId, { siteId, name: buildingName })
    return current.buildingId
  }

  const created = await createMeetingBuilding({ siteId, name: buildingName })
  return created.buildingId
}

async function removeRoom(room) {
  if (saving.value) return
  // 삭제는 되돌릴 수 없으므로 한 번 확인한다.
  if (!window.confirm(`'${room.name}' 회의실을 삭제하시겠습니까?`)) return

  actionError.value = ''
  successMessage.value = ''

  try {
    await deleteMeetingRoom(room.roomId)
    successMessage.value = '회의실을 삭제했습니다.'
    await reloadAllData()
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      return
    }

    actionError.value = error?.message || '삭제에 실패했습니다.'
  }
}

async function saveSite() {
  if (saving.value) return

  const siteName = siteForm.value.siteName.trim()
  const buildingName = siteForm.value.buildingName.trim()
  if (!siteName || !buildingName) {
    actionError.value = '사이트명과 건물명을 입력해 주세요.'
    return
  }

  saving.value = true
  actionError.value = ''
  successMessage.value = ''

  try {
    // 같은 이름의 사이트가 이미 있으면 그 사이트를 재사용하고 건물만 추가한다(중복 사이트 생성 방지).
    // 없으면 사이트+건물을 한 번에 새로 만든다.
    const existingSite = sites.value.find(
      (site) => site.name.trim().toLowerCase() === siteName.toLowerCase(),
    )
    if (existingSite) {
      await createMeetingBuilding({ siteId: existingSite.siteId, name: buildingName })
      successMessage.value = `'${existingSite.name}' 사이트에 '${buildingName}' 건물을 추가했습니다.`
    } else {
      await createSiteWithBuilding({ siteName, buildingName })
      successMessage.value = '사이트와 건물을 추가했습니다.'
    }
    closeSiteModal()
    await reloadAllData()
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      closeSiteModal()
      return
    }

    actionError.value = error?.message || '추가에 실패했습니다.'
  } finally {
    saving.value = false
  }
}

function createEmptyRoomForm() {
  return { name: '', siteId: '', buildingId: '', buildingName: '', floor: 1, capacity: 6, isAvailable: true }
}

function normalizeRoom(item) {
  return {
    roomId: item?.roomId || '',
    name: item?.name || '-',
    siteId: item?.siteId || '',
    siteName: item?.siteName || '-',
    buildingId: item?.buildingId || '',
    buildingName: item?.buildingName || '-',
    floor: item?.floor ?? null,
    capacity: item?.capacity ?? 0,
    // 목록 응답은 isAvailable, 일부 응답은 available 키를 쓰므로 둘 다 허용한다.
    isAvailable: (item?.isAvailable ?? item?.available) !== false,
  }
}

function normalizeSite(item) {
  return {
    siteId: item?.siteId || '',
    name: item?.name || '-',
    address: item?.address || '',
  }
}

function normalizeBuilding(item) {
  return {
    buildingId: item?.buildingId || '',
    siteId: item?.siteId || '',
    name: item?.name || '-',
  }
}
</script>

<template>
  <section class="page admin-page">
    <header class="page-header rooms-header">
      <div>
        <h1>회의실 관리</h1>
        <p>사이트·건물을 등록하고 회의실 운영 상태를 관리합니다.</p>
      </div>
      <div class="admin-actions">
        <ActionButton variant="secondary" @click="openSiteModal">사이트/건물 추가</ActionButton>
        <ActionButton variant="primary" @click="openCreateRoom">회의실 등록</ActionButton>
      </div>
    </header>

    <article v-if="loading" class="card empty-state">회의실 데이터를 불러오는 중입니다.</article>

    <article v-else-if="forbidden" class="card empty-state">
      <h2>접근 권한 없음</h2>
      <p>이 화면은 관리자 계정만 확인할 수 있습니다.</p>
    </article>

    <article v-else-if="errorMessage" class="card">
      <div class="error-box">{{ errorMessage }}</div>
      <div class="admin-actions retry-actions">
        <ActionButton variant="secondary" @click="loadPage">다시 시도</ActionButton>
      </div>
    </article>

    <template v-else>
      <div v-if="successMessage" class="card feedback-card">
        <p class="settings-success">{{ successMessage }}</p>
      </div>

      <div v-if="actionError" class="card feedback-card">
        <div class="error-box">{{ actionError }}</div>
      </div>

      <article class="card admin-site-filter">
        <strong>사이트 / 건물</strong>
        <div class="toolbar">
          <button
            class="chip admin-room-filter-chip"
            :class="{ active: buildingFilter === 'all' }"
            type="button"
            @click="buildingFilter = 'all'"
          >
            전체 ({{ rooms.length }}실)
          </button>
          <button
            v-for="building in siteBuildingList"
            :key="building.buildingId"
            class="chip admin-room-filter-chip"
            :class="{ active: buildingFilter === building.buildingId }"
            type="button"
            @click="buildingFilter = buildingFilter === building.buildingId ? 'all' : building.buildingId"
          >
            {{ building.siteName }} - {{ building.name }} ({{ roomCountByBuilding(building.buildingId) }}실)
          </button>
        </div>
      </article>

      <div class="table-card admin-data-table">
        <table>
          <thead>
            <tr>
              <th>회의실</th>
              <th>사이트</th>
              <th>건물</th>
              <th>층</th>
              <th>정원</th>
              <th>상태</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="room in filteredRooms" :key="room.roomId">
              <td>{{ room.name }}</td>
              <td>{{ room.siteName }}</td>
              <td>{{ room.buildingName }}</td>
              <td>{{ room.floor === null ? '-' : `${room.floor}F` }}</td>
              <td>{{ room.capacity }}명</td>
              <td>
                <span :class="['badge', 'admin-room-status-badge', room.isAvailable ? 'success' : 'warning']">
                  {{ room.isAvailable ? '운영 중' : '사용 제한' }}
                </span>
              </td>
              <td class="admin-room-action-cell">
                <button class="icon-text admin-room-action-button" type="button" @click="openEditRoom(room)">수정</button>
                <button class="icon-text danger admin-room-action-button admin-room-action-button--danger" type="button" @click="removeRoom(room)">삭제</button>
              </td>
            </tr>
            <tr v-if="!filteredRooms.length">
              <td colspan="7" class="empty-state-inline">표시할 회의실이 없습니다.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <ModalShell v-if="roomModal" modal-class="admin-modal" @close="closeRoomModal">
        <header class="admin-modal-header">
          <div class="admin-modal-title">
            <h2>{{ editingRoom ? '회의실 정보 수정' : '회의실 등록' }}</h2>
            <p class="admin-modal-subtitle">회의실 이름과 위치, 정원·운영 상태를 입력해 주세요.</p>
          </div>
          <button type="button" class="admin-modal-close" @click="closeRoomModal">닫기</button>
        </header>
        <form class="admin-modal-form" @submit.prevent="saveRoom">
          <div class="admin-modal-body">
            <p v-if="actionError" class="admin-modal-inline-error">{{ actionError }}</p>
            <label>회의실 이름<input v-model="roomForm.name" required></label>
            <div class="form-row two">
              <label>
                사이트
                <AppSelect v-model="roomForm.siteId">
                  <option v-for="site in sites" :key="site.siteId" :value="site.siteId">{{ site.name }}</option>
                </AppSelect>
              </label>
              <label>
                건물
                <AppSelect v-if="!editingRoom" v-model="roomForm.buildingId">
                  <option v-for="building in formBuildings" :key="building.buildingId" :value="building.buildingId">
                    {{ building.name }}
                  </option>
                </AppSelect>
                <input v-else v-model="roomForm.buildingName" placeholder="건물명 입력">
              </label>
            </div>
            <p v-if="!editingRoom && !formBuildings.length" class="admin-modal-note">
              선택한 사이트에 등록된 건물이 없습니다. 먼저 사이트/건물을 추가하세요.
            </p>
            <p v-else-if="isRenamedBuilding" class="admin-modal-note">
              건물 이름이 '{{ roomForm.buildingName.trim() }}'(으)로 변경됩니다 (해당 건물을 쓰는 다른 회의실에도 반영).
            </p>
            <div class="form-row two">
              <label>층<input type="number" v-model.number="roomForm.floor"></label>
              <label>정원<input type="number" min="1" v-model.number="roomForm.capacity"></label>
            </div>
            <label class="admin-toggle-row">
              <span>운영 중</span>
              <input type="checkbox" v-model="roomForm.isAvailable">
            </label>
          </div>
          <footer class="admin-modal-footer">
            <div class="admin-modal-actions-left"></div>
            <div class="admin-modal-actions-right">
              <ActionButton variant="secondary" type="button" @click="closeRoomModal">취소</ActionButton>
              <ActionButton variant="primary" type="submit" :disabled="saving">{{ saving ? '저장 중...' : '저장' }}</ActionButton>
            </div>
          </footer>
        </form>
      </ModalShell>

      <ModalShell v-if="siteModal" modal-class="admin-modal" @close="closeSiteModal">
        <header class="admin-modal-header">
          <div class="admin-modal-title">
            <h2>사이트 / 건물 관리</h2>
            <p class="admin-modal-subtitle">사이트와 건물을 추가하거나 기존 항목을 수정·삭제합니다.</p>
          </div>
          <button type="button" class="admin-modal-close" @click="closeSiteModal">닫기</button>
        </header>

        <div class="admin-modal-body">
          <!-- 모달 안 에러 표시(페이지 상단 피드백은 모달 뒤라 안 보이므로). -->
          <p v-if="actionError" class="admin-modal-inline-error">{{ actionError }}</p>

          <!-- 사이트/건물 추가(기존 기능 유지) -->
          <form class="site-add-form" @submit.prevent="saveSite">
            <div class="form-row two">
              <label>사이트<input v-model="siteForm.siteName" required placeholder="예: 판교"></label>
              <label>건물<input v-model="siteForm.buildingName" required placeholder="예: 본관"></label>
            </div>
            <div class="admin-modal-actions-right">
              <ActionButton variant="secondary" type="button" @click="closeSiteModal">취소</ActionButton>
              <ActionButton variant="primary" type="submit" :disabled="saving">{{ saving ? '추가 중...' : '추가' }}</ActionButton>
            </div>
          </form>

          <!-- 사이트 목록 + 인라인 수정 -->
          <div class="site-manage">
            <h3 class="site-manage-title">사이트 목록</h3>
            <p v-if="!sites.length" class="empty-text">등록된 사이트가 없습니다.</p>
            <ul v-else class="site-manage-list">
              <li v-for="site in sites" :key="site.siteId" class="site-item">
                <div class="site-row">
                  <form
                    v-if="editingSite && editingSite.siteId === site.siteId"
                    class="site-edit-form"
                    @submit.prevent="saveSiteEdit"
                  >
                    <input v-model="siteEditForm.name" required placeholder="사이트명">
                    <input v-model="siteEditForm.address" placeholder="주소(선택)">
                    <button class="primary-button small" type="submit" :disabled="saving">{{ saving ? '저장 중...' : '저장' }}</button>
                    <button class="secondary-button small" type="button" @click="cancelEditSite">취소</button>
                  </form>
                  <template v-else>
                    <div class="site-row-info">
                      <strong>{{ site.name }}</strong>
                      <span class="site-row-address">{{ site.address || '주소 미등록' }}</span>
                    </div>
                    <div class="site-row-actions">
                      <button class="secondary-button small" type="button" @click="openEditSite(site)">수정</button>
                      <button class="secondary-button small danger" type="button" :disabled="saving" @click="removeSite(site)">삭제</button>
                    </div>
                  </template>
                </div>

                <!-- 사이트별 건물 목록 + 삭제. 사이트를 지우려면 건물을 먼저 비워야 하므로 함께 관리한다. -->
                <ul class="building-sublist">
                  <li
                    v-for="building in buildingsOfSite(site.siteId)"
                    :key="building.buildingId"
                    class="building-row"
                  >
                    <span class="building-name">{{ building.name }}</span>
                    <span class="building-room-count">회의실 {{ roomCountByBuilding(building.buildingId) }}개</span>
                    <button class="secondary-button small danger" type="button" :disabled="saving" @click="removeBuilding(building)">삭제</button>
                  </li>
                  <li v-if="!buildingsOfSite(site.siteId).length" class="building-empty">등록된 건물이 없습니다.</li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </ModalShell>
    </template>
  </section>
</template>

<style scoped>
/* 사이트/건물 추가 폼(모달 본문 안, 사이트 목록 위) */
.site-add-form {
  display: grid;
  gap: 14px;
}
.site-add-form .admin-modal-actions-right {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* 성공/에러 알림 카드 */
.feedback-card {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  padding: 8px;
}

/* 알림 메시지(성공 p·에러 box) */
.feedback-card > * {
  margin: 0 !important;
}


.admin-data-table table {
  table-layout: fixed;
}
.admin-data-table th:nth-child(1), .admin-data-table td:nth-child(1) { width: 24%; } /* 회의실 */
.admin-data-table th:nth-child(2), .admin-data-table td:nth-child(2) { width: 15%; } /* 사이트 */
.admin-data-table th:nth-child(3), .admin-data-table td:nth-child(3) { width: 15%; } /* 건물 */
.admin-data-table th:nth-child(4), .admin-data-table td:nth-child(4) { width: 8%; }  /* 층 */
.admin-data-table th:nth-child(5), .admin-data-table td:nth-child(5) { width: 8%; }  /* 정원 */
.admin-data-table th:nth-child(6), .admin-data-table td:nth-child(6) { width: 14%; } /* 상태 */
.admin-data-table th:nth-child(7), .admin-data-table td:nth-child(7) { width: 16%; } /* 액션 */

.admin-room-filter-chip,
.admin-room-status-badge,
.admin-room-action-button {
  min-height: 32px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
}

.admin-room-filter-chip {
  padding: 0 12px;
}

.admin-room-filter-chip.active {
  box-shadow: 0 6px 16px rgba(241, 101, 33, 0.12);
}

.admin-room-status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 74px;
  padding: 0 12px;
}

.admin-room-action-cell {
  white-space: nowrap;
}

.admin-room-action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  border: 1px solid rgba(241, 101, 33, 0.16);
  background: rgba(255, 237, 213, 0.82);
  color: var(--primary-dark);
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}

.admin-room-action-button:hover {
  background: rgba(255, 237, 213, 1);
  border-color: rgba(241, 101, 33, 0.28);
  color: var(--primary);
  box-shadow: 0 6px 16px rgba(241, 101, 33, 0.12);
}

.admin-room-action-button + .admin-room-action-button {
  margin-left: 8px;
}

.admin-room-action-button--danger {
  border-color: rgba(220, 38, 38, 0.14);
  background: rgba(254, 226, 226, 0.9);
  color: var(--danger);
}

.admin-room-action-button--danger:hover {
  background: #fee2e2;
  border-color: rgba(220, 38, 38, 0.24);
  color: #b91c1c;
  box-shadow: 0 6px 16px rgba(220, 38, 38, 0.1);
}

/* 운영 중 토글: 본문 라벨은 기본 grid(세로)라, 라벨+체크박스를 한 줄로 정렬하도록 덮어씀 */
.admin-modal-body > label.admin-toggle-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
}
/* 본문 input 공통 규칙(width:100%; min-height:40px)이 체크박스에도 적용돼서 되돌림 */
.admin-toggle-row > input[type='checkbox'] {
  width: 16px;
  height: 16px;
  min-height: 0;
  flex: 0 0 auto;
  margin: 0;
  cursor: pointer;
}

/* 사이트 관리(추가 폼 아래 사이트 목록 + 인라인) */
.site-manage {
  margin-top: 4px;
  border-top: 1px solid var(--border);
  padding-top: 16px;
}
.site-manage-title {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 700;
}
.site-manage-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.site-item {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 10px;
}
.site-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.site-row-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.site-row-address {
  color: var(--muted-foreground);
  font-size: 12px;
}
.site-row-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

/* 사이트별 건물 목록(삭제 버튼 포함) */
.building-sublist {
  list-style: none;
  margin: 8px 0 0;
  padding: 8px 0 0;
  border-top: 1px dashed var(--border);
  display: grid;
  gap: 6px;
}
.building-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 10px;
}
.building-name {
  font-size: 13px;
  font-weight: 600;
}
.building-room-count {
  color: var(--muted-foreground);
  font-size: 12px;
  margin-left: auto;
}
.building-empty {
  padding-left: 10px;
  color: var(--muted-foreground);
  font-size: 12px;
}

/* 위험(삭제) 버튼 */
.secondary-button.danger {
  color: var(--destructive, #dc2626);
  border-color: var(--destructive, #dc2626);
}
.site-edit-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  width: 100%;
}
.site-edit-form input {
  flex: 1 1 120px;
  min-width: 0;
}
/* 행 버튼은 컴팩트하게(.small 유무와 무관) */
.site-row .secondary-button,
.building-row .secondary-button,
.site-edit-form button {
  padding: 6px 12px;
  font-size: 13px;
}
</style>
