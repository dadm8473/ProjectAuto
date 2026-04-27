# ProjectAuto Real GDD Index

이 폴더는 `docs/fortune_relay_full_design_10000.md`의 리뷰 결과를 반영해 새로 작성한 실제 개발용 기획 산출물이다.

기존 10,000줄 문서는 요구 형식을 만족했지만 구현 명세로는 부족했다. 이 GDD 세트는 분량보다 실행 가능성을 우선한다.

## Working Title

**Relay Garden**

세로형 2인 협동 랜덤 디펜스. 플레이어들은 무너진 공중정원을 복구하는 정비사이며, 적은 길을 따라오는 몬스터가 아니라 도시의 회로를 오염시키는 `Noise`다. 유닛은 타워가 아니라 회로 위에 배치하는 `Relays`다.

핵심 차별점:

- 표면적으로 “럭키/다이스/몬스터 길막”을 따라가지 않는다.
- 전투 목표는 적 처치뿐 아니라 오염된 회로를 복구해 도시 신호를 유지하는 것이다.
- 협동의 핵심은 같은 자원 공유가 아니라 `내 보드의 과부하를 파트너가 흡수하거나 증폭해주는 연결 선택`이다.
- 운은 소환 결과가 아니라 “회로에 들어온 불완전한 부품을 어떻게 연결할지”에서 재미가 나온다.

## Documents

1. [Core Game Spec](./01_core_game_spec.md)
2. [Prototype Balance Sheet](./02_prototype_balance_sheet.md)
3. [Originality Matrix](./03_originality_matrix.md)
4. [Co-op UX Flow](./04_coop_ux_flow.md)
5. [Bot Policy Spec](./05_bot_policy.md)
6. [Multiplayer Protocol Spec](./06_multiplayer_protocol.md)
7. [BM v0](./07_bm_v0.md)
8. [2-week Prototype Plan](./08_two_week_prototype_plan.md)

## Prototype Definition

2주 프로토타입은 “상용 출시판”이 아니다. 목표는 다음 4가지를 검증하는 것이다.

- 세로 화면에서 두 보드와 중앙 회로 상태를 동시에 읽을 수 있는가.
- 랜덤으로 들어온 Relay를 연결, 승급, 과부하 관리하는 선택이 재미있는가.
- 파트너 지원이 실제로 고맙고 눈에 보이는가.
- 봇 파트너로 혼자 테스트해도 협동 리듬이 느껴지는가.
