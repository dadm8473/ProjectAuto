# Core Game Spec

## 1. One Sentence

`Relay Garden`은 두 플레이어가 각자 공중정원의 회로 보드를 운영하며, 랜덤하게 공급되는 Relay 부품을 연결해 중앙 도시 신호를 지키는 세로형 협동 랜덤 디펜스다.

## 2. Design Target

플레이어가 재미를 느껴야 하는 순간:

- 새 Relay가 자동 배치됐을 때 “이걸 어디로 옮기고 무엇과 연결하면 살아날까?”라고 3초 안에 판단하는 순간
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
- `tags`: Beam, Pulse, Field, Repair, Amp, Sink, Support, Origin
- `linkShape`: N, E, S, W 방향 연결 정보
- `range`: 중앙 루프상 공격 가능 거리. 프로토타입 기본 0.34 loop.

### Noise

Noise는 적이다. 중앙 회로 루프를 돌며 제거되지 않으면 Saturation을 올린다.

속성:

- `type`: Flicker, Crawler, Bulwark, Splitter, Null, Boss
- `hp`
- `speed`: loop units per second. v0 loop length is 1000 units.
- `saturationOnLoop`
- `rewardCharge`
- `pattern`

### Signal

Signal은 팀 생명력이다.

- `integrity`: 100에서 시작
- `saturation`: 0에서 시작, 100 도달 시 패배
- `stability`: M2/deferred field. 2주 v0 state와 protocol snapshot에는 포함하지 않는다.

### Team Economy

자원 소유권은 구현 충돌을 막기 위해 아래처럼 고정한다.

| resource | owner | use |
|---|---|---|
| Charge | team shared | Supply |
| Link Energy | team shared | Link Pulse |
| Chance Level | team shared | Supply grade odds |
| Pending Supply Discount | team shared | next successful Supply cost reduction |
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
- 과부하 위험 칸 2개: index 3, 8
- Anchor 칸 1개

과부하 위험 칸:

- Relay가 index 3 또는 8에 있으면 self `cycleHeat`에 +2를 더한다.
- negative heat Relay도 이 보정을 받는다. 예: `cycleHeat = -9`면 위험 칸에서 -7.
- UI는 해당 socket에 amber hatch pattern을 항상 표시한다.
- 이 효과는 v0 시뮬레이션과 heat log에 포함한다.

Anchor 칸:

- 초기 위치는 index 5
- Anchor는 막힌 칸이 아니라 특수 socket이다. Relay를 배치할 수 있다.
- Anchor socket의 Relay가 주변 4방향에 active link를 만들면 Link Bonus가 발생한다.
- Anchor socket이 비어 있으면 `activeLinksOnAnchorRelay = 0`이다.
- Anchor socket의 Relay heat가 90 이상이거나 Anchor가 감염 중이면 내 보드의 모든 Relay effective cycle이 15% 느려진다.

Link activation:

- 두 Relay가 상하좌우로 인접해야 한다.
- A의 `linkShape`에 B 방향이 있고, B의 `linkShape`에 A 방향이 있으면 raw link 1개다.
- raw link가 `disabledLinks`에 포함되어 있지 않으면 effective active link 1개다.
- v0에서 `activeLinks`라는 필드명은 항상 effective active links를 뜻한다.
- Damage, Anchor, Amp, Support, Merge preview link count는 모두 effective active links만 사용한다.
- `All`은 N/E/S/W 모든 방향으로 취급한다.
- active link는 Relay별 최대 4개, damage formula에서는 최대 4개까지만 계산한다.
- Anchor socket Relay와 active link로 연결된 Relay는 `anchorLinked = true`.

Anchor bonus:

```text
anchorBonus = anchorLinked ? 1.12 : 1.0
boardAnchorBonus = activeLinksOnAnchorRelay >= 3 ? 1.08 : 1.0
```

위 보너스는 `linkMultiplier`에 곱한다.

배치 규칙:

