# Core Game Spec

## 1. One Sentence

`Relay Garden`은 두 플레이어가 각자 공중정원의 회로 보드를 운영하며, 랜덤하게 공급되는 Relay 부품을 연결해 중앙 도시 신호를 지키는 세로형 협동 랜덤 디펜스다.

## 2. Design Target

플레이어가 재미를 느껴야 하는 순간:

- 새 Relay가 들어왔을 때 “이걸 어디에 꽂으면 살아날까?”라고 3초 안에 판단하는 순간
- 3개 합성으로 고급 Relay가 만들어졌을 때 보드 전체 연결이 다시 살아나는 순간
- 내 보드가 과부하로 터지기 직전에 파트너가 Link Pulse로 구해주는 순간
- 보스성 Noise가 중앙 신호를 잠식할 때, 둘이 서로 다른 역할로 버텨내는 순간

재미의 핵심은 운 자체가 아니다. 랜덤하게 주어진 불완전한 부품을 **연결 가능한 구조로 바꾸는 판단**이 핵심이다.

## 3. Session Shape

| 항목 | 값 |
|---|---:|
| 목표 세션 길이 | 6분 30초-8분 |
| 플레이어 수 | 2명 협동, 봇 대체 가능 |
| 화면 방향 | 세로 고정 |
| 보드 | 플레이어별 3x4, 총 12칸 |
| 웨이브 | 10웨이브 프로토타입 |
| 보스 | 3, 6, 10웨이브 |
| 패배 조건 | 중앙 Signal Integrity 0 또는 Noise Saturation 100 |
| 승리 조건 | 10웨이브 보스 제거 후 20초 유지 |

## 4. Game Objects

### Relay

Relay는 전투 유닛이자 회로 부품이다.

속성:

- `id`: 고유 식별자
- `type`: Relay 종류
- `tier`: 1-5
- `grade`: Basic, Tuned, Prime, Core, Origin
- `socket`: 보드 위치
- `voltage`: 공격력 계열 값
- `cycle`: 공격 주기
- `heat`: 과부하 수치
- `tags`: Beam, Pulse, Field, Repair, Amp, Sink
- `linkShape`: N, E, S, W 방향 연결 정보
- `range`: 중앙 루프상 공격 가능 거리. 프로토타입 기본 0.34 loop.

### Noise

Noise는 적이다. 중앙 회로 루프를 돌며 제거되지 않으면 Saturation을 올린다.

속성:

- `type`: Flicker, Crawler, Bulwark, Splitter, Null, Boss
- `hp`
- `speed`
- `saturationOnLoop`
- `rewardCharge`
- `pattern`

### Signal

Signal은 팀 생명력이다.

- `integrity`: 100에서 시작
- `saturation`: 0에서 시작, 100 도달 시 패배
- `stability`: 웨이브 종료 시 회복/보너스에 사용

### Team Economy

자원 소유권은 구현 충돌을 막기 위해 아래처럼 고정한다.

| resource | owner | use |
|---|---|---|
| Charge | team shared | Supply |
| Link Energy | team shared | Link Pulse |
| Signal Integrity | team shared | loss/win pressure |
| Noise Saturation | team shared | loss pressure |
| Swap Charge | individual | Swap |
| Supply count | individual | personal cost scaling and pity |
| Pity counters | individual | grade guarantees |

## 5. Board Rules

각 플레이어는 3x4 보드를 가진다.

Board index:

```text
0  1  2  3
4  5  6  7
8  9 10 11
```

칸 속성:

- 일반 칸 9개
- 과부하 위험 칸 2개
- Anchor 칸 1개

Anchor 칸:

- 초기 위치는 index 5
- Anchor 주변 4방향에 Relay를 연결하면 Link Bonus 발생
- Anchor가 과열되면 내 보드의 모든 Relay cycle이 15% 느려진다

Link activation:

- 두 Relay가 상하좌우로 인접해야 한다.
- A의 `linkShape`에 B 방향이 있고, B의 `linkShape`에 A 방향이 있으면 active link 1개다.
- `All`은 N/E/S/W 모든 방향으로 취급한다.
- active link는 Relay별 최대 4개, damage formula에서는 최대 4개까지만 계산한다.
- Anchor와 active link가 연결된 Relay는 `anchorLinked = true`.

Anchor bonus:

