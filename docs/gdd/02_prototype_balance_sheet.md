# Prototype Balance Sheet

이 문서는 2주 프로토타입의 초기 숫자표다. 목표는 완벽한 밸런스가 아니라 “재미를 검증할 수 있는 첫 기준점”이다.

## 1. Starting Values

| 항목 | 값 |
|---|---:|
| Signal Integrity | 100 |
| Noise Saturation | 0 |
| 시작 team Charge | 90 |
| 시작 team Link Energy | 40 |
| 시작 team Chance Level | 0 |
| 시작 pending Supply discount | 0% |
| 시작 개인 Swap Charge | 2 |
| Supply 기본 비용 | 20 |
| Supply 비용 증가 | 개인 Supply 5회마다 +3 |
| Link Pulse 비용 | 40 |
| Link Pulse 팀 쿨다운 | 12초 |
| Overclock 쿨다운 | 18초 |
| 보드 슬롯 | 플레이어당 12 |

## 2. Grade Odds

Supply 결과는 Relay `grade`를 먼저 뽑고, 해당 grade 안에서 type을 뽑는다.

| grade | 기본 확률 | Chance Level 1 | Chance Level 2 | Chance Level 3 |
|---|---:|---:|---:|---:|
| Basic | 68% | 60% | 53% | 46.6% |
| Tuned | 24% | 29% | 32% | 34% |
| Prime | 7% | 9% | 12% | 15% |
| Core | 1% | 2% | 3% | 4% |
| Origin | 0% | 0% | 0% | 0.4% |

Pity:

- 7회 연속 Basic이면 다음 Supply는 Tuned 이상
- 18회 동안 Prime 이상이 없으면 다음 Supply는 Prime 이상
- Pity는 플레이어별로 관리한다

## 2.1 Chance Level Rules

Chance Level은 run 안에서만 유지되는 team shared 값이다. BM, 계정 성장, 결제와 연결하지 않는다.

| event | change | max |
|---|---:|---:|
| Wave 3 boss defeated | +1 | 3 |
| Wave 6 boss defeated | +1 | 3 |
| Wave 8 cleared with Saturation < 70 | +1 | 3 |
| Wave 9 cleared and Chance Level < 3 | +1 catch-up | 3 |

Supply roll order:

1. 현재 team Chance Level의 grade odds를 선택한다.
2. 개인 pity가 grade floor를 올릴 수 있다.
3. grade가 확정되면 해당 grade pool 안에서 type을 뽑는다.
4. roll 결과는 서버 로그에 `chanceLevel`, `pityApplied`, `grade`, `type`을 기록한다.

## 2.2 Supply Cost Curve

| personalSupplyCount | cost |
|---:|---:|
| 0-4 | 20 |
| 5-9 | 23 |
| 10-14 | 26 |
| 15-19 | 29 |
| 20-24 | 32 |
| 25-29 | 35 |
| 30-34 | 38 |
| 35-39 | 41 |
| 40-44 | 44 |
| 45+ | 47 |

This table is the capped `baseSupplyCost` before boss and discount multipliers. Core Game Spec and Bot Policy use the same `min(47, 20 + floor(personalSupplyCount / 5) * 3)` base.

Canonical examples:

| state | formula | cost |
|---|---|---:|
| count 8, normal | ceil(23 * 1.00 * 1.00) | 23 |
| count 8, boss active | ceil(23 * 1.20 * 1.00) | 28 |
| count 8, discount active | ceil(23 * 1.00 * 0.75) | 18 |
| count 8, boss + discount | ceil(23 * 1.20 * 0.75) | 21 |

## 3. Relay Roster v0

