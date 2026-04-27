# Prototype Balance Sheet

이 문서는 2주 프로토타입의 초기 숫자표다. 목표는 완벽한 밸런스가 아니라 “재미를 검증할 수 있는 첫 기준점”이다.

## 1. Starting Values

| 항목 | 값 |
|---|---:|
| Signal Integrity | 100 |
| Noise Saturation | 0 |
| 시작 Charge | 90 |
| 시작 Link Energy | 40 |
| 시작 Swap Charge | 2 |
| Supply 기본 비용 | 20 |
| Supply 비용 증가 | 팀 Supply 5회마다 +3 |
| Link Pulse 비용 | 40 |
| Link Pulse 팀 쿨다운 | 12초 |
| Overclock 쿨다운 | 18초 |
| 보드 슬롯 | 플레이어당 12 |

## 2. Grade Odds

Supply 결과는 Relay `grade`를 먼저 뽑고, 해당 grade 안에서 type을 뽑는다.

| grade | 기본 확률 | Chance Level 1 | Chance Level 2 | Chance Level 3 |
|---|---:|---:|---:|---:|
| Basic | 68% | 60% | 53% | 47% |
| Tuned | 24% | 29% | 32% | 34% |
| Prime | 7% | 9% | 12% | 15% |
| Core | 1% | 2% | 3% | 4% |
| Origin | 0% | 0% | 0% | 0.4% |

Pity:

- 7회 연속 Basic이면 다음 Supply는 Tuned 이상
- 18회 동안 Prime 이상이 없으면 다음 Supply는 Prime 이상
- Pity는 플레이어별로 관리한다

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
| aurora_amp | Aurora Amp | Amp | Origin | 0 | 2.8 | 30 | All | 보드 전체 linkMultiplier +0.25 |
| sink_stone | Sink Stone | Sink | Basic+ | 4 | 1.6 | -16 | S | heat 흡수 |
| dusk_sink | Dusk Sink | Sink | Prime+ | 8 | 2.0 | -28 | N-S | 과열 Relay 정지 방지 1회 |
| mirror_port | Mirror Port | Support | Tuned+ | 0 | 2.0 | 10 | E-W | 파트너 같은 tag 출력 +8% |
| twin_gate | Twin Gate | Support | Core+ | 18 | 1.8 | 20 | All | 파트너 Link Pulse 효과 +50% |
| origin_seed | Origin Seed | Origin | Origin | 64 | 1.0 | 30 | All | 보스 hp 15% 이하 execute |

## 4. Tier Multipliers

| tier | multiplier | merge requirement |
|---:|---:|---|
| 1 | 1.00 | Supply |
| 2 | 1.62 | 3x same type/tier |
| 3 | 2.24 | 3x same type/tier |
| 4 | 2.86 | 3x same type/tier |
| 5 | 3.48 | 3x same type/tier |

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
| boss_orchid | Boss Orchid | 900 | 18 | 15 | 60 | 3웨이브 |
| boss_mirror | Boss Mirror | 1550 | 20 | 18 | 85 | 6웨이브 |
| boss_origin | Origin Null | 2800 | 22 | 25 | 140 | 10웨이브 |

## 7. Wave Table v0

| wave | duration target | enemies | boss timer | clear reward |
|---:|---:|---|---:|---|
| 1 | 35s | 16 Flicker, 8 Crawler | - | Charge 35, Link 10, Swap 1 |
| 2 | 40s | 18 Crawler, 4 Bulwark | - | Charge 45, Link 12 |
| 3 | 55s | 20 Crawler, 8 Splitter, Boss Orchid | 36s | Charge 65, Link 22, Swap 2 |
| 4 | 45s | 24 Flicker, 16 Crawler, 5 Bulwark | - | Charge 55, Link 14 |
| 5 | 50s | 12 Splitter, 8 Bulwark, 6 Null | - | Charge 65, Link 16 |
| 6 | 65s | 22 Crawler, 12 Null, Boss Mirror | 42s | Charge 85, Link 28, Swap 2 |
| 7 | 52s | 48 Flicker, 10 Bulwark | - | Charge 75, Link 16 |
| 8 | 58s | 24 Splitter, 16 Null, 10 Bulwark | - | Charge 85, Link 18 |
| 9 | 62s | 40 Crawler, 20 Splitter, 16 Bulwark | - | Charge 95, Link 22 |
| 10 | 85s | 20 Null, 24 Bulwark, Origin Null | 55s | Win |

## 8. Heat Model

Heat is the main originality axis. It makes “strong board” and “safe board” different decisions.

```text
heatAfterCycle = currentHeat + relayHeatPerCycle + overclockHeat - cooling
```

Cooling sources:

- Sink tag: listed negative heat
- Repair tag: adjacent Relay heat -6 to -18
- Link Pulse: highest heat Relay x2 heat -35
- Wave clear: all Relay heat -20

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