- v0에서 Supply는 target socket을 받지 않는다. Relay는 아래 우선순위의 첫 빈 칸에 자동 배치된다.
- Supply placement priority: `[5, 4, 6, 1, 9, 0, 2, 8, 10, 3, 7, 11]`
- 플레이어는 Relay 두 개의 위치를 바꿀 수 있다.
- 위치 교환에는 `Swap Charge` 1개가 필요하다.
- 각 플레이어는 웨이브 시작 시 Swap Charge +1, 보스 처치 시 Swap Charge +2를 받는다.
- 따라서 v0의 공간 판단은 Supply 직후 수동 배치가 아니라 Swap, Merge, Link shape 복구에서 나온다.

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

- 비용은 team Charge를 사용하며 서버가 아래 canonical formula로만 계산한다.

```text
baseSupplyCost = 20 + floor(personalSupplyCount / 5) * 3
bossSupplyMultiplier = bossActive ? 1.20 : 1.00
discountMultiplier = pendingSupplyDiscountPct > 0 ? 0.75 : 1.00
supplyCost = ceil(baseSupplyCost * bossSupplyMultiplier * discountMultiplier)
```

- `personalSupplyCount`는 비용 계산 후, 성공한 Supply에서만 +1 된다.
- `pendingSupplyDiscountPct`는 다음 성공한 Supply 1회에만 적용되고 즉시 0으로 돌아간다.
- 비용 처리 순서: 빈 칸 확인 -> cost 계산 -> team Charge 확인 -> team Charge 차감 -> discount token 소비 -> tutorial override 확인 -> grade/type roll 또는 fixed grant -> 자동 배치 -> personal counters 증가.
- 빈 칸이 없으면 실패
- 7회 연속 Basic만 나오면 다음 공급은 Tuned 이상 보장
- 18회 동안 Prime 이상이 없으면 다음 공급은 Prime 이상 보장
- Basic pity와 Prime pity가 동시에 활성화되면 Prime pity가 우선한다.
- pity 적용 순서: tutorial override 확인 -> pity grade floor 계산 -> grade odds roll -> floor보다 낮은 grade면 floor로 승격 -> type roll.
- `pityBasic`은 Basic 결과면 +1, Tuned 이상이면 0으로 reset한다.
- `pityPrime`은 Prime 미만 결과면 +1, Prime 이상이면 0으로 reset한다.
- Supply grade odds는 현재 team `Chance Level`을 사용한다.
- `personalSupplyCount`와 pity는 플레이어별로 증가한다.
- first-run tutorial override는 각 플레이어의 첫 성공 Supply를 `Needle Beam`, 둘째 성공 Supply를 `Coolant Moss`로 고정한다.
- tutorial override도 성공한 Supply로 취급해 team Charge를 소모하고, `personalSupplyCount`와 pity를 Basic roll처럼 증가시킨다.
- tutorial override는 첫 플레이 튜토리얼 방에서만 켜며, 일반 매치/재도전/시뮬레이션에서는 꺼진다.

### Merge

같은 `type + tier` 3개를 하나로 합성한다.

- 결과 tier는 +1
- tier 5 Relay는 Merge할 수 없다. 서버는 `MERGE_MAX_TIER`로 거부한다.
- grade는 합성 재료 평균 rank보다 낮아지지 않는다.
- grade rank: Basic 0, Tuned 1, Prime 2, Core 3, Origin 4.
- `minimumResultGradeRank = floor((rankA + rankB + rankC) / 3)`.
Merge RNG order:

1. Compute `minimumResultGradeRank`.
2. Set `resultGradeRank = minimumResultGradeRank`. v0 has no extra merge grade-up roll.
3. Roll branch: 70% same type, 30% same tag different type.
4. If same-tag branch has no different-type candidates, switch to same-type branch.
5. For same-tag branch, candidate types are all different type Relays sharing at least one tag.
6. Roll candidate type uniformly from that candidate list.
7. If chosen type requires a higher minimum grade than current `resultGradeRank`, raise `resultGradeRank` to that type's minimum grade.
8. Final result is `chosenType`, `resultGrade`, `tier + 1`.

- 결과 `linkShape`는 결과 type의 shape pool에서 새로 roll한다. 재료의 linkShape를 상속하지 않는다.
- v0 shape pool은 roster의 base `linkShape`를 90도씩 회전한 unique variants다. `All`은 회전하지 않고 그대로 사용한다.
- 결과 heat는 `min(40, floor(averageIngredientHeat * 0.45))`다.
- Merge preview는 확정 전 destination socket, tier/grade floor, 가능한 link count range를 보여준다. 최종 type/linkShape는 서버 confirm 후 표시한다.
- 합성 후 1.2초 동안 해당 보드에 Spark Wave 이펙트 발생
- Merge command의 destination socket은 `slots[0]`이다.

