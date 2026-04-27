# Bot Policy Spec

봇은 플레이어를 대신 이기는 자동화가 아니다. 혼자 테스트할 때 협동의 리듬을 보여주는 파트너다.

## 1. Goals

봇은 다음을 해야 한다.

- 초반 플레이어 주도권을 빼앗지 않는다.
- 플레이어가 위험할 때 Link Pulse로 구조한다.
- 보드가 꽉 차면 합성을 시도한다.
- 보스 웨이브에서 과열 관리와 오버클럭을 사용한다.
- 플레이어가 배울 수 있도록 의도를 짧게 보여준다.

봇은 다음을 하면 안 된다.

- 시작하자마자 공유 자원을 다 쓴다.
- 플레이어보다 먼저 핵심 튜토리얼 순간을 가져간다.
- 완벽한 판단으로 인간 플레이어를 무의미하게 만든다.
- BM이나 상점 구매를 자동으로 실행한다.

## 2. Bot Modes

| mode | target user | behavior |
|---|---|---|
| Tutorial | 첫 3판 | 천천히, 설명 중심 |
| Casual | 기본 | 실수도 하지만 구조함 |
| Tester | 개발/QA | 로그가 많고 특정 상황 재현 |
| Hard Carry | 접근성 옵션 | 플레이어가 전투를 구경해도 클리어 가능 |

프로토타입 기본은 `Casual`.

## 3. Decision Loop

봇은 0.5초마다 상황을 평가하지만 행동은 쿨다운을 가진다.

Priority:

1. If partner danger critical, cast Link Pulse.
2. If own heat cascade imminent, Swap or wait for cooling.
3. If boss active and own board stable, Overclock.
4. If exact merge exists, Merge.
5. If board has empty slot and Charge reserve safe, Supply.
6. If board full and no merge, Swap to improve links.
7. Otherwise wait.

## 4. Resource Rules

봇은 자원 예절을 지킨다.

| condition | bot rule |
|---|---|
| first 20s | Supply 금지 |
| player has 0 Relay | Supply 금지 |
| team Charge < nextSupplyCost + 25 | Supply 금지 |
| boss active and Link Energy >= 40 | Link Pulse 우선 |
| player just failed Merge | 3초 대기 |

## 5. Link Pulse Logic

파트너 구조 조건:

```text
if playerHeatMax >= 90
or playerRelayShutdownSoon == true
or bossActive and playerBoardDpsShare < 35%
or SignalIntegrity <= 35 and playerHasRepairTag
then Link Pulse
```

Variable definitions:

```text
playerHeatMax = boardHeatMax(partnerBoard), where empty board returns 0
playerRelayShutdownSoon = count(relay.heat >= 92 and relay.cooldown <= 1.5s) >= 1
playerBoardDpsShare = partnerBoard.estimatedDps / max(1, teamEstimatedDps)
playerHasRepairTag = count(partnerBoard.relays where tag includes Repair) >= 1
teamEstimatedDps = sum(estimatedDps for both boards)
estimatedDps(relay) = Core Game Spec damage formula for that Relay / effectiveCycle
boardHeatAverage(board) and boardHeatMax(board) use Core Game Spec empty-board helpers
nextSupplyCost = canonicalSupplyCost(botPersonalSupplyCount, bossActive, pendingSupplyDiscountPct)
canonicalSupplyCost(count, bossActive, discountPct) =
  ceil(min(47, 20 + floor(count / 5) * 3) * (bossActive ? 1.20 : 1.00) * (discountPct > 0 ? 0.75 : 1.00))
```

`player` in these names means the human partner when the bot evaluates rescue actions.

봇이 Link Pulse를 쓰면 짧은 말풍선:

- “Cooling your hot Relay.”
- “Linking during boss.”
- “Saving Signal.”

한국어 UI에서는:

- “과열 식혀줄게요.”
- “보스 중 링크 지원.”
- “신호 복구합니다.”

## 6. Merge Logic

Merge score:

```text
score = tierGain * 40
      + gradeProtection * 25
      + boardSpacePressure * 20
      + tagNeedBonus * 15
      - heatRisk * 15
```

봇은 score >= 55일 때 합성한다.

Merge score variable definitions:

```text
tierGain = 1 for every legal Merge

gradeProtection =
  1 if at least one ingredient is Prime+ or the Merge preview grade floor is Prime+
  else 0

boardSpacePressure =
  clamp((occupiedSockets - 8) / 4, 0, 1)

tagNeedBonus =
  1 if any utility group in {Repair, Amp, Sink, Field} would be missing after removing the ingredients
    and Merge preview possibleUtilityGroups includes at least one of those missing utility groups
  0.5 if the board keeps all four utility tag groups but the preview max link count is greater than current effective links
  else 0

heatRisk =
  clamp(averageIngredientHeat / 100, 0, 1)
  + 0.5 if any ingredient is currently the only Relay cooling or linking a heat >= 80 Relay
```

`tagNeedBonus` and link comparisons use the canonical `computeMergePreview` range from the Core Game Spec. CasualBot cannot inspect final type or linkShape before server confirm.

Merge를 보류하는 경우:

- 합성하면 Repair tag가 0개가 됨
- 보스 5초 전이고 현재 DPS가 충분함
- 합성 재료 중 하나가 heat를 안정화 중

## 7. Swap Logic

봇은 매번 최적화하지 않는다. 6초마다 한 번만 Swap을 고려한다.

Swap score:

- active link +1개: +25
- Anchor 인접 Repair 배치: +20
- heat 80 이상 Relay를 Sink 옆으로 이동: +30
- 파트너와 tag 보너스 활성화: +15

score >= 40이면 Swap.

## 8. Difficulty Tuning

| mode | reaction delay | resource reserve | merge threshold | link generosity |
|---|---:|---:|---:|---:|
| Tutorial | 2.5s | 45 | 70 | high |
| Casual | 1.2s | 25 | 55 | medium |
| Tester | 0.4s | 10 | configurable | configurable |
| Hard Carry | post-prototype | post-prototype | post-prototype | post-prototype |

## 9. Bot Logs

QA 로그:

```json
{
  "time": 142.3,
  "botAction": "link_pulse",
  "reason": "partner_heat_critical",
  "playerHeatMax": 94,
  "bossActive": true,
  "linkEnergyBefore": 58
}
```

로그는 플레이테스트에서 “봇이 왜 그랬는지”를 설명하는 데 사용한다.

## 10. Acceptance Criteria

- 첫 20초 동안 봇이 Supply를 누르지 않는다.
- 5판 중 4판에서 플레이어가 첫 Merge를 직접 한다.
- 플레이어 heat 90 이상 상황에서 봇 Link Pulse 반응률 70% 이상.
- Casual 봇과 초보 플레이어의 3웨이브 도달률 75% 이상.
- Hard Carry 10-wave clear tuning is post-prototype and must not block the 2-week show build.
