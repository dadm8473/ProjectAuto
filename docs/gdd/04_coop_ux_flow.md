# Co-op UX Flow

## 1. Portrait Layout

세로 화면 기준 390x844 안전 영역을 기본 목표로 하고, 360x800을 최소 대응 목표로 한다.

```text
┌──────────────────────────────┐
│ Top HUD: Signal / Wave / Link│ 52
├──────────────────────────────┤
│ Partner Board 3x4            │ 176
│ heat beacons + request edge  │
├──────────────────────────────┤
│ Central Signal Loop          │ 196
│ Noise, Boss, Saturation      │
├──────────────────────────────┤
│ My Board 3x4                 │ 176
│ selected sockets + heat      │
├──────────────────────────────┤
│ Action Bar                   │ 144
│ Supply Swap Merge Link       │
└──────────────────────────────┘
```

## 2. Always Visible Information

항상 보여야 하는 것:

- Signal Integrity
- Noise Saturation
- Current Wave
- Boss timer when active
- 팀 Charge
- 팀 Link Energy
- 내 Swap Charge
- 파트너 위험 상태

숨겨도 되는 것:

- 전체 확률표
- BM 상품
- 상세 스탯
- 미션 목록
- 패스 진행도

## 3. Main Actions

| button | primary state | disabled reason |
|---|---|---|
| Supply | Charge 충분 + 빈 슬롯 있음 | Charge 부족, 보드 꽉 참 |
| Swap | Relay 선택 2개 + Swap Charge 있음 | 선택 부족, Swap Charge 없음 |
| Merge | 같은 type/tier 3개 선택 | 조건 불일치 |
| Link Pulse | Link Energy 충분 + 쿨다운 없음 | 에너지 부족, 쿨다운 |
| Overclock | 보조 액션, 길게 누르기 또는 확장 버튼 | heat 평균 80 이상이면 경고 후 실행 |

버튼은 텍스트만 쓰지 않고 아이콘 형태를 병행한다.

- Supply: 작은 부품 상자
- Swap: 교차 화살표
- Merge: 세 점이 하나로 모이는 아이콘
- Link: 파트너 보드로 향하는 전파
- Overclock: 경고 삼각형 + 번개

Action Bar layout:

```text
390x844: [Supply] [Swap] [Merge] [Link Pulse] + Overclock as hold on Signal Loop
360x800: [Supply] [Merge] [Link] on first row, [Swap] [Overclock] as compact second row
```

Overclock은 항상 노출 버튼이 아니라 중앙 Signal Loop를 0.45초 길게 눌러도 발동된다. 따라서 4버튼 레이아웃과 5액션 규칙이 충돌하지 않는다.

## 4. First 30 Seconds

### 0-5s

- 보드와 중앙 Signal loop가 보인다.
- Supply 버튼만 밝다.
- 토스트: “Relay를 공급해 회로를 깨우세요.”

### 5-12s

- 첫 Relay는 고정 지급.
- Relay가 Noise를 자동으로 공격한다.
- 데미지 숫자와 Signal pulse가 보인다.

### 12-20s

- 두 번째 Relay는 Repair 계열 고정 지급.
- heat가 낮아지는 작은 애니메이션을 보여준다.

### 20-30s

- 세 번째부터 랜덤.
- 같은 유닛 3개가 아직 없어도 Merge 버튼은 잠겨 있고 이유를 짧게 표시한다.

## 5. Merge Flow

1. 플레이어가 Relay 슬롯을 누른다.
2. 같은 type/tier 후보가 노란 테두리로 표시된다.
3. 3개 선택 시 Merge 버튼이 밝아진다.
4. Merge preview가 destination socket, tier/grade floor, possible link count range, heat compression을 보여준다.
5. Merge를 누르면 선택된 3칸에서 선이 중앙으로 모인다.
6. 결과 Relay가 첫 선택 칸에 생성된다.
7. 결과가 Prime 이상이면 파트너 화면에도 작은 알림이 뜬다.

잘못 선택했을 때:

- 다른 type을 누르면 기존 선택 유지, 해당 슬롯은 빨간 흔들림
- 선택 해제는 같은 슬롯 재탭
- 3개를 초과하면 가장 오래된 선택 자동 해제

## 6. Partner Rescue Flow

파트너 보드에서 위험을 읽게 해야 한다.

위험 표시:

- heat 70 이상 Relay: 주황 호흡 효과
- heat 90 이상 Relay: 빨간 Pulse beacon
- 파트너 Signal 기여 하락: 보드 가장자리 노이즈

Link Pulse 사용:

1. 파트너 보드 가장자리에 “LINK?” beacon
2. 내 Link Pulse 버튼이 파란색으로 점멸
3. 누르면 에너지 파동이 내 보드에서 파트너 보드로 이동
4. 파트너 Relay heat가 내려가고 effective cycle이 6초 동안 80%로 짧아짐
5. 양쪽 화면에 “Saved by Link Pulse” 표시

## 7. Boss Flow

보스 웨이브는 시작과 동시에 8초 예고를 보여준다. 보스가 실제로 들어오는 순간 boss timer가 시작된다.

```text
wave +0s: central loop darkens
wave +3s: boss name card
wave +5s: partner board heat scan
wave +8s: boss enters, timer starts
```

보스 중 UI 변화:

- Boss timer는 Top HUD와 중앙 모두에 표시
- Overclock 버튼 테두리 빨강
- Link Pulse 성공 시 timer 주변 파란 ring
- 보스 hp 25% 이하에서 음악/화면 pulse 증가

## 8. Result Screen

승리:

- “Signal Restored”
- MVP가 아니라 “Best Rescue”, “Best Link”, “Best Stabilizer” 같은 협동 칭호
- 하이라이트 3개: biggest merge, clutch link, boss clear time
- 다시하기 버튼
- 친구 초대 버튼

패배:

- 한 가지 원인만 크게 표시
- 개선 힌트 1개
- 리플레이 로그 요약

예:

```text
Signal Lost: Heat Cascade
3 Relay shut down within 10 seconds during Wave 6.
Next run: keep one Sink Relay near Anchor or save Link Pulse for boss wave.
```

## 9. BM Entry Points

전투 중 BM 진입은 최소화한다.

전투 중 허용:

- 코스메틱 효과 미리보기 없음
- 결제 없음
- 광고 없음

전투 후 허용:

- 패스 진행
- 코스메틱 언락
- 미션 보상 수령
- 상점 진입

## 10. Accessibility

- 모든 희귀도는 색뿐 아니라 아이콘 테두리 패턴으로 구분
- heat 상태는 색 + 흔들림 + 슬롯 아이콘으로 표현
- 버튼 텍스트는 12px 미만 금지
- 한 손 조작 기준 하단 주요 버튼 높이 44px 이상
- 화면 흔들림은 설정에서 약하게 가능