Canonical Merge preview:

```text
computeMergePreview(slots, boardState, roster):
  validate the same rules as a Merge command, except no RNG is consumed
  destinationSocket = slots[0]
  ingredientType = boardState.slots[slots[0]].type
  ingredientTier = boardState.slots[slots[0]].tier
  ingredientTags = union(tags of the three ingredients)
  ingredientRanks = [rankA, rankB, rankC] from the three ingredients
  ingredientHeats = [heatA, heatB, heatC] from the three ingredients
  resultTier = ingredientTier + 1
  minimumResultGradeRank = floor(sum(ingredientRanks) / 3)
  resultHeat = min(40, floor(average(ingredientHeats) * 0.45))

  sameTypeCandidates = [ingredientType]
  sameTagCandidates = roster types where type != ingredientType and tags intersect ingredientTags
  possibleTypes =
    sameTypeCandidates if sameTagCandidates is empty
    else sameTypeCandidates + sameTagCandidates

  previewBoardBase = boardState with all three ingredient slots emptied

  for each possibleType:
    previewGradeRank = max(minimumResultGradeRank, possibleType.minimumGradeRank)
    for each unique shape in possibleType.shapePool:
      simulatedBoard = previewBoardBase with destinationSocket filled by possibleType/resultTier/previewGradeRank/resultHeat/shape
      previewLinks.add(countEffectiveActiveLinks(simulatedBoard, boardState.disabledLinks))

  return {
    destinationSocket,
    resultTier,
    minimumResultGradeRank,
    resultHeat,
    minPreviewLinks: min(previewLinks),
    maxPreviewLinks: max(previewLinks),
    currentEffectiveLinks: countEffectiveActiveLinks(boardState, boardState.disabledLinks),
    possibleUtilityGroups: intersection({Repair, Amp, Sink, Field}, union(tags of possibleTypes)),
    possibleTypeCount: count(possibleTypes)
  }
```

- `shapePool` uses the v0 unique rotation rule above. `All` contributes one shape.
- `countEffectiveActiveLinks` is the same function used by combat and snapshots: compute legal adjacent links, then remove socket pairs in `disabledLinks` that still match the simulated board.
- Merge preview is public deterministic state, not a gameplay command. Client UI, server validation helpers, ScriptedHuman, and CasualBot must call the same shared function from the latest authoritative snapshot.
- The preview may expose `possibleUtilityGroups` and `possibleTypeCount`, but it must not expose the chosen type, chosen shape, final grade raise source, or branch RNG before server confirm.

### Swap

내 보드 Relay 두 개의 위치를 교환한다.

- 비용: Swap Charge 1
- 보스 웨이브 중 쿨다운 2초
- 잘못된 배치를 복구하는 핵심 조작

### Link Pulse

파트너 보드에 지원 펄스를 보낸다.

- 비용: Link Energy 40
- 기본 효과: 파트너 보드에서 heat가 가장 높은 Relay 2개의 heat -35, 120 ticks 동안 `cycleMultiplier = 0.80`
- caster board에 active Twin Gate link가 있으면 heat reduction은 -53, duration은 180 ticks로 증가한다.
- Signal 회복은 `linkPulseSignalGain` formula 결과만큼 적용한다.
- 남발 방지를 위해 팀 쿨다운 12초
- 같은 Relay에 Link Pulse가 다시 적용되면 배율은 중첩되지 않고, 현재 caster의 effective duration으로 갱신된다. base 120 ticks, Twin Gate 180 ticks.
- Signal 회복은 아래 canonical formula로만 계산한다.

```text
partnerDanger =
  partnerHeatMax >= 90
  or partnerRelayShutdownSoon
  or SignalIntegrity <= 35

linkPulseSignalGain =
  (bossActive or partnerDanger) ? max(0, min(4, 8 - linkPulseSignalGainThisWave)) : 0
```

