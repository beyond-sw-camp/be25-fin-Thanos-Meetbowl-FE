#  회의 중심 업무 지식 관리 플랫폼, Meetbowl 💻
<img width="1672" height="941" alt="meetbowl이미지_" src="https://github.com/user-attachments/assets/2391cd46-fc46-427f-9a9b-c19dcb3cbc41" />

📺 **[Meetbowl 시연영상 보러가기 (Youtube)](https://youtu.be/KenE7xzqJiY?si=R4WPOjtlcysPnhqb)**  


<br>

## 👥팀원 
<div align="center">
  
| 이진 | 김지연 | 윤정윤 | 이다윗 | 이서윤 |
| :---: | :---: | :---: | :---: | :---: |
| <img width="120" height="120" alt="blue" src="https://github.com/user-attachments/assets/22adab5d-736a-491c-a522-941bb9dfef89" /><br><a href="https://github.com/LeeJin0801"><img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white"/></a> | <img width="120" height="120" alt="purple" src="https://github.com/user-attachments/assets/48b14d15-b099-4f0c-820b-7f8d3a8fdcbf" /><br><a href="https://github.com/wldusdus63"><img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white"/></a> | <img width="120" height="120" alt="yellow" src="https://github.com/user-attachments/assets/ece17ccb-8081-420d-b416-4efb29b63e99" /><br><a href="https://github.com/penep0"><img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white"/></a> | <img width="120" height="120" alt="orange" src="https://github.com/user-attachments/assets/84efbee8-c0db-417e-90c5-28539aba899e" /><br><a href="https://github.com/Dawit-lee"><img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white"/></a> | <img width="120" height="120" alt="green" src="https://github.com/user-attachments/assets/bc4e65b2-7864-45c2-99b4-629bababacea" /><br><a href="https://github.com/leesy744"><img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white"/></a> |<img width="1672" height="941" alt="readme용meetbowl" src="https://github.com/user-attachments/assets/a753056a-43c6-4b53-a206-5a1d98efed5d" />

</div>

## 📚 목차
1. [프로젝트 개요](#1-프로젝트-개요)
2. [프로젝트 기획서](#2-프로젝트-기획서)
3. [WBS](#3-WBS)
4. [요구사항 명세서](#4-요구사항-명세서)  
5. [기술 스택](#5-기술-스택)  
6. [시스템 아키텍처](#6-시스템-아키텍처)  
7. [데이터베이스 설계 (ERD)](#7-데이터베이스-설계-erd)  
8. [화면 기능 설계서](#8-화면-기능-설계서)
9. [테이블 명세서](#9-테이블-명세서)  
10. [API 명세서](#10-api-명세서)  
11. [테스트 결과서](#11-테스트-결과서)
12. [CI/CD 계획서](#12-CI/CD-계획서)
13. [통합 테스트 결과서](#13-통합-테스트-결과서)
14. [향후 개선 계획](#14-향후-개선-계획)
15. [회고록](#15-회고록)

<br/>

## 1. 프로젝트 개요

#### 1.1 프로젝트 소개

**Meetbowl**은 회의 예약, 진행, 회의록 생성, 메일 공유, 백업, 검색을 하나의 흐름으로 연결하는 **회의 중심 업무 지식 관리 플랫폼**입니다.

사용자는 회의실을 예약하고, 화상 회의에 참여한 뒤, 회의 내용을 녹음·STT로 기록할 수 있습니다. 회의 종료 후에는 AI가 주요 내용을 요약하여 회의록을 생성하고, 참석자에게 내부 메일로 자동 공유합니다.

또한 중요한 회의록과 메일은 개인 워크스페이스에 백업할 수 있으며, 이후 검색을 통해 과거 회의 내용과 업무 이력을 다시 확인할 수 있습니다.


#### 1.2 프로젝트 배경

**회의 업무 흐름의 분산**

기존 업무 환경에서는 회의 예약, 화상 회의, 회의록 작성, 메일 공유가 각각 다른 도구에서 이루어져 업무 흐름이 끊기기 쉽습니다.

**회의록 작성과 공유의 부담**

회의 후 회의록을 수동으로 작성하고 참석자에게 공유하는 과정은 반복적인 행정 업무를 발생시키며, 주요 결정 사항이나 실행 항목이 누락될 수 있습니다.

**업무 기록의 보관과 재검색 필요성**

회의록, 메일, 첨부자료가 여러 곳에 흩어지면 나중에 필요한 내용을 다시 찾기 어렵습니다. Meetbowl은 회의에서 발생한 기록을 백업하고 검색할 수 있게 하여 업무 이력을 체계적으로 관리할 수 있도록 돕습니다.


<br/>


## 2. 프로젝트 기획서

[프로젝트 기획서](https://github.com/user-attachments/files/28079549/Meetbowl_.pdf)

<br/>


## 3. WBS

[WBS](https://docs.google.com/spreadsheets/d/1nOWCJmpTlyvO9L5ES9-pbAvM8WLmR13WEBstjrw-yW8/edit?usp=sharing)

<img width="4963" height="3509" alt="beyond SW camp 25기 - 3팀 Meetbowl 문서 - WBS v 2_page-0001" src="https://github.com/user-attachments/assets/f7318701-178b-452b-87a9-04aeb5989a56" />


<br/>


## 4. 요구사항 명세서

[요구사항 명세서](https://docs.google.com/spreadsheets/d/1nOWCJmpTlyvO9L5ES9-pbAvM8WLmR13WEBstjrw-yW8/edit?usp=sharing)

<br/>


## 5. 기술 스택

| 분류 | 기술 |
|-------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **프론트엔드** | ![Vue.js](https://img.shields.io/badge/Vue.js-4FC08D?logo=vuedotjs&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black) ![Vue Router](https://img.shields.io/badge/Vue_Router-4FC08D) ![Pinia](https://img.shields.io/badge/Pinia-FFD859) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white) ![TipTap](https://img.shields.io/badge/TipTap-000000) ![LiveKit](https://img.shields.io/badge/LiveKit-1E1F24) |
| **백엔드 (Java / Spring)** | ![Java 25](https://img.shields.io/badge/Java_25-007396?logo=openjdk&logoColor=white) ![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?logo=springboot&logoColor=white) ![Spring MVC](https://img.shields.io/badge/Spring_MVC-6DB33F) ![Spring Security](https://img.shields.io/badge/Spring_Security-6DB33F?logo=springsecurity&logoColor=white) ![JWT](https://img.shields.io/badge/JWT-000000?logo=jsonwebtokens) ![Spring Data JPA](https://img.shields.io/badge/Spring_Data_JPA-6DB33F) ![Flyway](https://img.shields.io/badge/Flyway-CC0200?logo=flyway&logoColor=white) ![Gradle](https://img.shields.io/badge/Gradle-02303A?logo=gradle&logoColor=white) ![OpenAPI](https://img.shields.io/badge/OpenAPI-6BA539?logo=swagger&logoColor=white) |
| **백엔드 (Python / AI)** | ![Python 3.12](https://img.shields.io/badge/Python_3.12-3776AB?logo=python&logoColor=white) ![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white) ![Pydantic](https://img.shields.io/badge/Pydantic-E92063) ![Pydantic AI](https://img.shields.io/badge/Pydantic_AI-7C3AED) ![Gemini](https://img.shields.io/badge/Gemini-4285F4?logo=google&logoColor=white) ![OpenAI](https://img.shields.io/badge/OpenAI-412991?logo=openai&logoColor=white) ![aio-pika](https://img.shields.io/badge/aio--pika-FF6F00) ![boto3](https://img.shields.io/badge/boto3-FF9900?logo=amazonaws&logoColor=white) |
| **STT / 실시간 처리** | ![Node.js](https://img.shields.io/badge/Node.js-5FA04E?logo=nodedotjs&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white) ![Fastify](https://img.shields.io/badge/Fastify-000000?logo=fastify&logoColor=white) ![WebSocket](https://img.shields.io/badge/WebSocket-010101) ![LiveKit RTC](https://img.shields.io/badge/LiveKit_RTC-1E1F24) ![OpenAI Realtime](https://img.shields.io/badge/OpenAI_Realtime-412991?logo=openai&logoColor=white) |
| **메시징 / 이벤트** | ![REST API](https://img.shields.io/badge/REST_API-005571) ![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?logo=rabbitmq&logoColor=white) ![Redis Stream](https://img.shields.io/badge/Redis_Stream-DC382D?logo=redis&logoColor=white) ![LiveKit DataChannel](https://img.shields.io/badge/LiveKit_DataChannel-1E1F24) |
| **데이터베이스 / 저장소** | ![MariaDB](https://img.shields.io/badge/MariaDB-003545?logo=mariadb&logoColor=white) ![Redis](https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white) ![Qdrant](https://img.shields.io/badge/Qdrant-DC244C) ![Elasticsearch](https://img.shields.io/badge/Elasticsearch-005571?logo=elasticsearch&logoColor=white) ![AWS S3](https://img.shields.io/badge/AWS_S3-569A31?logo=amazons3&logoColor=white) |
| **인프라 / 클라우드** | ![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white) ![Docker Compose](https://img.shields.io/badge/Docker_Compose-2496ED?logo=docker&logoColor=white) ![Nginx](https://img.shields.io/badge/Nginx-009639?logo=nginx&logoColor=white) ![AWS EC2](https://img.shields.io/badge/AWS_EC2-FF9900?logo=amazonec2&logoColor=white) ![AWS RDS](https://img.shields.io/badge/AWS_RDS-527FFF?logo=amazonrds&logoColor=white) ![AWS ECR](https://img.shields.io/badge/AWS_ECR-FF9900?logo=amazonecr&logoColor=white) ![AWS SSM](https://img.shields.io/badge/AWS_SSM-DD344C?logo=amazonaws&logoColor=white) |
| **CI / CD** | ![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?logo=githubactions&logoColor=white) |
| **협업 도구** | ![Git](https://img.shields.io/badge/Git-F05032?logo=git&logoColor=white) ![GitHub](https://img.shields.io/badge/GitHub-181717?logo=github&logoColor=white) ![Notion](https://img.shields.io/badge/Notion-000000?logo=notion&logoColor=white) ![Figma](https://img.shields.io/badge/Figma-F24E1E?logo=figma&logoColor=white) |

## 6. 시스템 아키텍쳐
<img width="3644" height="2960" alt="meetbowl-architecture-final drawio" src="https://github.com/user-attachments/assets/2bcf8525-bcb1-4ac8-bf2c-4857ca099fb9"/>


## 7. 데이터베이스 설계 (ERD)
[ERD](https://www.erdcloud.com/d/dRyS7PZbFQSijDuDi)

<img width="6000" height="3832" alt="meetbowl final" src="https://github.com/user-attachments/assets/2c886914-5948-49bf-8164-98d796ea4c3d" />

<br>


## 8. 화면 기능 설계서
[화면 기능 설계서](https://www.figma.com/board/daSTynfA5bNxs7zU00zo6I/BeatBuddy-%ED%99%94%EB%A9%B4%EC%84%A4%EA%B3%84%EC%84%9C?node-id=127-817&t=Lrm1j4z83LmRJ4TP-0)
<br>


## 9. 테이블 명세서
[테이블 명세서](https://docs.google.com/spreadsheets/d/1nOWCJmpTlyvO9L5ES9-pbAvM8WLmR13WEBstjrw-yW8/edit?usp=sharing)
<br>

## 10. API 명세서
[API 명세서](https://0w10wfx2jn.apidog.io/)
<br>
[API 명세서(주요 기능)](https://app.notion.com/p/playdatacademy/Meetbowl_-_API-38fd943bcac280e9ada2fbb40d676046)


## 11. 단위 테스트 결과서
[백엔드 단위 테스트 결과서](https://docs.google.com/spreadsheets/d/1nOWCJmpTlyvO9L5ES9-pbAvM8WLmR13WEBstjrw-yW8/edit?usp=sharing)
<br>
[프론트엔드 단위 테스트 결과서](https://docs.google.com/spreadsheets/d/1nOWCJmpTlyvO9L5ES9-pbAvM8WLmR13WEBstjrw-yW8/edit?usp=sharing)
<br>

## 12. CI/CD 계획서
[CI/CD 계획서](https://github.com/beyond-sw-camp/be25-fin-thanos-meetbowl/blob/main/file/pdf/meetbowl-ci-cd-plan.pdf)
<br>

## 13. 통합 테스트 결과서
[통합 테스트 결과서](https://github.com/beyond-sw-camp/be25-fin-thanos-meetbowl/blob/main/file/pdf/meetbowl-test-result.pdf)
<br>

## 14. 향후 개선 계획
<details>
<summary>향후 개선 계획</summary>
<div markdown="1">
  Meetbowl은 **회의 예약 → 진행 → 회의록 생성 → 공유 → 백업·검색**으로 이어지는 회의 중심 업무 흐름을 하나로 연결하는 것을 목표로 개발되었습니다. 향후에는 각 단계를 아래와 같이 고도화하여, 단순한 회의 도구를 넘어 **조직의 지식과 협업을 관리하는 플랫폼**으로 확장하고자 합니다.<br><br>

| 확장 방향 | 기대 효과 |
| --- | --- |
| **실시간 피드백 자막 고도화**<br/>STT 자막을 실시간 교정·요약하고, 화자 분리와 다국어 번역 자막을 제공 | **회의 흐름을 돕는 실시간 지원 도구**<br/>참석자가 발언을 놓치지 않고 회의에 집중하도록 지원 |
| **결정 사항·담당자·마감일 자동 정리**<br/>회의 중 논의된 결정을 담당자·마감일과 함께 자동 추출·정리 | **회의 결과를 후속 업무로 연결**<br/>회의가 끝나는 즉시 실행 가능한 업무 목록으로 전환 |
| **회의·프로젝트 히스토리 검색 확대**<br/>회의록·메일·첨부자료를 프로젝트 단위로 묶어 검색 범위와 정확도를 확대 | **조직 지식 탐색 도구로 확장**<br/>과거 회의와 업무 이력을 조직의 지식 자산으로 재활용 |
| **자료 연결·추천·버전 관리 강화**<br/>회의와 관련된 문서를 자동 추천·연결하고 문서 버전 이력을 관리 | **팀 협업 허브로 확장**<br/>회의를 중심으로 관련 자료가 모이고 함께 관리되는 협업 공간 제공 |
| **회의 운영 지표·협업 현황 분석**<br/>회의 빈도·참여도·후속 업무 처리율 등 운영 지표를 수집·시각화 | **조직 운영 개선을 위한 협업 인사이트 제공**<br/>데이터 기반으로 회의 문화와 협업 방식을 개선 |
</div>
</details>

<br/>

## 15. 회고록
|   조원 이름	| 회고  	 |
|---	|-------|
|   이진   |  실시간 STT의 사용성을 개선하기 위해 실제로 말을 하며 발화 인식 설정을 조정했던 것이 특히 기억에 남습니다. 직접 테스트하면서 자막이 자연스럽게 생성되는지 발화가 끊기는 시점이 어색하지 않은지를 확인하는 과정이 쉽지는 않았지만 즐거웠습니다. 또한 기존에 경험해보지 못했던 이벤트 발행과 처리, 메시지 브로커를 사용해볼 수 있어 좋았습니다. 실시간 자막, 피드백, 회의록 저장처럼 목적이 다른 흐름을 분리해 처리하면서 백엔드 구조를 더 넓게 이해하게 되었습니다. 프로젝트 후반에는 퀄리티를 끌어올리기 위해 시간을 많이 쏟았지만 최종 결과물이 나쁘지 않게 나온 것 같아 만족합니다. 동시에 제 개발 지식이 아직 부족하다는 것을 느꼈습니다. 이번 교육 과정을 계기로 더 공부하고 성장하고 싶다는 생각을 하게 되었습니다. 또 부족한 조장이었지만 저를 믿고 따라와준 팀원들께 감사하다는 말을 전하고 싶습니다.|
|   김지연   |   이번 프로젝트는 교육 과정에서 진행한 마지막 프로젝트였기 때문에 더욱 의미 있게 느껴졌습니다. 그동안 배운 내용을 실제로 적용해 볼 수 있었고, 기획부터 구현, 수정, 마무리까지 직접 경험하면서 하나의 서비스를 완성하는 과정이 쉽지 않다는 것을 알게 되었습니다. 예상하지 못한 오류도 있었지만, 문제를 해결해 나가면서 개발에 대한 이해도와 문제 해결 능력을 키울 수 있었습니다.<br> 마지막 프로젝트였던 만큼 아쉬움도 많이 남습니다. 시간이 더 있었다면 기능을 더 추가하거나 화면을 더 깔끔하게 다듬고, 코드 구조도 더 정리해 보고 싶었습니다. 하지만 제한된 시간 안에서 끝까지 프로젝트를 완성하며 많은 것을 배울 수 있었고, 이번 경험은 그동안의 성장을 확인할 수 있었던 뜻깊은 시간이었습니다. |
|   윤정윤   | Meetbowl 프로젝트는 여러 서버와 기능이 연결된 구조에서 전체 흐름과 책임 분리를 고민해 본 경험이었습니다. 특히 실시간 STT는 빠른 화면 표시 중심으로, 회의록 생성은 최종 원문 기반의 비동기 처리로 분리하면서 기능별 요구사항에 맞는 설계가 중요하다는 것을 배웠습니다. 또한 API 서버와 AI 서버의 역할을 나누고, RabbitMQ를 활용해 작업을 안정적으로 처리하면서 서버 간 책임 경계를 명확히 하는 경험을 했습니다. 협업 측면에서는 하네스와 문서를 통해 API 응답, 에러 코드, 이벤트 구조, 배포 기준 등을 표준화하며 팀원이 같은 기준으로 개발할 수 있는 환경을 만들고자 했습니다. 이번 프로젝트를 통해 백엔드 개발자는 단순히 API를 구현하는 것을 넘어 시스템 흐름, 장애 대응, 배포 안정성, 협업 표준까지 함께 고려해야 한다는 것을 배웠습니다.|
|   이다윗   | 챗봇, 메일, 워크스페이스 전반을 맡으면서 권한 기반으로 사내 문서를 통합 검색하고 답변을 생성하는 구조를 처음부터 설계해볼 수 있었던 게 가장 기억에 남습니다. 특히 응답 속도가 예상보다 느리게 나왔을 때, 문제 원인을 찾기 위해 처리 과정을 하나씩 단계별로 뜯어보며 병목 지점을 추적했던 경험이 값졌습니다. 막연히 "느리다"에서 끝나지 않고, 어디서 시간이 새는지 직접 확인하고 근거를 가지고 개선했다는 점에서 성취감이 컸습니다. 또한 Hybrid 검색과 Reranker를 도입하면서 단순히 기능을 붙이는 것을 넘어, 왜 이 방식을 선택해야 하는지 스스로 납득할 수 있을 때까지 고민하는 습관을 들일 수 있었던 것도 큰 수확이었습니다. 프로젝트를 진행하며 팀원들과 끊임없이 소통하고 서로의 작업 흐름을 맞춰가는 과정이 쉽지만은 않았지만, 그 덕분에 혼자였다면 놓쳤을 문제들을 더 빨리 발견할 수 있었습니다. 부족한 부분도 분명 있었지만, 이번 프로젝트를 통해 문제를 구조적으로 바라보는 시야가 한층 넓어진 것 같아 만족스럽습니다. |
|   이서윤 	 | 이번 최종 프로젝트는 기획부터 설계, 구현까지 전 과정을 직접 경험해본 B2B 프로젝트였습니다. SSE, 동시성 제어처럼 처음 다뤄보는 기술 스택이 있어서 정해진 기간 안에 개발을 잘 마칠 수 있을지 걱정했지만, 좋은 팀원분들을 만난 덕분에 막연했던 걱정을 덜 수 있었습니다. 함께 고민하고 부딪히는 과정에서 배운 것이 많았고, 결국 계획한 구현을 무사히 마칠 수 있었습니다. 그리고 이번 프로젝트를 통해 한번 더 확신하게 된 것은 데이터베이스와 테이블 설계, 그리고 백엔드가 탄탄해야 프로젝트 전체가 단단해진다는 점입니다. 기반이 되는 설계가 견고할수록 이후의 모든 작업이 안정적으로 이어진다는 것을 몸소 느낄 수 있었습니다. 잘 이끌어주신 팀원분들께 너무 감사하고 모두 고생하셨습니다!!|
