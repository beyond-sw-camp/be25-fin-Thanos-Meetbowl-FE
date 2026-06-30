#  회의 중심 업무 지식 관리 플랫폼, Meetbowl 💻
<img width="1672" height="941" alt="meetbowl이미지_" src="https://github.com/user-attachments/assets/2391cd46-fc46-427f-9a9b-c19dcb3cbc41" />

📺 **[Meetbowl 시연영상 보러가기 (Youtube)]()**  


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


## 7. 데이터베이스 설계 (ERD)
[ERD](https://www.erdcloud.com/d/yXrcCrnYFdM2P8q6b)

<img width="1930" height="1330" alt="meetbowl" src="https://github.com/user-attachments/assets/66637be3-f064-4db5-a451-05c959c69a12" />

<br>


## 8. 화면 기능 설계서
[화면 기능 설계서](https://www.figma.com/design/HAyNurdsY2cy5S5nGAFhgZ/Meetbowl_%ED%99%94%EB%A9%B4-%EC%84%A4%EA%B3%84%EC%84%9C?node-id=0-1&t=EA6CCD1yU9dlcSUv-1)
<br>


## 9. 테이블 명세서
[테이블 명세서](https://docs.google.com/spreadsheets/d/1nOWCJmpTlyvO9L5ES9-pbAvM8WLmR13WEBstjrw-yW8/edit?usp=sharing)
<br>

## 10. API 명세서
[API 명세서](https://0w10wfx2jn.apidog.io/)
<br>


## 11. 단위 테스트 결과서
[백엔드 단위 테스트 결과서](https://docs.google.com/spreadsheets/d/1nOWCJmpTlyvO9L5ES9-pbAvM8WLmR13WEBstjrw-yW8/edit?usp=sharing)
<br>
[프론트엔드 단위 테스트 결과서](https://docs.google.com/spreadsheets/d/1nOWCJmpTlyvO9L5ES9-pbAvM8WLmR13WEBstjrw-yW8/edit?usp=sharing)

<br>

## 12. CI/CD 계획서

<br>

## 13. 통합 테스트 결과서

<br>

## 14. 향후 개선 계획
<details>
<summary>향후 개선 계획</summary>
<div markdown="1">
</div>
</details>

<br/>

## 15. 회고록
|   조원 이름	| 회고  	 |
|---	|-------|
|   이진   | |
|   김지연   |   이번 프로젝트는 교육 과정에서 진행한 마지막 프로젝트였기 때문에 더욱 의미 있게 느껴졌습니다. 그동안 배운 내용을 실제로 적용해 볼 수 있었고, 기획부터 구현, 수정, 마무리까지 직접 경험하면서 하나의 서비스를 완성하는 과정이 쉽지 않다는 것을 알게 되었습니다. 예상하지 못한 오류도 있었지만, 문제를 해결해 나가면서 개발에 대한 이해도와 문제 해결 능력을 키울 수 있었습니다.<br> 마지막 프로젝트였던 만큼 아쉬움도 많이 남습니다. 시간이 더 있었다면 기능을 더 추가하거나 화면을 더 깔끔하게 다듬고, 코드 구조도 더 정리해 보고 싶었습니다. 하지만 제한된 시간 안에서 끝까지 프로젝트를 완성하며 많은 것을 배울 수 있었고, 이번 경험은 그동안의 성장을 확인할 수 있었던 뜻깊은 시간이었습니다. |
|   윤정윤   | |
|   이다윗   | |
|   이서윤 	 | |
