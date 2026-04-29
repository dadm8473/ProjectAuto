# ProjectAuto 리부트 수정 상세 기획

작성일: 2026-04-29

## 목적

이 문서는 현재 구현된 ProjectAuto를 어떤 방향으로 수정할지 정하는 상세 기획서다.

앞선 문서의 결론은 명확하다.

- 현재 게임은 기능은 있으나 상용 모바일 게임처럼 보이지 않는다.
- 핵심 재미는 `소환`, `합성`, `구원`으로 단순화해야 한다.
- 첫 120초 안에 재미가 보여야 한다.
- 추상적인 `Signal/Relay/Noise/Heat/Link` 시스템을 플레이어가 먼저 학습하게 만들면 안 된다.
- 개발 재개 전에는 `docs/gdd/11_core_combat_prototype_spec.md`의 seed suite와 수치 계약을 구현 기준으로 삼아야 한다.

이 문서는 코드 구현 전에 “무엇을 남기고, 무엇을 버리고, 어떤 순서로 고칠지”를 고정한다.

## 리부트 목표

### 목표 장르

세로형 2인 협동 랜덤 보드-구원 TD.

### 목표 첫인상

플레이어가 앱을 켜면 웹페이지가 아니라 모바일 게임 준비실에 들어온 느낌이어야 한다. 전투에 들어가면 바로 길, 적, 내 보드, 파트너 보드, 소환 버튼, 합성 가능 상태, 구원 타이밍이 읽혀야 한다.

### 목표 핵심 감정

> 둘이 함께 랜덤 신호 장난감을 소환하고 합성해, 무너지는 보드를 마지막 구원 한 번으로 버틴다.

### 목표 조작

첫 120초 기준 조작은 3개만 노출한다.

- `소환`
- `합성`
- `구원`

첫 120초에서 숨길 것:

- 교체
- 오버클럭
- 링크 모양 최적화
- 열기/과부하 세부 수식
- BM 버튼
- 상점/패스/미션 진입
- 긴 설명 텍스트

## 현재 구현 진단

### 살릴 것

현재 코드베이스에서 다음은 살린다.

- `server/server.js`, `server/ws.js`, `server/room.js`
  - 로컬 서버, WebSocket, 방 동기화 구조는 계속 사용할 수 있다.
  - 전투 상태 payload만 바뀌면 된다.

- `server/profile_purchase.js`
  - BM/프로필 구매의 테스트 기반을 유지한다.
  - 단, 전투력 판매로 이어지지 않도록 상품 정의는 재작성한다.

- `src/shared/meta.js`, `src/shared/run_highlights.js`, `src/shared/event_text.js`
  - 결과 화면, 진행도, 이벤트 텍스트의 기반으로 활용한다.
  - 이벤트 이름과 하이라이트 종류는 리부트 용어에 맞게 바꾼다.

- `src/client/render_layout.js`
  - 세로 화면 viewport 계산과 캔버스 스케일링 기반으로 유지한다.
  - 다만 전투 영역 목표는 390x844 기준 상단 0-620px로 재정의한다.

- 앱 화면 구조
  - Splash, Lobby, Shop, Missions, Season, Result 구조는 유지한다.
  - 각 화면은 웹 카드가 아니라 게임 준비실/보상/컬렉션처럼 다시 디자인한다.

- 테스트 체계
  - `node --test` 기반을 유지한다.
  - 새 전투 seed suite, 렌더 레이아웃, BM guardrail 테스트를 추가한다.

### 버리거나 뒤로 미룰 것

다음은 첫 리부트 구현에서 제거하거나 숨긴다.

- 기존 `강화`, `교체`, `오버클럭`, 복잡한 링크 모양 조작
- `Signal`, `Relay`, `Noise`, `Saturation`, `Heat`, `Anchor`, `Link Shape`를 동시에 노출하는 UI
- 전투 중 BM/상점/미션/패스 진입
- 기능 설명이 많은 카드형 로비
- 검은 사각형처럼 보일 위험이 있는 적/유닛 atlas 사용 방식
- 전투 결과보다 미션/보상/상점이 먼저 보이는 흐름

### 대체할 것

