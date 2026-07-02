<template>
  <section v-if="shouldShowMeetingEndedScreen" class="meeting-ended-page">
    <div class="meeting-ended-card">
      <span class="badge muted meeting-ended-badge">회의 종료</span>
      <h1>{{ meetingTitle }}</h1>
      <p>{{ meetingEndedScreenMessage }}</p>
      <div class="guest-link-actions">
        <button class="secondary-button" type="button" @click="goToMeetingsPage">
          회의 목록으로 이동
        </button>
        <button class="secondary-button" type="button" @click="closeMeetingPage">
          창 닫기
        </button>
        <button
          v-if="auth.isAuthenticated"
          class="primary-button"
          type="button"
          @click="goToMinutesPage"
        >
          회의록 화면으로 이동
        </button>
      </div>
    </div>
  </section>

  <section v-else-if="inLobby" class="meeting-lobby">
    <header class="meeting-lobby-header">
      <RouterLink to="/app/meetings" class="brand meeting-lobby-brand">
        <span class="brand-mark">M</span>
        <span>Meetbowl</span>
      </RouterLink>
      <div class="meeting-lobby-actions">
        <button class="meeting-lobby-top-action" type="button" @click="openGuestLinkDialog">
          <MessageSquareShare :size="16" />
          공유
        </button>
        <button class="meeting-lobby-top-action" type="button" @click="closeMeetingPage">
          <LogOut :size="16" />
          대기실 나가기
        </button>
      </div>
    </header>

    <main class="meeting-lobby-main">
      <div class="meeting-lobby-intro">
        <span class="badge danger">진행 중</span>
        <h1>{{ meetingTitle }}</h1>
        <p>카메라와 오디오를 확인한 뒤 회의에 입장하세요.</p>
      </div>

      <div class="meeting-lobby-grid">
        <section class="meeting-preview-panel">
          <header class="meeting-panel-header">
            <h2><Video :size="18" /> 카메라 미리보기</h2>
          </header>
          <div class="camera-preview meeting-camera-preview">
            <video
              v-show="cam && hasVideoTrack"
              ref="previewVideo"
              autoplay
              muted
              playsinline
            />
            <div v-if="!cam || !hasVideoTrack" class="camera-placeholder">
              <span>{{ currentParticipantInitial }}</span>
              <p>{{ cameraPlaceholder }}</p>
            </div>

            <button type="button" class="preview-capture-button" aria-label="카메라 미리보기">
              <Camera :size="18" />
            </button>
            <span class="preview-participant-name">{{ currentParticipantName }}</span>

            <div class="preview-controls">
              <button
                type="button"
                class="media-control"
                :class="{ off: !mic }"
                :aria-pressed="mic"
                @click="toggleMicrophone"
              >
                <component :is="mic ? Mic : MicOff" :size="16" />
                {{ mic ? '마이크 켜짐' : '마이크 꺼짐' }}
              </button>
              <button
                type="button"
                class="media-control"
                :class="{ off: !cam }"
                :aria-pressed="cam"
                @click="toggleCamera"
              >
                <component :is="cam ? Video : VideoOff" :size="16" />
                {{ cam ? '카메라 켜짐' : '카메라 꺼짐' }}
              </button>
            </div>
          </div>

          <p v-if="deviceStatus" class="device-status" :class="{ error: deviceError }">
            {{ deviceStatus }}
          </p>
        </section>

        <aside class="meeting-device-panel">
          <audio ref="speakerTestAudio" autoplay playsinline class="sr-only-audio" />

          <div class="device-panel-heading">
            <div>
              <h2><Settings2 :size="18" /> 입장 설정</h2>
              <p>현재 기기에 연결된 장치를 선택하세요.</p>
            </div>
            <button
              type="button"
              class="secondary-button small meeting-device-refresh"
              :disabled="loadingDevices"
              @click="initializeDevices"
            >
              <RefreshCw :size="15" />
              {{ loadingDevices ? '검색 중' : '새로고침' }}
            </button>
          </div>

          <div class="device-fields meeting-device-fields">
            <div class="meeting-device-two-column">
            <label>
              표시 이름
              <input
                v-model="displayName"
                maxlength="30"
                autocomplete="name"
                placeholder="회의에서 표시할 이름"
              >
            </label>

            <label>
              마이크
              <AppSelect
                v-model="selectedAudioInput"
                :disabled="!audioInputs.length || loadingDevices"
                @change="restartPreview"
              >
                <option v-if="!audioInputs.length" value="">마이크를 찾을 수 없음</option>
                <option v-for="device in audioInputs" :key="device.deviceId" :value="device.deviceId">
                  {{ device.label }}
                </option>
              </AppSelect>
            </label>
            </div>

            <div class="microphone-test">
              <div class="microphone-test-heading">
                <div>
                  <strong>마이크/스피커 테스트</strong>
                  <small>{{ audioTestMessage }}</small>
                </div>
                <button
                  type="button"
                  class="secondary-button small"
                  :disabled="!hasAudioTrack || !mic"
                  @click="toggleAudioTest"
                >
                  {{ testingAudio ? '테스트 중지' : '테스트 시작' }}
                </button>
              </div>
              <div
                class="microphone-level"
                role="meter"
                aria-label="마이크 입력 레벨"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-valuenow="microphoneLevel"
              >
                <span :style="{ width: `${microphoneLevel}%` }" />
              </div>
              <p class="audio-test-tip">스피커 확인은 이어폰을 연결한 상태에서 테스트하는 편이 안정적입니다.</p>
            </div>

            <div class="meeting-device-two-column">
              <label>
                스피커
                <AppSelect
                  v-model="selectedAudioOutput"
                  :disabled="!audioOutputs.length || !supportsSpeakerSelection"
                  @change="applySpeaker"
                >
                  <option v-if="!audioOutputs.length" value="">기본 스피커</option>
                  <option v-for="device in audioOutputs" :key="device.deviceId" :value="device.deviceId">
                    {{ device.label }}
                  </option>
                </AppSelect>
                <small v-if="!supportsSpeakerSelection">
                  이 브라우저에서는 스피커 선택을 지원하지 않습니다.
                </small>
              </label>

              <label>
                카메라
                <AppSelect
                  v-model="selectedVideoInput"
                  :disabled="!videoInputs.length || loadingDevices"
                  @change="restartPreview"
                >
                  <option v-if="!videoInputs.length" value="">카메라를 찾을 수 없음</option>
                  <option v-for="device in videoInputs" :key="device.deviceId" :value="device.deviceId">
                    {{ device.label }}
                  </option>
                </AppSelect>
              </label>
            </div>
          </div>

          <button
            class="primary-button meeting-enter-button"
            type="button"
            :disabled="loadingDevices || connectingMeeting"
            @click="enterMeeting"
          >
            {{ connectingMeeting ? '회의 연결 중' : '회의 입장' }}
          </button>
        </aside>
      </div>
    </main>
  </section>

  <section
    v-else
    ref="meetingRoomShell"
    class="meeting-room"
    :class="{
      'meeting-room-side-collapsed': isMeetingSideCollapsed,
      'meeting-room-focus-view': isFocusMode,
    }"
  >
    <div class="meeting-main">
      <header class="meeting-room-header">
        <div class="meeting-room-title">
          <strong>{{ meetingTitle }}</strong>
          <div class="meeting-room-status-line">
            <span class="meeting-connection-pill" :class="meetingConnectionTone">
              {{ meetingConnectionStatus }}
            </span>
            <small>{{ participantCount }}명 참여</small>
            <small>{{ elapsedTimeLabel }}</small>
          </div>
        </div>
        <div class="meeting-room-actions">
          <span v-if="isCurrentUserHost" class="meeting-host-badge">관리자</span>
          <span v-if="screenShareEnabled" class="meeting-top-indicator active">내 화면 공유 중</span>
          <span v-else-if="activeScreenShareParticipant" class="meeting-top-indicator">
            {{ activeScreenShareParticipant.name }} 화면 공유 중
          </span>
        </div>
      </header>

      <div class="meeting-stage-shell">
        <p v-if="meetingConnectionError || screenShareControlHint" class="meeting-control-hint meeting-control-hint-floating">
          {{ meetingConnectionError || screenShareControlHint }}
        </p>

        <div
          v-if="meetingLayoutMode === 'grid'"
          class="video-grid-shell"
          :style="meetingGridStyle"
        >
          <div class="video-grid" :style="meetingGridStyle">
            <article
              v-for="tile in gridTiles"
              :key="tile.key"
              :ref="setTileRef(tile.key)"
              class="video-tile"
              :class="{
                'video-tile-screen': tile.type === 'screen',
                'video-tile-local': tile.isLocal,
                'video-tile-placeholder': !tile.track,
                'video-tile-fullscreen': isTileFullscreen(tile.key),
              }"
              @click="toggleTileFocus(tile.key)"
            >
              <video
                v-if="tile.track"
                :ref="setTileMediaRef(tile.key)"
                autoplay
                playsinline
                :muted="tile.isLocal"
              />
              <div v-else class="video-placeholder">
                <span>{{ tile.initials }}</span>
                <p>{{ tile.placeholder }}</p>
              </div>

              <div class="video-tile-badge-row">
                <span v-if="tile.type === 'screen'" class="video-badge accent">화면 공유</span>
                <span v-if="tile.isLocal" class="video-badge">나</span>
                <span v-if="tile.muted" class="video-badge muted">음소거</span>
              </div>
              <div v-if="tile.type === 'screen'" class="video-stage-actions">
                <button
                  class="video-stage-action-button"
                  type="button"
                  :title="isTileFullscreen(tile.key) ? '전체화면 종료' : '공유 화면 전체화면'"
                  :aria-label="isTileFullscreen(tile.key) ? '전체화면 종료' : '공유 화면 전체화면'"
                  @click.stop="toggleSharedScreenFullscreen(tile.key)"
                >
                  <Fullscreen :size="16" />
                </button>
              </div>
              <em>{{ tile.label }}</em>
            </article>
          </div>

          <div v-if="totalGridPages > 1" class="meeting-grid-pagination" aria-label="참여자 화면 페이지 이동">
            <button
              type="button"
              :disabled="currentGridPage === 0"
              @click="goToPreviousGridPage"
            >
              <ChevronLeft :size="16" />
              <span>이전</span>
            </button>
            <strong>{{ currentGridPage + 1 }} / {{ totalGridPages }}</strong>
            <button
              type="button"
              :disabled="currentGridPage >= totalGridPages - 1"
              @click="goToNextGridPage"
            >
              <span>다음</span>
              <ChevronRight :size="16" />
            </button>
          </div>
        </div>

        <div
          v-else
          class="meeting-stage-layout"
          :class="{
            'meeting-stage-layout-screen-share': meetingLayoutMode === 'screen-share',
            'meeting-stage-layout-focus': meetingLayoutMode === 'focus',
            'meeting-stage-layout-filmstrip-hidden': !shouldRenderFilmstrip,
          }"
        >
          <section class="meeting-stage-column">
            <button
              v-if="isFocusMode && !shouldRenderFilmstrip"
              class="filmstrip-handle filmstrip-handle-open"
              type="button"
              @click.stop="openFocusFilmstrip"
              aria-label="다른 참석자 화면 열기"
            >
              <ChevronRight :size="18" />
            </button>

            <article
              v-if="stageTile"
              :key="stageTile.key"
              :ref="setTileRef(stageTile.key)"
              class="video-tile video-tile-stage"
              :class="{
                'video-tile-screen': stageTile.type === 'screen',
                'video-tile-local': stageTile.isLocal,
                'video-tile-placeholder': !stageTile.track,
                'video-tile-selected': isFocusMode,
                'video-tile-fullscreen': isTileFullscreen(stageTile.key),
              }"
              @click="toggleTileFocus(stageTile.key)"
            >
              <video
                v-if="stageTile.track"
                :ref="setTileMediaRef(stageTile.key)"
                autoplay
                playsinline
                :muted="stageTile.isLocal"
              />
              <div v-else class="video-placeholder">
                <span>{{ stageTile.initials }}</span>
                <p>{{ stageTile.placeholder }}</p>
              </div>

              <div class="video-tile-badge-row">
                <span v-if="stageTile.type === 'screen'" class="video-badge accent">화면 공유</span>
                <span v-if="stageTile.isLocal" class="video-badge">나</span>
                <span v-if="stageTile.muted" class="video-badge muted">음소거</span>
              </div>
              <div v-if="stageTile.type === 'screen'" class="video-stage-actions">
                <button
                  class="video-stage-action-button"
                  type="button"
                  :title="isTileFullscreen(stageTile.key) ? '전체화면 종료' : '공유 화면 전체화면'"
                  :aria-label="isTileFullscreen(stageTile.key) ? '전체화면 종료' : '공유 화면 전체화면'"
                  @click.stop="toggleSharedScreenFullscreen(stageTile.key)"
                >
                  <Fullscreen :size="16" />
                </button>
              </div>
              <em>{{ stageTile.label }}</em>
            </article>
          </section>

          <aside v-if="shouldRenderFilmstrip" class="meeting-filmstrip">
            <button
              v-if="isFocusMode && canPageFilmstripBackward"
              class="filmstrip-page-button filmstrip-page-button-top"
              type="button"
              aria-label="이전 참석자 보기"
              @click.stop="showPreviousFilmstripPage"
            >
              <ChevronUp :size="18" />
            </button>
            <button
              v-if="isFocusMode"
              class="filmstrip-handle filmstrip-handle-close"
              type="button"
              @click.stop="showFilmstripInFocus = false"
              aria-label="다른 참석자 숨기기"
            >
              <ChevronLeft :size="18" />
            </button>

            <article
              v-for="tile in visibleFilmstripTiles"
              :key="tile.key"
              :ref="setTileRef(tile.key)"
              class="video-tile video-tile-filmstrip"
              :class="{
                'video-tile-screen': tile.type === 'screen',
                'video-tile-local': tile.isLocal,
                'video-tile-placeholder': !tile.track,
                'video-tile-selected': selectedTileKey === tile.key,
                'video-tile-fullscreen': isTileFullscreen(tile.key),
              }"
              @click="toggleTileFocus(tile.key)"
            >
              <video
                v-if="tile.track"
                :ref="setTileMediaRef(tile.key)"
                autoplay
                playsinline
                :muted="tile.isLocal"
              />
              <div v-else class="video-placeholder">
                <span>{{ tile.initials }}</span>
                <p>{{ tile.placeholder }}</p>
              </div>

              <div class="video-tile-badge-row">
                <span v-if="tile.type === 'screen'" class="video-badge accent">화면 공유</span>
                <span v-if="tile.isLocal" class="video-badge">나</span>
                <span v-if="tile.muted" class="video-badge muted">음소거</span>
              </div>
              <div v-if="tile.type === 'screen'" class="video-stage-actions">
                <button
                  class="video-stage-action-button"
                  type="button"
                  :title="isTileFullscreen(tile.key) ? '전체화면 종료' : '공유 화면 전체화면'"
                  :aria-label="isTileFullscreen(tile.key) ? '전체화면 종료' : '공유 화면 전체화면'"
                  @click.stop="toggleSharedScreenFullscreen(tile.key)"
                >
                  <Fullscreen :size="16" />
                </button>
              </div>
              <em>{{ tile.label }}</em>
            </article>
            <button
              v-if="isFocusMode && canPageFilmstripForward"
              class="filmstrip-page-button filmstrip-page-button-bottom"
              type="button"
              aria-label="다음 참석자 보기"
              @click.stop="showNextFilmstripPage"
            >
              <ChevronDown :size="18" />
            </button>
          </aside>
        </div>

        <div v-if="moreMenuOpen" class="meeting-more-menu">
          <button type="button" @click="openMeetingSettings">
            <Settings2 :size="16" />
            <span>장치 설정</span>
          </button>
          <button type="button" @click="openGuestLinkDialog">
            <MessageSquareShare :size="16" />
            <span>공유 링크</span>
          </button>
          <button
            v-if="isCurrentUserHost"
            type="button"
            @click="openHostTransferDialog"
          >
            <Users :size="16" />
            <span>회의 호스트 변경</span>
          </button>
          <button
            v-if="fullscreenTileKey"
            type="button"
            @click="exitMeetingFullscreen"
          >
            <Fullscreen :size="16" />
            <span>전체화면 종료</span>
          </button>
        </div>
      </div>

      <footer class="meeting-controls">
        <button
          class="control control-bar-button"
          :class="{ off: !mic }"
          :aria-label="mic ? '마이크 끄기' : '마이크 켜기'"
          :title="mic ? '마이크 끄기' : '마이크 켜기'"
          @click="toggleMicrophone"
        >
          <component :is="mic ? Mic : MicOff" :size="18" class="control-icon" />
          <span>음소거</span>
        </button>
        <button
          class="control control-bar-button"
          :class="{ off: !cam }"
          :aria-label="cam ? '카메라 끄기' : '카메라 켜기'"
          :title="cam ? '카메라 끄기' : '카메라 켜기'"
          @click="toggleCamera"
        >
          <component :is="cam ? Video : VideoOff" :size="18" class="control-icon" />
          <span>비디오</span>
        </button>