| id | name | tag | grade pool | voltage | cycle | heat/cycle | linkShape | special |
|---|---|---|---|---:|---:|---:|---|---|
| needle_beam | Needle Beam | Beam | Basic+ | 12 | 0.9 | 7 | E-W | 가장 앞 Noise 우선 |
| prism_lance | Prism Lance | Beam | Tuned+ | 22 | 1.15 | 10 | N-S | Boss 피해 +35% |
| split_ray | Split Ray | Beam | Prime+ | 18 | 1.0 | 12 | E-W-S | 2타겟 분산 |
| coolant_moss | Coolant Moss | Repair | Basic+ | 0 | 1.2 | -9 | N-E | 주변 heat -6 |
| rain_pump | Rain Pump | Repair | Tuned+ | 0 | 1.8 | -14 | N-S | Signal 수리 |
| root_clinic | Root Clinic | Repair | Prime+ | 0 | 2.2 | -18 | All | 보스 중 수리 2배 |
| pulse_drum | Pulse Drum | Pulse | Basic+ | 8 | 0.55 | 6 | E-S | 빠른 공격 |
| thunder_bowl | Thunder Bowl | Pulse | Tuned+ | 16 | 0.7 | 12 | N-E-W | chain 2 |
| storm_heart | Storm Heart | Pulse | Core+ | 42 | 0.8 | 22 | All | Link 수마다 chain +1 |
| amber_field | Amber Field | Field | Basic+ | 6 | 1.5 | 5 | N-W | 범위 둔화 |
| gravity_loom | Gravity Loom | Field | Prime+ | 10 | 2.1 | 18 | E-S-W | Saturation 증가 20% 감소 |
| null_cage | Null Cage | Field | Core+ | 28 | 2.4 | 24 | All | Null Noise 봉쇄 |
| signal_amp | Signal Amp | Amp | Basic+ | 0 | 1.0 | 9 | E-W | 연결 Relay voltage +12% |
| bloom_amp | Bloom Amp | Amp | Tuned+ | 0 | 1.4 | 14 | N-E-S | Repair tag 효과 +18% |
| aurora_amp | Aurora Amp | Amp | Origin | 0 | 2.8 | 30 | All | 보드 전체 linkMultiplier +0.25 after normal cap, final cap 1.57 |
| sink_stone | Sink Stone | Sink | Basic+ | 4 | 1.6 | -16 | S | heat 흡수 |
| dusk_sink | Dusk Sink | Sink | Prime+ | 8 | 2.0 | -28 | N-S | 과열 Relay 정지 방지 1회 |
| mirror_port | Mirror Port | Support | Tuned+ | 0 | 2.0 | 10 | E-W | 파트너 같은 tag 피해/Signal repair +8% |
| twin_gate | Twin Gate | Support | Core+ | 18 | 1.8 | 20 | All | 파트너 Link Pulse 효과 +50% |
| origin_seed | Origin Seed | Origin | Origin | 64 | 1.0 | 30 | All | 보스 hp 15% 이하 execute |

## 3.1 Relay Effect Rules v0

All effects trigger on the Relay's `effectiveCycle` unless the row says passive. Only the highest applicable Amp modifier applies to the same target; slow and cage durations refresh instead of stacking.

| id | executable effect | target rule | stacking/log |
|---|---|---|---|
| needle_beam | deals 100% finalDamage | highest priority Noise in range | `damage` |
| prism_lance | deals 100% finalDamage, or 135% to Boss | Boss first, then normal priority | `damage`, `boss_bonus_damage` |
| split_ray | hits up to 2 Noise for 70% finalDamage each | two highest priority Noise in range | `multi_damage` |
| coolant_moss | adjacent Relay heat -6; self applies listed heat/cycle | N/E/S/W adjacent occupied sockets | `cooling` |
| rain_pump | Signal integrity +0.35, capped by Repair max per wave | team Signal | `signal_repair` |
| root_clinic | Signal integrity +0.45, doubled while bossActive | team Signal | `signal_repair` |
| pulse_drum | deals 100% finalDamage | normal priority | `damage` |
| thunder_bowl | primary target 100%, up to 2 chain targets 45% | nearest Noise within 0.12 progress of primary | `chain_damage` |
| storm_heart | primary target 100%, chain targets 45%; chain count = min(5, 1 + activeLinks) | nearest Noise within 0.14 progress | `chain_damage` |
| amber_field | deals 70% finalDamage and applies speedMultiplier 0.82 for 1.5s | all Noise within range, max 5 | `slow_field` |
| gravity_loom | deals 80% finalDamage and applies saturationMultiplier 0.80 for 2s; saturation formula in Core Game Spec | highest saturation Noise in range | `saturation_mark` |
| null_cage | deals 100% finalDamage; if target is Null, speedMultiplier 0 for 1.2s and blocks Anchor infection | Null first, then normal priority | `null_caged` |
| signal_amp | passive: linked adjacent Relays voltage *1.12 | active-linked neighbor Relays | `amp_applied`, non-stacking |
| bloom_amp | passive: linked adjacent Repair effects *1.18 | active-linked Repair Relays | `repair_amp`, non-stacking |
| aurora_amp | passive: board linkMultiplier bonus +0.25 after normal cap, final cap 1.57 | all own-board Relays | `aurora_amp`, one per board |
| sink_stone | vents 16 heat from hottest adjacent Relay; self applies listed heat/cycle | adjacent Relay with highest heat | `heat_sink` |
| dusk_sink | vents 28 heat from hottest adjacent Relay; once per wave prevents adjacent shutdown, sets target heat to 78 | adjacent Relay with highest heat | `shutdown_prevented` |
| mirror_port | passive: partner Relay damage/Signal repair output *1.08 through Mirror Support | partner board, same tag as any active-linked neighbor | `mirror_support`, one per partner Relay |
| twin_gate | passive: Link Pulse sent by this board has heat reduction and duration *1.50 | caster board must have active Twin Gate link | `twin_link_pulse` |
| origin_seed | if Boss hp <= 15%, executes once per boss; otherwise deals 100% finalDamage | Boss first | `boss_execute` |