| 현재 | 리부트 후 |
| --- | --- |
| 릴레이 장치 | 수집형 신호 장난감 유닛 |
| 노이즈 | 장난감 트랙을 침범하는 잡음 생물/오염 조각 |
| 강화 | 소환 재화/합성 결과로 대체 |
| 구원/링크 펄스 | 파트너 보드를 살리는 명확한 `구원` |
| 열기/포화 | 첫 120초 뒤에만 등장하는 고급 압박 |
| 릴레이 연구소 | 유닛 컬렉션/장난감 진열대 |
| 상점 상품 카드 | 큰 프리뷰 중심 코스메틱 진열대 |

## 수정 방향 요약

### 1. 전투 코어를 새로 세운다

기존 `src/shared/game.js`는 많은 기능이 쌓여 있어 첫 120초 재미를 검증하기 어렵다. 직접 덧칠하는 대신 새 전투 계약을 별도 모듈로 만든다.

권장 구조:

- `src/shared/reboot_content.js`
  - 첫 120초 유닛, 적, seed suite, wave contract, rules를 정의한다.

- `src/shared/reboot_game.js`
  - `createRebootGame`
  - `tickRebootGame`
  - `summonToy`
  - `mergeToys`
  - `castRescue`
  - `serializeRebootState`

- `src/shared/game.js`
  - 기존 서버/클라이언트 호환을 위해 일시적으로 adapter 역할을 한다.
  - 기존 export 이름 `supplyRelay`, `mergeRelays`, `castLinkPulse`는 새 조작에 매핑한다.

이렇게 하면 기존 멀티 서버와 테스트를 한 번에 깨지 않고, 전투 핵심만 빠르게 교체할 수 있다.

### 2. 첫 120초 seed suite를 먼저 통과시킨다

구현은 무작위 전투 전체가 아니라 seed suite부터 시작한다.

필수 seed:

- `tutorial_success`
- `lucky_clutch`
- `bad_recoverable`
- `greed_loss`
- `rescue_miss`
- `boss_clutch`

목표:

- scripted tutorial만 재미있는 상태를 방지한다.
- 좋은 RNG, 나쁜 RNG, 욕심, 구원 지연, 보스 대응이 서로 다른 감정으로 보이게 한다.
- 실패 후 “왜 졌는지”와 “다음에 무엇을 할지”가 한 문장으로 남게 한다.

### 3. 전투 화면을 다시 그린다

전투 화면은 기존 회로판/시스템 HUD보다 toy-board 전투를 우선한다.

필수 화면 요소:

- 중앙 공유 트랙
- 내 보드
- 파트너 보드
- 파트너 위험도
- 소환 재화
- 합성 가능 상태
- 구원 게이지
- 보스 경고
- 결과로 이어지는 대표 사건

전투 중 버튼:

- `소환`
- `합성`
- `구원`

버튼 수는 3개 이하로 유지한다. 합성 가능 유닛 선택은 보드 위에서 처리하고, 별도 고급 버튼을 만들지 않는다.

### 4. 에셋을 기획 기준에 맞게 재생성한다

기존 generated atlas는 임시로 유지하되, 리부트 vertical slice에는 새 스타일 잠금 이미지와 새 에셋을 사용한다. 스타일 락과 placeholder 규칙은 전투 UI 구현보다 먼저 승인한다.

첫 에셋 범위:

- 유닛 5종
  - 스파크 핀
  - 톡톡 앰프
  - 느림 코일
  - 버스트 핀
  - 구원 코일

- 적 4종
  - 잡음 조각
  - 빠른 잡음
  - 무거운 잡음
  - 소형 보스

- UI/보상
  - 소환 재화
  - 구원 게이지
  - 합성 가능 프레임
  - 파트너 위험 경고
  - 결과 보상 3종

에셋 조건:

- 텍스트 없는 투명 배경
- 24px/48px/64px readability 통과
- 390x844 실제 화면에서 식별 가능
- 같은 원근, 같은 림라이트, 같은 외곽선
- atlas slice 자동 테스트 통과

### 5. 홈/상점/컬렉션은 게임 화면처럼 다시 만든다

