# 2026-11-10 지도로 매장 찾기 (프레임워크)

브랜치: `feat/map-store-search` (origin/dev 기준)
참고: 백엔드 `feat/266-map-stores` (준혁님, dev 미병합), 캐치테이블 앱 "내 주변" 화면

## 추가
- **지도 화면** `/map` (하단 탭바 없는 전체 화면)
  - 처음: 내 위치(권한 없으면 강남역)를 가운데 두고 그 화면을 바로 검색
  - 지도를 옮기면 "이 지역에서 검색" 버튼. 한 변 5km 를 넘으면 "지도를 확대하면 검색할 수 있어요"로 막음
  - 핀: `GET /api/user/stores/map/bounds/markers`. 누르면 이름 말풍선 + 아래 매장 카드
  - 아래 요약 "이 지역 매장 N곳" (truncated 면 "N곳 이상"), 누르면 목록 시트
  - 목록: `GET /api/user/stores/map/bounds` 가까운 순 10개씩 더 보기. 사진, 평점(리뷰 수), 구와 음식 종류, 영업 상태와 다음 바뀌는 시각, 거리, 예약 가능/웨이팅 가능
  - 내 위치 버튼: 위치 권한 요청 후 이동하고 그 화면을 다시 검색
- **진입점**: 홈 검색창 옆 "내 주변", 검색 화면 "지도로 보기"
- `features/store-map`: API 3종(`markers`, `bounds`, `radius`), 훅(`useMapMarkers`, `useMapStores`, `useNearbyStores`), 거리/범위 계산, 영업 상태 문구, `MapStoreItem`
- `entities/store`: `MapStore`, `MapStoreList`, `MapMarker`, `MapMarkerList`, `OpenStatus`, `LatLng`, `MapBounds`
- `shared/ui/map`: `MapView` 하나로 감싼 지도
  - `VITE_KAKAO_MAP_KEY` 가 있으면 카카오맵 (SDK 를 필요할 때 한 번만 불러옴, 핀은 CustomOverlay)
  - 키가 없거나 SDK 를 못 불러오면 키 없는 간이 지도 (격자 + 핀, 끌기, 휠, +/-)
- `shared/lib/useGeolocation`
- MSW: 지도 API 3종, 시드 매장 좌표, 강남역 주변 공공데이터(점주 없음) 매장 18개. 영업 상태는 백엔드 규칙(OPEN, BREAK, BEFORE_OPEN, CLOSED + nextChangeAt)대로 계산
- 테스트: `tests/storeMap.test.ts` (범위 한 변 길이, 5km 제한, 거리 문구, 영업 상태 문구)

## 확인
- tsc, oxlint, vitest 44개, 빌드 통과
- MSW 로만 확인 (Playwright 390×844): 첫 검색 18곳, 핀 선택 카드, 목록 10개 → 더 보기 18개, 끌어서 다시 검색, 축소 시 5km 안내, 위치 권한 없을 때 강남역 기준
- **카카오맵은 키가 없어 확인 못 함**. 키 발급 후 콘솔에 Web 도메인(localhost:5173, 배포 도메인) 등록하고 `.env` 에 `VITE_KAKAO_MAP_KEY` 넣어서 확인 필요
- 실제 백엔드는 지도 API 가 dev 에 없어 확인 못 함

## 남은 것 / 백엔드에 물어볼 것
- 지도 API 에 음식 종류, 날짜/인원 필터가 없어 캐치테이블의 카테고리 칩, 필터 줄은 넣지 않음
- 마커 응답에 영업 상태, 카테고리가 없어 핀 색 구분(예약 가능 매장 강조 등) 못 함
- 선택한 핀이 아직 안 불러온 목록 페이지에 있으면 매장 상세로 이름, 종류, 주소만 보여줌
- 400 응답의 에러 코드는 백엔드 브랜치 기준으로 다시 맞춰야 함 (목은 INVALID_INPUT)
- 핀 묶기(클러스터), 카드 좌우 넘기기는 다음 단계