Final damage and cycle math come from Core Game Spec. Repair effects cannot raise Signal integrity above 100.

## 4. Tier Multipliers

| tier | multiplier | merge requirement |
|---:|---:|---|
| 1 | 1.00 | Supply |
| 2 | 1.62 | created by merging tier 1 |
| 3 | 2.24 | created by merging tier 2 |
| 4 | 2.86 | created by merging tier 3 |
| 5 | 3.48 | max tier, cannot merge |

## 5. Grade Multipliers

| grade | multiplier | role |
|---|---:|---|
| Basic | 1.00 | early filler |
| Tuned | 1.35 | stable mid-game |
| Prime | 1.85 | build-around |
| Core | 2.55 | late-game carry |
| Origin | 3.60 | rare climax |

## 6. Enemy Roster v0

| id | name | hp | speed | saturation | rewardCharge | pattern |
|---|---|---:|---:|---:|---:|---|
| flicker | Flicker | 28 | 58 | 1 | 2 | 빠르게 루프 |
| crawler | Crawler | 55 | 38 | 2 | 3 | 기본 적 |
| bulwark | Bulwark | 170 | 24 | 5 | 8 | 느리고 단단함 |
| splitter | Splitter | 80 | 34 | 2 | 5 | 사망 시 Flicker 2 생성 |
| null | Null | 120 | 30 | 4 | 7 | Anchor 감염 시 Signal -8 |
| null_spore | Null Spore | 70 | 44 | 2 | 0 | Origin Null disruption child |
| boss_orchid | Boss Orchid | 900 | 18 | 15 | 60 | 3웨이브 |
| boss_mirror | Boss Mirror | 1550 | 20 | 18 | 85 | 6웨이브 |
| boss_origin | Origin Null | 2800 | 22 | 25 | 140 | 10웨이브 |

Speed values are loop units per second. Core Game Spec fixes loop length at 1000 units.

Reward contract:

- `rewardCharge` is paid only when that Noise dies.
- Loop completion pays no Charge.
- Splitter children use the Flicker stat line but `rewardCharge = 0`; child progress, lane, and `spawnSequenceId` are defined in Core Game Spec.
- Boss rewardCharge is paid on boss death and is separate from wave clear reward.

## 7. Wave Table v0

| wave | duration target | spawnEnd | enemies | boss timer after entry | clear reward |
|---:|---:|---:|---|---:|---|
| 1 | 26-32s | 20s | 16 Flicker, 8 Crawler | - | Charge 35, Link 10 |
| 2 | 29-35s | 23s | 18 Crawler, 4 Bulwark | - | Charge 45, Link 12 |
| 3 | 39-47s | 33s | 20 Crawler, 8 Splitter, Boss Orchid | 36s | Charge 65, Link 22, Chance +1 |
| 4 | 32-39s | 26s | 24 Flicker, 16 Crawler, 5 Bulwark | - | Charge 55, Link 14 |
| 5 | 36-44s | 30s | 12 Splitter, 8 Bulwark, 6 Null | - | Charge 65, Link 16 |
| 6 | 45-53s | 38s | 22 Crawler, 12 Null, Boss Mirror | 42s | Charge 85, Link 28, Chance +1 |
| 7 | 38-44s | 31s | 48 Flicker, 10 Bulwark | - | Charge 75, Link 16 |
| 8 | 40-48s | 34s | 24 Splitter, 16 Null, 10 Bulwark | - | Charge 85, Link 18, Chance +1 if Saturation < 70 |
| 9 | 44-52s | 38s | 40 Crawler, 20 Splitter, 16 Bulwark | - | Charge 95, Link 22, Chance catch-up if < 3 |
| 10 | 71-78s incl. 20s hold | 43s | 20 Null, 24 Bulwark, Origin Null | 55s | Win |