```text
anchorBonus = anchorLinked ? 1.12 : 1.0
boardAnchorBonus = activeLinksToAnchor >= 3 ? 1.08 : 1.0
```

위 보너스는 `linkMultiplier`에 곱한다.

배치 규칙:

- Relay는 빈 칸에 자동으로 들어온다.
- 플레이어는 Relay 두 개의 위치를 바꿀 수 있다.
- 위치 교환에는 `Swap Charge` 1개가 필요하다.
- Swap Charge는 웨이브 시작 시 1개, 보스 처치 시 2개 지급된다.

## 6. Core Loop

1. 웨이브가 시작된다.
2. Noise가 중앙 루프에 들어온다.
3. 플레이어는 Charge로 Relay를 공급받는다.
4. Relay는 보드 연결 상태에 따라 자동 공격/수리/증폭을 한다.
5. 같은 `type + tier` Relay 3개를 합성해 상위 grade 또는 다른 type의 고급 Relay를 얻는다.
6. 보드가 과열되면 Heat를 낮추거나 파트너에게 Link Pulse를 요청한다.
7. 웨이브 종료 시 남은 Signal, 낮은 Saturation, 사용한 협동 스킬에 따라 보상을 받는다.
8. 10웨이브를 클리어하면 승리한다.

## 7. Player Actions

### Supply

랜덤 Relay 1개를 공급한다.

- 비용: team Charge를 사용한다.
- 비용식: `20 + floor(personalSupplyCount / 5) * 3`
- 빈 칸이 없으면 실패
- 7회 연속 Basic만 나오면 다음 공급은 Tuned 이상 보장
- 보스 웨이브 중 Supply 비용 +20%
- `personalSupplyCount`와 pity는 플레이어별로 증가한다.

### Merge

같은 `type + tier` 3개를 하나로 합성한다.

- 결과 tier는 +1
- grade는 합성 재료 평균보다 낮아지지 않는다
- 결과 type은 70% 같은 type, 30% 같은 tag 내 다른 type
- 합성 후 1.2초 동안 해당 보드에 Spark Wave 이펙트 발생

### Swap

내 보드 Relay 두 개의 위치를 교환한다.

- 비용: Swap Charge 1
- 보스 웨이브 중 쿨다운 2초
- 잘못된 배치를 복구하는 핵심 조작

### Link Pulse

파트너 보드에 지원 펄스를 보낸다.

- 비용: Link Energy 40
- 효과: 파트너 보드에서 heat가 가장 높은 Relay 2개의 heat -35, 6초 동안 cycle +20%
- 보스 웨이브 중 사용하면 추가로 Signal integrity +4
- 남발 방지를 위해 팀 쿨다운 12초

### Overclock

내 보드 전체를 짧게 강화한다.

- 비용: Heat +20 전체
- 효과: 5초 동안 공격/수리량 +35%
- 위험: 종료 후 heat 70 이상 Relay가 있으면 3초 정지

## 8. Combat Rules

Relay는 중앙 루프의 Noise를 자동으로 타겟팅한다.

타겟팅 우선순위:

1. Boss
2. Signal에 가장 가까운 Noise
3. hp가 낮은 Noise
4. 무작위

Damage formula:

```text
damage = voltage * tierMultiplier * gradeMultiplier * linkMultiplier * anchorBonus * heatPenalty
```

| 값 | 수식 |
|---|---|
| tierMultiplier | 1 + (tier - 1) * 0.62 |
| gradeMultiplier | Basic 1.0, Tuned 1.35, Prime 1.85, Core 2.55, Origin 3.6 |
| linkMultiplier | 1 + activeLinks * 0.08, 최대 1.32 |
| anchorBonus | anchorBonus * boardAnchorBonus, 최대 1.21 |
| heatPenalty | heat 70 이상 0.8, heat 90 이상 0.55 |

Attack tick:

- 서버 시뮬레이션 tick은 20Hz다.
- 각 Relay는 `cooldown`을 갖고, `cooldown <= 0`이면 공격/수리/증폭 효과를 실행한다.
- 실행 후 `cooldown = cycle`.
- 클라이언트 snapshot은 10Hz로 받지만 전투 판정은 서버 20Hz 기준이다.
- 공격 사거리는 중앙 루프 progress 기준 거리다. `abs(relayLaneFocus - noise.progress) <= relay.range`.
- Relay의 기본 `laneFocus`는 보드 index에 따라 고정된다.