- `partnerRelayShutdownSoon`은 partner board에서 heat >= 92이고 cooldown <= 1.5s인 Relay가 1개 이상인 상태다.
- 보스 중 위험 구조 조건을 동시에 만족해도 Link Pulse 1회당 +4를 넘지 않는다.
- `linkPulseSignalGainThisWave`는 wave 시작 시 0으로 초기화한다.

### Overclock

내 보드 전체를 짧게 강화한다.

- 비용: Heat +20 전체
- 효과: 5초 동안 공격/수리량 +35%
- 위험: 종료 후 heat 70 이상 Relay가 있으면 3초 정지
- heat 비용은 발동 즉시 모든 Relay에 +20을 더하는 방식이다. 지속시간 동안 heat/cycle multiplier는 없다.
- 종료 시점에 heat >= 70인 Relay는 `overclock_stall` 이벤트를 기록하고 `shutdownUntilTick = currentTick + 60`이 된다.
- Overclock stall은 heat를 reset하지 않는다.
- Overclock stall은 Heat cascade의 shutdown event로 계산하지 않는다.
- 양쪽 보드의 Overclock이 동시에 active가 되는 첫 tick에 team `dualOverclockBossUntilTick = currentTick + 80`을 설정한다.

## 8. Combat Rules

Relay는 중앙 루프의 Noise를 자동으로 타겟팅한다.

타겟팅 우선순위:

1. Boss
2. Signal에 가장 가까운 Noise
3. hp가 낮은 Noise
4. 무작위

Damage formula:

```text
damage = voltage
       * tierMultiplier
       * gradeMultiplier
       * linkMultiplier
       * anchorBonus
       * heatOutputMultiplier
       * heatPenalty
       * overclockOutputMultiplier
       * dualOverclockBossMultiplier
```

| 값 | 수식 |
|---|---|
| tierMultiplier | 1 + (tier - 1) * 0.62 |
| gradeMultiplier | Basic 1.0, Tuned 1.35, Prime 1.85, Core 2.55, Origin 3.6 |
| linkMultiplier | 1 + activeLinks * 0.08, 최대 1.32 |
| anchorBonus | anchorBonus * boardAnchorBonus, 최대 1.21 |
| heatOutputMultiplier | heat 50-69면 1.05, 그 외 1.0 |
| heatPenalty | heat 70 이상 0.8, heat 90 이상 0.55 |
| overclockOutputMultiplier | own board Overclock active면 1.35, 아니면 1.0 |
| dualOverclockBossMultiplier | target Boss + `dualOverclockBossUntilTick > currentTick`이면 1.30, 아니면 1.0 |

Repair formula:

```text
signalRepairBeforeCap = baseSignalRepair * repairAmpMultiplier * overclockOutputMultiplier * heatOutputMultiplier
signalRepairApplied = min(signalRepairBeforeCap, remainingWaveRepairCap)
```

Repair formula applies only to Signal integrity repair from `rain_pump` and `root_clinic`.

- Heat cooling, Sink venting, Null cage, Saturation reduction, and Amp effects are not Signal repair and do not receive Overclock output multiplier.
- `remainingWaveRepairCap` is the per-wave +12 Signal repair cap after previous Repair effects.
- Overclock multiplier는 damage와 Signal repair 계산의 마지막 출력 계수로 곱한다. effectiveCycle에는 영향을 주지 않는다.

Attack tick:

- 서버 시뮬레이션 tick은 20Hz다.
- 각 Relay는 `cooldown`을 갖고, `cooldown <= 0`이면 공격/수리/증폭 효과를 실행한다.
- 실행 후 `cooldown = effectiveCycle`.
- 클라이언트 snapshot은 10Hz로 받지만 전투 판정은 서버 20Hz 기준이다.
- 공격 사거리는 중앙 루프 progress 기준 거리다. `loopDistance(relayLaneFocus, noise.progress) <= relay.range`.
- Relay의 기본 `laneFocus`는 보드 index에 따라 고정된다.
- 특수효과는 [Prototype Balance Sheet](./02_prototype_balance_sheet.md)의 Relay Effect Rules v0만 구현한다.

Effective cycle:

```text
effectiveCycle = cycle * linkPulseCycleMultiplier * anchorCycleMultiplier
linkPulseCycleMultiplier = relay.linkPulseUntilTick > currentTick ? 0.80 : 1.00
anchorCycleMultiplier =
  board.anchorRelayHeat >= 90 or board.anchorSlowedUntilTick > currentTick ? 1.15 : 1.00
```