Swap Charge contract:

- Swap Charge is not part of wave clear rewards.
- Each player gains +1 Swap Charge at every wave start.
- Each player gains +2 Swap Charge immediately when a boss dies.
- The reward table omits Swap to avoid double counting.

Spawn lane offsets:

| enemy | laneOffset |
|---|---:|
| Flicker | 0.0s |
| Crawler | 0.2s |
| Splitter | 0.4s |
| Bulwark | 0.6s |
| Null | 0.8s |
| Boss warning | wave elapsed 0.0s on boss waves |
| Boss entry | wave elapsed +8.0s |

Each enemy type in a wave spawns on its own lane from `1.0s + laneOffset` through `spawnEnd`. This table is the canonical schedule for v0; do not serialize each wave as a single sequential list.

## 8. Heat Model

Heat is the main originality axis. It makes “strong board” and “safe board” different decisions.

```text
heatAfterCycle = currentHeat + relayHeatPerCycle - cooling
canonicalHeat = clamp(heatAfterCycle, 0, 100)
```

If the Relay is on overload-risk socket index 3 or 8, add +2 to `relayHeatPerCycle` before applying cooling. All heat changes use the Core Game Spec canonical heat mutation order and `0..100` clamp.

Overclock adds +20 heat to every Relay once on activation. It does not add per-cycle heat.

Heat and repair sources:

- `relayHeatPerCycle` is the Relay's self heat delta from the roster. Negative values cool self.
- `coolant_moss` is the only Repair tag Relay that cools adjacent Relays in v0.
- `rain_pump` and `root_clinic` repair Signal integrity only; they do not cool adjacent Relays.
- Sink tag effects vent heat exactly as listed in Relay Effect Rules v0.
- Link Pulse: highest heat Relay x2 heat -35.
- Wave clear: all Relay heat -20.

Overheat:

- heat >= 100: Relay shuts down for 4 seconds, heat resets to 60
- if 3 Relay shut down within 10 seconds: Signal integrity -8

## 9. Economy Targets

By minute:

| minute | expected team supply | expected merge | expected chance level | expected tension |
|---:|---:|---:|---:|---|
| 1 | 5-7 | 0-1 | 0 | learn board |
| 2 | 9-12 | 1-2 | 0-1 | first boss |
| 3 | 14-17 | 2-4 | 1 | heat pressure |
| 4 | 19-23 | 4-6 | 1-2 | second boss |
| 5 | 25-30 | 6-8 | 2 | board full |
| 6 | 32-38 | 8-11 | 2-3 | final prep |
| 7 | 40+ | 10+ | 3 | final boss |

## 9.1 Closed-model Simulation Targets

These targets are the first acceptance band for a 50-seed automated sim.

| wave | expected team DPS at start | expected active links/team | expected avg heat | expected team Charge spent | target clear time |
|---:|---:|---:|---:|---:|---:|
| 1 | 35-55 | 1-3 | 20-35 | 80-120 | 26-32s |
| 2 | 65-95 | 3-5 | 28-45 | 130-180 | 29-35s |
| 3 | 120-170 | 5-8 | 40-62 | 190-260 | 39-47s |
| 4 | 160-220 | 7-10 | 42-66 | 250-330 | 32-39s |
| 5 | 210-290 | 8-12 | 48-72 | 320-420 | 36-44s |
| 6 | 300-420 | 10-15 | 55-78 | 410-540 | 45-53s |
| 7 | 360-500 | 12-17 | 55-82 | 500-640 | 38-44s |
| 8 | 430-590 | 14-19 | 58-84 | 600-760 | 40-48s |
| 9 | 520-720 | 16-22 | 60-86 | 720-900 | 44-52s |
| 10 | 700-980 | 18-26 | 65-90 | 880-1100 | 51-58s |