<!--        <button class="control control-bar-button" type="button" @click="openMeetingSettings">-->
<!--          <Settings2 :size="18" class="control-icon" />-->
<!--          <span>장치</span>-->
<!--        </button>-->
        <button
          class="control control-bar-button"
          :class="{ active: screenShareEnabled, off: screenShareToggleDisabled }"
          :disabled="screenShareToggleDisabled"
          @click="toggleScreenShare"
        >
          <component :is="screenShareEnabled ? ScreenShareOff : ScreenShare" :size="18" class="control-icon" />
          <span>화면 공유</span>
        </button>
<!--        <button-->
<!--          class="control control-bar-button"-->
<!--          :class="{ active: !isMeetingSideCollapsed && activeSidePanel === 'stt' }"-->
<!--          type="button"-->
<!--          @click="toggleSidePanel('stt')"-->
<!--        >-->
<!--          <Captions :size="18" class="control-icon" />-->
<!--          <span>자막</span>-->
<!--        </button>-->
<!--        <button-->
<!--          class="control control-bar-button"-->
<!--          :class="{ active: !isMeetingSideCollapsed && activeSidePanel === 'people' }"-->
<!--          type="button"-->
<!--          @click="toggleSidePanel('people')"-->
<!--        >-->
<!--          <Users :size="18" class="control-icon" />-->
<!--          <span>참석자</span>-->
<!--        </button>-->
<!--        <button-->
<!--          class="control control-bar-button"-->
<!--          :class="{ active: !isMeetingSideCollapsed && activeSidePanel === 'chat' }"-->
<!--          type="button"-->
<!--          @click="toggleSidePanel('chat')"-->
<!--        >-->
<!--          <MessageSquare :size="18" class="control-icon" />-->
<!--          <span>채팅</span>-->
<!--        </button>-->
<!--        <button-->
<!--          class="control control-bar-button"-->
<!--          :class="{ active: !isMeetingSideCollapsed && activeSidePanel === 'ai' }"-->
<!--          type="button"-->
<!--          @click="toggleSidePanel('ai')"-->
<!--        >-->
<!--          <Sparkles :size="18" class="control-icon" />-->
<!--          <span>AI</span>-->
<!--        </button>-->
        <button
          class="control control-bar-button"
          :class="{ active: moreMenuOpen }"
          type="button"
          @click="toggleMoreMenu"
        >
          <Ellipsis :size="18" class="control-icon" />
          <span>더보기</span>
        </button>
        <button class="danger-button control-bar-button danger-control" :disabled="meetingEndPending" @click="openMeetingEndConfirm">
          <PhoneOff :size="18" class="control-icon" />
          <span>{{ meetingEndPending ? '처리 중' : '나가기' }}</span>
        </button>
      </footer>
    </div>

    <aside class="meeting-side" :class="{ collapsed: isMeetingSideCollapsed }">
      <div class="meeting-side-rail">
        <button
          class="meeting-side-rail-button"
          :class="{ active: !isMeetingSideCollapsed && activeSidePanel === 'stt' }"
          type="button"
          title="실시간 자막"
          aria-label="실시간 자막"
          @click="toggleSidePanel('stt')"
        >
          <Captions :size="18" />
        </button>
        <button
          class="meeting-side-rail-button"
          :class="{ active: !isMeetingSideCollapsed && activeSidePanel === 'people' }"
          type="button"
          title="참석자"
          aria-label="참석자"
          @click="toggleSidePanel('people')"
        >
          <Users :size="18" />
        </button>
        <button
          class="meeting-side-rail-button"
          :class="{ active: !isMeetingSideCollapsed && activeSidePanel === 'chat' }"
          type="button"
          title="채팅"
          aria-label="채팅"
          @click="toggleSidePanel('chat')"
        >
          <MessageSquare :size="18" />
        </button>
        <button
          class="meeting-side-rail-button"
          :class="{ active: !isMeetingSideCollapsed && activeSidePanel === 'ai' }"
          type="button"
          title="AI 피드백"
          aria-label="AI 피드백"
          @click="toggleSidePanel('ai')"
        >
          <Sparkles :size="18" />
        </button>
        <button
          class="meeting-side-rail-button meeting-side-rail-toggle"
          type="button"
          :title="isMeetingSideCollapsed ? '패널 열기' : '패널 닫기'"
          :aria-label="isMeetingSideCollapsed ? '패널 열기' : '패널 닫기'"
          @click="toggleMeetingSidePanel"
        >
          <component :is="isMeetingSideCollapsed ? PanelRightOpen : PanelRightClose" :size="18" />
        </button>
      </div>

      <template v-if="!isMeetingSideCollapsed">
        <div class="meeting-side-panel">
          <header class="meeting-side-panel-header">
            <div>
              <strong>{{ activeSidePanelTitle }}</strong>
              <p>{{ activeSidePanelDescription }}</p>
            </div>
            <span class="meeting-side-panel-status">{{ activeSidePanelStatus }}</span>
          </header>

          <div v-if="activeSidePanel === 'stt'" class="side-body meeting-caption-panel">
            <section class="meeting-caption-language-panel" aria-label="원문 언어 탭">
              <header class="meeting-caption-language-panel-head">
                <div>
                  <strong>{{ activeCaptionTabLabel }}</strong>
                  <p>회의 원문 영역 안에서 언어별 자막을 전환해 확인합니다.</p>
                </div>
                <span class="meeting-caption-language-status">{{ captionPanelStatus }}</span>
              </header>

              <div class="meeting-caption-tabs" role="tablist" aria-label="자막 언어">
                <button
                  id="meeting-caption-tab-source"
                  type="button"
                  class="meeting-caption-tab"
                  :class="{ active: captionDisplayMode === 'source' }"
                  :aria-selected="captionDisplayMode === 'source'"
                  aria-controls="meeting-caption-panel-source"
                  @click="captionDisplayMode = 'source'"
                >
                  <span class="meeting-caption-tab-label">원문</span>
                  <small>Source</small>
                </button>
                <button
                  id="meeting-caption-tab-ko"
                  type="button"
                  class="meeting-caption-tab"
                  :class="{ active: captionDisplayMode === 'ko' }"
                  :aria-selected="captionDisplayMode === 'ko'"
                  aria-controls="meeting-caption-panel-ko"
                  @click="captionDisplayMode = 'ko'"
                >
                  <span class="meeting-caption-tab-label">KOR</span>
                  <small>한국어</small>
                </button>
                <button
                  id="meeting-caption-tab-en"
                  type="button"
                  class="meeting-caption-tab"
                  :class="{ active: captionDisplayMode === 'en' }"
                  :aria-selected="captionDisplayMode === 'en'"
                  aria-controls="meeting-caption-panel-en"
                  @click="captionDisplayMode = 'en'"
                >
                  <span class="meeting-caption-tab-label">ENG</span>
                  <small>English</small>
                </button>
              </div>

              <p v-if="sttStatusHint" class="meeting-caption-hint meeting-caption-hint-inline">
                {{ sttStatusHint }}
              </p>

              <div
                :id="activeCaptionPanelId"
                ref="captionLog"
                class="meeting-caption-scroll meeting-caption-scroll-panel"
                :aria-labelledby="activeCaptionTabId"
                @scroll="handleCaptionScroll"
              >
                <p
                  v-for="caption in visibleFinalizedCaptions"
                  :key="caption.segmentId"
                  class="transcript"
                  :class="{ finalized: caption.status === 'FINALIZED' }"
                >
                  <small>
                    {{ formatCaptionTime(caption.startedAtMs) }}
                    · 확정
                  </small>
                  <small class="transcript-debug">
                    seq {{ caption.sequence ?? '-' }}
                    · {{ caption.segmentId.slice(0, 8) }}
                    <template v-if="captionDebugLanguageLabel(caption)">
                      · {{ captionDebugLanguageLabel(caption) }}
                    </template>
                  </small>
                  {{ caption.displayText }}
                </p>
                <p
                  v-if="visibleStreamingCaptionPreview"
                  class="transcript transcript-preview"
                >
                  <small>
                    {{ formatCaptionTime(visibleStreamingCaptionPreview.startedAtMs) }}
                    · 말하는 중
                  </small>
                  <small class="transcript-debug">
                    seq {{ visibleStreamingCaptionPreview.sequence ?? '-' }}
                    · {{ visibleStreamingCaptionPreview.segmentId.slice(0, 8) }}
                    <template v-if="captionDebugLanguageLabel(visibleStreamingCaptionPreview)">
                      · {{ captionDebugLanguageLabel(visibleStreamingCaptionPreview) }}
                    </template>
                  </small>
                  {{ visibleStreamingCaptionPreview.displayText }}
                </p>
                <p v-if="!visibleFinalizedCaptions.length && !visibleStreamingCaptionPreview" class="meeting-caption-empty">
                  {{ currentCaptionEmptyStateMessage }}
                </p>
              </div>
            </section>
          </div>

          <div v-else-if="activeSidePanel === 'people'" class="side-body meeting-people-body">
            <section v-if="hostParticipantName" class="meeting-host-summary">
              <span class="meeting-host-summary-label">회의 호스트</span>
              <strong>{{ hostParticipantName }}</strong>
              <small>{{ hostParticipantStatus }}</small>
            </section>
            <p v-for="participant in participantList" :key="participant.key" class="people-row">
              <span class="people-row-name">
                {{ participant.name }}
                <small v-if="participant.isLocal">나</small>
                <small v-else-if="extractParticipantUserId(participant.identity) === hostUserId">호스트</small>
              </span>
              <span class="people-row-status">
                {{ participantStatusLabel(participant) }}
              </span>
            </p>
          </div>
          <div v-else-if="activeSidePanel === 'chat'" class="side-body chat-body">
            <div ref="chatLog" class="chat-log">
              <article
                v-for="item in chatMessages"
                :key="item.id"
                class="chat-message"
                :class="{ self: item.isSelf, system: item.isSystem }"
              >
                <header>
                  <strong>{{ item.senderName }}</strong>
                  <small>{{ formatChatTime(item.sentAt) }}</small>
                </header>
                <p>{{ item.content }}</p>
              </article>
              <p v-if="!chatMessages.length" class="meeting-caption-empty">
                아직 채팅이 없습니다. 회의 참여자에게 첫 메시지를 보내보세요.
              </p>
            </div>
            <div class="chat-input">
              <input
                v-model="chatInput"
                placeholder="메시지를 입력하고 Enter로 전송하세요"
                maxlength="300"
                :disabled="!meetingRoom || sendingChat"
                @compositionstart="chatInputComposing = true"
                @compositionend="chatInputComposing = false"
                @keydown.enter="handleChatEnter"
              >
              <button :disabled="!meetingRoom || !chatInput.trim() || sendingChat" @click="sendChat">
                {{ sendingChat ? '전송 중' : '전송' }}
              </button>
            </div>
          </div>

          <div v-else class="side-body meeting-ai-body">
            <RealtimeFeedbackPanel
              class="meeting-realtime-feedback"
              :feedbacks="realtimeFeedbacks"
              :connected="Boolean(meetingRoom)"
              :fill="true"
            />
          </div>

          <div v-if="activeSidePanel !== 'ai'" class="meeting-side-feedback-dock">
            <RealtimeFeedbackPanel
              class="meeting-realtime-feedback meeting-realtime-feedback-dock"
              :feedbacks="realtimeFeedbacks"
              :connected="Boolean(meetingRoom)"
            />
          </div>
        </div>
      </template>
    </aside>
  </section>

  <div v-if="guestLinkDialogOpen" class="modal-backdrop" @click.self="closeGuestLinkDialog">
    <section class="write-modal guest-link-modal" aria-label="게스트 링크">
      <header>
        <div>
          <h2>게스트 링크</h2>
          <p class="guest-link-note">
            로그인하지 않은 사용자가 회의에 들어올 수 있는 공개 링크를 복사합니다.
          </p>
        </div>
        <button type="button" @click="closeGuestLinkDialog">닫기</button>
      </header>

      <label class="guest-link-field">
        공유 링크
        <input ref="guestLinkInput" :value="guestMeetingLink" readonly @focus="$event.target.select()">
      </label>

      <p class="guest-link-note">
        이 링크는 현재 회의 ID를 기준으로 생성되며, 대기실과 회의실에서 같은 주소를 복사합니다.
      </p>

      <footer class="guest-link-footer">
        <span class="share-copy-status">{{ guestLinkCopyStatus }}</span>
        <div class="guest-link-actions">
          <button class="secondary-button" type="button" @click="closeGuestLinkDialog">취소</button>
          <button class="primary-button" type="button" @click="copyGuestMeetingLink">
            링크 복사
          </button>
        </div>
      </footer>
    </section>
  </div>

  <div v-if="meetingSettingsOpen" class="modal-backdrop" @click.self="closeMeetingSettings">
    <section class="write-modal meeting-settings-modal" aria-label="회의 장치 설정">
      <header>
        <div>
          <h2>회의 장치 설정</h2>
          <p class="guest-link-note">
            회의 중에도 개인 마이크, 스피커, 카메라 장치를 바로 바꿀 수 있습니다.
          </p>
        </div>
        <button type="button" @click="closeMeetingSettings">닫기</button>
      </header>

      <div class="device-fields">
        <label>
          마이크
          <AppSelect
            v-model="selectedAudioInput"
            :disabled="!audioInputs.length || loadingDevices"
            @change="handleAudioInputSelection"
          >
            <option v-if="!audioInputs.length" value="">마이크를 찾을 수 없음</option>
            <option v-for="device in audioInputs" :key="device.deviceId" :value="device.deviceId">
              {{ device.label }}
            </option>
          </AppSelect>
        </label>

        <label>
          스피커
          <AppSelect
            v-model="selectedAudioOutput"
            :disabled="!audioOutputs.length || !supportsSpeakerSelection"
            @change="applySpeaker"
          >
            <option v-if="!audioOutputs.length" value="">기본 스피커</option>
            <option v-for="device in audioOutputs" :key="device.deviceId" :value="device.deviceId">
              {{ device.label }}
            </option>
          </AppSelect>
          <small v-if="!supportsSpeakerSelection">
            이 브라우저에서는 스피커 선택을 지원하지 않습니다.
          </small>
        </label>

        <label>
          카메라
          <AppSelect
            v-model="selectedVideoInput"
            :disabled="!videoInputs.length || loadingDevices"
            @change="handleVideoInputSelection"
          >
            <option v-if="!videoInputs.length" value="">카메라를 찾을 수 없음</option>
            <option v-for="device in videoInputs" :key="device.deviceId" :value="device.deviceId">
              {{ device.label }}
            </option>
          </AppSelect>
        </label>
      </div>

      <p v-if="deviceStatus" class="device-status meeting-settings-status" :class="{ error: deviceError }">
        {{ deviceStatus }}
      </p>

      <footer class="meeting-settings-footer">
        <span class="guest-link-note">입력 장치는 즉시 적용되고, 스피커는 현재 재생 중인 오디오부터 바뀝니다.</span>
        <div class="guest-link-actions">
          <button class="secondary-button" type="button" :disabled="loadingDevices" @click="initializeDevices">
            {{ loadingDevices ? '검색 중' : '장치 새로고침' }}
          </button>
          <button class="primary-button" type="button" @click="closeMeetingSettings">닫기</button>
        </div>
      </footer>
    </section>
  </div>

  <div v-if="hostTransferDialogOpen" class="modal-backdrop" @click.self="closeHostTransferDialog">
    <section class="write-modal meeting-transfer-modal" aria-label="회의 관리자 이전">
      <header>
        <div>
          <h2>회의 관리자 이전</h2>
          <p class="guest-link-note">
            현재 회의에 참여 중인 로그인 사용자에게만 관리자를 넘길 수 있습니다.
          </p>
        </div>
        <button type="button" @click="closeHostTransferDialog">닫기</button>
      </header>

      <label class="guest-link-field">
        새 관리자
        <AppSelect v-model="hostTransferTargetUserId">
          <option v-if="!hostTransferCandidates.length" value="">
            이전할 수 있는 사용자가 없습니다.
          </option>
          <option
            v-for="participant in hostTransferCandidates"
            :key="participant.key"
            :value="extractParticipantUserId(participant.identity)"
          >
            {{ participant.name }}
          </option>
        </AppSelect>
      </label>

      <p class="guest-link-note">
        다른 참여자가 많을 때는 새 관리자가 회의 종료와 화면 공유 권한을 이어받습니다.
      </p>

      <footer class="meeting-settings-footer">
        <span class="guest-link-note">{{ hostTransferStatus }}</span>
        <div class="guest-link-actions">
          <button class="secondary-button" type="button" @click="closeHostTransferDialog">취소</button>
          <button
            class="primary-button"
            type="button"
            :disabled="!hostTransferTargetUserId || !hostTransferCandidates.length"
            @click="transferHost"
          >
            이전하기
          </button>
        </div>
      </footer>
    </section>
  </div>

  <div v-if="meetingEndConfirmOpen" class="modal-backdrop" @click.self="closeMeetingEndConfirm">
    <section class="write-modal meeting-end-modal" aria-label="회의 종료 확인">
      <header>
        <div>
          <h2>{{ isCurrentUserHost ? '회의 종료 확인' : '회의 나가기 확인' }}</h2>
          <p class="guest-link-note">
            {{ meetingEndConfirmDescription }}
          </p>
        </div>
        <button type="button" @click="closeMeetingEndConfirm">닫기</button>
      </header>

      <p class="meeting-end-warning">
        {{ meetingEndConfirmWarning }}
      </p>

      <footer class="meeting-settings-footer">
        <span class="guest-link-note">{{ meetingEndPending ? '요청을 처리하는 중입니다.' : '확인을 누르면 바로 진행됩니다.' }}</span>
        <div class="guest-link-actions">
          <button class="secondary-button" type="button" :disabled="meetingEndPending" @click="closeMeetingEndConfirm">취소</button>
          <button class="danger-button" type="button" :disabled="meetingEndPending" @click="confirmMeetingEndAction">
            {{ meetingEndPending ? '처리 중' : meetingEndButtonLabel }}
          </button>
        </div>
      </footer>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppSelect from '../../components/common/AppSelect.vue'