리부트 v1에서 전투 외 화면은 모두 존재하되, 전투보다 앞서 복잡해지면 안 된다.

홈:

- 중앙에 현재 덱/대표 유닛/트랙 프리뷰
- 가장 큰 버튼은 `시작`
- 보상 훅은 1개만 노출
- 하단 도크는 아이콘 중심

유닛 컬렉션:

- 데이터 목록이 아니라 장난감 진열대
- 잠긴 유닛도 실루엣과 희귀도 프레임으로 갖고 싶게 보이게 한다.

상점:

- 전투력 상품 금지
- 큰 프리뷰 중심
- 스킨, 보드, 합성 이펙트, 구원 이펙트, 이모트만 취급

미션/시즌:

- 첫 세션에서는 결과 이후에만 열림
- 미션은 `소환`, `합성`, `구원`, `파트너 도움`, `보스 클러치` 중심

### 6. BM은 전투 밖에 둔다

전투 중에는 다음을 금지한다.

- 상점 버튼
- 패스 버튼
- 광고 버튼
- 유료 부활
- 유료 reroll
- 보스 실패 직후 구매 제안

BM 대상:

- 스킨
- 보드 테마
- 합성 이펙트
- 구원 이펙트
- 이모트
- 프로필 프레임
- 승리 포즈
- 시즌 코스메틱

돈을 낸 플레이어는 더 멋져 보일 수 있지만, 파트너와 함께 하는 전투를 더 쉽게 만들면 안 된다.

## 구현 단계

### Phase 0: 안전장치와 기준 고정

목표:

- 현재 구현을 바로 뜯기 전에 리부트 기준, 아트 게이트, 테스트 전환 전략을 고정한다.

작업:

1. 아트 게이트 선행 문서 작성
   - `docs/design/generation/reboot_asset_prompts.md`
   - 스타일 thesis
   - 홈 mockup 요구사항
   - 전투 mockup 요구사항
   - 유닛/적/보상 에셋 inventory
   - placeholder 금지 규칙
   - 24/48/64px readability 기준

2. 스타일 락 이미지와 핵심 mockup 생성/승인
   - 홈 mockup 1장
   - 전투 mockup 1장
   - 유닛/적 스타일 샘플 1장
   - 보상/재화 샘플 1장
   - 승인 전에는 Phase 3 전투 UI 구현과 Phase 6 홈/상점/컬렉션 리스킨을 시작하지 않는다.

3. placeholder 규칙 고정
   - 검은 사각형 금지
   - atlas 배경 노출 금지
   - 색만 다른 유닛 금지
   - 합성/구원/보스 경고는 최종 에셋 전에도 motion placeholder를 가진다.

4. `src/shared/reboot_content.js` 생성
   - `REBOOT_RULES`
   - `REBOOT_UNITS`
   - `REBOOT_ENEMIES`
   - `REBOOT_WAVES`
   - `REBOOT_SEEDS`

5. `test/reboot_content.test.js` 생성
   - seed 6종 존재 확인
   - 유닛 5종 수치 확인
   - 적 4종 수치 확인
   - 구원/소환/합성 계약 확인

6. 테스트 전환표 작성
   - 기존 테스트를 유지/수정/대체/삭제 후보로 분류한다.
   - `node --test`가 어느 phase에서 무엇을 검증하는지 명확히 한다.

완료 기준:

- `node --test` 통과
- `docs/gdd/11_core_combat_prototype_spec.md`의 수치 계약이 코드에 반영됨
- 스타일 락/placeholder 규칙이 승인되기 전 전투 화면 구현을 시작하지 않음

### 테스트 전환 전략

기존 테스트는 무조건 유지가 아니라 목적별로 전환한다.

