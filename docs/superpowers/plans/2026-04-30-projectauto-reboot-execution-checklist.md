# ProjectAuto Reboot Execution Checklist

작성일: 2026-04-30

이 체크리스트는 `2026-04-30-projectauto-reboot-implementation.md`를 실제 구현 중 놓치지 않도록 압축한 실행 게이트다. 목표는 웹페이지 같은 데모가 아니라, 세로형 모바일 협동 랜덤 보드-구원 TD로 느껴지는 playable vertical slice를 만드는 것이다.

## 원칙

- 전투 중 조작은 `소환`, `합성`, `구원` 3개만 둔다.
- BM, 상점, 패스, 보상, 유닛 강화는 전투 밖 화면에서만 다룬다.
- 모든 구현은 테스트를 먼저 만들고 실패를 확인한 뒤 통과시킨다.
- 브라우저 QA는 항상 `http://localhost:4173/?mute=1`로 진행한다.
- 첫 120초는 seed suite로 재현 가능해야 한다.
- 이미지 에셋은 리부트 전용 manifest와 새 atlas만 사용한다.
- 기존 `relay-world`, `noise-world`, 검은 사각 적 에셋은 리부트 렌더에서 사용하지 않는다.

## Phase 0: 작업 안전장치

- [x] `main`이 아닌 구현 브랜치에서 작업한다.
- [x] 로컬 git 계정이 `dadm8473 <dadm8473@gmail.com>`인지 커밋 전 확인한다.
- [x] 큰 작업은 기능 단위 커밋으로 나눈다.
- [x] 각 커밋 전 `git diff --check`를 통과시킨다.
- [x] 문서/테스트/코드가 같은 방향을 가리키는지 확인한다.

## Phase 1: 리부트 콘텐츠 계약

- [x] `src/shared/reboot_content.js`를 만든다.
- [x] `test/reboot_content.test.js`를 먼저 작성한다.
- [x] seed 이름 6개를 고정한다.
- [x] 유닛 5종을 고정한다.
- [x] 적 4종을 고정한다.
- [x] 소환 비용 10, 시작 소환 재화 10을 고정한다.
- [x] 구원 튜토리얼 창 10초를 고정한다.
- [x] 390x844 기준 화면 계약을 고정한다.
- [x] wave timing이 GDD와 일치하는지 테스트한다.
- [x] seed summon/merge script가 GDD와 일치하는지 테스트한다.

## Phase 2: 리부트 엔진

- [x] `src/shared/reboot_game.js`를 만든다.
- [x] `test/reboot_game.test.js`를 먼저 작성한다.
- [x] `createRebootGame` state shape를 고정한다.
- [x] `summonToy`, `mergeToys`, `castRescue`, `tickRebootGame`, `serializeRebootState`를 구현한다.
- [x] `Math.random()`을 사용하지 않는다.
- [x] `tutorial_success`가 소환, 합성, 구원을 모두 경험하게 한다.
- [x] `greed_loss`는 대표 원인 `greed` 하나만 낸다.
- [x] `rescue_miss`는 대표 원인 `rescue_missed` 하나만 낸다.
- [x] `boss_clutch`는 `boss_slowed`, `boss_final_hit`, `boss_leaked` 분기를 구분한다.
- [x] 결과에 `nextGoal`과 `highlights`를 포함한다.

## Phase 3: 기존 API 어댑터

- [x] `src/shared/game.js` public API는 유지한다.
- [x] `createGame`을 리부트 state로 연결한다.
- [x] `supplyRelay`는 `summonToy`로 연결한다.
- [x] `mergeRelays`는 `mergeToys`로 연결한다.
- [x] `castLinkPulse`는 `castRescue`로 연결한다.
- [x] `swapRelays`, `upgradeSupplyFocus`, `overclockRelay`는 첫 120초 리부트 전투에서 no-op/reject 처리한다.
- [x] 기존 테스트는 레거시 기본 경로를 유지하면서 리부트 seed 경로를 추가 검증한다.

## Phase 4: 서버 멀티플레이