import {
  Camera,
  Captions,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Ellipsis,
  Fullscreen,
  LogOut,
  MessageSquare,
  MessageSquareShare,
  Mic,
  MicOff,
  PanelRightClose,
  PanelRightOpen,
  PhoneOff,
  RefreshCw,
  ScreenShare,
  ScreenShareOff,
  Settings2,
  Sparkles,
  Users,
  Video,
  VideoOff,
} from '@lucide/vue'
import { Room, RoomEvent, Track, createLocalAudioTrack, createLocalVideoTrack } from 'livekit-client'
import { useRoute, useRouter } from 'vue-router'
import { API_BASE_URL, postJson } from '../../lib/api-client'
import { getMeeting } from '../../lib/reservations'
import {
  displayFinalizedCaptions,
  latestStreamingCaption,
  selectCaptionTextByMode,
  sortedCaptions,
  upsertCaption,
} from '../../lib/caption-store'
import RealtimeFeedbackPanel from '../../components/meeting/RealtimeFeedbackPanel.vue'
import { sortedFeedbacks, upsertFeedback } from '../../lib/feedback-store'
import { guestMeetingRoute } from '../../lib/meeting-route'
import { resolveLiveKitConnection } from '../../lib/livekit-meeting'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const DEFAULT_SIDE_PANEL = 'stt'

const inLobby = ref(true)
const mic = ref(true)
const cam = ref(true)
const activeSidePanel = ref(DEFAULT_SIDE_PANEL)
const captionDisplayMode = ref('source')
const chatInput = ref('')
const displayName = ref(auth.user?.name || '')
const previewVideo = ref(null)
const meetingRoomShell = ref(null)
const speakerTestAudio = ref(null)
const chatLog = ref(null)
const captionLog = ref(null)
const chatInputComposing = ref(false)
const guestLinkDialogOpen = ref(false)
const meetingSettingsOpen = ref(false)
const isMeetingSideCollapsed = ref(false)
const sideCollapsedBeforeFocus = ref(false)
const moreMenuOpen = ref(false)
const guestLinkCopyStatus = ref('게스트 링크를 공유할 수 있습니다.')
const guestLinkInput = ref(null)
const previewStream = ref(null)
const audioInputs = ref([])
const audioOutputs = ref([])
const videoInputs = ref([])
const selectedAudioInput = ref('')
const selectedAudioOutput = ref('')
const selectedVideoInput = ref('')
const loadingDevices = ref(false)
const meetingTitleFromServer = ref('')
const deviceStatus = ref('')
const deviceError = ref(false)
const testingAudio = ref(false)
const microphoneLevel = ref(0)
const connectingMeeting = ref(false)
const meetingRoom = ref(null)
const meetingConnectionStatus = ref('연결 대기')
const meetingConnectionError = ref('')
const feedbackMap = ref(new Map())
const feedbackSessionId = ref('')
const lastCaptionReceivedAt = ref(null)
const lastCaptionText = ref('')
const lastCaptionPublishedAtMs = ref(null)
const lastCaptionStartedAtEpochMs = ref(null)
const lastCaptionTransportLatencyMs = ref(null)
const lastCaptionEndToEndLatencyMs = ref(null)
const lastLocalSpeechDetectedAtMs = ref(null)
const lastCaptionRenderedAtMs = ref(null)
const lastSpeechToCaptionLatencyMs = ref(null)
const captionMap = ref(new Map())
const participantStateMap = ref(new Map())
const chatMessages = ref([])
const sendingChat = ref(false)
const connectedAt = ref(null)
const screenShareEnabled = ref(false)
const meetingConnection = ref(null)
const selectedTileKey = ref('')
const fullscreenTileKey = ref('')
const showFilmstripInFocus = ref(false)
const focusFilmstripPage = ref(0)
const currentGridPage = ref(0)
const viewportWidth = ref(typeof window === 'undefined' ? 1440 : window.innerWidth)
const screenSharePending = ref(false)
const sttRuntimeStatus = ref('')
const lastDataChannelReceivedAt = ref(null)
const lastDataChannelEventType = ref('')
const lastMicPublishError = ref('')
const meetingEndPending = ref(false)
const meetingStartReported = ref(false)
const meetingEndHandled = ref(false)
const meetingEndConfirmOpen = ref(false)
const meetingEndedScreenVisible = ref(false)
const meetingEndedScreenMessage = ref('해당 회의는 종료되었습니다.')
const hostTransferDialogOpen = ref(false)
const hostTransferTargetUserId = ref('')
const hostTransferStatus = ref('')
const localTrackPublishedCount = ref(0)
const localTrackUnpublishedCount = ref(0)
const lastLocalTrackEvent = ref('')
const localAudioPublicationCount = ref(0)
const captionFollowLatest = ref(true)
const hasCaptionOverflow = ref(false)
const isNearCaptionBottom = ref(true)
const ignoreNextCaptionScrollEvent = ref(false)
const screenShareInactiveParticipantIds = ref(new Set())

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()
const tileElements = new Map()
const tileMediaElements = new Map()
const tileTrackBindings = new Map()
const remoteAudioBindings = new Map()
let mediaSyncQueued = false
let audioContext = null
let microphoneAnalyser = null
let microphoneSource = null
let microphoneAnimationFrame = null
let speakerTestStream = null
let speakerTestTrack = null
let speechLatencyAudioContext = null
let speechLatencyAnalyser = null
let speechLatencySource = null
let speechLatencyAnimationFrame = null
let speechLatencyStream = null
let speechLatencyTrackId = ''
let localSpeechIsActive = false
let localSpeechLastDetectedAtMs = 0
const pendingSpeechDetectionQueue = []
let elapsedTimer = null
let captionScrollRaf = null
const elapsedSeconds = ref(0)