| 현재 테스트 | 리부트 처리 | 이유 |
| --- | --- | --- |
| `test/game.test.js` | Phase 1-2에서 `test/reboot_game.test.js`와 `test/game_adapter.test.js`로 대체 | 기존 12칸 보드, supply cost 20, swap, overclock, heat/link 검증은 리부트 목표와 충돌 |
| `test/ws.test.js` | 유지하되 action whitelist, seed sync, result reason 일치 검증 추가 | 서버/멀티 구조는 살리되 payload 계약은 바뀜 |
| `test/profile_purchase.test.js` | 유지, 전투력 판매 금지 테스트 추가 | BM guardrail 유지 |
| `test/render_layout.test.js` | 유지, 375x812/390x844/430x932 safe area 추가 | 세로 앱 기준 강화 |
| `test/assets.test.js` | 새 atlas slice/readability 테스트로 수정 | 기존 에셋 대신 리부트 에셋 검증 |
| `test/run_highlights.test.js` | 새 하이라이트로 수정 | 파트너 구원, 동시 합성, 보스 막타, 욕심, 구원 지연 |
| `test/event_text.test.js` | 새 이벤트 라벨로 수정 | 추상 용어를 줄이고 행동/사건 중심으로 전환 |
| `test/meta.test.js` | 유지, cosmetic progress 중심 보상 검증 추가 | 전투력 판매 없이 진행도 유지 |
| `test/presentation.test.js` | 유지, 전투 중 BM 진입 없음/3버튼 제한 추가 | 모바일 UI guardrail |

Phase별 test gate:

- Phase 0: 기존 테스트 + `reboot_content` 계약 테스트.
- Phase 1: `reboot_game` seed suite 테스트가 추가되고, legacy combat assertion은 아직 유지한다.
- Phase 2: `game.js` adapter 전환과 함께 old combat assertion을 reboot adapter assertion으로 교체한다.
- Phase 3 이후: client presentation/render/layout 테스트를 리부트 화면 기준으로 갱신한다.
- 어떤 phase에서도 `node --test`는 통과해야 한다.

### Phase 1: 리부트 전투 엔진

목표:

- 첫 120초 seed suite가 실제 상태 전이로 재현된다.

작업:

1. `src/shared/reboot_game.js` 생성
   - 보드, 유닛, 적, 재화, 위험도, 구원 게이지, seed script, event log를 상태로 가진다.

2. 액션 구현
   - `summonToy(game, playerId)`
   - `mergeToys(game, playerId, unitIds)`
   - `castRescue(game, playerId)`

3. tick 구현
   - wave spawn
   - enemy movement
   - unit targeting
   - damage/slow
   - leak/risk
   - rescue window
   - boss warning
   - result transition

4. seed suite 테스트
   - `tutorial_success`는 소환/합성/구원을 모두 경험한다.
   - `lucky_clutch`는 좋은 RNG가 보스 막타/강한 연출로 이어진다.
   - `bad_recoverable`은 나쁜 결과가 slow/구원으로 쓸모 있어야 한다.
   - `greed_loss`는 욕심 실패 원인을 남긴다.
   - `rescue_miss`는 구원 지연 실패 원인을 남긴다.
   - `boss_clutch`는 보스 전 선택이 승패에 영향을 준다.

완료 기준:

- seed suite 테스트 통과
- 좋은 RNG seed와 실패 seed가 모두 통과
- 각 실패 seed의 result reason이 하나만 나온다.
- 첫 120초 전투가 자동 시뮬레이션으로 재현된다.

### Phase 2: 기존 game export adapter

목표:

- 서버와 클라이언트의 기존 진입점을 유지하면서 새 엔진으로 전환한다.

작업:

1. `src/shared/game.js`의 public API를 유지한다.
   - `createGame`
   - `tickGame`
   - `serializeState`
   - `supplyRelay`
   - `mergeRelays`
   - `castLinkPulse`

2. 내부 구현은 리부트 엔진으로 매핑한다.
   - `supplyRelay` -> `summonToy`
   - `mergeRelays` -> `mergeToys`
   - `castLinkPulse` -> `castRescue`

3. 첫 리부트에서는 다음 action을 disabled 처리한다.
   - `swapRelays`
   - `upgradeSupplyFocus`
   - `overclockRelay`

4. `serializeState`는 client가 필요한 최소 필드를 제공한다.
   - boards
   - track enemies
   - resources
   - actionState
   - eventLog
   - result
   - seedName

