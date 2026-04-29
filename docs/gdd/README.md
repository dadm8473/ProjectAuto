# ProjectAuto Real GDD Index

이 폴더는 `docs/fortune_relay_full_design_10000.md`의 리뷰 결과를 반영해 새로 작성한 실제 개발용 기획 산출물이다.

기존 10,000줄 문서는 요구 형식을 만족했지만 구현 명세로는 부족했다. 이 GDD 세트는 분량보다 실행 가능성을 우선한다.

2026-04-29 기준, 기존 구현은 “상용 앱게임처럼 보이지 않는다”는 판단으로 개발을 중단하고 장르/전투/화면 기준을 재정의하는 단계다. 현재 최우선 문서는 `10_competitor_genre_analysis.md`와 `11_core_combat_prototype_spec.md`다.

## Working Title

**Relay Garden / ProjectAuto Reboot**

세로형 2인 협동 랜덤 보드-구원 TD. 플레이어는 수집형 신호 장난감 유닛을 소환하고 합성해, 파트너와 함께 무너지는 공유 트랙을 버틴다.

현재 리부트 방향:

- 장르는 `협동 랜덤 보드-구원 TD`로 재정의한다.
- 기존 `Signal Relay` 정체성은 유지 가능하지만, 추상 네트워크 UI가 아니라 collectible toy-machine/mascot 유닛으로 상업화한다.
- 첫 120초 조작은 `소환`, `합성`, `구원` 3개로 제한한다.
- 협동의 핵심은 파트너 HUD가 아니라 “파트너가 무너지는 순간 내가 살리는 사건”이다.
- 개발 재개 전, 첫 120초 전투와 아트/상용 제작 게이트를 문서로 통과해야 한다.

## Documents

1. [Core Game Spec](./01_core_game_spec.md)
2. [Prototype Balance Sheet](./02_prototype_balance_sheet.md)
3. [Originality Matrix](./03_originality_matrix.md)
4. [Co-op UX Flow](./04_coop_ux_flow.md)
5. [Bot Policy Spec](./05_bot_policy.md)
6. [Multiplayer Protocol Spec](./06_multiplayer_protocol.md)
7. [BM v0](./07_bm_v0.md)
8. [2-week Prototype Plan](./08_two_week_prototype_plan.md)
9. [App Screen Architecture](./09_app_screen_architecture.md)
10. [Competitor Genre Analysis](./10_competitor_genre_analysis.md)
11. [Core Combat Prototype Spec](./11_core_combat_prototype_spec.md)

## Prototype Definition

기존 2주 프로토타입 정의는 보류한다. 기능 MVP를 더 쌓는 대신, 먼저 다음 4가지를 검증해야 한다.

- 첫 120초 안에 소환/합성/구원이 텍스트 없이 이해되는가.
- 파트너 위험과 구원이 보드 위 사건으로 보이는가.
- 실패 원인이 한 문장으로 설명되고 재도전 욕구가 생기는가.
- 홈, 전투, 보상, 상점, 컬렉션이 웹페이지가 아니라 상용 모바일 게임 화면처럼 보이는가.