const LOCAL_SPEECH_MEASUREMENT_RMS_THRESHOLD = 0.01
const LOCAL_SPEECH_MEASUREMENT_SILENCE_MS = 160
const LOCAL_SPEECH_TO_CAPTION_MATCH_WINDOW_MS = 15000
const meetingTitle = computed(() => {
  const titleFromRoute = typeof route.query.title === 'string' ? route.query.title.trim() : ''
  const titleFromConnection = String(meetingConnection.value?.title || '').trim()
  return meetingTitleFromServer.value || titleFromConnection || titleFromRoute || ''
})
const meetingId = computed(() => String(route.params.meetingId || '').trim())
const guestMeetingLink = computed(() => {
  if (!meetingId.value) return ''
  const path = guestMeetingRoute(meetingId.value)
  if (typeof window === 'undefined') return path
  const url = new URL(path, window.location.origin)
  const resolvedTitle = meetingTitle.value.trim()
  if (resolvedTitle) {
    url.searchParams.set('title', resolvedTitle)
  }
  return url.toString()
})
const isDedicatedMeetingWindow = computed(() => String(route.query.popup || '') === '1')
const popupSessionId = computed(() => String(route.query.popupSession || '').trim())
const popupReturnPath = computed(() => {
  const raw = String(route.query.returnTo || '').trim()
  if (!raw.startsWith('/')) return '/app/meetings'
  return raw
})
const isGuestMeetingRoute = computed(() => route.path.startsWith('/guest/meeting/'))
const hasVideoTrack = computed(() => Boolean(previewStream.value?.getVideoTracks().length))
const hasAudioTrack = computed(() => Boolean(previewStream.value?.getAudioTracks().length))
const pendingParticipantName = computed(() => displayName.value.trim() || auth.user?.name || '')
const currentParticipantName = computed(() => {
  const resolvedParticipantName = String(meetingConnection.value?.participantName || '').trim()
  return resolvedParticipantName || pendingParticipantName.value || '이름 미입력'
})
const currentParticipantInitial = computed(() => initialsFromName(currentParticipantName.value))
const currentUserId = computed(() => String(auth.user?.id || '').trim())
const orderedCaptions = computed(() => sortedCaptions(captionMap.value))
const finalizedCaptions = computed(() => displayFinalizedCaptions(captionMap.value))
const streamingCaptionPreview = computed(() => latestStreamingCaption(captionMap.value))
const visibleFinalizedCaptions = computed(() =>
  finalizedCaptions.value
    .map((caption) => ({
      ...caption,
      displayText: selectCaptionTextByMode(caption, captionDisplayMode.value),
    }))
    .filter((caption) => caption.displayText),
)
const visibleStreamingCaptionPreview = computed(() => {
  if (!streamingCaptionPreview.value) return null
  if (captionDisplayMode.value !== 'source') return null
  const displayText = selectCaptionTextByMode(
    streamingCaptionPreview.value,
    captionDisplayMode.value,
  )
  if (!displayText) return null
  return {
    ...streamingCaptionPreview.value,
    displayText,
  }
})
const activeCaptionTabLabel = computed(() => {
  if (captionDisplayMode.value === 'ko') return '한국어 자막'
  if (captionDisplayMode.value === 'en') return '영어 자막'
  return '원문 자막'
})
const shouldShowMeetingEndedScreen = computed(() =>
  meetingEndedScreenVisible.value
  || (meetingEndHandled.value && !meetingRoom.value && !inLobby.value),
)
const activeCaptionTabId = computed(() => `meeting-caption-tab-${captionDisplayMode.value}`)
const activeCaptionPanelId = computed(() => `meeting-caption-panel-${captionDisplayMode.value}`)
const realtimeFeedbacks = computed(() => sortedFeedbacks(feedbackMap.value))
const supportsSpeakerSelection = computed(() =>
  typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype,
)
const cameraPlaceholder = computed(() => {
  if (!cam.value) return '카메라가 꺼져 있습니다.'
  if (loadingDevices.value) return '카메라를 연결하고 있습니다.'
  return '사용 가능한 카메라가 없습니다.'
})
const audioTestMessage = computed(() => {
  if (!mic.value) return '마이크를 켜야 테스트할 수 있습니다.'
  if (!hasAudioTrack.value) return '사용 가능한 마이크가 없습니다.'
  if (testingAudio.value) return '말하면 입력 레벨이 움직이고 선택한 스피커로 들립니다.'
  return '선택한 마이크 입력과 스피커 재생을 함께 확인합니다.'
})
const participantList = computed(() =>
  Array.from(participantStateMap.value.values()).sort((left, right) => {
    if (left.isLocal !== right.isLocal) return left.isLocal ? -1 : 1
    return left.name.localeCompare(right.name, 'ko')
  }),
)
const participantCount = computed(() => participantList.value.length)
const hostUserId = computed(() => String(meetingConnection.value?.hostUserId || '').trim())
const hostParticipant = computed(() =>
  participantList.value.find((participant) => extractParticipantUserId(participant.identity) === hostUserId.value) || null,
)
const hostParticipantName = computed(() => hostParticipant.value?.name || '')
const hostParticipantStatus = computed(() => {
  if (!hostParticipant.value) return '현재 참여자 목록에서 호스트를 확인하지 못했습니다.'
  return participantStatusLabel(hostParticipant.value)
})
const meetingConnectionTone = computed(() => {
  if (meetingConnectionError.value || meetingConnectionStatus.value.includes('실패')) return 'error'
  if (meetingConnectionStatus.value.includes('재연결')) return 'warning'
  if (meetingRoom.value) return 'success'
  return 'muted'
})
const isCurrentUserHost = computed(() => {
  if (!hostUserId.value || !currentUserId.value) return false
  if (hostUserId.value === currentUserId.value) return true
  // 로컬 데모 계정은 백엔드 UUID와 다르므로 creator 역할을 맡는 기본 계정만 폴백으로 호스트로 본다.
  return currentUserId.value === 'u-user'
})
const activeScreenShareParticipant = computed(() =>
  participantList.value.find((participant) => participant.screenTrack || participant.screenShareEnabled) || null,
)
const screenShareToggleDisabled = computed(() => {
  if (screenSharePending.value) return true
  const activeSharer = activeScreenShareParticipant.value
  if (!activeSharer) return false
  return !activeSharer.isLocal
})
const screenShareButtonLabel = computed(() => {
  if (screenSharePending.value) return screenShareEnabled.value ? '공유 중지 중' : '화면 공유 준비 중'
  return screenShareEnabled.value ? '공유 중지' : '화면 공유'
})
const screenShareControlHint = computed(() => {
  const activeSharer = activeScreenShareParticipant.value
  if (!activeSharer || activeSharer.isLocal) return ''
  return `${activeSharer.name} 님이 화면을 공유 중이라 다른 참여자는 새 화면 공유를 시작할 수 없습니다.`
})
const activeSidePanelTitle = computed(() => {
  if (activeSidePanel.value === 'people') return '참석자'
  if (activeSidePanel.value === 'chat') return '채팅'
  if (activeSidePanel.value === 'ai') return 'AI 피드백'
  return '실시간 자막'
})
const activeSidePanelDescription = computed(() => {
  if (activeSidePanel.value === 'people') return '현재 회의에 참여한 인원과 장치 상태를 확인합니다.'
  if (activeSidePanel.value === 'chat') return '회의 중 메시지를 주고받습니다.'
  if (activeSidePanel.value === 'ai') return '이전 회의 맥락 기반 실시간 추천을 확인합니다.'
  return '회의 음성을 원문과 번역 자막으로 전환해 확인합니다.'
})
const activeSidePanelStatus = computed(() => {
  if (activeSidePanel.value === 'people') return `${participantCount.value}명`
  if (activeSidePanel.value === 'chat') return `${chatMessages.value.length}개`
  if (activeSidePanel.value === 'ai') return `${realtimeFeedbacks.value.length}건`
  return captionPanelStatus.value
})
const participantMediaTiles = computed(() => {
  const tiles = []

  participantList.value.forEach((participant) => {
    const base = {
      isLocal: participant.isLocal,
      initials: initialsFromName(participant.name),
      muted: !participant.micEnabled,
    }
    const hasScreenVisual = Boolean(participant.screenTrack && participant.screenShareEnabled)
    const hasCameraVisual = Boolean(participant.cameraTrack && participant.cameraEnabled)

    if (participant.screenTrack || participant.screenShareEnabled) {
      tiles.push({
        ...base,
        key: `${participant.key}:screen`,
        type: 'screen',
        track: hasScreenVisual ? participant.screenTrack : null,
        label: `${participant.name} 화면`,
        placeholder: hasScreenVisual ? '화면을 공유하는 중입니다.' : '화면 공유가 일시 중지되었습니다.',
      })
    }

    if (participant.cameraTrack || participant.cameraEnabled) {
      tiles.push({
        ...base,
        key: `${participant.key}:camera`,
        type: 'camera',
        track: hasCameraVisual ? participant.cameraTrack : null,
        label: participant.name,
        placeholder: hasCameraVisual ? '카메라를 준비하는 중입니다.' : '카메라가 꺼져 있습니다.',
      })
    }

    if (!participant.screenTrack && !participant.screenShareEnabled && !participant.cameraTrack && !participant.cameraEnabled) {
      tiles.push({
        ...base,
        key: `${participant.key}:placeholder`,
        type: 'placeholder',
        track: null,
        label: participant.name,
        placeholder: '카메라가 꺼져 있습니다.',
      })
    }
  })

  return tiles
})
const participantGridPageSize = computed(() => {
  const tileCount = participantMediaTiles.value.length
  if (tileCount <= 1) return 1
  if (viewportWidth.value < 900) {
    return tileCount <= 4 ? 4 : 4
  }
  return tileCount <= 4 ? 4 : 6
})
const totalGridPages = computed(() =>
  Math.max(1, Math.ceil(participantMediaTiles.value.length / participantGridPageSize.value)),
)
const meetingGridStyle = computed(() => {
  const count = Math.max(gridTiles.value.length, 1)
  const isNarrowViewport = viewportWidth.value < 900
  let columns = 1

  if (isNarrowViewport) {
    columns = count === 1 ? 1 : 2
  } else if (count <= 1) {
    columns = 1
  } else if (count <= 4) {
    columns = 2
  } else {
    columns = 3
  }

  return {
    '--meeting-grid-columns': columns,
    '--meeting-grid-rows': Math.max(1, Math.ceil(count / columns)),
  }
})
const selectedTile = computed(() =>
  participantMediaTiles.value.find((tile) => tile.key === selectedTileKey.value) || null,
)
const hasScreenShareTile = computed(() => participantMediaTiles.value.some((tile) => tile.type === 'screen'))
const defaultScreenShareTile = computed(() =>
  participantMediaTiles.value.find((tile) => tile.type === 'screen') || null,
)
const isFocusMode = computed(() => Boolean(selectedTile.value))
const stageTile = computed(() => {
  if (selectedTile.value) return selectedTile.value
  if (defaultScreenShareTile.value) return defaultScreenShareTile.value
  return null
})
const meetingLayoutMode = computed(() => {
  if (isFocusMode.value) return 'focus'
  return 'grid'
})
const filmstripTiles = computed(() => {
  if (!stageTile.value) return []

  const remainingTiles = participantMediaTiles.value.filter((tile) => tile.key !== stageTile.value.key)
  if (!remainingTiles.length) return []

  if (isFocusMode.value) {
    return remainingTiles
  }

  if (meetingLayoutMode.value === 'screen-share') {
    const cameras = remainingTiles.filter((tile) => tile.type !== 'screen')
    return cameras.length ? cameras : remainingTiles
  }

  return remainingTiles
})
const shouldRenderFilmstrip = computed(() => {
  if (!filmstripTiles.value.length) return false
  if (!isFocusMode.value) return true
  return showFilmstripInFocus.value
})
const focusFilmstripPageSize = computed(() => {
  if (viewportWidth.value < 900) return 3
  return 4
})
const focusFilmstripPageCount = computed(() =>
  Math.max(1, Math.ceil(filmstripTiles.value.length / focusFilmstripPageSize.value)),
)
const canPageFilmstripBackward = computed(() => focusFilmstripPage.value > 0)
const canPageFilmstripForward = computed(() => focusFilmstripPage.value < focusFilmstripPageCount.value - 1)
const visibleFilmstripTiles = computed(() => {
  if (!isFocusMode.value) return filmstripTiles.value
  const startIndex = focusFilmstripPage.value * focusFilmstripPageSize.value
  return filmstripTiles.value.slice(startIndex, startIndex + focusFilmstripPageSize.value)
})
const gridTiles = computed(() => {
  const startIndex = currentGridPage.value * participantGridPageSize.value
  return participantMediaTiles.value.slice(startIndex, startIndex + participantGridPageSize.value)
})
const elapsedTimeLabel = computed(() => {
  const hours = String(Math.floor(elapsedSeconds.value / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((elapsedSeconds.value % 3600) / 60)).padStart(2, '0')
  const seconds = String(elapsedSeconds.value % 60).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
})
const sttEmptyStateMessage = computed(() => {
  if (meetingConnectionError.value) return meetingConnectionError.value
  if (!meetingRoom.value) return '회의 연결이 완료되면 원문 자막이 여기에 표시됩니다.'
  if (finalizedCaptions.value.length > 0 || streamingCaptionPreview.value) return ''
  if (!mic.value && participantCount.value <= 1) return '마이크가 꺼져 있어서 자막이 생성되지 않습니다.'
  if (lastCaptionReceivedAt.value) {
    return `마지막 자막 수신: ${formatCaptionReceivedTime(lastCaptionReceivedAt.value)}`
  }
  return 'STT 세션은 준비되었습니다. 아직 음성이 감지되지 않았거나 자막이 도착하지 않았습니다.'
})
const currentCaptionEmptyStateMessage = computed(() => sttEmptyStateMessage.value)
const sttStatusHint = computed(() => {
  if (!meetingRoom.value) return ''
  if (finalizedCaptions.value.length > 0 || streamingCaptionPreview.value) return ''
  if (!mic.value) return '마이크가 꺼져 있으면 STT가 문장을 만들 수 없습니다.'
  if (sttRuntimeStatus.value) return `STT 상태: ${sttRuntimeStatus.value}`
  if (lastCaptionReceivedAt.value) return '자막은 수신됐지만 아직 화면에 고정된 문장이 없습니다.'
  return '마이크 입력을 기다리는 중입니다. 발화가 들어오면 자막이 표시됩니다.'
})
const captionPanelStatus = computed(() => {
  if (sttRuntimeStatus.value) return `자막 ${sttRuntimeStatus.value}`
  return meetingConnectionStatus.value
})

function captionDebugLanguageLabel(caption) {
  const language = String(caption?.language || '').trim()
  if (!language || language === 'unknown') return ''
  if (captionDisplayMode.value !== 'source') return ''
  return language
}

const livekitRoomName = computed(() => meetingConnection.value?.roomName || '연결 전')
const livekitParticipantIdentity = computed(() => currentParticipantIdentity() || '확인 중')
const localParticipantState = computed(() =>
  participantList.value.find((participant) => participant.isLocal) || null,
)
const localMicPublicationStatus = computed(() => {
  if (!meetingRoom.value?.localParticipant) return '회의 연결 전'
  if (!mic.value) return '로컬 음소거'
  if (!localParticipantState.value?.micEnabled) return '마이크 track 미발행'
  return localAudioPublicationCount.value > 0
    ? `발행됨 · publication ${localAudioPublicationCount.value}개`
    : '발행 이벤트 수신됨'
})
const captionReceptionStatus = computed(() => {
  if (finalizedCaptions.value.length > 0) {
    return `${finalizedCaptions.value.length}개 확정`
  }
  if (streamingCaptionPreview.value) {
    return '말하는 중 자막 수신'
  }
  if (!meetingRoom.value) return '회의 연결 전'
  return '아직 자막 수신 없음'
})
const lastDataChannelReceivedLabel = computed(() => {
  if (!lastDataChannelReceivedAt.value) return '수신 없음'
  return `${formatChatTime(lastDataChannelReceivedAt.value)} · ${lastDataChannelEventType.value || 'unknown'}`
})
const lastCaptionTransportLatencyLabel = computed(() => {
  if (lastCaptionTransportLatencyMs.value === null) return '측정 전'
  return `${(lastCaptionTransportLatencyMs.value / 1000).toFixed(2)}초`
})
const lastCaptionEndToEndLatencyLabel = computed(() => {
  if (lastCaptionEndToEndLatencyMs.value === null) return '측정 전'
  return `${(lastCaptionEndToEndLatencyMs.value / 1000).toFixed(2)}초`
})
const lastLocalSpeechDetectedLabel = computed(() => {
  if (lastLocalSpeechDetectedAtMs.value === null) return '측정 전'
  return formatMeasurementTime(lastLocalSpeechDetectedAtMs.value)
})
const lastCaptionRenderedLabel = computed(() => {
  if (lastCaptionRenderedAtMs.value === null) return '측정 전'
  return formatMeasurementTime(lastCaptionRenderedAtMs.value)
})
const lastSpeechToCaptionLatencyLabel = computed(() => {
  if (lastSpeechToCaptionLatencyMs.value === null) return '측정 전'
  return `${(lastSpeechToCaptionLatencyMs.value / 1000).toFixed(2)}초`
})
const microphonePublishErrorLabel = computed(() => lastMicPublishError.value || '오류 없음')
const localTrackEventStatus = computed(() => {
  if (!meetingRoom.value) return '회의 연결 전'
  if (!localTrackPublishedCount.value && !localTrackUnpublishedCount.value) return '이벤트 없음'
  return `publish ${localTrackPublishedCount.value} / unpublish ${localTrackUnpublishedCount.value}${lastLocalTrackEvent.value ? ` · ${lastLocalTrackEvent.value}` : ''}`
})
const localAudioPublicationCountLabel = computed(() => {
  if (!meetingRoom.value) return '회의 연결 전'
  return `${localAudioPublicationCount.value}개`
})
const hostTransferCandidates = computed(() =>
  participantList.value.filter((participant) => {
    if (participant.isLocal || isInternalMeetingParticipant(participant)) {
      return false
    }
    return Boolean(extractParticipantUserId(participant.identity))
  }),
)
const meetingEndButtonLabel = computed(() =>
  isCurrentUserHost.value ? '회의 종료' : '회의 나가기',
)
const meetingEndConfirmDescription = computed(() =>
  isCurrentUserHost.value
    ? '관리자가 회의를 종료하면 현재 세션이 닫히고 다른 참석자도 함께 회의에서 나가게 됩니다.'
    : '회의에서 나가면 현재 참가만 종료되고, 다른 참석자들의 회의는 계속 진행됩니다.',
)
const meetingEndConfirmWarning = computed(() =>
  isCurrentUserHost.value
    ? '이 작업은 현재 회의 전체를 종료합니다.'
    : '이 작업은 본인만 회의에서 나가게 됩니다.',
)

function initialsFromName(name) {
  return (name || '참석자').trim().slice(0, 1) || '참'
}

function normalizeParticipantIdentity(identity) {
  return String(identity || '').trim()
}

function extractParticipantUserId(identity) {
  const normalized = normalizeParticipantIdentity(identity)
  if (!normalized) return ''
  if (/^[0-9a-fA-F-]{36}$/.test(normalized)) {
    return normalized
  }
  if (normalized.startsWith('user-')) {
    return normalized.slice(5)
  }
  return ''
}

function clearTileFocus() {
  const shouldRestoreSidePanel = selectedTileKey.value && !sideCollapsedBeforeFocus.value
  selectedTileKey.value = ''
  showFilmstripInFocus.value = false
  if (shouldRestoreSidePanel) {
    isMeetingSideCollapsed.value = false
  }
}

function currentParticipantIdentity() {
  return normalizeParticipantIdentity(meetingConnection.value?.participantIdentity || '')
}

function openGuestLinkDialog() {
  moreMenuOpen.value = false
  guestLinkCopyStatus.value = '게스트 링크를 확인하고 복사할 수 있습니다.'
  guestLinkDialogOpen.value = true
}

function closeGuestLinkDialog() {
  guestLinkDialogOpen.value = false
}

function openMeetingSettings() {
  moreMenuOpen.value = false
  meetingSettingsOpen.value = true
}

function toggleSidePanel(panel) {
  moreMenuOpen.value = false
  if (activeSidePanel.value === panel && !isMeetingSideCollapsed.value) {
    isMeetingSideCollapsed.value = true
    return
  }

  activeSidePanel.value = panel
  isMeetingSideCollapsed.value = false
}

function toggleMeetingSidePanel() {
  moreMenuOpen.value = false
  isMeetingSideCollapsed.value = !isMeetingSideCollapsed.value
  if (!isMeetingSideCollapsed.value && !activeSidePanel.value) {
    activeSidePanel.value = DEFAULT_SIDE_PANEL
  }
}

function toggleMoreMenu() {
  moreMenuOpen.value = !moreMenuOpen.value
}

function closeMeetingSettings() {
  meetingSettingsOpen.value = false
}

function openHostTransferDialog() {
  moreMenuOpen.value = false
  hostTransferStatus.value = ''
  const fallbackCandidate = hostTransferCandidates.value[0]
  hostTransferTargetUserId.value = extractParticipantUserId(fallbackCandidate?.identity) || ''
  hostTransferDialogOpen.value = true
}

function closeHostTransferDialog() {
  hostTransferDialogOpen.value = false
  hostTransferStatus.value = ''
}

function openMeetingEndConfirm() {
  if (meetingEndPending.value) return
  moreMenuOpen.value = false
  meetingEndConfirmOpen.value = true
}

function closeMeetingEndConfirm() {
  meetingEndConfirmOpen.value = false
}

async function copyGuestMeetingLink() {
  if (!guestMeetingLink.value) {
    guestLinkCopyStatus.value = '회의 링크를 만들 수 없습니다.'
    return
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(guestMeetingLink.value)
    } else if (guestLinkInput.value) {
      guestLinkInput.value.focus()
      guestLinkInput.value.select()
      document.execCommand('copy')
    } else {
      throw new Error('clipboard unavailable')
    }
    guestLinkCopyStatus.value = '게스트 링크를 복사했습니다.'
  } catch {
    guestLinkCopyStatus.value = '복사에 실패했습니다. 링크를 직접 선택해 복사하세요.'
  }
}