Wave 10 timing:

- target clear time measures wave start to Origin Null death.
- boss enters at wave +8s and must die before the 55s boss timer expires.
- after Origin Null death, victory requires the separate 20s Signal hold from Core Game Spec.
- expected total final-wave time including hold is 71-78s.
- total expected session time from wave 1 start to victory is 6m40s-7m52s.

50-seed pass band:

- win rate with ScriptedHuman + CasualBot: 35-65%
- loss before wave 3: <= 8%
- final boss reached: >= 45%
- Link Pulse used at least once: >= 70%
- average Relay shutdowns per run: 2-7
- average ScriptedHuman Merge count: 4-8

Merge expectation:

| combined successful Supplies | expected merge opportunities | expected completed merges |
|---:|---:|---:|
| 10 | 0-1 | 0-1 |
| 20 | 2-4 | 1-3 |
| 30 | 5-8 | 3-6 |
| 40 | 9-13 | 6-10 |

## 9.2 Sim Harness Player Model

The 50-seed automated sim uses one `ScriptedHuman` and one `CasualBot`. It is not bot+bot and not a perfect solver.

Seed contract:

- seeds: `1000..1049`
- simulation tick: 20Hz
- snapshot/export tick: 10Hz
- scripted human reaction interval: 0.8s
- Casual bot reaction interval: values from Bot Policy Spec

ScriptedHuman policy:

1. If partner heat max >= 92 and Link Pulse ready, cast Link Pulse.
2. If own board has exact merge with score >= 45, Merge.
3. If board has <= 2 empty slots and Swap score >= 35, Swap.
4. If team Charge >= canonical Supply cost + 15 and board has an empty slot, Supply.
5. If boss active, own avg heat < 62, and Overclock ready, Overclock.
6. Otherwise wait.

ScriptedHuman scoring:

```text
scriptedMergeScore =
  tierGain * 35
  + freesSlots * 10
  + preservesUtilityTags * 15
  + predictedEffectiveLinksDelta * 12
  - averageIngredientHeat / 5

scriptedSwapScore =
  predictedEffectiveLinksDelta * 22
  + movesHotRelayOffRiskSocket * 18
  + movesSinkNextToHotRelay * 24
  + restoresAnchorLink * 18
```

- `tierGain` is always 1 for legal Merge.
- `freesSlots` is 2 for a normal 3-to-1 Merge.
- `preservesUtilityTags` is 1 if the board keeps at least one Repair, Amp, Sink, or Field after Merge; otherwise 0.
- `predictedEffectiveLinksDelta` uses the expected value of the public Merge preview link-count range from Core Game Spec `computeMergePreview`: `(minPreviewLinks + maxPreviewLinks) / 2 - currentEffectiveLinks`.
- ScriptedHuman uses only public preview fields and cannot peek final type or linkShape before server confirm.
- ScriptedHuman thresholds intentionally differ from CasualBot thresholds because the sim is a human-like baseline, not the partner AI.

Sim metrics:

- team DPS uses `sum(finalDamage / effectiveCycle)` for damage Relays, where finalDamage is the Core Game Spec damage formula after link, Aurora, Overclock, dual-overclock, and Mirror Support multipliers.
- Repair, Amp, Sink, and Support value are reported separately as `supportPower`; Mirror Support is reported as supportPower and as its own `mirror_support` event, but its 1.08 multiplier affects only damage and Signal repair.
- heat average excludes empty sockets.
- clear time is measured from wave start to last wave enemy removed.
- boss timer is measured from boss entry, not wave start.

## 10. Tuning Rules

If players lose before wave 3:

- lower Supply cost scaling
- lower Flicker speed by 8%
- increase first Link Energy reward

If players never use Link Pulse:

- make partner heat warning louder
- lower Link Pulse cost to 30
- add boss bonus for Link Pulse

If players win without Merge:

- raise late-wave hp by 15%
- add board-full pressure earlier
- increase Supply scaling after 20 Supply

If players feel unlucky:

- lower pity threshold from 7 to 6
- show pity meter
- ensure merge result never downgrades grade