빠른 효과는 cycle 값을 더하거나 늘리는 표현이 아니라, cycle을 줄이는 multiplier로만 표현한다.

Lane focus:

| row | indexes | laneFocus |
|---:|---|---:|
| 0 | 0-3 | 0.20 |
| 1 | 4-7 | 0.50 |
| 2 | 8-11 | 0.80 |

중앙 루프는 1.0 progress를 한 바퀴로 본다. 거리 계산은 원형 거리로 한다.

```text
loopDistance(a, b) = min(abs(a - b), 1 - abs(a - b))
wrap(x) = ((x % 1) + 1) % 1
```

Noise movement:

```text
loopLengthUnits = 1000
progress += (speed / loopLengthUnits) * deltaSeconds * speedMultiplier
```

- `speed`는 Balance Sheet의 Enemy Roster 값을 사용한다.
- `progress >= 1.0`이면 루프 완료 판정을 한 뒤 해당 Noise를 제거한다.
- 루프 완료 시 Saturation이 `saturationOnLoop`만큼 증가하고, `rewardCharge`는 지급하지 않는다.
- slow/cage effects apply through `speedMultiplier`.

Spawn schedule:

- v0는 단일 순차 spawn list를 사용하지 않는다.
- 각 wave의 enemy group은 type별 병렬 spawn lane으로 생성한다.
- 각 lane은 Balance Sheet의 `spawnEnd`까지 자기 count를 균등 분배한다.
- lane spawn time: `spawnAt(i) = laneStart + i * ((spawnEnd - laneStart) / max(1, count - 1))`
- `laneStart = 1.0s + laneOffset[type]`
- laneOffset: Flicker 0.0s, Crawler 0.2s, Bulwark 0.6s, Splitter 0.4s, Null 0.8s.
- count가 1이면 `spawnAt = laneStart`.
- 보스 웨이브는 wave elapsed 0초부터 8초 경고를 표시한다.
- 보스는 wave elapsed 8.0초에 1회 스폰한다.
- boss timer는 보스 스폰 tick부터 시작하며, duration은 Balance Sheet의 `boss timer after entry`를 사용한다.
- wave 3/6 boss timer가 0이 되면 `boss_surge`가 발생해 Signal integrity -15, 해당 보스 disruption 주기 -35%가 적용된다.
- wave 10 boss timer가 0이 되면 즉시 패배한다.
- wave spawn은 모든 type lane이 spawnEnd에 도달하면 종료된다.

Boss disruption:

| boss | disruption | timing | event |
|---|---|---|---|
| Boss Orchid | highest-link Relay 2개의 heat +12 | spawn 후 10초마다 | `boss_orchid_heatroot` |
| Boss Mirror | 양쪽 보드에서 active link 1개를 5초간 disable | spawn 후 12초마다 | `boss_mirror_linkbreak` |
| Origin Null | Null spore 2개 생성 | spawn 후 9초마다 | `boss_origin_spore` |

Null spore:

- Origin Null이 disruption을 실행할 때 2개를 생성한다.
- spawn progress는 `wrap(boss.progress - 0.06)`와 `wrap(boss.progress + 0.06)`이다.
- stats는 Balance Sheet의 `null_spore` row를 사용한다.
- `null_spore`는 Null로 취급되어 `null_cage`의 우선 타겟이 된다.
- `null_spore`가 루프를 완료하면 Signal integrity -4, `anchorSlowedUntilTick = currentTick + 120`을 적용하고 제거된다.
- `null_spore`는 일반 Null의 Signal -8 감염 규칙을 사용하지 않는다.

Reward Charge:

- 일반 Noise가 사망하면 server가 즉시 team Charge에 `rewardCharge`를 더한다.
- 루프 완료로 제거된 Noise는 rewardCharge를 지급하지 않는다.
- Splitter가 사망하면 Splitter의 rewardCharge는 지급한다.
- Splitter가 생성한 Flicker child는 `rewardCharge = 0`, `saturationOnLoop = 1`로 생성된다.
- Boss가 사망하면 Boss rewardCharge를 즉시 지급한다.
- Wave clear reward는 모든 spawn lane이 완료되고, 해당 wave의 살아있는 Noise가 모두 제거된 뒤 별도로 1회 지급한다.
- Boss rewardCharge와 wave clear reward는 중복 지급된다. 밸런스 표는 이 중복을 포함한 경제 목표다.