function stopAudioTest() {
  if (microphoneAnimationFrame) cancelAnimationFrame(microphoneAnimationFrame)
  microphoneAnimationFrame = null
  microphoneSource?.disconnect()
  microphoneAnalyser?.disconnect()
  microphoneSource = null
  microphoneAnalyser = null
  speakerTestTrack?.stop()
  speakerTestTrack = null
  speakerTestStream = null
  if (speakerTestAudio.value) {
    speakerTestAudio.value.pause()
    speakerTestAudio.value.srcObject = null
  }
  if (audioContext) audioContext.close()
  audioContext = null
  microphoneLevel.value = 0
  testingAudio.value = false
}

function stopLocalSpeechLatencyMonitor() {
  if (speechLatencyAnimationFrame) cancelAnimationFrame(speechLatencyAnimationFrame)
  speechLatencyAnimationFrame = null
  speechLatencySource?.disconnect()
  speechLatencyAnalyser?.disconnect()
  speechLatencySource = null
  speechLatencyAnalyser = null
  speechLatencyStream?.getTracks().forEach((track) => track.stop())
  speechLatencyStream = null
  if (speechLatencyAudioContext) speechLatencyAudioContext.close()
  speechLatencyAudioContext = null
  speechLatencyTrackId = ''
  localSpeechIsActive = false
  localSpeechLastDetectedAtMs = 0
  pendingSpeechDetectionQueue.length = 0
}