5. 서버 계약을 이 phase에서 함께 고정한다.
   - action whitelist: `summon`, `merge`, `rescue`
   - seedName/runId 양쪽 동기화
   - bot takeover 상태
   - 양쪽 result reason 일치
   - legacy action 수신 시 no-op 또는 명시적 reject

완료 기준:

- 서버 테스트가 통과한다.
- 기존 WebSocket room flow가 깨지지 않는다.
- 클라이언트가 새 상태를 렌더링할 수 있다.
- 온라인 모드가 Phase 8까지 검증되지 않은 채 밀리지 않도록 최소 계약 테스트가 존재한다.

### Phase 3: 전투 UI/렌더 리부트

목표:

- 전투 화면을 상용 모바일 toy-board TD처럼 다시 만든다.

작업:

1. `src/client/app.js`를 필수 분해한다.
   - `src/client/reboot_actions.js`: 전투 버튼 상태와 command mapping
   - `src/client/reboot_render.js`: canvas 전투 렌더
   - `src/client/reboot_screens.js`: 홈/컬렉션/상점/미션/시즌 screen builder
   - `src/client/reboot_online.js`: WebSocket 연결과 action 송수신
   - `src/client/app.js`: bootstrap, screen state, module wiring만 담당

2. 전투 action을 3개로 제한한다.
   - `소환`
   - `합성`
   - `구원`

3. 전투 렌더를 새 상태에 맞춘다.
   - 중앙 공유 트랙
   - 내 보드
   - 파트너 보드
   - 파트너 위험 meter
   - 구원 beam
   - 합성 reveal
   - 보스 warning

4. 기존 canvas 함수 중 재사용 가능 항목만 유지한다.
   - viewport 계산
   - screen shake
   - reward flyout
   - hit flash 계열

5. 복잡한 HUD를 숨긴다.
   - wave/signal/saturation/heat를 첫 120초에서는 축약
   - 텍스트보다 아이콘과 meter 사용

6. 첫 120초 합성은 추천 쌍 1개를 버튼 한 번으로 합성한다.
   - 수동 2개 선택 UI는 첫 120초 밖으로 미룬다.
   - 합성 후보가 없으면 `합성` 버튼은 비활성화한다.
   - 합성 후보가 있으면 보드 위 추천 쌍만 빛난다.

완료 기준:

- 390x844에서 버튼이 3개 이하
- 전투 중 BM/상점/패스/미션 진입 없음
- 정지 스크린샷으로 적 경로, 내 보드, 파트너 보드, 위험, 주 버튼이 보임
- `app.js`가 전투 렌더/온라인/화면 builder를 직접 모두 소유하지 않음

### Phase 4: 결과/재도전 루프

목표:

- 실패가 “한 번 더”로 이어진다.

작업:

1. result reason을 seed suite에 맞게 재작성한다.
   - `욕심`
   - `구원 지연`
   - `보스 돌파`
   - `합성 실수`
   - `운이 나쁨`

2. 결과 화면 우선순위
   - 대표 사건
   - 실패 원인 1개
   - 다음 목표 1개
   - 보상 1-2개
   - `다시 도전`

3. 실패 직후 금지
   - 상점
   - 광고
   - 유료 부활
   - 패스 구매

완료 기준:

- 실패 seed마다 원인이 하나만 보인다.
- 재도전 버튼이 가장 크다.
- 결과 화면에서 다음 판 목표가 한 문장으로 보인다.

### Phase 5: 봇 파트너

목표:

- 서버 없이도 협동 리듬이 느껴진다.

작업:

1. 봇은 첫 120초 동안 플레이어보다 약간 늦게 반응한다.
2. 62-88초 사이 한 번 위험해져 구원 학습을 만든다.
3. 플레이어가 구원하면 감사 emote와 결과 하이라이트를 남긴다.
4. 봇이 모든 문제를 해결하지 않도록 DPS 기여를 제한한다.

완료 기준:

- 봇이 있어도 플레이어 선택이 승패에 영향을 준다.
- 파트너 위험이 보드 위 사건으로 보인다.
- 봇이 너무 유능하거나 무의미하지 않다.

### Phase 6: 홈/컬렉션/상점 리스킨

목표:

