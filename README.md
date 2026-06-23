
## 👥팀원  

| 이진 | 김지연 | 윤정윤 | 이다윗 | 이서윤 |
| :---: | :---: | :---: | :---: | :---: |
| <img width="1254" height="1254" alt="blue" src="https://github.com/user-attachments/assets/22adab5d-736a-491c-a522-941bb9dfef89" /> | <img width="1254" height="1254" alt="purple" src="https://github.com/user-attachments/assets/48b14d15-b099-4f0c-820b-7f8d3a8fdcbf" /> | <img width="1254" height="1254" alt="yellow" src="https://github.com/user-attachments/assets/ece17ccb-8081-420d-b416-4efb29b63e99" /> | <img width="1254" height="1254" alt="orange" src="https://github.com/user-attachments/assets/84efbee8-c0db-417e-90c5-28539aba899e" /> | <img width="1254" height="1254" alt="green" src="https://github.com/user-attachments/assets/bc4e65b2-7864-45c2-99b4-629bababacea" /> |


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

## <a id="1-프로젝트-개요"></a> 1. 프로젝트 개요

#### 1.1 프로젝트 소개

**Meetbowl**은 회의 예약, 진행, 회의록 생성, 메일 공유, 백업, 검색을 하나의 흐름으로 연결하는 **회의 중심 업무 지식 관리 플랫폼**입니다.

사용자는 회의실을 예약하고, 화상 회의에 참여한 뒤, 회의 내용을 녹음·STT로 기록할 수 있습니다. 회의 종료 후에는 AI가 주요 내용을 요약하여 회의록을 생성하고, 참석자에게 내부 메일로 자동 공유합니다.

또한 중요한 회의록과 메일은 개인 워크스페이스에 백업할 수 있으며, 이후 검색을 통해 과거 회의 내용과 업무 이력을 다시 확인할 수 있습니다.

---

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

[WBS 링크](https://docs.google.com/spreadsheets/d/1nOWCJmpTlyvO9L5ES9-pbAvM8WLmR13WEBstjrw-yW8/edit?usp=sharing)


<br/>


## 4. 요구사항 명세서

[요구사항 명세서](https://docs.google.com/spreadsheets/d/1nOWCJmpTlyvO9L5ES9-pbAvM8WLmR13WEBstjrw-yW8/edit?usp=sharing)

<br/>


## 5. 기술 스택


#**Database**
<br>

#**Backend**
<br>

#**Frontend**
<br>

#**API Platform**
<br>

#**CI/CD**
<br>


#**Tools&External References**
<br>

<br/>

## 6. 시스템 아키텍처

<img width="1928" height="1324" alt="시스템아키텍쳐" src="https://github.com/user-attachments/assets/8fc19aa1-9a65-4c09-bd78-5531c3cf282b" />


<br/>


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
[API 명세서](https://playdatacademy.notion.site/372d943bcac2801c9be8e3fdbe38b6b4?v=372d943bcac2805d92ec000cfbed638d&source=copy_link)
<br>


## 11. 테스트 결과서

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
|   김지연   | |
|   윤정윤   | |
|   이다윗   | |
|   이서윤 	 | |