Heat gain:

```text
heat += cycleHeat - coolingFromTags
```

Overclock heat is not part of the per-cycle formula. It is applied once on activation as `heat += 20` to every Relay on that board.

Heat cascade:

- If 3 or more Relay shutdown events occur on the same board within 10 seconds, Signal integrity -8.
- The server records `heat_cascade` with `boardOwner`, `shutdownCount`, and `windowSeconds: 10`.
- A Relay prevented by `dusk_sink` does not count as a shutdown event.

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
- Saturation pressure tick: -10
- Null Noise가 Anchor를 감염: -8
- Heat cascade 발생: -8

Saturation pressure:

- `saturation >= 80`이 되는 tick에 `saturationPressureStartedTick = currentTick`로 설정한다.
- `saturation < 80`이 되면 `saturationPressureStartedTick`과 `lastSaturationPressureDamageTick`을 reset한다.
- `saturation >= 80`이 10초 유지되면 Signal integrity -10, event `saturation_pressure_damage`를 기록한다.
- 이후에도 `saturation >= 80`이면 마지막 damage tick부터 10초마다 반복 적용한다.
- event payload는 `saturation`, `windowSeconds: 10`, `damage: 10`을 포함한다.

Null Anchor infection:

- Null이 제거되지 않고 루프를 1바퀴 완료하면 감염 판정을 한다.
- `null_cage` 효과를 받고 있는 Null은 감염하지 못한다.
- 감염 대상은 `anchorHeat`가 더 높은 보드다. 동률이면 Saturation 기여가 높은 보드를 고른다.
- `anchorHeat`는 Anchor socket Relay의 heat이며, Anchor socket이 비어 있으면 0이다.
- 감염 시 Signal integrity -8, 대상 Anchor socket Relay heat +20, `anchorSlowedUntilTick = currentTick + 160`.
- 로그 이벤트는 `null_anchor_infected`를 기록한다.

Signal 회복 조건:

- 보스 처치: +8
- Repair tag Relay가 웨이브 중 누적 수리: 최대 +12
- Link Pulse 사용: `linkPulseSignalGain` formula 결과만큼 회복, wave당 최대 +8

## 10. Co-op Rules

협동은 자원 공유가 아니라 “서로의 위기를 읽고 개입하는 구조”다.

공유되는 것:

- 중앙 Signal
- Noise Saturation
- Charge
- 보스 타이머
- Link Energy
- Chance Level
- Pending Supply Discount

개별인 것:

- 보드
- Supply 횟수와 pity
- Swap Charge
- Heat 상태
- Merge 선택

v0 협동 보너스:

| 조건 | 효과 |
|---|---|
| `link_pulse_save` event 발생 | `pendingSupplyDiscountPct = 25`, 다음 성공한 Supply 1회 |
| 보스 웨이브 중 양쪽 모두 Overclock 사용 | 4초간 Boss 받는 피해 +30% |

`link_pulse_save` event:

- Link Pulse 직전 partner board에 `partnerRelayShutdownSoon = true`였고, Link Pulse 후 해당 Relay들의 heat가 모두 90 미만이 되면 발생한다.
- 또는 Link Pulse의 `linkPulseSignalGain > 0`이고 Link Pulse 직전 `preSignalIntegrity <= 35`였으면 발생한다.
- event payload는 `playerId`, `targetPlayerId`, `preSignalIntegrity`, `savedUnitIds`, `signalGain`, `pendingSupplyDiscountPct: 25`를 포함한다.

Deferred co-op bonuses:

These are not implemented in the 2-week prototype and should not appear in protocol state until M2.

| 조건 | 효과 |
|---|---|
| 양쪽 보드가 서로 다른 tag 3개 이상 활성화 | Signal stability +10% |
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

1. 첫 성공 Supply는 tutorial override로 `Needle Beam` 지급
2. 둘째 성공 Supply는 tutorial override로 `Coolant Moss` 지급
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