- 전투 밖 화면이 웹페이지가 아니라 모바일 게임 화면처럼 보인다.

작업:

1. 홈
   - 대표 유닛/덱/트랙 프리뷰를 중앙에 배치
   - `시작` 버튼을 가장 크게
   - 보상 훅 1개만 노출

2. 유닛 컬렉션
   - 5종 리부트 유닛을 장난감 진열대처럼 표시
   - 역할, 희귀도, 실루엣, preview를 제공

3. 상점
   - 코스메틱 preview 중심
   - 전투력 판매 문구 제거
   - 구매 가능 항목은 표현/수집만 유지

4. 미션/시즌
   - 결과 이후 열리는 보상 루프로 유지
   - 전투 중 노출 금지

완료 기준:

- 홈 첫 화면이 게임 준비실처럼 보인다.
- 유닛 컬렉션이 데이터 카드 리스트처럼 보이지 않는다.
- 상점이 결제 그리드처럼 보이지 않는다.

### Phase 7: 에셋 생성/교체

목표:

- Phase 0에서 승인한 스타일 락에 맞춰 임시 canvas 도형을 일관된 상용풍 에셋으로 교체한다.

작업:

1. Phase 0에서 승인된 스타일 락 이미지와 mockup을 기준으로 세부 에셋을 확장한다.
   - 홈 mockup 방향 유지
   - 전투 mockup 방향 유지
   - 유닛/적 샘플의 원근/림라이트/외곽선 유지

2. 에셋 생성
   - 유닛 5종
   - 적 4종
   - UI/보상 6종 이상

3. 후처리
   - 배경 제거
   - atlas slicing
   - outline/rim 통일
   - 24/48/64px 검증

4. 인게임 스크린샷 검증
   - 375x812
   - 390x844
   - 430x932

완료 기준:

- 검은 사각형/카드처럼 보이는 적이 없다.
- 유닛 5종이 64px에서 구분된다.
- 인게임 화면에서 에셋 원근과 조명이 섞이지 않는다.

### Phase 8: 멀티플레이 재연결

목표:

- Phase 2에서 고정한 서버 계약을 실제 두 브라우저 플레이로 검증한다.

작업:

1. 두 브라우저가 같은 seedName/runId로 시작하는지 확인한다.
2. `summon`, `merge`, `rescue` action이 양쪽에서 같은 결과를 만든다.
3. 온라인 파트너 이탈 시 봇 takeover가 화면과 결과에 반영된다.
4. result reason과 reward summary가 양쪽에서 일치해야 한다.
5. legacy action이 클라이언트에서 발생하지 않는지 확인한다.

완료 기준:

- 봇 모드와 온라인 모드가 같은 전투 규칙을 사용한다.
- 온라인 지연이 있어도 소환/합성/구원 결과가 어긋나지 않는다.
- 파트너 이탈 시 결과 화면이 깨지지 않는다.

### Phase 9: 외부 테스트 준비

목표:

- 신규 플레이어가 무설명으로 첫 120초를 이해하는지 검증한다.

작업:

1. `?mute=1` 테스트 URL을 기본 검수 URL로 사용한다.
2. seed 선택 debug 메뉴를 개발자용으로만 둔다.
3. 테스트 기록 항목을 만든다.
   - 소환 버튼 발견 시간
   - 첫 합성 이해 여부
   - 첫 구원 사용 여부
   - 실패 원인 설명 가능 여부
   - 재도전 클릭 여부
   - 오조작 횟수

완료 기준:

- 신규 5명 중 4명 이상이 첫 120초 안에 소환/합성/구원을 이해한다.
- 외부 테스트 샘플에는 `lucky_clutch`를 반드시 포함한다.
- 첫 실패 후 재도전 클릭률 40% 이상을 목표로 한다.
- 첫 전투 오조작 평균 1회 이하를 목표로 한다.

## 파일별 수정 계획

### 새로 만들 파일

- `src/shared/reboot_content.js`
  - 리부트 전투 계약 데이터.

- `src/shared/reboot_game.js`
  - 리부트 전투 엔진.

- `src/client/reboot_actions.js`
  - 전투 버튼 상태와 command mapping.