function buildApiUrl(path) {
  const normalizedBaseUrl = API_BASE_URL.replace(/\/+$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBaseUrl}${normalizedPath}`
}

function showMeetingEndedScreen(message = '해당 회의는 종료되었습니다.') {
  meetingEndedScreenVisible.value = true
  meetingEndedScreenMessage.value = message
  inLobby.value = false
  meetingConnectionStatus.value = '회의 종료됨'
  meetingConnectionError.value = ''
  meetingEndConfirmOpen.value = false
}

function resolveMeetingEndedMessage(event) {
  const rawReason = String(event?.reason || '').trim()
  if (!rawReason || rawReason === 'host-ended' || rawReason === 'host-unload') {
    return '해당 회의는 종료되었습니다.'
  }
  return rawReason
}

function goToMeetingsPage() {
  fallbackNavigate('/app/meetings')
}

function goToMinutesPage() {
  fallbackNavigate('/app/minutes')
}

function fallbackNavigate(path) {
  router.push(path).catch(() => {})
  window.setTimeout(() => {
    if (window.location.pathname === path) return
    window.location.replace(path)
  }, 60)
}

function attemptCloseMeetingWindow(fallbackPath) {
  // 명시적 종료/나가기 버튼은 사용자가 직접 눌렀으므로 창 닫기 허용 가능성이 가장 높다.
  // 먼저 부모 창을 다시 보이게 하고, 닫기 실패 시에는 즉시 회의 목록/회의록으로 보낸다.
  try {
    window.opener?.focus?.()
  } catch {
    // no-op
  }

  try {
    window.close()
  } catch {
    // no-op
  }

  window.setTimeout(() => {
    if (window.closed) return

    try {
      window.opener = null
      window.open('', '_self')
      window.close()
    } catch {
      // no-op
    }

    window.setTimeout(() => {
      if (!window.closed) {
        fallbackNavigate(fallbackPath)
      }
    }, 80)
  }, 80)
}

function closeMeetingPage() {
  if (isDedicatedMeetingWindow.value) {
    attemptCloseMeetingWindow(popupReturnPath.value)
    return
  }

  fallbackNavigate('/app/meetings')
}

function navigateAfterMeetingExit() {
  if (isDedicatedMeetingWindow.value) {
    attemptCloseMeetingWindow(popupReturnPath.value)
    return
  }

  fallbackNavigate(auth.isAuthenticated ? '/app/minutes' : '/login')
}

function prunePendingSpeechDetectionQueue(nowMs = Date.now()) {
  while (
    pendingSpeechDetectionQueue.length > 0 &&
    nowMs - pendingSpeechDetectionQueue[0] > LOCAL_SPEECH_TO_CAPTION_MATCH_WINDOW_MS
  ) {
    pendingSpeechDetectionQueue.shift()
  }
}

function recordPendingSpeechDetection(detectedAtMs) {
  prunePendingSpeechDetectionQueue(detectedAtMs)
  // 여러 번의 미세 잡음으로 큐가 길어지면 체감 지연 측정이 왜곡된다.
  // 화면 자막과 비교할 때는 가장 최근 로컬 발화 시작만 유지하는 편이 맞다.
  pendingSpeechDetectionQueue.length = 0
  pendingSpeechDetectionQueue.push(detectedAtMs)
}

function matchPendingSpeechDetection(renderedAtMs) {
  prunePendingSpeechDetectionQueue(renderedAtMs)
  if (!pendingSpeechDetectionQueue.length) return null

  const matchedDetectedAtMs = pendingSpeechDetectionQueue[pendingSpeechDetectionQueue.length - 1]
  pendingSpeechDetectionQueue.length = 0
  if (renderedAtMs - matchedDetectedAtMs > LOCAL_SPEECH_TO_CAPTION_MATCH_WINDOW_MS) {
    return null
  }
  return matchedDetectedAtMs
}

function formatCaptionReceivedTime(timestampMs) {
  return new Date(timestampMs).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function formatMeasurementTime(timestampMs) {
  const date = new Date(timestampMs)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0')
  return `${hours}:${minutes}:${seconds}.${milliseconds}`
}

function stopPreview() {
  stopAudioTest()
  previewStream.value?.getTracks().forEach((track) => track.stop())
  previewStream.value = null
  if (previewVideo.value) previewVideo.value.srcObject = null
}

function deviceLabel(device, index, fallback) {
  return device.label || `${fallback} ${index + 1}`
}

async function loadDeviceList() {
  const devices = await navigator.mediaDevices.enumerateDevices()
  audioInputs.value = devices
    .filter((device) => device.kind === 'audioinput')
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: deviceLabel(device, index, '마이크'),
    }))
  audioOutputs.value = devices
    .filter((device) => device.kind === 'audiooutput')
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: deviceLabel(device, index, '스피커'),
    }))
  videoInputs.value = devices
    .filter((device) => device.kind === 'videoinput')
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: deviceLabel(device, index, '카메라'),
    }))

  if (!audioInputs.value.some((device) => device.deviceId === selectedAudioInput.value)) {
    selectedAudioInput.value = audioInputs.value[0]?.deviceId || ''
  }
  if (!audioOutputs.value.some((device) => device.deviceId === selectedAudioOutput.value)) {
    selectedAudioOutput.value = audioOutputs.value[0]?.deviceId || ''
  }
  if (!videoInputs.value.some((device) => device.deviceId === selectedVideoInput.value)) {
    selectedVideoInput.value = videoInputs.value[0]?.deviceId || ''
  }
}

async function restartPreview() {
  if (!navigator.mediaDevices?.getUserMedia) return

  stopAudioTest()
  stopPreview()
  const constraints = {
    audio: selectedAudioInput.value
      ? { deviceId: { exact: selectedAudioInput.value } }
      : audioInputs.value.length > 0,
    video: selectedVideoInput.value
      ? { deviceId: { exact: selectedVideoInput.value } }
      : videoInputs.value.length > 0,
  }

  if (!constraints.audio && !constraints.video) {
    deviceError.value = true
    deviceStatus.value = '연결된 마이크와 카메라를 찾을 수 없습니다.'
    return
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    stream.getAudioTracks().forEach((track) => {
      track.enabled = mic.value
    })
    stream.getVideoTracks().forEach((track) => {
      track.enabled = cam.value
    })
    previewStream.value = stream
    await nextTick()
    if (previewVideo.value) {
      previewVideo.value.srcObject = stream
      await applySpeaker()
    }
    deviceError.value = false
    deviceStatus.value = '장치가 연결되었습니다.'
  } catch (error) {
    deviceError.value = true
    deviceStatus.value = mediaErrorMessage(error)
  }
}

async function handleAudioInputSelection() {
  if (inLobby.value) {
    await restartPreview()
    return
  }

  if (!meetingRoom.value?.localParticipant || !mic.value) {
    deviceError.value = false
    deviceStatus.value = '다음 마이크 사용 시 선택한 장치를 적용합니다.'
    return
  }

  try {
    lastMicPublishError.value = ''
    await meetingRoom.value.localParticipant.setMicrophoneEnabled(
      true,
      selectedAudioInput.value ? { deviceId: selectedAudioInput.value } : undefined,
    )
    await restartLocalSpeechLatencyMonitor(meetingRoom.value)
    deviceError.value = false
    deviceStatus.value = '마이크 장치를 변경했습니다.'
    syncParticipantsFromRoom()
  } catch (error) {
    lastMicPublishError.value = error?.message || '마이크 장치를 변경하지 못했습니다.'
    deviceError.value = true
    deviceStatus.value = error?.message || '마이크 장치를 변경하지 못했습니다.'
  }
}

async function handleVideoInputSelection() {
  if (inLobby.value) {
    await restartPreview()
    return
  }

  if (!meetingRoom.value?.localParticipant || !cam.value) {
    deviceError.value = false
    deviceStatus.value = '다음 카메라 사용 시 선택한 장치를 적용합니다.'
    return
  }

  try {
    await meetingRoom.value.localParticipant.setCameraEnabled(
      true,
      selectedVideoInput.value ? { deviceId: selectedVideoInput.value } : undefined,
      { source: Track.Source.Camera },
    )
    deviceError.value = false
    deviceStatus.value = '카메라 장치를 변경했습니다.'
    syncParticipantsFromRoom()
  } catch (error) {
    deviceError.value = true
    deviceStatus.value = error?.message || '카메라 장치를 변경하지 못했습니다.'
  }
}

async function initializeDevices() {
  if (!navigator.mediaDevices?.enumerateDevices || !navigator.mediaDevices?.getUserMedia) {
    deviceError.value = true
    deviceStatus.value = '이 브라우저에서는 미디어 장치 접근을 지원하지 않습니다.'
    return
  }

  loadingDevices.value = true
  deviceError.value = false
  deviceStatus.value = '마이크와 카메라 권한을 확인하고 있습니다.'

  try {
    const permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
    permissionStream.getTracks().forEach((track) => track.stop())
    await loadDeviceList()
    await restartPreview()
  } catch (error) {
    await loadDeviceList()
    deviceError.value = true
    deviceStatus.value = mediaErrorMessage(error)
  } finally {
    loadingDevices.value = false
  }
}

function mediaErrorMessage(error) {
  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
    return '마이크와 카메라 권한이 필요합니다. 브라우저 주소창의 권한 설정을 확인하세요.'
  }
  if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
    return '사용 가능한 마이크 또는 카메라를 찾을 수 없습니다.'
  }
  if (error?.name === 'NotReadableError' || error?.name === 'TrackStartError') {
    return '다른 앱에서 장치를 사용 중입니다. 장치를 닫고 다시 시도하세요.'
  }
  return '미디어 장치를 불러오지 못했습니다. 연결 상태를 확인하고 다시 시도하세요.'
}

async function applyOutputDevice(element) {
  if (!element || !supportsSpeakerSelection.value || !selectedAudioOutput.value) return
  try {
    await element.setSinkId(selectedAudioOutput.value)
  } catch {
    deviceError.value = true
    deviceStatus.value = '선택한 스피커를 사용할 수 없습니다. 브라우저 설정을 확인하세요.'
  }
}

async function applySpeaker() {
  await applyOutputDevice(previewVideo.value)
  await applyOutputDevice(speakerTestAudio.value)

  await Promise.all(
    Array.from(remoteAudioBindings.values()).map(({ element }) => applyOutputDevice(element)),
  )
}

async function toggleAudioTest() {
  if (testingAudio.value) {
    stopAudioTest()
    return
  }

  const audioTrack = previewStream.value?.getAudioTracks()[0]
  if (!audioTrack || !mic.value) return

  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) {
    deviceError.value = true
    deviceStatus.value = '이 브라우저에서는 오디오 테스트를 지원하지 않습니다.'
    return
  }

  speakerTestTrack = audioTrack.clone()
  speakerTestTrack.enabled = true
  speakerTestStream = new MediaStream([speakerTestTrack])
  audioContext = new AudioContextClass()
  await audioContext.resume()
  microphoneSource = audioContext.createMediaStreamSource(speakerTestStream)
  microphoneAnalyser = audioContext.createAnalyser()
  microphoneAnalyser.fftSize = 256
  microphoneAnalyser.smoothingTimeConstant = 0.75
  microphoneSource.connect(microphoneAnalyser)
  let started = true
  if (speakerTestAudio.value) {
    speakerTestAudio.value.srcObject = speakerTestStream
    await applyOutputDevice(speakerTestAudio.value)
    await speakerTestAudio.value.play().catch(() => {
      started = false
      deviceError.value = true
      deviceStatus.value = '오디오 테스트를 시작하지 못했습니다. 브라우저 자동 재생 설정을 확인하세요.'
    })
  }
  if (!started) {
    stopAudioTest()
    return
  }
  testingAudio.value = true

  const samples = new Uint8Array(microphoneAnalyser.fftSize)
  const updateLevel = () => {
    if (!microphoneAnalyser) return
    microphoneAnalyser.getByteTimeDomainData(samples)
    const sum = samples.reduce((total, sample) => {
      const normalized = (sample - 128) / 128
      return total + normalized * normalized
    }, 0)
    const rootMeanSquare = Math.sqrt(sum / samples.length)
    microphoneLevel.value = Math.min(100, Math.round(rootMeanSquare * 320))
    microphoneAnimationFrame = requestAnimationFrame(updateLevel)
  }
  updateLevel()
}

function createParticipantState(participant, isLocal, previousState) {
  const videoPublications = Array.from(participant.videoTrackPublications.values())
  const audioPublications = Array.from(participant.audioTrackPublications.values())
  const cameraPublication = videoPublications.find((publication) => publication.source === Track.Source.Camera)
  const screenPublication = videoPublications.find((publication) => publication.source === Track.Source.ScreenShare)
  const microphonePublication = audioPublications.find((publication) => publication.source === Track.Source.Microphone)
  const hasActiveScreenTrack =
    Boolean(screenPublication?.videoTrack) &&
    !screenPublication.isMuted &&
    !screenShareInactiveParticipantIds.value.has(participant.identity)

  return {
    key: participant.identity || (isLocal ? 'local-participant' : crypto.randomUUID()),
    identity: participant.identity || previousState?.identity || '',
    name: participant.name || previousState?.name || '게스트',
    isLocal,
    joinedAt: previousState?.joinedAt || Date.now(),
    micEnabled: microphonePublication ? !microphonePublication.isMuted : (isLocal ? mic.value : false),
    cameraEnabled: cameraPublication ? !cameraPublication.isMuted : (isLocal ? cam.value : false),
    screenShareEnabled: hasActiveScreenTrack ? true : (isLocal ? screenShareEnabled.value : false),
    cameraTrack: cameraPublication?.videoTrack || null,
    screenTrack: hasActiveScreenTrack ? screenPublication.videoTrack : null,
  }
}

function isInternalMeetingParticipant(participant) {
  if (!participant) return false

  const identity = normalizeParticipantIdentity(participant.identity)
  const name = String(participant.name || '').trim()
  return identity.startsWith('stt-') || name === 'Meetbowl STT'
}

function markScreenShareInactive(identity) {
  const normalized = normalizeParticipantIdentity(identity)
  if (!normalized) return
  const next = new Set(screenShareInactiveParticipantIds.value)
  next.add(normalized)
  screenShareInactiveParticipantIds.value = next
}

function markScreenShareActive(identity) {
  const normalized = normalizeParticipantIdentity(identity)
  if (!normalized) return
  if (!screenShareInactiveParticipantIds.value.has(normalized)) return
  const next = new Set(screenShareInactiveParticipantIds.value)
  next.delete(normalized)
  screenShareInactiveParticipantIds.value = next
}

function syncParticipantsFromRoom(room = meetingRoom.value) {
  if (!room) {
    participantStateMap.value = new Map()
    screenShareEnabled.value = false
    localAudioPublicationCount.value = 0
    queueMediaSync()
    return
  }

  const nextStateMap = new Map()
  const previousStateMap = participantStateMap.value

  const localIdentity = room.localParticipant.identity || meetingConnection.value?.participantIdentity || 'local-participant'
  const localPrevious = previousStateMap.get(localIdentity)
  nextStateMap.set(localIdentity, createParticipantState(room.localParticipant, true, localPrevious))
  localAudioPublicationCount.value = Array.from(
    room.localParticipant.audioTrackPublications.values(),
  ).filter((publication) => publication.source === Track.Source.Microphone).length

  Array.from(room.remoteParticipants.values()).forEach((participant) => {
    if (isInternalMeetingParticipant(participant)) return
    const previousState = previousStateMap.get(participant.identity)
    nextStateMap.set(participant.identity, createParticipantState(participant, false, previousState))
  })

  participantStateMap.value = nextStateMap
  screenShareEnabled.value = nextStateMap.get(localIdentity)?.screenShareEnabled || false
  if (selectedTileKey.value && !participantMediaTiles.value.some((tile) => tile.key === selectedTileKey.value)) {
    clearTileFocus()
  }
  if (fullscreenTileKey.value && !participantMediaTiles.value.some((tile) => tile.key === fullscreenTileKey.value)) {
    void exitMeetingFullscreen()
  }
  if (!hasScreenShareTile.value) {
    showFilmstripInFocus.value = false
  } else {
    nextStateMap.forEach((participant) => {
      if (participant.screenTrack) {
        screenShareInactiveParticipantIds.value.delete(participant.identity)
      }
    })
  }
  queueMediaSync()
}

function toggleTileFocus(tileKey) {
  if (participantMediaTiles.value.length <= 1) {
    return
  }

  if (selectedTileKey.value === tileKey) {
    clearTileFocus()
    return
  }

  if (!selectedTileKey.value) {
    sideCollapsedBeforeFocus.value = isMeetingSideCollapsed.value
  }
  selectedTileKey.value = tileKey
  showFilmstripInFocus.value = false
  isMeetingSideCollapsed.value = sideCollapsedBeforeFocus.value
}

function openFocusSidePanel(panel = 'people') {
  activeSidePanel.value = panel
  isMeetingSideCollapsed.value = false
  showFilmstripInFocus.value = false
}

function openFocusFilmstrip() {
  showFilmstripInFocus.value = true
}

function showPreviousFilmstripPage() {
  focusFilmstripPage.value = Math.max(0, focusFilmstripPage.value - 1)
}

function showNextFilmstripPage() {
  focusFilmstripPage.value = Math.min(focusFilmstripPageCount.value - 1, focusFilmstripPage.value + 1)
}

function goToPreviousGridPage() {
  currentGridPage.value = Math.max(0, currentGridPage.value - 1)
}

function goToNextGridPage() {
  currentGridPage.value = Math.min(totalGridPages.value - 1, currentGridPage.value + 1)
}

function setTileRef(tileKey) {
  return (element) => {
    if (!element) {
      tileElements.delete(tileKey)
      return
    }

    tileElements.set(tileKey, element)
  }
}

function isTileFullscreen(tileKey) {
  return fullscreenTileKey.value === tileKey
}

async function toggleSharedScreenFullscreen(tileKey) {
  const tile = participantMediaTiles.value.find((candidate) => candidate.key === tileKey)
  if (!tile || tile.type !== 'screen') return

  const element = tileElements.get(tileKey)
  if (!element?.requestFullscreen) return

  if (document.fullscreenElement === element) {
    await exitMeetingFullscreen()
    return
  }

  try {
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen().catch(() => {})
    }
    await element.requestFullscreen()
    fullscreenTileKey.value = tileKey
  } catch {
    // 공유 화면 타일만 브라우저 전체화면으로 확장한다.
  }
}

async function exitMeetingFullscreen() {
  if (!document.fullscreenElement || !document.exitFullscreen) return

  try {
    await document.exitFullscreen()
  } catch {
    // 전체화면 해제 실패는 현재 화면 복구를 막지 않는다.
  } finally {
    fullscreenTileKey.value = ''
  }
}

function handleFullscreenChange() {
  if (!document.fullscreenElement) {
    fullscreenTileKey.value = ''
    return
  }

  const activeEntry = Array.from(tileElements.entries()).find(([, element]) => element === document.fullscreenElement)
  fullscreenTileKey.value = activeEntry?.[0] || ''
}

function cleanupTileBinding(tileKey) {
  const binding = tileTrackBindings.get(tileKey)
  const element = tileMediaElements.get(tileKey)
  if (binding?.track && element) {
    binding.track.detach(element)
  }
  tileTrackBindings.delete(tileKey)
}

function queueMediaSync() {
  if (mediaSyncQueued) return
  mediaSyncQueued = true
  nextTick(() => {
    mediaSyncQueued = false
    syncTileMediaElements()
  })
}

function syncTileMediaElements() {
  const currentTiles = new Map(participantMediaTiles.value.map((tile) => [tile.key, tile]))

  Array.from(tileTrackBindings.keys()).forEach((tileKey) => {
    if (!currentTiles.has(tileKey)) cleanupTileBinding(tileKey)
  })

  currentTiles.forEach((tile, tileKey) => {
    const element = tileMediaElements.get(tileKey)
    if (!element) return

    const previousBinding = tileTrackBindings.get(tileKey)
    if (!tile.track) {
      if (previousBinding?.track) previousBinding.track.detach(element)
      tileTrackBindings.delete(tileKey)
      element.srcObject = null
      return
    }

    const nextTrackId = tile.track.sid || tile.track.mediaStreamTrack.id
    if (previousBinding?.trackId === nextTrackId) return

    if (previousBinding?.track) previousBinding.track.detach(element)
    tile.track.attach(element)
    element.autoplay = true
    element.playsInline = true
    element.muted = tile.isLocal
    tileTrackBindings.set(tileKey, { track: tile.track, trackId: nextTrackId })
  })
}

function setTileMediaRef(tileKey) {
  return (element) => {
    if (!element) {
      cleanupTileBinding(tileKey)
      tileMediaElements.delete(tileKey)
      return
    }

    tileMediaElements.set(tileKey, element)
    queueMediaSync()
  }
}

async function attachRemoteAudioTrack(track) {
  const bindingKey = track.sid || track.mediaStreamTrack.id
  if (remoteAudioBindings.has(bindingKey)) return

  const element = track.attach()
  element.autoplay = true
  element.playsInline = true
  element.className = 'sr-only-audio'
  await applyOutputDevice(element)
  document.body.appendChild(element)
  remoteAudioBindings.set(bindingKey, { track, element })
}

function resolvePreviewTrack(kind) {
  return previewStream.value?.getTracks().find((track) => track.kind === kind) || null
}

function currentMicrophonePublication(room = meetingRoom.value) {
  return Array.from(
    room?.localParticipant?.audioTrackPublications?.values?.() || [],
  ).find((publication) => publication.source === Track.Source.Microphone)
}

function resolveLocalMicrophoneMediaStreamTrack(room = meetingRoom.value) {
  const publication = currentMicrophonePublication(room)
  return publication?.audioTrack?.mediaStreamTrack || publication?.track?.mediaStreamTrack || null
}

function currentCameraPublication(room = meetingRoom.value) {
  return Array.from(
    room?.localParticipant?.videoTrackPublications?.values?.() || [],
  ).find((publication) => publication.source === Track.Source.Camera)
}

function currentScreenSharePublication(room = meetingRoom.value) {
  return Array.from(
    room?.localParticipant?.videoTrackPublications?.values?.() || [],
  ).find((publication) => publication.source === Track.Source.ScreenShare)
}

async function publishLocalPreviewTrack(room, kind, source) {
  const previewTrack = resolvePreviewTrack(kind)
  if (!previewTrack) return false

  // 로비에서 이미 확보한 track을 먼저 publish하면 회의 입장 시점의 재권한 요청 실패를 줄일 수 있다.
  await room.localParticipant.publishTrack(previewTrack.clone(), { source })
  return true
}

async function publishSelectedMicrophoneTrack(room) {
  const track = await createLocalAudioTrack(
    selectedAudioInput.value ? { deviceId: selectedAudioInput.value } : undefined,
  )
  await room.localParticipant.publishTrack(track, { source: Track.Source.Microphone })
}

async function publishSelectedCameraTrack(room) {
  const track = await createLocalVideoTrack(
    selectedVideoInput.value ? { deviceId: selectedVideoInput.value } : undefined,
  )
  await room.localParticipant.publishTrack(track, { source: Track.Source.Camera })
}

async function ensureLocalMicrophonePublished(room) {
  if (!mic.value) return
  if (currentMicrophonePublication(room)) return

  lastMicPublishError.value = ''

  try {
    const publishedWithPreviewTrack = await publishLocalPreviewTrack(
      room,
      'audio',
      Track.Source.Microphone,
    )
    if (publishedWithPreviewTrack && currentMicrophonePublication(room)) return
  } catch (error) {
    lastMicPublishError.value = error?.message || '로비 마이크 track publish에 실패했습니다.'
  }

  try {
    // LiveKit 테스트 페이지에서 실제 publish 검증에 쓰는 경로와 맞춰서
    // createLocalAudioTrack -> publishTrack 순서로 한 번 더 시도한다.
    await publishSelectedMicrophoneTrack(room)
  } catch (error) {
    lastMicPublishError.value = error?.message || '선택한 마이크 track을 발행하지 못했습니다.'
  }

  if (currentMicrophonePublication(room)) return

  try {
    await room.localParticipant.setMicrophoneEnabled(
      true,
      selectedAudioInput.value ? { deviceId: selectedAudioInput.value } : undefined,
      { source: Track.Source.Microphone },
    )
  } catch (error) {
    lastMicPublishError.value = error?.message || '마이크 track을 발행하지 못했습니다.'
  }

  if (!currentMicrophonePublication(room) && !lastMicPublishError.value) {
    lastMicPublishError.value =
      room.localParticipant.lastMicrophoneError?.message || '마이크 track이 발행되지 않았습니다.'
  }
}

async function restartLocalSpeechLatencyMonitor(room = meetingRoom.value) {
  if (!room?.localParticipant || !mic.value) {
    stopLocalSpeechLatencyMonitor()
    return
  }

  const mediaStreamTrack = resolveLocalMicrophoneMediaStreamTrack(room)
  if (!mediaStreamTrack) {
    stopLocalSpeechLatencyMonitor()
    return
  }

  const nextTrackId = mediaStreamTrack.id || currentMicrophonePublication(room)?.trackSid || 'local-mic'
  if (speechLatencyTrackId === nextTrackId && speechLatencyAnalyser) return

  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return

  stopLocalSpeechLatencyMonitor()

  // 회의 중 체감 지연은 STT 서버 시각이 아니라 브라우저에서 로컬 마이크 입력이 감지된 순간을 기준으로 잡는다.
  // 그래서 실제 publish 중인 마이크 track을 복제해 별도 analyser에 연결한다.
  const clonedTrack = mediaStreamTrack.clone()
  speechLatencyStream = new MediaStream([clonedTrack])
  speechLatencyTrackId = nextTrackId
  speechLatencyAudioContext = new AudioContextClass()
  await speechLatencyAudioContext.resume()
  speechLatencySource = speechLatencyAudioContext.createMediaStreamSource(speechLatencyStream)
  speechLatencyAnalyser = speechLatencyAudioContext.createAnalyser()
  speechLatencyAnalyser.fftSize = 1024
  speechLatencyAnalyser.smoothingTimeConstant = 0.2
  speechLatencySource.connect(speechLatencyAnalyser)

  const samples = new Uint8Array(speechLatencyAnalyser.fftSize)
  const updateSpeechLatency = () => {
    if (!speechLatencyAnalyser) return

    speechLatencyAnalyser.getByteTimeDomainData(samples)
    const sum = samples.reduce((total, sample) => {
      const normalized = (sample - 128) / 128
      return total + normalized * normalized
    }, 0)
    const rootMeanSquare = Math.sqrt(sum / samples.length)
    const nowMs = Date.now()

    if (rootMeanSquare >= LOCAL_SPEECH_MEASUREMENT_RMS_THRESHOLD) {
      localSpeechLastDetectedAtMs = nowMs
      if (!localSpeechIsActive) {
        localSpeechIsActive = true
        lastLocalSpeechDetectedAtMs.value = nowMs
        recordPendingSpeechDetection(nowMs)
      }
    } else if (
      localSpeechIsActive &&
      nowMs - localSpeechLastDetectedAtMs >= LOCAL_SPEECH_MEASUREMENT_SILENCE_MS
    ) {
      localSpeechIsActive = false
    }

    speechLatencyAnimationFrame = requestAnimationFrame(updateSpeechLatency)
  }

  updateSpeechLatency()
}

async function ensureLocalCameraPublished(room) {
  if (!cam.value) return
  if (currentCameraPublication(room)) return

  try {
    const publishedWithPreviewTrack = await publishLocalPreviewTrack(
      room,
      'video',
      Track.Source.Camera,
    )
    if (publishedWithPreviewTrack && currentCameraPublication(room)) return
  } catch {
    // 카메라는 진단보다 연결 유지가 중요하므로 기본 LiveKit 경로로 바로 fallback 한다.
  }

  try {
    await publishSelectedCameraTrack(room)
    if (currentCameraPublication(room)) return
  } catch {
    // 카메라도 명시적 publish가 실패하면 기존 LiveKit helper 경로로 마지막 한 번 더 시도한다.
  }

  await room.localParticipant.setCameraEnabled(
    true,
    selectedVideoInput.value ? { deviceId: selectedVideoInput.value } : undefined,
    { source: Track.Source.Camera },
  )
}

function detachRemoteAudioTrack(track) {
  const bindingKey = track.sid || track.mediaStreamTrack.id
  const binding = remoteAudioBindings.get(bindingKey)
  if (!binding) return

  binding.track.detach(binding.element)
  binding.element.remove()
  remoteAudioBindings.delete(bindingKey)
}

function clearRemoteAudioBindings() {
  Array.from(remoteAudioBindings.values()).forEach(({ track, element }) => {
    track.detach(element)
    element.remove()
  })
  remoteAudioBindings.clear()
}

function resetMeetingSessionState(options = {}) {
  const { preserveEndedView = false } = options
  captionMap.value = new Map()
  feedbackMap.value = new Map()
  feedbackSessionId.value = ''
  participantStateMap.value = new Map()
  chatMessages.value = []
  lastCaptionReceivedAt.value = null
  lastCaptionText.value = ''
  lastCaptionPublishedAtMs.value = null
  lastCaptionStartedAtEpochMs.value = null
  lastCaptionTransportLatencyMs.value = null
  lastCaptionEndToEndLatencyMs.value = null
  lastLocalSpeechDetectedAtMs.value = null
  lastCaptionRenderedAtMs.value = null
  lastSpeechToCaptionLatencyMs.value = null
  meetingConnectionError.value = ''
  screenShareEnabled.value = false
  meetingConnection.value = null
  meetingSettingsOpen.value = false
  moreMenuOpen.value = false
  isMeetingSideCollapsed.value = false
  activeSidePanel.value = DEFAULT_SIDE_PANEL
  fullscreenTileKey.value = ''
  clearTileFocus()
  screenSharePending.value = false
  sttRuntimeStatus.value = ''
  lastDataChannelReceivedAt.value = null
  lastDataChannelEventType.value = ''
  lastMicPublishError.value = ''
  localTrackPublishedCount.value = 0
  localTrackUnpublishedCount.value = 0
  lastLocalTrackEvent.value = ''
  localAudioPublicationCount.value = 0
  captionFollowLatest.value = true
  hasCaptionOverflow.value = false
  isNearCaptionBottom.value = true
  ignoreNextCaptionScrollEvent.value = false
  screenShareInactiveParticipantIds.value = new Set()
  meetingEndPending.value = false
  meetingStartReported.value = false
  if (!preserveEndedView) {
    meetingEndHandled.value = false
    meetingEndedScreenVisible.value = false
    meetingEndedScreenMessage.value = '해당 회의는 종료되었습니다.'
  }
  hostTransferDialogOpen.value = false
  hostTransferTargetUserId.value = ''
  hostTransferStatus.value = ''
  connectedAt.value = null
  elapsedSeconds.value = 0
  clearInterval(elapsedTimer)
  elapsedTimer = null
  if (captionScrollRaf) {
    cancelAnimationFrame(captionScrollRaf)
    captionScrollRaf = null
  }
  tileElements.clear()
  Array.from(tileTrackBindings.keys()).forEach((tileKey) => cleanupTileBinding(tileKey))
  tileMediaElements.clear()
  clearRemoteAudioBindings()
  stopLocalSpeechLatencyMonitor()
}

function updateCaptionScrollState() {
  if (!captionLog.value) {
    hasCaptionOverflow.value = false
    isNearCaptionBottom.value = true
    return
  }

  const { scrollTop, scrollHeight, clientHeight } = captionLog.value
  const overflow = scrollHeight - clientHeight > 4
  const distanceToBottom = scrollHeight - clientHeight - scrollTop
  const nearBottom = distanceToBottom <= 36

  hasCaptionOverflow.value = overflow
  isNearCaptionBottom.value = !overflow || nearBottom
}

function scrollCaptionsToLatest() {
  if (!captionLog.value) return
  ignoreNextCaptionScrollEvent.value = true
  captionLog.value.scrollTop = captionLog.value.scrollHeight
  updateCaptionScrollState()
  captionFollowLatest.value = true
}

function scheduleCaptionScrollToLatest() {
  if (captionScrollRaf) cancelAnimationFrame(captionScrollRaf)
  captionScrollRaf = requestAnimationFrame(() => {
    captionScrollRaf = null
    scrollCaptionsToLatest()
  })
}

function handleCaptionScroll() {
  if (ignoreNextCaptionScrollEvent.value) {
    ignoreNextCaptionScrollEvent.value = false
    updateCaptionScrollState()
    return
  }

  updateCaptionScrollState()
  captionFollowLatest.value = isNearCaptionBottom.value
}

function startElapsedTimer() {
  clearInterval(elapsedTimer)
  elapsedTimer = setInterval(() => {
    if (!connectedAt.value) return
    elapsedSeconds.value = Math.max(0, Math.floor((Date.now() - connectedAt.value) / 1000))
  }, 1000)
}

async function toggleMicrophone() {
  mic.value = !mic.value
  previewStream.value?.getAudioTracks().forEach((track) => {
    track.enabled = mic.value
  })

  if (!meetingRoom.value?.localParticipant) {
    if (!mic.value) stopAudioTest()
    return
  }

  lastMicPublishError.value = ''
  await meetingRoom.value.localParticipant.setMicrophoneEnabled(
    mic.value,
    selectedAudioInput.value ? { deviceId: selectedAudioInput.value } : undefined,
  ).catch((error) => {
    lastMicPublishError.value = error?.message || '마이크 상태를 변경하지 못했습니다.'
    meetingConnectionError.value = error?.message || '마이크 상태를 변경하지 못했습니다.'
  })
  if (mic.value) {
    await restartLocalSpeechLatencyMonitor(meetingRoom.value)
  } else {
    stopLocalSpeechLatencyMonitor()
  }
  syncParticipantsFromRoom()

  if (!mic.value) stopAudioTest()
}

async function toggleCamera() {
  cam.value = !cam.value
  previewStream.value?.getVideoTracks().forEach((track) => {
    track.enabled = cam.value
  })

  if (!meetingRoom.value?.localParticipant) return

  await meetingRoom.value.localParticipant.setCameraEnabled(
    cam.value,
    selectedVideoInput.value ? { deviceId: selectedVideoInput.value } : undefined,
    { source: Track.Source.Camera },
  ).catch((error) => {
    meetingConnectionError.value = error?.message || '카메라 상태를 변경하지 못했습니다.'
  })
  syncParticipantsFromRoom()
}

async function toggleScreenShare() {
  if (!meetingRoom.value?.localParticipant || screenSharePending.value) return

  const activeSharer = activeScreenShareParticipant.value
  if (activeSharer && !activeSharer.isLocal && !screenShareEnabled.value) {
    meetingConnectionError.value = `${activeSharer.name} 님이 이미 화면을 공유 중입니다.`
    return
  }

  meetingConnectionError.value = ''
  screenSharePending.value = true
  const nextEnabled = !screenShareEnabled.value
  await meetingRoom.value.localParticipant.setScreenShareEnabled(
    nextEnabled,
    { audio: false },
    { source: Track.Source.ScreenShare },
  ).catch((error) => {
    meetingConnectionError.value = error?.message || '화면 공유를 변경하지 못했습니다.'
  }).finally(() => {
    screenSharePending.value = false
  })

  if (!nextEnabled) {
    const screenPublication = currentScreenSharePublication(meetingRoom.value)
    if (screenPublication?.track) {
      await meetingRoom.value.localParticipant.unpublishTrack(screenPublication.track).catch((error) => {
        // 일부 브라우저/LiveKit 조합에서는 stop 이후 제거 호출이 불필요하거나 실패할 수 있다.
        if (!String(error?.message || '').includes('removeTrack')) {
          meetingConnectionError.value = error?.message || '화면 공유 종료 후 정리하지 못했습니다.'
        }
      })
    }
    screenShareEnabled.value = false
    showFilmstripInFocus.value = false
    clearTileFocus()
    markScreenShareInactive(meetingRoom.value.localParticipant.identity)
  } else {
    markScreenShareActive(meetingRoom.value.localParticipant.identity)
  }
  syncParticipantsFromRoom()
}

async function enterMeeting() {
  if (connectingMeeting.value) return
  if (meetingEndHandled.value || meetingEndedScreenVisible.value) {
    showMeetingEndedScreen()
    return
  }
  connectingMeeting.value = true
  meetingConnectionError.value = ''
  meetingEndedScreenVisible.value = false
  inLobby.value = false

  try {
    await connectMeetingRoom()
    stopPreview()
  } catch (error) {
    await disconnectMeetingRoom().catch(() => {})
    if (error?.code === 'MEETING_ALREADY_ENDED') {
      showMeetingEndedScreen(error?.message || '해당 회의는 종료되었습니다.')
    } else if (error?.code === 'COMMON_CONFLICT' && String(error?.message || '').includes('취소된 회의')) {
      showMeetingEndedScreen(error?.message || '취소된 회의는 입장할 수 없습니다.')
    } else if (error?.code === 'MEETING_JOIN_TOO_EARLY') {
      meetingConnectionStatus.value = '입장 대기'
      meetingConnectionError.value = error?.message || '회의 시작 15분 전부터 입장할 수 있습니다.'
      inLobby.value = true
      window.alert(meetingConnectionError.value)
    } else {
      meetingConnectionStatus.value = '연결 실패'
      meetingConnectionError.value = error?.message || '회의 연결에 실패했습니다.'
      inLobby.value = true
    }
  } finally {
    connectingMeeting.value = false
  }
}

async function connectMeetingRoom() {
  await disconnectMeetingRoom()
  const connection = await resolveLiveKitConnection({
    meetingId: meetingId.value,
    participantIdentity: auth.user?.id || '',
    displayName: pendingParticipantName.value,
    skipAuth: isGuestMeetingRoute.value || !auth.isAuthenticated,
  })

  meetingConnection.value = connection
  meetingTitleFromServer.value = String(connection.title || '').trim()
  if (connection.participantName) {
    // 게스트의 기본 이름은 서버가 번호를 붙여 다시 정할 수 있으므로, 입장 직후 로컬 화면도 그 값으로 맞춘다.
    displayName.value = connection.participantName
  }
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
  })
  bindMeetingRoomEvents(room)
  meetingConnectionStatus.value = '연결 중'
  await room.connect(connection.url, connection.token, {
    autoSubscribe: true,
  })

  meetingRoom.value = room
  connectedAt.value = Date.now()
  await reportMeetingStarted()
  startElapsedTimer()

  await ensureLocalMicrophonePublished(room)
  await ensureLocalCameraPublished(room)
  await restartLocalSpeechLatencyMonitor(room)

  syncParticipantsFromRoom(room)
  if (mic.value && !currentMicrophonePublication(room)) {
    throw new Error(lastMicPublishError.value || '회의 입장 후 마이크 track을 발행하지 못했습니다.')
  }
  meetingConnectionStatus.value = '회의 연결됨'
  pushSystemChat('회의에 입장했습니다.')
}

async function loadMeetingTitle() {
  if (meetingTitleFromServer.value) return
  const fallbackTitle = typeof route.query.title === 'string' ? route.query.title.trim() : ''
  if (fallbackTitle) return
  if (!auth.isAuthenticated || !meetingId.value) return

  try {
    const meeting = await getMeeting(meetingId.value)
    meetingTitleFromServer.value = String(meeting?.title || '').trim()
  } catch {
    // 제목 조회는 부가 정보이므로 실패해도 회의 입장 흐름은 막지 않는다.
  }
}

async function reportMeetingStarted() {
  if (meetingStartReported.value) return
  if (!meetingId.value) return

  try {
    // 회의실 사용 현황과 관리자 대시보드는 회의가 실제로 시작되면 status=IN_PROGRESS로 전환된 값을 본다.
    // 시작 API는 비로그인/게스트 경로도 허용하므로, guest 링크 입장도 연결 직후 시작 상태를 같은 방식으로 보고한다.
    await postJson(`/meetings/${meetingId.value}/start`, {})
    meetingStartReported.value = true
  } catch (error) {
    if (
      error?.code === 'MEETING_ALREADY_ENDED' ||
      (error?.code === 'COMMON_CONFLICT' && String(error?.message || '').includes('취소된 회의'))
    ) {
      throw error
    }

    console.warn('회의 시작 상태를 저장하지 못했습니다.', error)
  }
}

function bindMeetingRoomEvents(room) {
  room.on(RoomEvent.ParticipantConnected, () => {
    syncParticipantsFromRoom(room)
  })
  room.on(RoomEvent.ParticipantDisconnected, () => {
    syncParticipantsFromRoom(room)
  })
  room.on(RoomEvent.LocalTrackPublished, (publication) => {
    localTrackPublishedCount.value += 1
    lastLocalTrackEvent.value = 'published'
    if (publication?.source === Track.Source.ScreenShare) {
      markScreenShareActive(room.localParticipant.identity)
    }
    if (publication?.source === Track.Source.Microphone) {
      void restartLocalSpeechLatencyMonitor(room)
    }
    syncParticipantsFromRoom(room)
  })
  room.on(RoomEvent.LocalTrackUnpublished, (publication) => {
    localTrackUnpublishedCount.value += 1
    lastLocalTrackEvent.value = 'unpublished'
    if (publication?.source === Track.Source.ScreenShare) {
      markScreenShareInactive(room.localParticipant.identity)
    }
    if (publication?.source === Track.Source.Microphone) {
      stopLocalSpeechLatencyMonitor()
    }
    syncParticipantsFromRoom(room)
  })
  room.on(RoomEvent.MediaDevicesError, (error) => {
    lastMicPublishError.value = error?.message || '브라우저 미디어 장치 오류가 발생했습니다.'
    meetingConnectionError.value = lastMicPublishError.value
  })
  room.on(RoomEvent.TrackSubscribed, async (track, publication, participant) => {
    if (track.kind === Track.Kind.Audio) {
      await attachRemoteAudioTrack(track).catch(() => {})
    }
    if (publication?.source === Track.Source.ScreenShare) {
      markScreenShareActive(participant?.identity)
    }
    syncParticipantsFromRoom(room)
  })
  room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
    if (track.kind === Track.Kind.Audio) {
      detachRemoteAudioTrack(track)
    }
    if (publication?.source === Track.Source.ScreenShare) {
      markScreenShareInactive(participant?.identity)
    }
    syncParticipantsFromRoom(room)
  })
  room.on(RoomEvent.TrackMuted, (_track, publication, participant) => {
    if (publication?.source === Track.Source.ScreenShare) {
      markScreenShareInactive(participant?.identity)
    }
    syncParticipantsFromRoom(room)
  })
  room.on(RoomEvent.TrackUnmuted, (_track, publication, participant) => {
    if (publication?.source === Track.Source.ScreenShare) {
      markScreenShareActive(participant?.identity)
    }
    syncParticipantsFromRoom(room)
  })
  room.on(RoomEvent.DataReceived, (payload, participant, _kind, topic) => {
    handleDataChannelMessage(payload, participant, topic)
  })
  room.on(RoomEvent.Reconnecting, () => {
    meetingConnectionStatus.value = '재연결 중'
  })
  room.on(RoomEvent.Reconnected, () => {
    meetingConnectionStatus.value = '회의 연결됨'
    syncParticipantsFromRoom(room)
    if (!meetingStartReported.value) {
      void reportMeetingStarted()
    }
  })
  room.on(RoomEvent.Disconnected, () => {
    // 브라우저 탭 종료, 네트워크 단절, 명시적 leave/end 모두 결국 RTC disconnect로 보일 수 있다.
    // 즉 이 이벤트만으로는 "회의 종료"와 "내가 그냥 나감"을 구분할 수 없으므로,
    // 실제 세션 종료 판단은 별도의 `meeting.ended` DataChannel 또는 BE 종료 API 결과를 기준으로 한다.
    meetingConnectionStatus.value = '연결 종료'
    if (meetingEndHandled.value || meetingEndedScreenVisible.value) return
    resetMeetingSessionState()
  })
}

function handleDataChannelMessage(payload, participant, topic) {
  try {
    const event = JSON.parse(textDecoder.decode(payload))
    lastDataChannelReceivedAt.value = Date.now()
    lastDataChannelEventType.value = String(event?.eventType || 'unknown')

    if (event?.eventType === 'meeting.ended') {
      void handleMeetingEndedEvent(event)
      return
    }

    if (event?.eventType === 'meeting.host.changed') {
      const nextHostUserId = String(event?.newHostUserId || event?.payload?.newHostUserId || '').trim()
      if (nextHostUserId) {
        meetingConnection.value = {
          ...meetingConnection.value,
          hostUserId: nextHostUserId,
        }
        const nextHostName = String(event?.newHostName || event?.payload?.newHostName || '').trim()
        pushSystemChat(
          nextHostName ? `회의 관리자가 ${nextHostName} 님으로 이전되었습니다.` : '회의 관리자가 이전되었습니다.',
        )
      }
      return
    }

    if (event?.eventType === 'caption.updated') {
      const shouldAutoScroll = captionFollowLatest.value
      captionMap.value = upsertCaption(captionMap.value, event)
      const receivedAtMs = Date.now()
      lastCaptionReceivedAt.value = receivedAtMs
      lastCaptionText.value = event.text || event.sourceText || event.sourceTranscript || ''
      lastCaptionPublishedAtMs.value = Number.isFinite(Number(event.publishedAtMs)) ? Number(event.publishedAtMs) : null
      lastCaptionStartedAtEpochMs.value = Number.isFinite(Number(event.startedAtEpochMs)) ? Number(event.startedAtEpochMs) : null
      lastCaptionTransportLatencyMs.value =
        lastCaptionPublishedAtMs.value !== null
          ? Math.max(0, receivedAtMs - lastCaptionPublishedAtMs.value)
          : null
      lastCaptionEndToEndLatencyMs.value =
        lastCaptionStartedAtEpochMs.value !== null
          ? Math.max(0, receivedAtMs - lastCaptionStartedAtEpochMs.value)
          : null
      nextTick(() => {
        const renderedAtMs = Date.now()
        lastCaptionRenderedAtMs.value = renderedAtMs
        // 외부 caption.updated에는 화자 식별자를 싣지 않으므로,
        // 로컬 마이크에서 감지한 다음 첫 자막을 내 발화 기준 체감 지연으로 본다.
        const matchedSpeechDetectedAtMs = matchPendingSpeechDetection(renderedAtMs)
        if (matchedSpeechDetectedAtMs !== null) {
          lastLocalSpeechDetectedAtMs.value = matchedSpeechDetectedAtMs
          lastSpeechToCaptionLatencyMs.value = Math.max(0, renderedAtMs - matchedSpeechDetectedAtMs)
        }
        // 자막이 스크롤 구간에 들어간 뒤에는 사용자가 최신 문장 근처를 보고 있을 때만 자동으로 따라간다.
        if (shouldAutoScroll) {
          scheduleCaptionScrollToLatest()
        } else {
          updateCaptionScrollState()
        }
      })
      return
    }

    if (event?.eventType === 'chat.message.sent') {
      // DataChannel sender identity와 payload 값이 다를 수 있어 현재 room participant identity를 기준으로 자기 메시지를 판별한다.
      const senderIdentity = normalizeParticipantIdentity(
        participant?.identity || event.senderParticipantIdentity || event.senderUserId,
      )
      const isSelf = senderIdentity === currentParticipantIdentity()
      pushChatMessage({
        id: event.messageId,
        senderName: event.senderName || '게스트',
        senderUserId: event.senderUserId || senderIdentity,
        content: event.content || '',
        sentAt: event.sentAt || new Date().toISOString(),
        isSelf,
        isSystem: false,
      })
      return
    }

    if (event?.eventType === 'feedback.generated') {
      if (topic && topic !== 'feedback.generated') return

      const nextFeedbackMap = upsertFeedback(feedbackMap.value, event, {
        meetingId: meetingId.value,
        sessionId: feedbackSessionId.value,
      })
      if (nextFeedbackMap === feedbackMap.value) return

      feedbackMap.value = nextFeedbackMap
      if (!feedbackSessionId.value) {
        feedbackSessionId.value = sortedFeedbacks(nextFeedbackMap)[0]?.sessionId || ''
      }
      return
    }

    if (event?.eventType === 'stt.status.changed') {
      const nextStatus = event.payload?.status || event.status
      if (nextStatus) {
        sttRuntimeStatus.value = String(nextStatus)
      }
    }
  } catch {
    // Ignore non-JSON DataChannel packets.
  }
}

async function handleMeetingEndedEvent(event) {
  if (meetingEndHandled.value) return
  meetingEndHandled.value = true
  meetingConnectionStatus.value = '회의 종료됨'
  const message = resolveMeetingEndedMessage(event)
  pushSystemChat(message)
  meetingConnectionError.value = ''
  hostTransferStatus.value = ''
  showMeetingEndedScreen(message)

  // 종료 화면을 먼저 그린 뒤 room 정리를 한 틱 뒤로 미룬다.
  // 이렇게 해야 로비가 잠깐 다시 그려졌다가 종료 화면으로 바뀌는 깜빡임을 줄일 수 있다.
  nextTick(() => {
    void disconnectMeetingRoom({ preserveEndedView: true }).catch(() => {})
  })
}

function pushChatMessage(message) {
  if (!message.content?.trim()) return

  if (chatMessages.value.some((item) => item.id === message.id)) return

  chatMessages.value.push(message)
  nextTick(() => {
    if (!chatLog.value) return
    chatLog.value.scrollTop = chatLog.value.scrollHeight
  })
}

function pushSystemChat(content) {
  pushChatMessage({
    id: `system-${Date.now()}`,
    senderName: '시스템',
    senderUserId: 'system',
    content,
    sentAt: new Date().toISOString(),
    isSelf: false,
    isSystem: true,
  })
}

async function sendChat() {
  const content = chatInput.value.trim()
  if (!content || !meetingRoom.value?.localParticipant || sendingChat.value) return

  sendingChat.value = true
  const message = {
    eventType: 'chat.message.sent',
    messageId: crypto.randomUUID(),
    meetingId: meetingId.value,
    senderUserId: auth.user?.id || meetingConnection.value?.participantIdentity || 'guest',
    senderParticipantIdentity: currentParticipantIdentity(),
    senderName: currentParticipantName.value,
    content,
    sentAt: new Date().toISOString(),
  }

  // 같은 입력이 enter/click으로 거의 동시에 두 번 들어오는 상황을 막기 위해 입력창은 전송 전에 비운다.
  chatInput.value = ''
  await meetingRoom.value.localParticipant.publishData(
    textEncoder.encode(JSON.stringify(message)),
    { reliable: true },
  ).then(() => {
    pushChatMessage({
      id: message.messageId,
      senderName: message.senderName,
      senderUserId: message.senderUserId,
      content: message.content,
      sentAt: message.sentAt,
      isSelf: true,
      isSystem: false,
    })
  }).catch((error) => {
    chatInput.value = content
    meetingConnectionError.value = error?.message || '채팅을 전송하지 못했습니다.'
  }).finally(() => {
    sendingChat.value = false
  })
}

function handleChatEnter(event) {
  // 한글 IME 조합 중 Enter는 입력 확정이므로 전송으로 해석하지 않는다.
  if (chatInputComposing.value || event.isComposing || event.keyCode === 229) {
    return
  }
  event.preventDefault()
  void sendChat()
}

async function disconnectMeetingRoom(options = {}) {
  const { preserveEndedView = false } = options
  const room = meetingRoom.value
  meetingRoom.value = null
  if (!room) {
    resetMeetingSessionState({ preserveEndedView })
    return
  }

  await room.localParticipant.setScreenShareEnabled(false).catch(() => {})
  await room.localParticipant.setMicrophoneEnabled(false).catch(() => {})
  await room.localParticipant.setCameraEnabled(false).catch(() => {})
  room.disconnect()
  resetMeetingSessionState({ preserveEndedView })
}

function disconnectMeetingRoomForUnload() {
  const room = meetingRoom.value
  meetingRoom.value = null
  if (!room) {
    resetMeetingSessionState()
    return
  }

  // 페이지가 닫히는 시점에는 비동기 track 정리까지 기다리기 어렵다.
  // 이 경로는 "최대한 빨리 room 연결을 끊는다"는 목적에 집중한다.
  room.disconnect()
  resetMeetingSessionState()
}

function notifyMeetingEndedDuringUnload(reason) {
  if (!meetingRoom.value || meetingEndHandled.value) return

  meetingEndHandled.value = true

  // 창 닫기/새로고침 직전에는 일반 fetch보다 keepalive/sendBeacon이 더 성공 가능성이 높다.
  // 호스트 이탈을 회의 종료로 취급하기 위해 종료 API를 best-effort로 먼저 보낸다.
  const endUrl = buildApiUrl(`/meetings/${meetingId.value}/end`)
  const endBody = JSON.stringify({})

  try {
    const beaconBody = new Blob([endBody], { type: 'application/json' })
    const sent = navigator.sendBeacon?.(endUrl, beaconBody)
    if (!sent) {
      void fetch(endUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: endBody,
        keepalive: true,
      }).catch(() => {})
    }
  } catch {
    void fetch(endUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: endBody,
      keepalive: true,
    }).catch(() => {})
  }

  void publishMeetingEndedSignal(reason).catch(() => {})
  disconnectMeetingRoomForUnload()
}

function handleBeforeUnload() {
  if (!meetingRoom.value || meetingEndHandled.value) return

  if (isCurrentUserHost.value) {
    notifyMeetingEndedDuringUnload('host-unload')
    return
  }

  disconnectMeetingRoomForUnload()
}

async function publishMeetingEndedSignal(reason) {
  if (!meetingRoom.value?.localParticipant) return

  // 이 DataChannel 메시지는 "회의 전체 종료" 신호다.
  // 따라서 호스트가 명시적으로 종료 버튼을 눌렀을 때만 보낸다.
  // 브라우저 탭을 그냥 닫는 경우에는 이 신호가 보장되지 않으며, 그 경우 다른 참가자 입장에서는
  // 우선 "한 참가자가 연결에서 사라졌다"로만 보이고, 회의 종료 여부는 BE/STT 후속 처리로 판단한다.
  const message = {
    eventType: 'meeting.ended',
    meetingId: meetingId.value,
    reason: reason || 'host-ended',
    endedAt: new Date().toISOString(),
    endedByUserId: auth.user?.id || currentParticipantIdentity(),
    endedByName: currentParticipantName.value,
  }

  await meetingRoom.value.localParticipant.publishData(
    textEncoder.encode(JSON.stringify(message)),
    { reliable: true },
  )
}

async function leaveMeeting() {
  if (meetingEndPending.value) return
  if (isCurrentUserHost.value) {
    await endMeeting()
    return
  }

  meetingEndPending.value = true
  try {
    hostTransferDialogOpen.value = false
    meetingEndConfirmOpen.value = false
    // "회의 나가기"는 non-host에 한해 내 참가만 종료한다.
    await disconnectMeetingRoom()
    navigateAfterMeetingExit()
  } finally {
    meetingEndPending.value = false
  }
}

async function confirmMeetingEndAction() {
  if (isCurrentUserHost.value) {
    await endMeeting()
    return
  }
  await leaveMeeting()
}

async function endMeeting() {
  if (meetingEndPending.value) return
  meetingEndPending.value = true

  try {
    hostTransferDialogOpen.value = false
    meetingEndConfirmOpen.value = false
    if (isCurrentUserHost.value) {
      await postJson(`/meetings/${meetingId.value}/end`, {}, { keepalive: true })
      meetingEndHandled.value = true
      showMeetingEndedScreen('해당 회의는 종료되었습니다.')
      meetingConnectionStatus.value = '회의 종료됨'
      meetingConnectionError.value = ''
      await publishMeetingEndedSignal('host-ended').catch((error) => {
        meetingConnectionError.value = error?.message || ''
      })
    } else {
      meetingEndHandled.value = true
      showMeetingEndedScreen('해당 회의는 종료되었습니다.')
    }
    await nextTick()
    await disconnectMeetingRoom({ preserveEndedView: true })
  } catch (error) {
    meetingEndHandled.value = false
    meetingConnectionError.value = error?.message || '회의를 종료하지 못했습니다.'
  } finally {
    meetingEndPending.value = false
  }
}

async function transferHost() {
  if (!meetingRoom.value || !isCurrentUserHost.value || !hostTransferTargetUserId.value) {
    return
  }

  hostTransferStatus.value = '관리자를 이전하는 중입니다.'
  try {
    const result = await postJson(`/meetings/${meetingId.value}/transfer-host`, {
      newHostUserId: hostTransferTargetUserId.value,
    })
    meetingConnection.value = {
      ...meetingConnection.value,
      hostUserId: result.hostUserId,
    }
    await meetingRoom.value.localParticipant.publishData(
      textEncoder.encode(
        JSON.stringify({
          eventType: 'meeting.host.changed',
          meetingId: meetingId.value,
          previousHostUserId: currentUserId.value,
          newHostUserId: result.hostUserId,
          newHostName:
            participantList.value.find(
              (participant) => extractParticipantUserId(participant.identity) === result.hostUserId,
            )?.name || '',
          changedAt: new Date().toISOString(),
        }),
      ),
      { reliable: true },
    ).catch(() => {})
    hostTransferStatus.value = '회의 관리자를 이전했습니다.'
    closeHostTransferDialog()
    syncParticipantsFromRoom()
  } catch (error) {
    hostTransferStatus.value = error?.message || '회의 관리자를 이전하지 못했습니다.'
  }
}

function formatCaptionTime(startedAtMs) {
  const totalSeconds = Math.max(0, Math.floor((startedAtMs || 0) / 1000))
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

function formatChatTime(timestamp) {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function participantStatusLabel(participant) {
  const statuses = []
  statuses.push(participant.micEnabled ? '마이크 켜짐' : '음소거')
  statuses.push(participant.cameraEnabled ? '카메라 켜짐' : '카메라 꺼짐')
  if (participant.screenShareEnabled) statuses.push('화면 공유')
  return statuses.join(' · ')
}

function handleDeviceChange() {
  loadDeviceList().then(() => {
    if (inLobby.value) {
      return restartPreview()
    }
    return undefined
  }).catch(() => {
    deviceError.value = true
    deviceStatus.value = '장치 목록을 갱신하지 못했습니다.'
  })
}

function handleViewportResize() {
  viewportWidth.value = window.innerWidth
}

watch(activeSidePanel, (nextPanel) => {
  if (nextPanel !== 'stt') return
  nextTick(() => {
    updateCaptionScrollState()
    if (captionFollowLatest.value) {
      scheduleCaptionScrollToLatest()
    }
  })
})

watch(orderedCaptions, () => {
  nextTick(() => {
    if (captionFollowLatest.value) {
      scheduleCaptionScrollToLatest()
    } else {
      updateCaptionScrollState()
    }
  })
})

watch([participantMediaTiles, participantGridPageSize], () => {
  const lastPageIndex = Math.max(0, totalGridPages.value - 1)
  if (currentGridPage.value > lastPageIndex) {
    currentGridPage.value = lastPageIndex
  }
})

watch([filmstripTiles, focusFilmstripPageSize], () => {
  const lastPageIndex = Math.max(0, focusFilmstripPageCount.value - 1)
  if (focusFilmstripPage.value > lastPageIndex) {
    focusFilmstripPage.value = lastPageIndex
  }
})

watch(meetingLayoutMode, (mode) => {
  if (mode !== 'grid') {
    currentGridPage.value = 0
  }
  if (mode !== 'focus') {
    showFilmstripInFocus.value = false
    focusFilmstripPage.value = 0
  }
})

watch(selectedTileKey, () => {
  focusFilmstripPage.value = 0
})

watch([meetingId, popupSessionId], () => {
  if (!isDedicatedMeetingWindow.value) return
  // 같은 meeting popup 창을 재사용할 때는 이전 room 상태가 남을 수 있으므로
  // pop-up 진입 토큰이 바뀌면 로비 상태로 다시 정리한다.
  if (meetingRoom.value) return
  if (meetingEndHandled.value || meetingEndedScreenVisible.value) return
  meetingEndedScreenVisible.value = false
  meetingConnectionStatus.value = '연결 대기'
  meetingConnectionError.value = ''
  inLobby.value = true
}, { immediate: true })

onMounted(() => {
  initializeDevices()
  void loadMeetingTitle()
  navigator.mediaDevices?.addEventListener?.('devicechange', handleDeviceChange)
  window.addEventListener('beforeunload', handleBeforeUnload)
  window.addEventListener('resize', handleViewportResize)
  document.addEventListener('fullscreenchange', handleFullscreenChange)
})

onBeforeUnmount(() => {
  navigator.mediaDevices?.removeEventListener?.('devicechange', handleDeviceChange)
  window.removeEventListener('beforeunload', handleBeforeUnload)
  window.removeEventListener('resize', handleViewportResize)
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  clearInterval(elapsedTimer)
  stopPreview()
  void disconnectMeetingRoom()
})
</script>