Lane focus:

| row | indexes | laneFocus |
|---:|---|---:|
| 0 | 0-3 | 0.20 |
| 1 | 4-7 | 0.50 |
| 2 | 8-11 | 0.80 |

중앙 루프는 1.0 progress를 한 바퀴로 본다. 거리 계산은 원형 거리로 한다.

```text
loopDistance(a, b) = min(abs(a - b), 1 - abs(a - b))
```

Spawn cadence:

- 웨이브 시작 후 1.0초 대기.
- 기본 spawn interval은 0.75초.
- Flicker는 0.45초, Crawler는 0.7초, Bulwark는 1.2초, Splitter는 0.9초, Null은 1.0초.
- 보스는 해당 웨이브 시작 8초 후 1회 스폰한다.
- 동일 웨이브 내 남은 큐가 비면 spawn 종료.

Heat gain:

```text
heat += cycleHeat * overclockMultiplier - coolingFromTags
```

Heat bands:

| heat | 상태 |
|---:|---|
| 0-49 | 안정 |
| 50-69 | 노란 경고, 출력 +5% |
| 70-89 | 주황 경고, 출력 -20% |
| 90-100 | 빨강 경고, 출력 -45%, 폭주 위험 |

## 9. Signal Rules

Noise가 루프를 한 바퀴 돌면 Saturation이 증가한다.

Signal integrity 감소 조건:

- Boss가 루프를 완료: -15
- Saturation 80 이상 상태로 10초 유지: -10
- Null Noise가 Anchor를 감염: -8

Signal 회복 조건:

- 보스 처치: +8
- Repair tag Relay가 웨이브 중 누적 수리: 최대 +12
- 파트너가 위험 상태에서 Link Pulse 사용: +4

## 10. Co-op Rules

협동은 자원 공유가 아니라 “서로의 위기를 읽고 개입하는 구조”다.

공유되는 것:

- 중앙 Signal
- Noise Saturation
- Charge
- 보스 타이머
- Link Energy

개별인 것:

- 보드
- Supply 횟수와 pity
- Swap Charge
- Heat 상태
- Merge 선택

협동 보너스:

| 조건 | 효과 |
|---|---|
| 양쪽 보드가 서로 다른 tag 3개 이상 활성화 | Signal 안정도 +10% |
| 한 플레이어가 Link Pulse로 파트너 폭주를 방지 | 다음 Supply 비용 -25% |
| 보스 웨이브 중 양쪽 모두 Overclock 사용 | 4초간 Boss 받는 피해 +30% |
| 한쪽이 Repair 2개, 다른 쪽이 Beam 2개 유지 | 웨이브 보상 +15% |

## 11. Winning and Losing

승리:

- 10웨이브 Origin Null 보스를 처치한다.
- 처치 후 20초 동안 Saturation 100 미만을 유지한다.

패배:

- Signal integrity가 0이 된다.
- Saturation이 100에 도달한다.
- 10웨이브 보스 타이머가 종료된다.

패배 화면은 원인 1개를 명확히 보여준다.

예:

- “Heat를 방치해 3개 Relay가 멈췄습니다.”
- “보스 웨이브에서 Link Pulse가 17초 동안 사용되지 않았습니다.”
- “Supply만 누르고 Merge가 부족했습니다.”

## 12. First Play Tutorial

튜토리얼은 별도 긴 설명이 아니라 1웨이브 안에서 처리한다.

1. 첫 Supply는 고정으로 `Needle Beam` 지급
2. 둘째 Supply는 `Coolant Moss` 지급
3. 세 번째부터 랜덤
4. 첫 Noise가 한 바퀴 돌기 전 “Relay는 자동 공격합니다” 토스트
5. 같은 Relay 3개가 생기면 보드 슬롯에 Merge glow 표시
6. 파트너 heat 80 이상이면 Link Pulse 버튼 점멸

## 13. Prototype Acceptance Criteria

2주 프로토타입은 아래를 만족해야 한다.

- 봇과 플레이할 때 10웨이브까지 평균 6-8분
- 첫 플레이어가 2분 안에 Merge를 최소 1회 수행
- 보스 웨이브에서 Link Pulse 사용률 50% 이상
- 패배 시 원인 메시지가 실제 로그와 일치
- 플레이테스트 5명 중 3명 이상이 “한 판 더”를 선택