- `src/client/reboot_render.js`
  - 리부트 전투 canvas 렌더.

- `src/client/reboot_screens.js`
  - 홈/컬렉션/상점/미션/시즌 builder.

- `src/client/reboot_online.js`
  - WebSocket 연결과 action 송수신.

- `test/reboot_content.test.js`
  - 계약 데이터 검증.

- `test/reboot_game.test.js`
  - seed suite와 첫 120초 시뮬레이션 검증.

- `test/reboot_result.test.js`
  - 실패 원인/재도전 목표 검증.

- `docs/design/generation/reboot_asset_prompts.md`
  - 유닛/적/UI 에셋 생성 프롬프트.

### 수정할 파일

- `src/shared/game.js`
  - 리부트 엔진 adapter.

- `src/shared/content.js`
  - 장기적으로 legacy content와 reboot content 분리.
  - 첫 구현에서는 직접 수정 최소화.

- `src/shared/event_text.js`
  - 새 event label.

- `src/shared/run_highlights.js`
  - `파트너 구원`, `동시 합성`, `보스 막타`, `욕심`, `구원 지연` 하이라이트.

- `src/shared/meta.js`
  - 결과 보상과 cosmetic progress 적용.

- `src/client/app.js`
  - bootstrap, screen state, module wiring.
  - 전투 렌더/액션/온라인/화면 builder 직접 소유 금지.

- `src/client/styles.css`
  - 홈/상점/컬렉션/결과 화면을 모바일 게임 화면으로 재정의.

- `src/client/render_layout.js`
  - 390x844 기준 전투 영역과 safe area 조정.

- `server/room.js`
  - action whitelist와 seed sync 확인.

- `server/ws.js`
  - action payload compatibility 확인.

- `index.html`
  - 버튼 라벨, 전투 HUD, 화면 구조 정리.

### 삭제하지 않을 파일

첫 리부트 구현에서는 legacy 파일을 바로 삭제하지 않는다. 대신 사용 경로를 새 엔진으로 옮기고, 테스트 통과 후 별도 정리 단계에서 제거한다.

## UX 상세

### 전투 조작

소환:

- 재화가 10 이상이면 활성화된다.
- 버튼은 가장 큰 주 행동이다.
- 누르면 350-700ms 공개 연출 후 유닛이 보드에 착지한다.

합성:

- 같은 등급 유닛 2개가 있으면 보드 위 유닛이 빛난다.
- 첫 120초에서는 추천 쌍 1개만 제시하고 `합성` 버튼 한 번으로 합성한다.
- 수동으로 유닛 2개를 고르는 UI는 첫 120초 검증 이후 고급 조작으로만 검토한다.
- 합성은 700ms reveal을 가진다.

구원:

- 파트너 위험 70 이상에서 버튼이 강하게 보인다.
- 게이지 100일 때만 사용 가능하다.
- 사용 시 양쪽 보드를 잇는 beam과 knockback이 발생한다.

### 전투 정보

필수:

- 소환 재화
- 구원 게이지
- 파트너 위험
- 보스 경고
- 합성 가능 표시

숨김:

- 긴 수치표
- 열기/포화 상세
- 전투력 비교
- 상점/미션/패스 버튼

## 아트 방향

### 비주얼 thesis

프리미엄 animated co-op toy board.

### 금지

- 검은 배경이 붙은 atlas 셀
- 얇고 복잡한 회로 장식
- 색만 다른 유닛
- 읽기 어려운 작은 장치
- UI 안의 긴 세계관 텍스트

### 권장

- 두꺼운 실루엣
- 밝은 rim light
- 장난감 같은 재질
- 귀엽지만 너무 유아적이지 않은 표정/형태
- 유닛별 명확한 역할 아이콘
- 파트너 구원 beam의 강한 만족감

## 테스트/검수 계획

### 자동 테스트

필수 명령:

```bash
node --test
node --check src/client/app.js
git diff --check
```

추가할 테스트:

- seed suite 자동 시뮬레이션
- action availability
- result reason 단일성
- BM guardrail
- render layout safe area
- asset atlas slice
- action whitelist/seed sync/result reason multiplayer contract