- [x] `server/server.js`의 실제 `handleAction` 경로를 수정한다.
- [x] `summon`, `merge`, `rescue`만 active battle action으로 허용한다.
- [x] legacy action은 state를 바꾸지 않는다.
- [x] `buy`는 active combat action이 아니다.
- [x] 두 플레이어가 같은 `seedName`, `runId`, `result.reason`을 본다.
- [x] 파트너 disconnect 시 봇이 이어받는다.
- [x] 테스트는 문자열 검사만 하지 않고 dispatcher 또는 WebSocket round trip을 사용한다.

## Phase 5: 클라이언트 모듈 분리

- [x] `src/client/reboot_actions.js`를 만든다.
- [x] `src/client/reboot_render.js`를 만든다.
- [x] `src/client/reboot_screens.js`를 만든다.
- [x] `src/client/reboot_online.js`를 만든다.
- [x] `src/client/app.js`는 bootstrap/wiring만 담당한다.
- [x] `app.js`는 900줄 이하로 줄인다.
- [x] `app.js`에서 legacy renderer anchor를 제거한다.

## Phase 6: 전투 UI

- [x] 전투 화면 버튼은 `소환`, `합성`, `구원` 3개만 보인다.
- [x] 전투 중 상점, 패스, 미션, 광고, 유료 부활 버튼이 없다.
- [x] 파트너 보드와 내 보드가 동시에 보인다.
- [x] 경로 위 적이 카드/아이콘처럼 보이지 않는다.
- [x] 구원 beam은 양쪽 보드를 잇는 사건처럼 보인다.
- [x] 위험 상태는 텍스트 없이도 읽힌다.

## Phase 7: 결과와 재도전

- [x] 결과 화면은 제목, 하이라이트, 원인, 다음 목표, 보상, 다시 도전, 홈 순서다.
- [x] 실패 직후 shop/ad/paid revive/pass purchase로 보내지 않는다.
- [x] `다시 도전`은 새 `runId`를 만들고 state/result/events를 초기화한다.
- [x] named training seed 재도전은 같은 `seedName`으로 다시 시작한다.

## Phase 8: 홈, 유닛, 상점

- [x] 홈은 하나의 큰 `시작` 버튼 중심이다.
- [x] 컬렉션은 유닛 5종의 역할과 등급을 보여준다.
- [x] 상점은 스킨, 보드 테마, 합성 효과, 구원 효과, 이모트, 프로필 프레임만 판매한다.
- [x] paid power, paid revive, paid reroll, paid summon odds는 없다.
- [x] 화면은 웹페이지가 아니라 앱게임 shell처럼 보여야 한다.

## Phase 9: 리부트 에셋 통합

- [x] `reboot-unit-atlas.png`를 통합한다.
- [x] `reboot-enemy-atlas.png`를 통합한다.
- [x] `reboot-ui-icons.png`를 통합한다.
- [x] `reboot-reward-icons.png`를 통합한다.
- [x] `reboot-board-accents.png`를 통합한다.
- [x] manifest `columns`, `rows`, `cell`, `order`가 실제 PNG와 일치한다.
- [x] content는 숫자 `atlasIndex` 대신 `spriteKey`를 사용한다.
- [x] 24px, 48px, 64px proof sheet에서 역할이 보인다.

## Phase 10: 브라우저 QA

- [x] `npm run dev`로 서버를 실행한다.
- [x] `http://localhost:4173/?mute=1`로 연다.
- [x] 375x812에서 확인한다.
- [x] 390x844에서 확인한다.
- [x] 430x932에서 확인한다.
- [x] 소리가 나지 않는다.
- [x] 전투 버튼은 3개뿐이다.
- [x] BM 버튼은 전투 중 없다.
- [x] 첫 120초가 자동/봇 테스트로 끝까지 플레이 가능하다.
- [x] 결과 화면에서 재도전이 즉시 작동한다.

## 현재 진행 포인터

Phase 0~10 완료. `tools/reboot_browser_qa.mjs`로 모바일 3종 뷰포트와 120초 가속 플레이스루를 검증한다.
