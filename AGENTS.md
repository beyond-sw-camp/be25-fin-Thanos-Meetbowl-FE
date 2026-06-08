# Meetbowl Frontend AGENTS

## 목적

본 문서는 `meetbowl-fe`에서 작업하는 모든 개발자와 AI Agent가 반드시 따라야 하는 규칙을 정의한다.

---

## 필수 문서

작업 전 반드시 아래 문서를 읽는다.

```text
../AGENTS.md
../docs/architecture.md
../docs/conventions.md
../docs/event-contract.md
../docs/communication-decision.md
README.md
```

---

## 역할

`meetbowl-fe`는 Meetbowl의 사용자 화면을 담당한다.

담당 기능:

- 로그인과 사용자 세션 화면
- 회의실/회의 예약 화면
- 화상회의 화면
- 실시간 자막 표시
- 실시간 AI 피드백 표시
- 회의 채팅 UI
- 회의록 조회/검토/승인 화면
- 내부 메일 화면
- 개인 워크스페이스 화면
- 공유 워크스페이스 화면
- 관리자 화면

---

## 통신 규칙

프론트엔드는 원칙적으로 `meetbowl-be`의 REST API만 직접 호출한다.

실시간 회의 화면의 자막, AI 피드백, 회의 채팅은 LiveKit DataChannel을 통해 송수신한다.

금지:

```text
MariaDB 직접 접근
Qdrant 직접 접근
RabbitMQ 직접 접근
Redis Stream 직접 접근
meetbowl-ai 직접 호출
meetbowl-stt 직접 호출
```

단, LiveKit 회의 참여에 필요한 접속 정보는 `meetbowl-be`에서 발급받은 값만 사용한다.

---

## API / 상태 규칙

- API Base URL과 응답 형식은 루트 `docs/conventions.md`와 `meetbowl-be/docs/api-spec.md`를 따른다.
- 성공/실패 응답은 공통 응답 Envelope 기준으로 처리한다.
- Entity나 DB 구조를 화면 상태 모델로 직접 가정하지 않는다.
- 화면 권한 제어는 사용자 경험 보조 수단이며, 최종 권한 검증은 반드시 서버가 수행한다.
- 시간 표시가 필요한 경우 서버 UTC 값을 KST로 변환해 표시한다.

---

## 실시간 화면 규칙

- Interim/Partial Transcript는 화면 표시용으로만 사용한다.
- Final Transcript 저장 여부를 프론트엔드가 직접 판단하지 않는다.
- AI 피드백은 화면 표시용 이벤트로 취급하고, 저장 보장이 필요한 데이터 경로로 사용하지 않는다.
- 회의 채팅은 `chat.message.sent` DataChannel 이벤트로 송수신한다.
- 채팅 내역 저장/조회가 필요하면 `meetbowl-be` REST API를 별도로 호출한다.

---

## 보안 / 로그 규칙

다음 값은 브라우저 콘솔, 네트워크 로그, 화면에 불필요하게 노출하지 않는다.

```text
비밀번호
JWT
Refresh Token
API Key
메일 본문
회의 원문 전체
개인정보
첨부파일 원본
```

---

## 구현 원칙

- 기존 Vue/Vite 구조와 컴포넌트 패턴을 우선 따른다.
- 서버 API 계약 없이 화면에서 임의 필드를 만들지 않는다.
- 공통 UI 상태, API 클라이언트, 인증 처리 방식은 한 곳에서 일관되게 관리한다.
- 요구사항 관련 작업은 `FR-*`, `NFR-*` ID를 확인한다.
- 복잡한 화면 또는 플로우 변경은 필요 시 `tasks/*.md`로 작업 범위를 정리한다.