### 브라우저 검수

항상 mute URL 사용:

```text
http://localhost:4173/?mute=1
```

검수 해상도:

- 375x812
- 390x844
- 430x932

검수 항목:

- 버튼 3개 이하
- 전투 중 BM 버튼 없음
- 적 경로 식별 가능
- 내 보드/파트너 보드 식별 가능
- 파트너 구원 연출 식별 가능
- 결과 원인 한 개만 표시
- 재도전 버튼 최우선

## 개발 우선순위

가장 먼저 고칠 것:

1. 아트 게이트/스타일 락/placeholder 규칙
2. 리부트 전투 계약 데이터
3. 테스트 전환표와 seed suite 테스트
4. 리부트 전투 엔진
5. 기존 game export adapter와 서버 action 계약
6. `app.js` 분해와 소환/합성/구원 3버튼 전투 UI
7. 결과/재도전 루프

그 다음:

8. 봇 파트너 감정 연출
9. 홈/컬렉션/상점 리스킨
10. 에셋 생성/교체
11. 온라인 멀티 실제 브라우저 검증
12. 외부 테스트 기록

마지막:

13. legacy 코드 정리
14. 장기 BM/시즌 확장
15. 고급 시스템 재도입

## 고급 시스템 재도입 조건

다음은 첫 120초가 통과된 뒤에만 재도입한다.

- 열기/과부하
- 교체
- 오버클럭
- 링크 모양 최적화
- 유닛 mastery
- 시즌 이벤트 boss
- 상점 회전 상품

재도입 기준:

- 새 시스템이 `소환`, `합성`, `구원`의 재미를 흐리지 않아야 한다.
- 버튼 수가 늘어나 모바일 조작을 해치면 안 된다.
- 플레이어가 실패 원인을 한 문장으로 말할 수 있어야 한다.

## 리스크와 대응

| 리스크 | 대응 |
| --- | --- |
| 기존 코드를 너무 많이 살려 리부트가 흐려짐 | 첫 120초에서는 새 엔진과 새 용어를 우선한다. |
| 새 엔진이 서버와 충돌 | adapter로 기존 public API를 유지한다. |
| 에셋 생성이 늦어짐 | 먼저 silhouette-safe placeholder를 쓰되, 검은 사각형/카드형 표현은 금지한다. |
| BM 화면이 다시 웹페이지처럼 보임 | 상점은 큰 preview와 코스메틱만 허용한다. |
| 봇이 재미를 빼앗음 | 봇 DPS와 자동 해결 능력을 제한한다. |
| 랜덤이 불쾌한 손해로 보임 | 나쁜 결과도 slow, 합성 재료, 구원 게이지로 회복 가능하게 만든다. |

## 완료 판정

리부트 수정 1차 완료는 다음을 모두 만족해야 한다.

- `tutorial_success`, `lucky_clutch`, `bad_recoverable`, `greed_loss`, `rescue_miss`, `boss_clutch` seed가 자동 테스트로 통과한다.
- 첫 120초 조작은 `소환`, `합성`, `구원`뿐이다.
- 전투 중 BM/상점/미션/패스 진입이 없다.
- 봇 모드에서 파트너 구원 사건이 반드시 한 번 발생한다.
- 실패 seed의 결과 화면은 원인 하나와 다음 목표 하나만 보여준다.
- 390x844 화면에서 적 경로, 내 보드, 파트너 보드, 위험, 주 버튼이 보인다.
- 유닛 5종과 적 4종이 64px에서 구분된다.
- `node --test`가 통과한다.
- 브라우저 검수는 항상 `?mute=1`로 진행한다.

## 다음 문서

이 문서가 검토를 통과하면 다음 문서를 작성한다.

1. `docs/design/generation/reboot_asset_prompts.md`
   - 이미지 생성 프롬프트와 후처리 기준.

2. `docs/superpowers/plans/2026-04-29-projectauto-reboot-implementation.md`
   - 실제 구현 작업을 체크박스 단위로 쪼갠 실행 계획.

3. `docs/gdd/13_external_playtest_script.md`
   - 신규 플레이어 5명 무설명 테스트 시나리오와 기록표.
