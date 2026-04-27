# Originality Matrix

이 문서는 참고작을 베끼지 않기 위한 금지/대체 기준이다. 참고작은 시장 언어와 플레이어 기대를 이해하기 위한 자료로만 사용한다.

## Sources

- [What the Luck?: Lucky Defense - Google Play](https://play.google.com/store/apps/details?hl=us&id=com.percent.aos.luckydefense): luck-based summoning, merging, roulette, ads/IAP framing.
- [Coop TD - Google Play](https://play.google.com/store/apps/details?hl=en-US&id=com.percent.aos.cooptd): cooperative tower defense, simple controls, placement, survival/defense framing.
- [Random Dice Defense - Google Play](https://play.google.com/store/apps/details?gl=US&hl=en_US&id=com.percent.royaldice): dice units with powers, merge/level-up, waves, bosses, PvP and co-op modes.

위 설명은 각 스토어 페이지의 공개 설명을 요약한 것이다. 디자인에 직접 복사하지 않는다.

## 1. Surface Elements We Must Not Copy

| category | avoid | reason |
|---|---|---|
| title language | Lucky, Dice, Random as main hook | 장르 연상은 강하지만 표면 유사성이 높다 |
| unit fantasy | dice face, guardian lottery, cute monster copy | 캐릭터 문법이 겹친다 |
| core visual | 동일한 양쪽 보드 + 중앙 길 구성 그대로 | UI 실루엣 유사성 리스크 |
| monetization language | luck packs promising stronger units | pay-to-win 오해 |
| mechanic bundle | summon + merge + roulette를 같은 조합으로 전면 배치 | 차별화 부족 |
| enemy fantasy | generic monsters marching down path | 흔하고 기억성이 낮다 |

## 2. Our Replacement Pillars

| market expectation | our replacement | player feeling retained |
|---|---|---|
| random summon | unstable Relay supply | “이번 부품으로 살릴 수 있을까?” |
| merge | circuit fusion with link shape | 고점과 보드 재구성의 쾌감 |
| tower placement | socket/link management | 공간 판단 |
| co-op help | Link Pulse and heat rescue | 파트너에게 구원받는 감정 |
| boss pressure | Signal corruption boss | 공동 위기 |
| unit rarity | grade + heat risk | 고등급이 강하지만 관리 필요 |

## 3. Core Differentiators

### Heat as a strategic cost

강한 Relay는 heat를 많이 만든다. 좋은 운이 와도 무조건 좋은 것이 아니라, 과열을 관리해야 한다.

이로 인해 복제 위험을 낮추는 점:

- 희귀 유닛이 단순 DPS 상승이 아니다.
- 지원/수리/Sink 역할이 실제로 중요하다.
- 파트너 지원의 이유가 “버프”가 아니라 “과열 구조”에서 나온다.

### Link shape as board puzzle

Relay는 N/E/S/W 연결 방향을 가진다. 같은 유닛 3개 합성보다 중요한 것은 보드 연결이 살아나는가다.

차별화:

- 유닛 위치 교환이 전략 핵심
- 좋은 Relay도 나쁜 위치에 있으면 약하다
- 합성 결과가 새 퍼즐을 만든다

### Signal fantasy

우리는 적을 죽이는 방어가 아니라 도시 신호를 지킨다.

차별화:

- 적 이름은 Noise 계열
- 생명력은 HP가 아니라 Signal Integrity
- 패배는 기지 파괴가 아니라 회로 잠식

## 4. Reference-to-Rule Matrix

| observed genre appeal | forbidden direct copy | Relay Garden rule |
|---|---|---|
| luck tension | “luck” theme as brand | unstable supply from broken city inventory |
| merge dopamine | identical merge presentation | circuit fusion with heat compression and link reroll |
| co-op visibility | mirrored boards only | partner board has heat beacons and help request lane |
| boss timer | generic boss countdown | Signal corruption timer with specific board debuffs |
| simple tap controls | one-button spam | four actions: Supply, Swap, Merge, Link Pulse |
| premium collection | paid power units | paid cosmetics only in v0, power earned in run |

## 5. Art Direction Guardrails

Do:

- 공중정원, 회로, 유리 온실, 신호 식물, 전자 이끼
- Relay는 작은 장치/식물 하이브리드
- Noise는 깨진 파형, 먼지, 균열, 흑백 잡음
- 색상은 Signal green, Amber heat, Violet corruption, Blue link

Do not:

- 주사위 눈금
- 슬롯머신/룰렛 중심 UI
- 수호자/영웅 소환 판타지 그대로
- 일반 몬스터 웨이브 판타지
- 귀여운 몬스터 표정 중심

## 6. Naming Guardrails

Good names:

- Relay Garden
- Signal Bloom
- Prism Link
- Heatroot
- Null Orchid
- Anchor Grove

Avoid names:

- Lucky Defense
- Random Relay
- Dice Garden
- Guardian Summon
- Co-op Tower

## 7. UX Differentiation

Our screen must be recognized by:

- 중앙 길이 아니라 중앙 Signal loop
- 양쪽 보드는 전투장보다 회로판처럼 보임
- heat warning이 보드 위에 흐름처럼 표시
- 파트너 요청은 채팅이 아니라 보드 가장자리의 Pulse beacon
- 합성 버튼보다 Swap과 Link가 중요한 순간을 만든다

## 8. Legal and Product Review Checklist

Before implementation milestone:

- 이름이 참고작과 혼동되지 않는가
- 아이콘 실루엣이 주사위/행운/수호자와 닮지 않았는가
- 스토어 설명 첫 문장이 “운”만 내세우지 않는가
- 스크린샷이 참고작과 같은 정보 배치를 하지 않는가
- 유닛 명칭과 아트가 고유 세계관을 갖는가

## 9. Mechanical Similarity Risk Register

표면 요소가 달라도 핵심 행동 루프가 같으면 플레이어는 “비슷한 게임”으로 인식한다. 아래 항목은 프로토타입 구현 전후에 반드시 확인한다.

| risk area | similarity risk if copied | Relay Garden differentiator | prototype proof |
|---|---|---|---|
| random unit supply | summon button spam becomes the main fun | team Charge is shared, but Supply cost and pity are personal; Supply creates heat-management risk | run telemetry shows Supply is not the only high-frequency action |
| merge loop | three identical units merge into pure power climb | circuit fusion rerolls link shape, compresses heat, and can break or improve network topology | merge preview shows destination and link-count range before confirmation |
| board value | strongest unit is always best | heat, Sink, Repair, and Anchor links make low-DPS support pieces valuable | win logs include at least 20% support Relay retention past wave 6 |
| co-op help | partner support is just a generic buff | Link Pulse targets partner heat, saturation, and board failures | at least one saved run has Link Pulse preventing shutdown or signal collapse |
| boss pressure | boss is only a large HP enemy with timer | bosses corrupt board rules, link behavior, or heat state | each boss has one named board-level disruption in combat log |
| economy | paid or random power is the long-term chase | BM remains cosmetic/meta-expression only for v0 | combat sim works with all store data disabled |
| UX rhythm | player repeatedly taps summon/merge without reading board | automatic Supply is followed by Swap, Merge, and Link evaluation | tutorial telemetry records Swap or Link evaluation before first boss |
| two-player layout | two mirrored boards around a path | partner board is compact status surface, central element is Signal loop, help appears as Pulse beacon | screenshot review passes silhouette checklist below |

Acceptance rule:

- If a mechanic can be described as “same as a popular co-op TD, renamed,” it must be cut or reworked.
- If a mechanic creates a new tradeoff between power, heat, link geometry, and partner rescue, it can stay.
- If a mechanic is common genre grammar but necessary, its presentation and surrounding decision must be distinct.

## 10. UX Silhouette Test Plan

This must be verified with screenshot and short gameplay-video review before art lock. The current document defines the test; it does not claim the future build has already passed.

Test set:

- 390x844 gameplay screenshot at wave 1, wave 5, final boss
- 360x800 small-device screenshot at wave 5
- 10-second video of Supply to first Swap/link decision
- 10-second video of Link Pulse rescue
- 10-second video of Merge decision

Fail conditions:

- Main screen reads as dice/guardian/random-summon UI at a glance.
- Central combat reads as a straight lane instead of a Signal loop.
- The largest button or animation implies the whole game is summon spam.
- Partner interaction is visually indistinguishable from a normal buff button.
- Merge animation hides heat/link consequences.
- Store, mission, or pass UI suggests paid combat strength.

Pass targets:

- A new viewer can identify heat as a core pressure within 5 seconds.
- A new viewer can tell which board belongs to the partner within 5 seconds.
- The most memorable visual is Signal/Relay/heat language, not luck/dice/monster language.
- The first 60 seconds show at least two distinct verbs besides Supply, usually Swap evaluation and Link/heat reading.
- Combat screenshots remain readable without copying a two-board-plus-path silhouette from reference games.
