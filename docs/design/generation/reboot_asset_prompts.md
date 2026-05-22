# ProjectAuto Reboot Asset Generation Prompts

작성일: 2026-04-30

## 목적

이 문서는 ProjectAuto 리부트 vertical slice에 필요한 이미지 생성 기준과 프롬프트를 정의한다.

기존 `Signal Relay` 에셋은 어두운 기술 패널, 회로, 릴레이 장치 중심이었다. 리부트 방향은 다음과 같이 바뀐다.

- 장르: 세로형 협동 랜덤 보드-구원 TD
- 첫 조작: `소환`, `합성`, `구원`
- 핵심 감정: 둘이 운을 굴려 무너지는 보드를 마지막 구원으로 버틴다.
- 비주얼 thesis: premium animated co-op toy-board

에셋은 예쁜 단품 이미지가 아니라 실제 390x844 세로 화면에서 읽히는 게임 자산이어야 한다.

## 선행 게이트

다음 4개 스타일 락 산출물이 승인되기 전에는 전투 UI 구현과 홈/상점/컬렉션 리스킨을 시작하지 않는다.

1. 홈 mockup 1장
2. 전투 mockup 1장
3. 유닛/적 스타일 샘플 1장
4. 보상/재화 샘플 1장

승인 기준:

- 390x844 세로 화면에서 모바일 게임처럼 보인다.
- 웹 대시보드, SaaS 패널, 기술 콘솔처럼 보이지 않는다.
- 유닛과 적이 64px에서 실루엣으로 구분된다.
- 생성 이미지에 글자, 숫자, 워터마크가 없다.
- 홈/전투/보상/상점이 같은 세계의 UI처럼 보인다.

## 공통 스타일 규칙

### 비주얼 thesis

Premium animated co-op toy-board.

### 형태 언어

- Chunky silhouettes
- Compact toy-machine bodies
- Soft mechanical charm
- Rounded but not childish
- Clear role icons through shape
- Thick rim light
- Readable at 24px, 48px, 64px

### 재질

- Polished painted metal
- Soft glass cores
- Rubber-like toy joints
- Subtle luminous signal seams
- Small screws, sockets, and handles
- No thin circuit-board detail as the primary read

### 팔레트

- Base: deep graphite, warm dark navy, muted charcoal
- Signal: bright teal
- Charge: amber yellow
- Rescue: warm cyan + white core
- Danger: coral red
- Slow/control: cool mint
- Reward/premium: gold + ivory
- Disabled: desaturated slate

금지:

- Dominant purple/blue gradient backgrounds
- Beige/brown/espresso dominance
- Casino/dice/pip language
- Thin sci-fi linework
- Dark unreadable silhouettes
- Pure UI cards as enemies
- Text inside generated images

### 스타일 락 고정 토큰

아래 값은 홈, 전투, 상점, 유닛, 적, UI 아이콘에 공통 적용한다. 한 번 승인되면 같은 vertical slice 안에서 바꾸지 않는다.

| Token | Locked Value |
| --- | --- |
| Camera | three-quarter top-down, 25-30 degree tilt, phone-game asset view |
| Key light | top-left warm key, lower-right soft fill |
| Shadow | soft ellipse, 12-18% opacity, y offset 8-14px at 256px cell |
| Outer outline | dark graphite outline, 3-5px at 256px cell |
| Inner rim | 1-2px colored rim on glass/core edge |
| Unit material | painted toy metal shell, soft glass core, rubber feet/handles |
| Enemy material | corrupted rubber/glass toy fragment, never square UI tile |
| Button material | pressed painted metal frame, glass icon well, subtle amber/cyan light |
| Runtime frame radius | 8px or less for UI containers; generated frame corners must not look like web cards |
| Rarity frame common | teal thin rim, graphite body |
| Rarity frame upgraded | amber double rim, brighter core |
| Rescue frame | cyan-white core, teal rim, clean medical/rescue feeling without text |
| Boss/danger frame | coral pulse rim, dark graphite shell, no skull/text glyph |
| Effect density | one primary glow per object; no full-screen fog or illegible particle wash |

생성 프롬프트에는 위 토큰을 반복 삽입한다. 결과물이 토큰과 다르면 후처리로 보정하지 말고 재생성한다.

## 에셋 인벤토리

### Style Lock

| Asset | Count | Format | Use |
| --- | --- | --- | --- |
| Home mockup | 1 | PNG/WebP | 홈 방향 승인 |
| Battle mockup | 1 | PNG/WebP | 전투 방향 승인 |
| Unit/enemy style sample | 1 | PNG/WebP | 캐릭터/적 형태 승인 |
| Reward/currency sample | 1 | PNG/WebP | 보상 방향 승인 |

### Vertical Slice Runtime Assets

| Asset | Count | Format | Notes |
| --- | --- | --- | --- |
| Unit atlas | 8 units | PNG/WebP transparent | 8 cells, equal size |
| Enemy atlas | 4 enemies | PNG/WebP transparent | 4 cells, equal size |
| UI/action icons | 6+ icons | PNG/WebP transparent | summon, merge, rescue, danger, reward |
| Reward icons | 3+ icons | PNG/WebP transparent | soft currency, shard, season progress |
| Result badges | 4 badges | PNG/WebP transparent | victory, defeat, reward chest, retry |
| Board frame accents | 3-5 pieces | PNG/WebP transparent | sockets, warning frame, rescue beam |
| Screen chrome | 5 pieces | PNG/WebP transparent | primary button, secondary button, content panel, dock, badge |
| Combat VFX | 5 effects | PNG/WebP transparent | summon, merge, rescue, enemy hit, boss warning |
| Navigation icons | 5 icons | PNG/WebP transparent | collection, shop, missions, season, home |
| Hero squad | 1 overlay | PNG/WebP transparent | splash/lobby unit group |
| Reward burst | 4 effects | PNG/WebP transparent | win reward, loss reward, gem burst, claim capsule |

## 런타임 아틀라스 계약

생성 이미지는 예쁜 샘플이 아니라 코드가 바로 slice해서 그릴 수 있는 런타임 자산이어야 한다. 모든 아틀라스는 straight alpha PNG 또는 lossless WebP로 저장한다. Premultiplied alpha 색 번짐, 검은 배경색 bleed, 흰 matte bleed는 실패다.

### Unit Atlas

| Field | Value |
| --- | --- |
| File | `src/client/assets/generated/reboot-unit-atlas.png` |
| Final size | 2048x256 |
| Grid | 8 columns x 1 row |
| Cell size | 256x256 |
| Cell order | `spark_pin`, `toktok_amp`, `slow_coil`, `burst_pin`, `rescue_coil`, `mirror_port`, `bloom_amp`, `nova_mast` |
| Runtime pivot | x 128, y 176 |
| Subject bbox | 160-210px on longest side |
| Center tolerance | cell center x deviation <= 8px |
| Foot/pivot tolerance | lowest contact point y 166-188 |
| Transparency | transparent pixel ratio >= 45% per cell |
| Margin | >= 18px clear margin on all sides |

### Enemy Atlas

| Field | Value |
| --- | --- |
| File | `src/client/assets/generated/reboot-enemy-atlas-v3.png` |
| Final size | 1024x256 |
| Grid | 4 columns x 1 row |
| Cell size | 256x256 |
| Cell order | `noise_shard`, `quick_noise`, `heavy_noise`, `mini_boss` |
| Runtime pivot | x 128, y 172 |
| Subject bbox | 130-220px on longest side |
| Center tolerance | cell center x deviation <= 8px |
| Ground contact tolerance | lowest contact point y 160-190 |
| Transparency | transparent pixel ratio >= 45% per cell |
| Margin | >= 18px clear margin on all sides |

### UI Action Icon Atlas

| Field | Value |
| --- | --- |
| File | `src/client/assets/generated/reboot-ui-icons.png` |
| Final size | 1536x256 |
| Grid | 6 columns x 1 row |
| Cell size | 256x256 |
| Cell order | `summon_charge`, `merge_action`, `rescue_action`, `partner_danger`, `boss_warning`, `reward_shard` |
| Runtime pivot | x 128, y 128 |
| Subject bbox | 148-190px on longest side |
| Center tolerance | x/y deviation <= 6px |
| Transparency | transparent pixel ratio >= 35% per cell |
| Margin | >= 24px clear margin on all sides |

### Board Accent Atlas

| Field | Value |
| --- | --- |
| File | `src/client/assets/generated/reboot-board-accents.png` |
| Final size | 1280x256 |
| Grid | 5 columns x 1 row |
| Cell size | 256x256 |
| Cell order | `player_socket`, `partner_socket`, `merge_ready_frame`, `rescue_beam_segment`, `danger_pulse_frame` |
| Runtime pivot | x 128, y 128 |
| Frame bbox | 210-244px on longest side |
| Center tolerance | x/y deviation <= 6px |
| Transparency | transparent pixel ratio >= 25% per cell |
| Margin | >= 6px clear margin on all sides |

### Reward Icon Atlas

| Field | Value |
| --- | --- |
| File | `src/client/assets/generated/reboot-reward-icons.png` |
| Final size | 1024x256 |
| Grid | 4 columns x 1 row |
| Cell size | 256x256 |
| Cell order | `soft_currency`, `cosmetic_shard`, `season_progress`, `unlock_capsule` |
| Runtime pivot | x 128, y 128 |
| Subject bbox | 148-190px on longest side |
| Center tolerance | x/y deviation <= 6px |
| Transparency | transparent pixel ratio >= 35% per cell |
| Margin | >= 24px clear margin on all sides |

### Screen Chrome Atlas

| Field | Value |
| --- | --- |
| File | `src/client/assets/generated/reboot-screen-chrome.png` |
| Final size | 1280x256 |
| Grid | 5 columns x 1 row |
| Cell size | 256x256 |
| Cell order | `primary_play_button`, `secondary_match_button`, `content_panel`, `bottom_dock`, `compact_badge` |
| Runtime use | CSS-scaled game UI skin for meta buttons, cards, docks, and badges |
| Center tolerance | each piece centered in its cell |
| Transparency | straight alpha; chroma-key source archived under `docs/design/generation/source/reboot/style-lock/` |
| Margin | visible frame edges must stay inside cell bounds |

### Result Badge Atlas

| Field | Value |
| --- | --- |
| File | `src/client/assets/generated/reboot-result-badges.png` |
| Final size | 1024x256 |
| Grid | 4 columns x 1 row |
| Cell size | 256x256 |
| Cell order | `victory_badge`, `defeat_badge`, `reward_chest`, `retry_core` |
| Runtime use | CSS result status badge and reward flourish |
| Subject bbox | 170-232px on longest side |
| Center tolerance | x/y deviation <= 8px |
| Transparency | transparent pixel ratio >= 30% per cell |
| Margin | >= 12px clear margin on all sides |

### Combat VFX Atlas

| Field | Value |
| --- | --- |
| File | `src/client/assets/generated/reboot-combat-vfx.png` |
| Final size | 1280x256 |
| Grid | 5 columns x 1 row |
| Cell size | 256x256 |
| Cell order | `summon_flash`, `merge_burst`, `rescue_flare`, `enemy_hit_spark`, `boss_warning_flare` |
| Runtime use | recent combat action feedback and live track impact VFX |
| Subject bbox | 170-236px on longest side |
| Center tolerance | x/y deviation <= 8px |
| Transparency | transparent pixel ratio >= 30% per cell |
| Margin | >= 10px clear margin on all sides |

### Navigation Icon Atlas

| Field | Value |
| --- | --- |
| File | `src/client/assets/generated/reboot-nav-icons.png` |
| Final size | 1280x256 |
| Grid | 5 columns x 1 row |
| Cell size | 256x256 |
| Cell order | `collection`, `shop`, `missions`, `season`, `home` |
| Runtime use | bottom dock and home/back buttons |
| Subject bbox | 160-220px on longest side |
| Center tolerance | x/y deviation <= 8px |
| Transparency | transparent pixel ratio >= 35% per cell |
| Margin | >= 14px clear margin on all sides |

### Hero Squad Overlay

| Field | Value |
| --- | --- |
| File | `src/client/assets/generated/reboot-hero-squad-v2.png` |
| Final size | 640x512 |
| Runtime use | splash and lobby mid-screen hero art |
| Subject bbox | 520-620px wide, 320-430px tall |
| Center tolerance | x/y deviation <= 16px |
| Transparency | transparent corners and clean alpha |
| Margin | >= 18px clear margin on all sides |

### Reward Burst Atlas

| Field | Value |
| --- | --- |
| File | `src/client/assets/generated/reboot-reward-burst.png` |
| Final size | 1024x256 |
| Grid | 4 columns x 1 row |
| Cell size | 256x256 |
| Cell order | `win_reward_burst`, `loss_reward_burst`, `gem_burst`, `claim_capsule` |
| Runtime use | result reward strip and reward claim feedback |
| Subject bbox | 168-236px on longest side |
| Center tolerance | x/y deviation <= 8px |
| Transparency | transparent pixel ratio >= 35% per cell |
| Margin | >= 12px clear margin on all sides |

## 런타임 소비 전환 계약

현재 앱은 기존 `Signal Relay` 자산을 다음 방식으로 소비한다.

| Current Runtime File | Current Grid | Current Use |
| --- | --- | --- |
| `src/client/assets/generated/relay-unit-atlas.png` | legacy unit grid | legacy fallback unit art |
| `src/client/assets/generated/relay-world-sprites.png` | 4 columns x 5 rows | legacy relay world sprites |
| `src/client/assets/generated/noise-world-sprites.png` | 4 columns x 2 rows | legacy enemy/world sprites |
| `src/client/assets/generated/ui-icon-atlas.png` | legacy UI grid | legacy UI icons |

리부트 구현은 위 파일과 grid를 재사용하지 않는다. `src/client/reboot_render.js`는 아래 manifest만 통해 전투 자산을 slice하고, 메타 화면 CSS는 `reboot-screen-chrome.png`를 UI skin으로만 소비한다.

```js
export const REBOOT_ATLAS_MANIFEST = {
  units: {
    src: '/src/client/assets/generated/reboot-unit-atlas.png',
    columns: 8,
    rows: 1,
    cell: { width: 256, height: 256 },
    pivot: { x: 128, y: 176 },
    order: ['spark_pin', 'toktok_amp', 'slow_coil', 'burst_pin', 'rescue_coil', 'mirror_port', 'bloom_amp', 'nova_mast']
  },
  enemies: {
    src: '/src/client/assets/generated/reboot-enemy-atlas-v3.png?v=enemy-atlas-v3',
    columns: 4,
    rows: 1,
    cell: { width: 256, height: 256 },
    pivot: { x: 128, y: 172 },
    order: ['noise_shard', 'quick_noise', 'heavy_noise', 'mini_boss']
  },
  ui: {
    src: '/src/client/assets/generated/reboot-ui-icons.png',
    columns: 6,
    rows: 1,
    cell: { width: 256, height: 256 },
    pivot: { x: 128, y: 128 },
    order: ['summon_charge', 'merge_action', 'rescue_action', 'partner_danger', 'boss_warning', 'reward_shard']
  },
  rewards: {
    src: '/src/client/assets/generated/reboot-reward-icons.png',
    columns: 4,
    rows: 1,
    cell: { width: 256, height: 256 },
    pivot: { x: 128, y: 128 },
    order: ['soft_currency', 'cosmetic_shard', 'season_progress', 'unlock_capsule']
  },
  board: {
    src: '/src/client/assets/generated/reboot-board-accents.png',
    columns: 5,
    rows: 1,
    cell: { width: 256, height: 256 },
    pivot: { x: 128, y: 128 },
    order: ['player_socket', 'partner_socket', 'merge_ready_frame', 'rescue_beam_segment', 'danger_pulse_frame']
  }
};
```

전환 규칙:

- `src/client/reboot_render.js`는 legacy `relayWorldSprites`, `noiseWorldSprites`, `relayAtlas`, `bossDisruptionAtlas`를 import하거나 참조하지 않는다.
- 리부트 content의 `atlasIndex`는 숫자가 아니라 manifest key를 사용한다. 예: `spriteKey: 'spark_pin'`.
- atlas slice는 `order.indexOf(spriteKey)`로만 계산한다.
- `test/assets.test.js`는 리부트 manifest의 `columns`, `rows`, `cell`, `order`와 실제 PNG 크기가 일치하는지 검증한다.
- 리부트 적은 `noise-world-sprites.png`의 4x2 grid로 slice하면 실패다.
- 기존 레거시 파일은 fallback으로도 쓰지 않는다. 임시 이미지가 필요하면 리부트 manifest에 맞는 임시 silhouette atlas를 만든다.
- 홈/상점/유닛/결과 화면의 카드와 버튼은 CSS gradient만으로 만들지 않고 `reboot-screen-chrome.png`를 배경 프레임으로 사용한다.

### Metadata Manifest

후처리 결과에는 slice manifest를 함께 남긴다.

```json
{
  "asset_id": "reboot-unit-atlas-v1",
  "image": "src/client/assets/generated/reboot-unit-atlas.png",
  "dimensions": { "width": 2048, "height": 256 },
  "grid": { "columns": 8, "rows": 1 },
  "cell": { "width": 256, "height": 256 },
  "alpha": "straight",
  "pivot": { "x": 128, "y": 176 },
  "order": ["spark_pin", "toktok_amp", "slow_coil", "burst_pin", "rescue_coil", "mirror_port", "bloom_amp", "nova_mast"],
  "qa": {
    "bbox_margin_min_px": 18,
    "center_deviation_max_px": 8,
    "transparent_pixel_ratio_min": 0.45,
    "stray_alpha_outside_bbox_max_ratio": 0.01,
    "thumbnail_passed": ["24px", "48px", "64px"]
  }
}
```

## 네이밍 규칙

생성 원본:

```text
docs/design/generation/source/reboot/<asset-type>/<YYYYMMDD>-<short-name>.png
```

후처리 결과:

```text
docs/design/generation/processed/reboot/<asset-type>/<short-name>.png
```

런타임 적용:

```text
src/client/assets/generated/reboot-<asset-type>.png
```

메타데이터:

```text
docs/design/generation/processed/reboot/<asset-type>/<short-name>.json
```

메타데이터 필수 필드:

```json
{
  "asset_id": "reboot-unit-atlas-v1",
  "created_at": "2026-04-30",
  "source_prompt": "prompt text",
  "postprocess": ["background_removed", "rim_normalized", "atlas_sliced"],
  "final_dimensions": "2048x256",
  "grid": { "columns": 8, "rows": 1 },
  "cell": { "width": 256, "height": 256 },
  "pivot": { "x": 128, "y": 176 },
  "order": ["spark_pin", "toktok_amp", "slow_coil", "burst_pin", "rescue_coil", "mirror_port", "bloom_amp", "nova_mast"],
  "qa": {
    "bbox_margin_min_px": 18,
    "center_deviation_max_px": 8,
    "transparent_pixel_ratio_min": 0.45,
    "stray_alpha_outside_bbox_max_ratio": 0.01,
    "thumbnail_passed": ["24px", "48px", "64px"]
  },
  "intended_use": "first 120 seconds unit atlas",
  "approval_state": "candidate"
}
```

## Style Lock Prompt: Home Mockup

```text
Use case: stylized-concept
Asset type: vertical mobile game home screen mockup for ProjectAuto reboot; style lock image.
Primary request: Create a polished portrait mobile game home screen for a cooperative random board-rescue tower defense game. The screen must feel like a real shipped Korean mobile game, not a website, dashboard, or prototype.
Core fantasy: two players collect and deploy charming signal toy-machines, merge them, and rescue each other on a shared glowing track.
Composition: exact 9:16 portrait phone composition. Center 35-45% of screen occupied by a tactile toy-board preview with 5 collectible signal toy units lined up like a premium game shelf. One dominant play button at bottom-center. Compact currencies at top. Bottom dock with icon-first entries for units, shop, missions, season.
Style lock tokens: three-quarter top-down 25-30 degree asset view inside UI previews, top-left warm key light, lower-right soft fill, dark graphite 3-5px outlines, 1-2px colored inner rim, pressed painted metal frames, glass icon wells, runtime frame radius 8px or less, one primary glow per object.
Visual style: premium animated co-op toy-board, chunky collectible toy-machines, polished painted metal, soft glass cores, thick rim light, crisp mobile UI frames, bright readable action areas.
Palette: deep graphite and warm charcoal base, teal signal glow, amber charge, coral danger accents, gold reward highlights, ivory UI edges.
Mood: playful but premium, readable, collectible, energetic, thumb-first.
Constraints: no readable text inside generated image, no letters, no numbers, no watermark. UI labels will be rendered by code. Do not copy any existing game. No dice, no casino pips, no chibi heroes, no dark sci-fi control panel, no SaaS dashboard cards.
Quality: high production value mobile game screen, strong first impression, clear commercial app-game feeling.
```

## Style Lock Prompt: Battle Mockup

```text
Use case: stylized-concept
Asset type: vertical mobile game battle screen mockup for ProjectAuto reboot; style lock image.
Primary request: Create a polished 390x844 portrait battle screen mockup for a cooperative random board-rescue tower defense game. It must be readable as gameplay within one second.
Core fantasy: two players defend a shared glowing toy track by summoning, merging, and rescuing with collectible signal toy-machines.
Composition: top compact partner board and danger meter, center shared enemy track with small toy-like corruption enemies moving toward a gate, lower player board with 5 toy-machine units, bottom action area with three large icon buttons for summon, merge, rescue. No shop or monetization buttons.
Required readability: enemy path, player board, partner board, danger state, summon/merge/rescue actions must be identifiable without text.
Style lock tokens: three-quarter top-down 25-30 degree gameplay view, top-left warm key light, lower-right soft fill, dark graphite 3-5px outlines on units/enemies, 1-2px colored inner rims, soft ellipse shadows, pressed painted metal action buttons, glass icon wells, runtime frame radius 8px or less, one primary glow per object.
Visual style: premium animated co-op toy-board, high-end Korean mobile game combat UI, chunky silhouettes, crisp effects, tactile toy materials, strong attack impacts and rescue beam.
Palette: graphite/charcoal base, teal signal track, amber summon charge, coral danger warning, cyan-white rescue beam, gold reward sparkle only as minor accent.
Motion impression: merge reveal glow, rescue beam connecting both boards, boss warning silhouette, small hit flashes.
Constraints: no readable text inside generated image, no letters, no numbers, no watermark. No dice, no casino UI, no generic card battler, no dark technical console, no thin circuit diagram.
Quality: shipped-game battle screen, compact, juicy, readable at phone size.
```

## Style Lock Prompt: Unit/Enemy Sample

```text
Use case: stylized-concept
Asset type: style sample sheet for ProjectAuto reboot units and enemies.
Primary request: Create a clean style sample sheet showing 5 collectible signal toy-machine units and 4 toy-like corruption enemies for a vertical co-op random tower defense game. Transparent or neutral simple background, no text.
Unit subjects: Spark Pin basic attacker, Toktok Amp support booster, Slow Coil control unit, Burst Pin upgraded attacker, Rescue Coil co-op rescue unit.
Enemy subjects: Noise Shard basic enemy, Quick Noise fast enemy, Heavy Noise tank enemy, Mini Boss chunky corruption toy.
Style lock tokens: three-quarter top-down 25-30 degree camera, top-left warm key light, lower-right soft fill, soft ellipse shadows, dark graphite 3-5px outer outline, 1-2px colored inner rim, one primary glow per object.
Visual style: premium mobile game toy-board assets, chunky readable silhouettes, polished painted metal and soft glass cores for units, corrupted rubber/glass toy fragments for enemies, consistent three-quarter top-down camera, consistent top-left lighting, strong rim light.
Role readability: attacker has pointed spark barrel, amplifier has round speaker/booster shape, slow coil has spiral/magnet shape, burst pin is larger and more powerful, rescue coil has cyan-white medical/rescue core; enemies have clear speed/tank/boss silhouette differences.
Palette: units use teal, amber, mint, cyan-white rescue accents; enemies use coral danger, dark graphite, small teal corruption highlights.
Constraints: no readable text, no letters, no numbers, no watermark. No dice, no playing cards, no humanoid heroes, no tiny thin details.
Quality: asset direction proof that each object reads at 64px.
```

## Style Lock Prompt: Reward/Currency Sample

```text
Use case: stylized-concept
Asset type: reward and currency style sample for ProjectAuto reboot.
Primary request: Create a compact premium mobile game reward/currency sample sheet for a cooperative toy-board tower defense game. No text.
Subjects: summon charge token, rescue energy core, cosmetic shard, soft currency coin, season progress badge, new unlock capsule, reward chest.
Style lock tokens: three-quarter top-down 25-30 degree icon view, top-left warm key light, lower-right soft fill, soft ellipse shadow, dark graphite 3-5px outline, 1-2px colored inner rim, pressed painted metal micro-frame, glass core, one primary glow per icon.
Visual style: cohesive game UI icons, polished toy-like metal and glass, thick outlines, strong silhouette, readable at 24px and 48px, matching ProjectAuto reboot unit style.
Palette: amber summon charge, cyan-white rescue, gold/ivory rewards, teal signal accents, coral danger only for warning badge, graphite frame.
Composition: equal icon cells with generous padding, consistent camera and lighting, transparent or simple neutral background, no labels.
Constraints: no readable text, no letters, no numbers, no watermark. No casino chips, dice, gacha machine, copied app icons, or generic emojis.
Quality: shipped mobile game reward icon set.
```

## Runtime Prompt: Unit Atlas

```text
Use case: sprite-atlas
Asset type: 8-cell transparent unit atlas for ProjectAuto reboot.
Primary request: Create 8 collectible signal toy-machine unit sprites in a single horizontal sprite atlas. Transparent background. Equal cell sizes. No text.
Output contract: final atlas 2048x256, 8 columns x 1 row, each cell exactly 256x256, straight alpha, no premultiplied alpha bleed.
Subjects left to right:
1. Spark Pin: basic attacker, eager tiny striker personality, small pointed spark barrel, teal glass core like a bright eye-light, amber spark tip, iconic forward-leaning pose.
2. Toktok Amp: support booster, cheerful round speaker-like amplifier body, amber ring, friendly chunky silhouette, little handle ears, readable as the team's booster.
3. Slow Coil: control unit, calm sleepy coil personality, mint spiral coil and magnetic feet, cool glow, iconic slow-field posture.
4. Burst Pin: upgraded attacker, bold premium version of Spark Pin, larger double spark barrel, stronger teal/amber glow, heroic compact pose, clearly grade 2.
5. Rescue Coil: co-op rescue unit, caring rescue-beacon personality, cyan-white rescue core, small wing-like handles, beam emitter shape, reads as the unit players want to protect.
6. Mirror Port: grade-2 support portal unit, circular teal mirror ring, symmetric cream metal rim, small cyan conduits, calm partner-link feel.
7. Bloom Amp: grade-1 support amplifier, flower-like teal petal fins around an amber core, squat cute mechanical silhouette, reads as a signal-growth booster.
8. Nova Mast: grade-2 attacker, taller orange/teal cannon-mast silhouette, one prominent energy barrel, stronger heroic damage presence without becoming too wide.
Style lock tokens: three-quarter top-down 25-30 degree camera, top-left warm key light, lower-right soft fill, soft ellipse shadow, dark graphite 3-5px outline, 1-2px colored inner rim, painted toy metal shell, soft glass core, one primary glow per unit.
Style: premium mobile game toy-board unit sprites, three-quarter top-down 25-30 degree camera, chunky silhouettes, polished painted metal, soft glass cores, dark graphite 3-5px outline, 1-2px inner colored rim, readable at 64px.
Lighting: top-left warm key light, lower-right soft fill, soft ellipse shadow at 12-18% opacity, consistent scale.
Constraints: transparent background, no card frames, no square tile, no text, no letters, no numbers, no watermark, no dice, no humanoid heroes.
Export target: subject bbox 160-210px longest side, pivot x 128 y 176, foot contact y 166-188, center x deviation <= 8px, at least 18px margin around the subject.
```

## Runtime Prompt: Enemy Atlas

```text
Use case: sprite-atlas
Asset type: 4-cell transparent enemy atlas for ProjectAuto reboot.
Primary request: Create 4 toy-like corruption enemy sprites in a single horizontal sprite atlas. Transparent background. Equal cell sizes. No text. V3 direction: stronger crawler silhouettes, more creature-like threat posture, and less abstract crystal-icon reading on the battlefield.
Output contract: final atlas 1024x256, 4 columns x 1 row, each cell exactly 256x256, straight alpha, no premultiplied alpha bleed.
Subjects left to right:
1. Noise Shard: small basic corruption crawler, coral crystal core, jagged graphite shell, short claw-like feet, simple readable triangular silhouette.
2. Quick Noise: fast skittering corruption drone, low streamlined body, swept-back graphite fins, bright coral streak, lean forward-motion silhouette.
3. Heavy Noise: tank enemy, squat armored crawler, thick graphite shell plates, large coral glass core, heavy planted feet.
4. Mini Boss: larger corruption commander, crown-like broken signal core, layered graphite armor, coral danger glow, clearly larger and more threatening than others.
Style lock tokens: three-quarter top-down 25-30 degree camera, top-left warm key light, lower-right soft fill, soft ellipse shadow, dark graphite 3-5px outline, 1-2px colored inner rim, corrupted rubber/glass toy fragment material, one primary coral glow per enemy.
Style: premium mobile game toy-board enemy sprites, corrupted glass/rubber toy materials, three-quarter top-down 25-30 degree camera, strong silhouette, readable at 48px, not a UI icon card.
Lighting: top-left warm key light, lower-right soft fill, subtle ellipse shadow, teal rim contamination.
Constraints: transparent background, no card frames, no square tile, no text, no watermark, no dice, no generic monster copy.
Export target: subject bbox 130-220px longest side, pivot x 128 y 172, lowest contact y 160-190, center x deviation <= 8px, at least 18px margin around the subject.
```

## Runtime Prompt: UI Action Icons

```text
Use case: sprite-atlas
Asset type: transparent UI action icon atlas for ProjectAuto reboot.
Primary request: Create 6 compact mobile game UI action/resource icons in a single horizontal transparent atlas. Equal cells. No text.
Output contract: final atlas 1536x256, 6 columns x 1 row, each cell exactly 256x256, straight alpha, no premultiplied alpha bleed.
Subjects left to right:
1. Summon charge: amber toy battery/token with spark.
2. Merge action: two small toy cores combining into one burst.
3. Rescue action: cyan-white beam heart/core connecting two boards.
4. Partner danger: coral warning gate with pulse.
5. Boss warning: chunky boss silhouette badge with coral rim.
6. Reward shard: gold/ivory cosmetic shard with teal glint.
Style lock tokens: three-quarter top-down 25-30 degree icon view, top-left warm key light, lower-right soft fill, soft ellipse shadow, dark graphite 3-5px outline, 1-2px colored inner rim, pressed painted metal micro-frame, glass core, one primary glow per icon.
Style: premium mobile game UI icons, chunky symbolic silhouettes, polished metal/glass, high contrast, readable at 24px.
Palette: amber summon, teal merge, cyan-white rescue, coral danger, gold reward, graphite outline.
Constraints: transparent background, no text, no letters, no numbers, no watermark, no dice pips, no generic emojis.
Export target: icon bbox 148-190px longest side, pivot x 128 y 128, center deviation <= 6px, at least 24px margin around the subject.
```

## Runtime Prompt: Board Accents

```text
Use case: sprite-atlas
Asset type: transparent board accent atlas for ProjectAuto reboot battle screen.
Primary request: Create 5 transparent board accent pieces for a vertical co-op toy-board tower defense game. Equal cells. No text.
Output contract: final atlas 1280x256, 5 columns x 1 row, each cell exactly 256x256, straight alpha, no premultiplied alpha bleed.
Subjects left to right:
1. Player socket frame: rounded chunky toy socket with teal rim.
2. Partner socket frame: smaller matching socket with cyan rim.
3. Merge ready frame: glowing amber dual-unit highlight frame.
4. Rescue beam segment: cyan-white beam with soft core and chunky toy energy edges.
5. Danger pulse frame: coral warning border for partner board.
Style lock tokens: three-quarter top-down 25-30 degree UI-gameplay hybrid view, top-left warm key light, lower-right soft fill, dark graphite 3-5px outline, 1-2px colored inner rim, pressed painted metal frame material, glass energy wells, one primary glow per accent.
Style: premium mobile game UI/gameplay hybrid assets, chunky toy-board material, polished metal, readable at phone scale.
Constraints: transparent background, no text, no watermark, no full-screen panel, no thin circuit lines.
Export target: frame bbox 210-244px longest side, pivot x 128 y 128, center deviation <= 6px, at least 6px margin around the subject.
```

## Runtime Prompt: Reward Icons

```text
Use case: sprite-atlas
Asset type: transparent reward icon atlas for ProjectAuto reboot result, shop, and collection screens.
Primary request: Create 4 compact mobile game reward icons in a single horizontal transparent atlas. Equal cells. No text.
Output contract: final atlas 1024x256, 4 columns x 1 row, each cell exactly 256x256, straight alpha, no premultiplied alpha bleed.
Subjects left to right:
1. Soft currency: gold/ivory toy coin with teal signal glint, not a casino chip.
2. Cosmetic shard: faceted gold/ivory shard with teal edge light.
3. Season progress: premium toy badge with amber progress core, no letters or numbers.
4. Unlock capsule: compact glass-and-metal capsule with a soft cyan reward core, no gacha-machine silhouette.
Style lock tokens: three-quarter top-down 25-30 degree icon view, top-left warm key light, lower-right soft fill, soft ellipse shadow, dark graphite 3-5px outline, 1-2px colored inner rim, pressed painted metal micro-frame, glass core, one primary glow per icon.
Style: premium mobile game reward icons, chunky symbolic silhouettes, polished metal/glass, high contrast, readable at 24px.
Palette: gold/ivory reward, teal signal accent, amber progress, cyan unlock core, graphite outline.
Constraints: transparent background, no text, no letters, no numbers, no watermark, no casino chips, no dice, no generic emojis, no copied app icons.
Export target: icon bbox 148-190px longest side, pivot x 128 y 128, center deviation <= 6px, at least 24px margin around the subject.
```

## Runtime Prompt: Battle Backdrop V2

```text
Use case: stylized-concept
Asset type: opaque portrait combat battlefield background for ProjectAuto reboot battle screen.
Primary request: Create a premium dark sci-fi cooperative tower defense battlefield map for a portrait mobile game. Preserve the gameplay geometry from the current battle backdrop: a 390x620 vertical frame, the same S-shaped enemy route, a bottom player board area, and a top partner socket deck, but restyle it to match ProjectAuto's dark graphite metal, cyan signal energy, amber gold trim, and generated app chrome.
Canvas/layout: vertical portrait map. Enemy route must be a bright cyan signal-lit S road that starts near x=196 y=158, passes x=270 y=224, x=154 y=266, x=88 y=292, x=92 y=316, x=204 y=338, and ends near x=252 y=346 in the 390x620 coordinate system. Leave readable floor around the route for enemies and effects. Keep a premium bottom command/player socket platform from y=455 to y=560 that is not a black empty hole. Keep the upper partner socket deck around y=95 to y=170. The map must work behind existing HUD and action dock overlays.
Style: high-end Korean mobile game UI background, dark sci-fi toy-board cooperative defense arena, polished graphite and gunmetal, luminous cyan glass route, restrained amber gold accents, compact commercial game readability, dramatic but not busy, consistent with ProjectAuto Signal Relay meta screens.
Lighting: darker, moodier, more premium than the earlier beige garden-like map; no bright grass, no warm daylight, no cute park scenery, no cartoon plaza. Use controlled cyan rim lights and dark floor plates.
Avoid: text, letters, numbers, logos, watermarks, dice/casino cues, large characters, enemies, towers, oversized trees, bright beige concrete, cheerful daytime lighting, blurry route, route geometry drift, empty black lower socket panel.
Runtime source: docs/design/generation/source/reboot/style-lock/20260522-battle-backdrop-v2-imagegen.png
Runtime file: src/client/assets/generated/reboot-battle-backdrop-v2.png
Postprocess: center-crop the generated source to the 390:620 target aspect, resize to 390x620, lightly boost contrast/color/sharpness for phone readability while preserving dark map tone.
Acceptance: the battle screen reads as part of the same premium dark sci-fi app as meta/result screens; enemies and generated track effects remain grounded on the cyan S route at the existing serialized path coordinates.
```

## Runtime Prompt: Result Badges

```text
Use case: sprite-atlas
Asset type: transparent result status badge atlas for ProjectAuto reboot result screen.
Primary request: Create 4 premium mobile game result/reward badges in a single horizontal transparent atlas. Equal cells. No text.
Output contract: final atlas 1024x256, 4 columns x 1 row, each cell exactly 256x256, straight alpha, no premultiplied alpha bleed.
Subjects left to right:
1. Victory badge: gold and teal signal crest, triumphant but compact, polished toy-board metal, glass core, celebratory spark rays.
2. Defeat badge: cracked coral/graphite signal core, broken gate silhouette, readable loss icon but not scary.
3. Reward chest badge: small premium toy chest/capsule with gold shard glow and teal glass highlight, not a gacha machine.
4. Retry badge: circular reset signal core with amber/teal loop arrow shape made from metal and glass, no actual text.
Style lock tokens: premium Korean mobile game result UI, cooperative toy-board tower defense, three-quarter top-down 25-30 degree icon view, top-left warm key light, lower-right soft fill, polished painted metal, dark graphite 3-5px outline, 1-2px colored inner rim, soft glass core, one controlled glow per badge.
Style: shipped mobile game result feedback, readable at 48px and 92px, tactile, celebratory, not a website modal.
Constraints: transparent background, no text, no letters, no numbers, no watermark, no dice, no casino pips, no generic emoji, no copied app icons.
Export target: subject bbox 170-232px longest side, pivot x 128 y 128, center deviation <= 8px, at least 12px margin around the subject.
```

## Runtime Prompt: Combat VFX

```text
Use case: sprite-atlas
Asset type: transparent combat VFX atlas for ProjectAuto reboot battle screen.
Primary request: Create 5 premium mobile game combat VFX pieces in a single horizontal transparent atlas. Equal cells. No text.
Output contract: final atlas 1280x256, 5 columns x 1 row, each cell exactly 256x256, straight alpha, no premultiplied alpha bleed.
Subjects left to right:
1. Summon flash: amber-gold energy ring and tiny toy spark burst, compact radial flash for a newly summoned unit.
2. Merge burst: teal and gold two-core fusion burst, chunky toy energy petals, reads as units combining.
3. Rescue flare: cyan-white rescue beam impact flare with soft glass core and protective halo.
4. Enemy hit spark: coral and teal hit spark slash on a toy corruption enemy, small punchy impact flash.
5. Boss warning flare: larger coral danger shockwave ring with graphite fragments, readable warning pulse, not a skull.
Style lock tokens: premium Korean mobile game combat effects, cooperative toy-board tower defense, polished toy energy, chunky readable shapes, graphite fragments, controlled glow per VFX.
Style: shipped mobile game combat juice, readable at 40px, 64px, and 110px, no UI-card framing.
Constraints: transparent background, no text, no letters, no numbers, no watermark, no dice, no casino pips, no generic emoji, no copied app icons.
Export target: subject bbox 170-236px longest side, pivot x 128 y 128, center deviation <= 8px, at least 10px margin around the subject.
```

## Runtime Prompt: Player Board Tray

```text
Use case: stylized-concept
Asset type: transparent combat player board tray overlay for ProjectAuto reboot battle screen.
Primary request: Create one premium mobile game bottom player-board landing tray for a portrait cooperative tower-defense battle screen. It must look like shipped Korean mobile game UI art, not a web card.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for background removal. The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation.
Subject: a wide low graphite-metal board tray with five compact toy-unit landing sockets/wells, teal glass cores, amber rim lights, chunky painted-metal bevels, subtle mechanical bolts, and a soft central teal energy rail. It should read as the player's unit deployment area beneath summoned units. No text.
Composition: horizontal tray, centered, aspect about 2.45:1, generous transparent padding after processing. Keep the top edge slightly open so units drawn above it remain readable. The five sockets should be evenly spaced and readable at phone size.
Style lock tokens: ProjectAuto reboot, cooperative toy-board tower defense, polished toy metal, dark graphite outline, teal glass cores, amber highlights, warm top-left key light, controlled glow, premium Korean mobile game combat UI.
Constraints: no text, no letters, no numbers, no watermark, no dice, no casino pips, no generic emoji, no buttons, no price tags, no cast shadow on the background. Do not use #00ff00 anywhere in the subject.
Export target after processing: final transparent PNG 780x320, subject bbox roughly 660-735px wide and 190-270px tall, at least 16px margin around the subject, straight alpha, readable beneath units and VFX.
```

## Runtime Prompt: Navigation Icons

```text
Use case: sprite-atlas
Asset type: transparent navigation icon atlas for ProjectAuto reboot mobile app shell.
Primary request: Create 5 premium mobile game navigation icons in a single horizontal transparent atlas. Equal cells. No text.
Output contract: final atlas 1280x256, 5 columns x 1 row, each cell exactly 256x256, straight alpha, no premultiplied alpha bleed.
Subjects left to right:
1. Collection: heroic toy relay unit badge, small character pedestal, reads as unit roster.
2. Shop: gem capsule chest with cosmetic sparkles, clearly store/cosmetic unlock, no money symbol.
3. Missions: sealed mission scroll and check emblem, readable daily quest icon.
4. Season: progress medal with orbit ring and star shard, readable season pass/progression without paid implication.
5. Home: compact command base house icon with teal dome, reads as return home.
Style lock tokens: premium Korean mobile game app shell, cooperative toy-board tower defense, polished toy metal, teal glass cores, amber highlights, graphite trim, chunky readable silhouettes.
Style: shipped mobile game navigation icons, readable at 28px, 40px, and 64px, no UI-card framing.
Constraints: transparent background, no text, no letters, no numbers, no watermark, no dice, no casino pips, no price tags, no generic emoji.
Export target: subject bbox 160-220px longest side, pivot x 128 y 128, center deviation <= 8px, at least 14px margin around the subject.
```

## Runtime Prompt: Hero Squad

```text
Use case: stylized-concept
Asset type: transparent splash/lobby hero squad overlay for ProjectAuto reboot mobile app shell.
Primary request: Create one premium mobile game hero artwork showing the five ProjectAuto toy relay units posing together on a tiny command platform. No text.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for background removal; no floor plane, no cast shadow on the background.
Subjects: five cooperative toy-defense units with silhouettes matching the runtime unit roster: spark pin attacker, toktok amp support, slow coil controller, burst pin attacker, rescue coil support. Arrange as a compact triangular squad, front unit low center, taller units behind, all facing slightly toward camera.
Style lock tokens: premium Korean mobile co-op tower defense, polished toy metal, teal glass cores, amber highlights, graphite trim, readable chunky shapes, friendly but battle-ready.
Style: shipped mobile game splash art, crisp at phone width, high contrast but not noisy, no UI-card framing.
Constraints: no text, no letters, no numbers, no watermark, no dice, no casino pips, no realistic humans, no weapon gore. Do not use #00ff00 anywhere in the subjects.
Export target after processing: final transparent PNG 640x512, squad centered, subject bbox 520-620px wide and 320-430px tall, at least 18px margin around the subject.
```

## Runtime Prompt: Reward Burst

```text
Use case: sprite-atlas
Asset type: transparent result reward burst atlas for ProjectAuto reboot result screen.
Primary request: Create 4 premium mobile game reward VFX icons in a single horizontal transparent atlas. Equal cells. No text.
Output contract: final atlas 1024x256, 4 columns x 1 row, each cell exactly 256x256, straight alpha, no premultiplied alpha bleed.
Subjects left to right:
1. Win reward burst: bright teal-gold capsule opening with gem shards and warm victory rays.
2. Loss reward burst: smaller cyan consolation capsule with gentle glow, still rewarding but restrained.
3. Gem burst: cluster of soft currency gems flying outward with spark particles.
4. Claim capsule: closed cosmetic unlock capsule with teal glass core and amber latch.
Style lock tokens: premium Korean mobile game reward reveal, cooperative toy-board tower defense, polished toy metal, teal glass, amber highlights, chunky readable shapes, controlled glow.
Style: shipped mobile game reward feedback, readable at 34px, 64px, and 110px, no UI-card framing.
Constraints: transparent background, no text, no letters, no numbers, no watermark, no dice, no casino pips, no price tags, no generic emoji.
Export target: subject bbox 168-236px longest side, pivot x 128 y 128, center deviation <= 8px, at least 12px margin around the subject.
```

## Runtime Prompt: Screen Chrome

```text
Use case: sprite-atlas
Asset type: transparent UI chrome atlas for ProjectAuto reboot home, shop, collection, mission, season, and result screens.
Primary request: Create 5 premium mobile game UI chrome pieces in a single horizontal atlas. Equal cells. No text.
Output contract: final atlas 1280x256, 5 columns x 1 row, each cell exactly 256x256, straight alpha, no premultiplied alpha bleed.
Subjects left to right:
1. Primary play button plate: wide chunky gold/amber painted-metal button frame with glass inset.
2. Secondary match button plate: wide graphite/teal painted-metal button frame with glass inset.
3. Content panel frame: portrait-friendly game info card frame, graphite metal, teal inner rim.
4. Bottom dock bar frame: low navigation dock with four subtle icon wells, graphite metal and teal glow.
5. Compact HUD badge frame: pill-shaped status badge, ivory edge, teal glass shine.
Style lock tokens: premium Korean mobile game UI, cooperative toy-board tower defense, polished painted metal, dark graphite 3-5px outline, 1-2px colored inner rim, glass wells, top-left warm key light, lower-right soft fill, one controlled glow per piece, runtime frame radius 8px or less.
Style: shipped mobile game UI skin, tactile, compact, thumb-first, not a website card or dashboard.
Constraints: transparent background, no text, no letters, no numbers, no watermark, no icons, no characters, no dice, no SaaS dashboard cards.
Export target: each piece centered in its 256x256 cell and usable as a CSS-scaled background skin.
```

## Runtime Prompt: Combat Reveal VFX

```text
Use case: stylized-concept
Asset type: project-bound transparent VFX atlas for a portrait mobile cooperative tower-defense game combat canvas.
Primary request: Create one horizontal 4-cell VFX atlas for ProjectAuto summon and merge anticipation moments, on a perfectly flat solid #ff00ff chroma-key background for background removal.
Subject: four separate equal-width cells with generous padding: 1) summon capsule opening ring, teal energy circle with amber sparks; 2) merge fusion burst, three small toy-device lights combining into one bright core; 3) rare pull flash, compact golden starburst with teal rim; 4) partner rescue charge spark, linked teal-gold pulse knot. No text, no icons with letters, no character faces.
Style/medium: shipped Korean mobile game combat VFX, premium toy-board tower-defense, polished metal/glass energy, chunky readable shapes, dark graphite outline accents, teal cores and warm amber highlights.
Composition/framing: orthographic UI sprite atlas, four equal cells in one row, centered effects, transparent-safe padding, readable at 54px and 96px.
Lighting/mood: crisp energetic combat feedback, controlled glow, high contrast.
Constraints: background must be one uniform #ff00ff with no gradients, shadows, texture, floor, reflections, or lighting variation. Do not use #ff00ff anywhere in the VFX. Keep cells visually separate. No watermark. No text.
Postprocess: remove #ff00ff chroma key with soft matte/despill, crop and pad runtime atlas to 1920x512, 4 columns x 1 row, 480x512 cells, centered straight-alpha subjects.
```

## Runtime Prompt: Online Partner Link Console

```text
Use case: stylized-concept
Asset type: mobile game UI sprite atlas for ProjectAuto / 신호릴레이
Primary request: Create one polished sci-fi mobile game UI sprite atlas containing THREE equal-width horizontal co-op event banner panels in a single row. Each cell is a wide metallic console banner with a strong dark central glass label plate where DOM text will be overlaid later.
State 1: partner searching, blue scanning link with a dark readable text plate.
State 2: partner connected, teal-gold dual linked cores with a dark readable text plate.
State 3: partner reset/disconnected, red-orange broken link alert with a dark readable text plate.
Scene/backdrop: transparent-safe atlas preview background.
Style/medium: high-end 2D game UI art, Korean mobile sci-fi tower-defense, glossy metal frame, teal energy, warm amber accents, consistent with premium generated game assets, not a web component.
Composition/framing: one atlas row, three equal cells, generous padding, centered panels, no cropping. The central dark text plate should occupy roughly the middle half of each cell and stay much quieter than the edge machinery.
Text: no text, no letters, no numbers, no logos.
Constraints: transparent outer background or a removable preview background; crisp edges suitable for alpha cleanup; each cell must be visually distinct and readable at phone scale.
Avoid: CSS-like flat rectangles, website cards, text, watermark, black rectangular baked background, cropped corners.
Postprocess: remove the preview background, slice the generated row into three equal cells, trim transparent padding per cell, and pad each state into a 390x144 runtime cell for final atlas 1170x144.
Runtime files:
- docs/design/generation/source/reboot/style-lock/20260516-online-partner-link-readable-imagegen.png
- src/client/assets/generated/reboot-online-partner-link.png
```

## Runtime Prompt: Lobby Operation Poster Atlas

```text
Use case: stylized-concept
Asset type: wide landscape sprite atlas for ProjectAuto lobby operation cards.
Primary request: Create one single horizontal sprite atlas composed of four equal wide landscape cards in a row. Each card is a 2.34:1 mission poster with a metallic mobile game frame, cinematic diorama, and a quiet dark lower-left text-safe zone for DOM Korean title overlays.
Cells left to right: first rescue operation with teal signal core and partner rescue beacon; boss final-hit operation with red-black corruption boss and gold/teal strike energy; comeback rescue operation with damaged partner beacon restored by cyan rescue beam; boss response operation with looming boss portal and prepared player towers.
Style/medium: high-end 2D Korean mobile game UI art, ProjectAuto reboot toy-board sci-fi tower defense, polished graphite metal, teal signal glow, amber charge, coral danger accents, gold sparks.
Constraints: no text, letters, numbers, logos, watermark, dice, casino UI, website cards, or copied commercial UI.
Postprocess: crop the generated atlas to the strongest 1720x184 landscape strip, convert to RGBA PNG, and use four 430x184 runtime cells.
Runtime files:
- docs/design/generation/source/reboot/style-lock/20260516-lobby-operation-posters-imagegen.png
- src/client/assets/generated/reboot-lobby-operation-posters.png
```

## Runtime Prompt: Lobby Operation Title Plate

```text
Use case: stylized-concept
Asset type: transparent mobile game UI nameplate for ProjectAuto lobby operation cards.
Primary request: Create a single horizontal Korean mobile game operation-title nameplate with no text, on a perfectly flat solid #00ff00 chroma-key background for background removal.
Composition: one centered ornate sci-fi/fantasy metal title frame, wide landscape ratio about 4:1, generous alpha-safe padding, dark teal glass center panel with high contrast for overlaid Korean operation titles. No decorative object may cross the central text-safe zone.
Style/medium: polished shipped Korean mobile game UI, teal energy glass, brushed gunmetal, gold trim, small orange/blue gem lights, crisp bevels, painterly rendered PNG game asset. Match the ProjectAuto rescue relay tower-defense art set.
Constraints: no letters, numbers, symbols, placeholder text, watermark, logo, cast shadow, reflection, floor plane, website card, or casino UI. Keep the chroma background perfectly flat and do not use #00ff00 inside the subject.
Postprocess: remove chroma key with soft matte, trim to alpha bounds, add transparent padding, and resize to 768x200 RGBA runtime PNG.
Runtime files:
- docs/design/generation/source/reboot/style-lock/20260521-lobby-operation-title-plate-chromakey-imagegen.png
- src/client/assets/generated/reboot-lobby-operation-title-plate-v1.png
```

## Runtime Prompt: Splash Season Badge

```text
Use case: stylized-concept
Asset type: transparent mobile game UI badge for ProjectAuto splash screen.
Primary request: Create one compact premium season badge frame with no text, on a perfectly flat solid #00ff00 chroma-key background for background removal.
Composition: horizontal badge ratio about 3:1, centered ornate sci-fi/fantasy metal badge, transparent-safe padding, dark teal glass center panel sized for overlaid Korean text "시즌 01". The frame must feel like shipped Korean mobile game UI chrome, not a website label.
Style/medium: polished ProjectAuto rescue relay toy-board tower-defense UI, graphite metal, gold trim, teal inner glow, crisp bevels, small amber/blue gem lights, painterly rendered PNG game asset. Match the splash title plate and lobby operation title plate.
Constraints: no letters, numbers, symbols, placeholder text, watermark, logo, cast shadow, reflection, floor plane, website card, casino UI, or flat CSS pill. Keep the chroma background perfectly flat and do not use #00ff00 inside the subject.
Postprocess: remove chroma key with soft matte, trim to alpha bounds, add transparent padding, and resize to 512x150 RGBA runtime PNG.
Runtime files:
- docs/design/generation/source/reboot/style-lock/20260521-splash-season-badge-chromakey-imagegen.png
- src/client/assets/generated/reboot-splash-season-badge-v1.png
```

## Runtime Prompt: Combat Operation Badge

```text
Use case: stylized-concept
Asset type: transparent mobile game UI badge for ProjectAuto combat HUD operation title.
Primary request: Create one compact horizontal operation-title badge frame with no text, on a perfectly flat solid #00ff00 chroma-key background for background removal.
Composition: one left-HUD nameplate for a portrait Korean mobile co-op tower-defense combat screen, with a small integrated circular emblem socket on the left and a dark teal glass center panel for overlaid Korean operation title/status copy. The badge must remain readable when displayed around 120x34 CSS pixels.
Style/medium: polished ProjectAuto rescue relay toy-board tower-defense UI, graphite metal, teal inner glow, small gold trim, amber/blue gem lights, crisp bevels, painterly rendered PNG game asset. Match the splash season badge, lobby operation title plate, and combat HUD chrome.
Constraints: no letters, numbers, symbols, placeholder text, watermark, logo, cast shadow, reflection, floor plane, website card, CSS pill, casino UI, or flat browser label. Keep the chroma background perfectly flat and do not use #00ff00 inside the subject.
Postprocess: remove chroma key with soft matte, trim to alpha bounds, add transparent padding, and resize proportionally to 640x175 RGBA runtime PNG.
Runtime files:
- docs/design/generation/source/reboot/style-lock/20260521-combat-operation-badge-chromakey-imagegen.png
- src/client/assets/generated/reboot-combat-operation-badge-v1.png
```

## Runtime Prompt: Combat Meter Sockets V2

```text
Use case: stylized-concept
Asset type: project-bound transparent-background three-cell combat resource meter socket atlas for ProjectAuto battle HUD.
Primary request: Create three premium mobile game HUD meter sockets that replace small web-like resource chips in the portrait battle screen. They must look like generated in-game hardware modules fitted into the combat HUD, not CSS pills.
Canvas/layout: three side-by-side horizontal meter sockets on a perfectly flat solid #00ff00 chroma-key background. Each socket must be separated with generous padding and have a dark readable glass center area for overlaid Korean labels and values. Cell 1 represents amber electric charge/energy. Cell 2 represents cyan rescue/link capacity. Cell 3 represents coral danger/threat. No readable text inside the art.
Style: high-end Korean mobile game sci-fi toy-board UI, dark graphite metal, cyan glass, amber/coral signal cores, small bevel details, compact commercial-game readability at 390px portrait width, consistent with ProjectAuto battle backdrop, combat operation badge, and command console assets.
Transparency/chroma constraints: background must be one uniform #00ff00 with no shadows, gradients, texture, reflections, floor plane, or lighting variation. Keep socket pixels separated from the background. Do not use #00ff00 inside the sockets.
Avoid: words, letters, numbers, logos, watermark, flat browser badges, CSS pills, SaaS dashboard meters, full opaque rectangular panels, dice/casino cues, copied existing games, noisy fake text, unreadable thin linework.
Runtime source: docs/design/generation/source/reboot/style-lock/20260522-combat-meter-sockets-v2-chromakey-imagegen.png
Runtime file: src/client/assets/generated/reboot-combat-meter-sockets-v2.png
Postprocess: remove the green chroma-key to alpha with soft matte/despill, crop each socket to its non-transparent bounds, fit into a 768x128 transparent atlas with three 256x128 cells, and preserve dark glass fill areas under each frame for Korean label/value readability.
Acceptance: the top battle HUD `전력`, `구원`, and `위험` meters read as compact generated combat hardware sockets; they remain legible at 320px, 375px, 390px, and 430px portrait widths and no longer look like HTML status chips.
```

## Runtime Prompt: Dual Crisis Cutin

```text
Use case: stylized-concept
Asset type: ProjectAuto runtime combat cut-in banner, final crop is 390x128.
Primary request: Create one high-end Korean mobile sci-fi tower-defense crisis banner for a portrait game screen. It represents two simultaneous threats: the partner board is in danger and a boss is approaching, but the visual priority is a rescue response.
Composition: wide cinematic horizontal banner, no text. Left third has a compact partner board rescue beacon with teal shield pulse and urgent warm red rim. Center has a bright teal rescue link core as the focal point. Right third has a distant red boss silhouette or portal alarm as secondary priority. Use layered glass, polished metal frame fragments, teal-gold energy, and warm red warning accents.
Style/medium: polished 2D mobile game UI art, consistent with ProjectAuto reboot assets, tactile glossy metal/glass, compact, premium, dramatic but not noisy.
Constraints: no words, letters, numbers, watermark, casino/dice/gacha imagery, copied game UI, or flat web-card rectangles.
Postprocess: resize/crop generated image to 390x128 runtime PNG.
Runtime files:
- docs/design/generation/source/reboot/style-lock/20260515-dual-crisis-cutin-imagegen.png
- src/client/assets/generated/reboot-dual-crisis-cutin.png
```

## Runtime Postprocess: UI Frame Alpha Cleanup

```text
Scope: generated UI frame assets that were created by imagegen with usable frame art but baked a dark rectangular background into the PNG.
Runtime files:
- src/client/assets/generated/reboot-result-panel-frame.png
- src/client/assets/generated/reboot-result-action-buttons.png
- src/client/assets/generated/reboot-result-detail-strips.png
- src/client/assets/generated/reboot-meta-row-frames.png
- src/client/assets/generated/reboot-result-copy-plates.png
- src/client/assets/generated/reboot-combat-action-buttons.png
- src/client/assets/generated/reboot-combat-status-plates.png
- src/client/assets/generated/reboot-meta-action-buttons.png
- src/client/assets/generated/reboot-meta-mini-badges.png
- src/client/assets/generated/reboot-launch-buttons.png
- src/client/assets/generated/reboot-launch-primary.png
- src/client/assets/generated/reboot-launch-secondary.png
- src/client/assets/generated/reboot-lobby-intel-strips.png
- src/client/assets/generated/reboot-lobby-intel-gems.png
- src/client/assets/generated/reboot-lobby-intel-next.png
Source files remain the committed imagegen sources under docs/design/generation/source/reboot/style-lock/.
Postprocess command pattern: run remove_chroma_key.py with --auto-key border --soft-matte --transparent-threshold 18 --opaque-threshold 210 --despill, then visually verify at 390x844.
Acceptance: all four corners alpha < 10, soft alpha coverage stays within the frame-specific test ranges, and stable lobby/meta/result screenshots no longer show a full black web-card rectangle behind generated UI chrome.
Reason: these assets are still imagegen-authored game UI art, but the runtime PNG must expose straight alpha so the app reads as one layered mobile game scene instead of stacked HTML/CSS cards.
```

## Runtime Prompt: Result Outcome Stage

```text
Use case: stylized-concept
Asset type: project-bound transparent-feel PNG source for a mobile game result outcome stage atlas, later cropped to 780x180 with two equal 390x180 cells.
Primary request: Create one wide horizontal two-panel sprite atlas for a polished Korean portrait mobile cooperative tower-defense game result screen. Left half is victory: five cute premium sci-fi toy defenders around a golden teal signal trophy, celebratory sparks and warm confetti, heroic but compact. Right half is defeat/retry: the same signal platform dimmed, a cracked red boss gate silhouette in the background, repair beacons glowing, determined comeback mood rather than scary gore.
Composition: exactly two side-by-side panels in one wide image, each panel has a centered diorama that reads clearly when scaled small; leave soft empty space at bottom for overlaid UI title; no hard rectangular cards or web panels.
Style: shipped mobile game UI key art, glossy 2.5D toy-mech sci-fi, teal energy plus amber gold accents, consistent with existing Signal Relay assets, premium Korean mobile game reward screen art.
Background for transparency processing: perfectly flat solid #ff00ff chroma-key background behind all subjects. The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation. Keep all subjects fully separated from the background with crisp edges and generous padding. Do not use #ff00ff anywhere in the subjects.
Avoid: any words, letters, numbers, logos, watermarks, dice, casino/gacha imagery, copied game UI, flat CSS rectangles, website card shapes, excessive darkness, gore, realistic humans.
Runtime source: docs/design/generation/source/reboot/style-lock/20260515-result-hero-stage-imagegen.png
Runtime file: src/client/assets/generated/reboot-result-hero-stage.png
Postprocess: remove #ff00ff chroma key with soft matte/despill, split the generated source into left/right halves, fit each half into a transparent 390x180 cell, then composite a 780x180 atlas.
Acceptance: result panel header shows a victory/defeat diorama behind the generated badge without adding a web card, text remains readable, both cells have alpha and no baked magenta background.
```

## Runtime Prompt: Enemy Track Trails

```text
Use case: stylized-concept
Asset type: project-bound transparent-feel PNG source for a mobile portrait cooperative tower-defense enemy track contact atlas, later cropped to 1024x128 with four equal 256x128 cells.
Primary request: Create one wide horizontal four-panel sprite atlas for a polished Korean portrait mobile cooperative tower-defense game. Each panel is a ground-contact shadow and motion trail that sits UNDER an enemy sprite on a sci-fi arena track, making the enemy feel physically attached to the map.
Panels left to right: 1. small teal-black oval contact shadow with faint cyan scanline dust for normal shard enemies. 2. quick enemy streak: narrow cyan speed smear and tiny sparks, readable but subtle. 3. heavy enemy wake: wider amber-teal weight shadow, dust vibration, compact shock ripple. 4. mini-boss contact: larger red-teal ominous aura ring with heavy shadow and short cracked-energy pulse.
Composition: exactly four side-by-side cells in one wide image, each cell centered with generous transparent padding; no backgrounds, no floor plane, no rectangular cards, no UI panels, no text. The art should be low and horizontal, designed to be drawn beneath enemy sprites at phone scale.
Style: shipped mobile game VFX sprite art, glossy 2.5D sci-fi toy-mech world, teal energy plus amber gold accents with one red boss variant, consistent with Signal Relay assets. Soft antialiasing, crisp silhouette, premium game polish.
Background for transparency processing: perfectly flat solid #ff00ff chroma-key background behind all subjects. The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation. Keep all VFX subjects fully separated from the background with crisp edges and generous padding. Do not use #ff00ff anywhere in the subjects.
Avoid: any words, letters, numbers, logos, watermarks, dice, casino/gacha imagery, copied game UI, square icons, character bodies, enemy bodies, large vertical explosions, realistic humans, gore.
Runtime source: docs/design/generation/source/reboot/style-lock/20260516-enemy-track-trails-chromakey-imagegen.png
Runtime file: src/client/assets/generated/reboot-enemy-track-trails.png
Postprocess: remove #ff00ff chroma key with soft matte/despill, split the generated source into four cells, trim each cell to alpha bounds, fit into transparent 256x128 cells, then composite a 1024x128 atlas.
Acceptance: every enemy type receives a distinct ground contact trail drawn under the sprite, atlas corners are transparent, and enemies read as map objects rather than floating UI icons.
```

## Runtime Prompt: Enemy Impact Bursts

```text
Use case: stylized-concept
Asset type: project-bound transparent-feel PNG source for a mobile portrait cooperative tower-defense enemy hit impact atlas, later cropped to 768x160 with three equal 256x160 cells.
Primary request: Create one wide horizontal three-panel sprite atlas for a polished Korean portrait mobile cooperative tower-defense game. Each panel is a compact hit-contact burst drawn ON TOP OF an enemy sprite at the exact damage point, making each attack feel tactile and satisfying without becoming a long screen-wide beam.
Panels left to right: 1. normal hit: small cyan-white spark ring with tiny teal shards and a soft radial pulse. 2. heavy hit: amber-teal impact bloom with short angular shock fragments and a compact pressure ripple. 3. boss hit: larger red-teal shield crack burst, bright core, short radial energy scratches, premium clutch impact but still compact.
Composition: exactly three side-by-side cells in one wide image, each cell centered with generous transparent padding; no backgrounds, no floor plane, no rectangular cards, no UI panels, no text. The art should fit around enemy sprites at phone scale and remain readable at 32-70px.
Style: shipped mobile game VFX sprite art, glossy 2.5D sci-fi toy-mech world, teal energy plus amber gold accents with one red boss variant, consistent with Signal Relay assets. Crisp silhouette, soft antialiasing, luminous but not overexposed.
Background for transparency processing: perfectly flat solid #ff00ff chroma-key background behind all subjects. The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation. Keep all VFX subjects fully separated from the background with crisp edges and generous padding. Do not use #ff00ff anywhere in the subjects.
Avoid: any words, letters, numbers, logos, watermarks, dice, casino/gacha imagery, copied game UI, square icons, character bodies, enemy bodies, long horizontal beams, full-screen explosions, realistic humans, gore.
Runtime source: docs/design/generation/source/reboot/style-lock/20260516-enemy-impact-bursts-chromakey-imagegen.png
Runtime file: src/client/assets/generated/reboot-enemy-impact-bursts.png
Postprocess: remove #ff00ff chroma key with soft matte/despill, split the generated source into three cells, trim each cell to alpha bounds, fit into transparent 256x160 cells, then composite a 768x160 atlas.
Acceptance: every hit lands with a compact generated contact burst at the target point, normal/heavy/boss hits read differently, and the effect never becomes a screen-wide beam or CSS-drawn flash.
```

## Runtime Prompt: Combat Cooldown Shutters

```text
Use case: stylized-concept
Asset type: project-bound source image for a transparent-feel PNG atlas used as combat command cooldown shutter overlays in a portrait Korean cooperative tower-defense mobile game. The final runtime atlas will be cropped to 1170x112 with three equal 390x112 cells.
Primary request: Create one wide horizontal three-panel sprite atlas. Each panel is a premium sci-fi command button cooldown shutter overlay that sits ON TOP OF an existing long command button when the command is charging or unavailable. It should make the disabled state feel like a mechanical game-console lockout, not a web disabled fade.
Panels left to right: 1. summon cooldown: amber-gold energy capacitor shutter with short diagonal metal slats and small cyan charge vents. 2. merge cooldown: teal-blue relay shutter with interlocking hex panels and short glowing circuit rails. 3. rescue cooldown: cyan-mint emergency shutter with protective shield shutters, small red warning accents, and compact charge ticks.
Composition: exactly three side-by-side long horizontal cells. Each cell is centered, wide, and low, shaped like a transparent overlay for a rounded sci-fi button. Leave transparent-feel padding around the overlay. No text, no numbers, no icons, no full button backgrounds, no rectangular card, no UI labels. The overlay should be semi-open in the center so Korean button text underneath remains readable.
Style: shipped mobile game UI sprite art, glossy 2.5D sci-fi toy-mech command console, metallic charcoal frames, teal/cyan energy, amber highlights, crisp silhouette, anti-aliased edges, polished but compact. Consistent with Signal Relay assets.
Background for transparency processing: perfectly flat solid #ff00ff chroma-key background behind all subjects. The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation. Keep all overlay subjects fully separated from the background with crisp edges and generous padding. Do not use #ff00ff anywhere in the subjects.
Avoid: any words, letters, numbers, logos, watermarks, dice, casino/gacha imagery, copied game UI, full button plates that hide the existing button, opaque black rectangles, long screen-wide beams, characters, enemies, realistic humans.
Runtime source: docs/design/generation/source/reboot/style-lock/20260516-combat-cooldown-shutters-chromakey-imagegen.png
Runtime file: src/client/assets/generated/reboot-combat-cooldown-shutters.png
Postprocess: remove #ff00ff chroma key with soft matte/despill, split the generated source into three cells, trim each cell to alpha bounds, fit each cell into a transparent 390x112 runtime cell, then composite a 1170x112 atlas.
Acceptance: disabled-but-unlocked combat commands receive generated mechanical cooldown shutters, Korean command labels remain readable, locked unearned commands still use the quieter socket atlas, and the command dock no longer depends on a web-style disabled fade.
```

## Runtime Prompt: Combat Action Stamps

```text
Use case: stylized-concept
Asset type: project-bound transparent-feel PNG source for a compact combat action success stamp atlas in a portrait Korean cooperative tower-defense mobile game. The final runtime atlas will be cropped to 768x128 with three equal 256x128 cells.
Primary request: Create one wide horizontal three-panel sprite atlas. Each panel is a compact premium action-success stamp that briefly appears over the battlefield after a player command succeeds, replacing a large instructional banner. The stamp should feel tactile and celebratory while covering very little of the game map.
Panels left to right: 1. summon success stamp: amber-gold capacitor spark badge with cyan relay pulse and a tiny mechanical bracket. 2. merge success stamp: teal-blue interlocking hex badge with a short upward energy join and small gold rivets. 3. rescue success stamp: cyan-mint shield pulse badge with compact red emergency accent and protective ring.
Composition: exactly three side-by-side cells, each centered in its 256x128 cell with generous transparent padding. Each stamp should be compact, about 70 percent cell width and 55 percent cell height, with an open center/side space where code-rendered Korean text can sit. No text, no numbers, no icons that look like letters, no full-width banner, no rectangular web card, no character or enemy body.
Style: shipped mobile game VFX/UI sprite art, glossy 2.5D sci-fi toy-mech command feedback, metallic charcoal micro-frame, teal/cyan energy, amber highlights, crisp silhouette, anti-aliased edges, polished but small. Consistent with Signal Relay assets.
Background for transparency processing: perfectly flat solid #ff00ff chroma-key background behind all subjects. The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation. Keep all stamp subjects fully separated from the background with crisp edges and generous padding. Do not use #ff00ff anywhere in the subjects.
Avoid: any words, letters, numbers, logos, watermarks, dice, casino/gacha imagery, copied game UI, full-width long banners, opaque black rectangles, screen-covering panels, characters, enemies, realistic humans.
Runtime source: docs/design/generation/source/reboot/style-lock/20260516-combat-action-stamps-chromakey-imagegen.png
Runtime file: src/client/assets/generated/reboot-combat-action-stamps.png
Postprocess: remove #ff00ff chroma key with soft matte/despill, split the generated source into three cells, trim each cell to alpha bounds, fit each stamp into a transparent 256x128 runtime cell, then composite a 768x128 atlas.
Acceptance: successful summon/merge/rescue feedback uses compact generated stamps instead of a large battlefield-covering banner, Korean result copy remains readable, and combat map visibility is preserved during frequent actions.
```

## Runtime Prompt: Shop Banner V2

```text
Use case: stylized-concept
Asset type: project-bound mobile game shop showcase banner background, final runtime crop is 430x160.
Primary request: Create a polished Korean mobile game cosmetic shop showcase background for a vertical cooperative tower defense game. It should look like a premium toy-board sci-fi store display, not a web panel.
Composition: wide 43:16 landscape composition. Central-left pedestal stays visually clear for a foreground item icon. Right side has colorful cosmetic capsules and reward bottles. Bottom has a subtle counter shelf. No text, no labels, no logos.
Style: shipped mobile game UI scene art, glossy 2.5D toy-mech sci-fi store, teal glass, amber-gold trim, bright collectible capsules, crisp readable shapes at phone size.
Avoid: black silhouette product placeholders, locked shadow tanks, pure black item tubes, large empty dark left panel, CSS-like gradients, words, letters, numbers, watermarks, casino/gacha imagery, copied game UI.
Runtime source: docs/design/generation/source/reboot/style-lock/20260519-shop-banner-v2-imagegen.png
Runtime file: src/client/assets/generated/reboot-shop-banner-v2.png
Postprocess: resize the generated 2055x765 source to 430x160 and normalize the runtime PNG to RGBA.
Acceptance: the shop featured area reads as a premium cosmetic display even before Korean text is read, foreground shop cosmetic sprites remain clear over the pedestal, and the banner no longer contributes black silhouette shapes behind purchase items.
```

## Runtime Prompt: Meta Showcase Copy Plates

```text
Use case: stylized-concept
Asset type: project-bound transparent-background UI atlas source for a portrait Korean mobile co-op tower-defense game.
Primary request: Create one wide horizontal 2-cell atlas of premium in-game showcase nameplates for ProjectAuto. The final asset will sit behind Korean title/detail text on the Unit Upgrade and Shop featured showcase panels.
Canvas/layout: one single wide image, exactly two side-by-side cells of equal width. Left cell is the Unit Upgrade nameplate. Right cell is the Shop cosmetic nameplate. Each cell must contain a compact ornate sci-fi toy-board UI nameplate frame with generous empty readable center space for text overlay.
Style: high-end Korean mobile game UI, collectible toy-board defense, dark brushed metal, cyan glass tubes, teal glow, amber bolts, small gold trim, beveled embossed frame, premium but not noisy. Strong silhouette at phone size.
Left cell treatment: training/lab identity, teal-cyan signal energy, clean engineering frame, subtle blue crystal accents.
Right cell treatment: premium shop identity, warmer gold/teal trim, small display-case jewels, cosmetic showcase feel.
Transparency processing background: perfectly flat solid #ff00ff chroma-key background behind all subjects. The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation. Keep the two nameplates fully separated from the background with crisp edges and generous padding. Do not use #ff00ff anywhere in the nameplates.
Avoid: no text, no numbers, no letters, no logos, no watermark, no character art, no product icons, no full opaque rectangles, no web card look, no CSS gradient look.
Runtime source: docs/design/generation/source/reboot/style-lock/20260519-meta-showcase-copy-plates-chromakey-imagegen.png
Runtime file: src/client/assets/generated/reboot-meta-showcase-copy-plates.png
Postprocess: remove #ff00ff chroma key with soft matte/despill, split source into two cells, trim each cell to alpha bounds, fit each cell into a transparent 430x160 runtime slot, then composite an 860x160 atlas.
Acceptance: featured unit/shop title copy sits on generated game nameplates instead of floating directly on banner art; the two cells keep transparent corners, distinct training/shop identity, and a readable center plate at phone scale.
```

## Runtime Prompt: Meta Screen Title Wordmarks

```text
Use case: stylized-concept
Asset type: project-bound transparent Korean mobile game UI title wordmark atlas for ProjectAuto meta screens; final runtime will be sliced into four equal horizontal cells.
Primary request: Create one polished premium mobile game title wordmark atlas on a perfectly flat solid #00ff00 chroma-key background. The atlas must contain exactly four separate Korean title wordmarks, arranged left to right in four equal cells: "유닛", "상점", "미션", "시즌".
Style: match a high-quality Korean sci-fi toy-board cooperative tower-defense game: beveled metal letters, cream-white inner face, teal glow edges, small gold mechanical trim, compact readable silhouette, same visual language as a commercial mobile game title plate.
Composition: one row, four equal cells, each title centered in its cell with generous padding. No surrounding rectangular panel, no UI frame, no extra subtitles, no icons except tiny symmetric decorative bolts integrated into the lettering. Keep each wordmark independent and similar height.
Chroma key requirements: background must be one uniform #00ff00 with no shadows, gradients, texture, reflections, floor plane, or lighting variation. Do not use #00ff00 anywhere in the wordmarks. No cast shadow outside the wordmark edges, no watermark.
Text accuracy: Korean text must be exact and legible: 유닛 / 상점 / 미션 / 시즌. No English, no extra letters, no numbers.
Runtime source: docs/design/generation/source/reboot/style-lock/20260521-meta-title-wordmarks-chromakey-imagegen.png
Runtime file: src/client/assets/generated/reboot-meta-title-wordmarks-v1.png
Postprocess: remove chroma key with soft matte/despill, center-crop vertical transparent padding to 1200x170 after resize, and preserve four equal 300x170 cells.
Acceptance: collection/shop/mission/season screen titles read as generated Korean game wordmarks instead of browser h1 text, while the original Korean title text remains available to assistive tech.
```

## Runtime Prompt: Mission Command Board

```text
Use case: stylized-concept
Asset type: project-bound vertical mobile game UI background panel for the mission/objective screen.
Primary request: Create a premium sci-fi cooperative tower defense mission contract board. It should look like a high-end portrait mobile game screen panel, not a web card. No readable text.
Scene/backdrop: dark teal-black futuristic command room machinery with cyan energy tubes and warm gold accents, matching a polished Korean mobile game UI. The panel should include a prominent upper mission reward console and three large horizontal contract row bays below, each row with an empty circular reward socket on the left, a wide empty nameplate in the middle, and a compact empty action socket on the right.
Style/medium: crisp 2.5D game UI illustration, rendered mechanical metal, collectible RPG/tower-defense UI polish, high contrast edges.
Composition/framing: portrait 2:3 vertical panel, centered, generous safe margins, top command board occupies upper 28%, three mission rows occupy lower 60%, all sockets empty and readable when overlaid with external text/icons.
Lighting/mood: luminous cyan core lighting, amber/gold bevel highlights, premium arcade command-console feel.
Color palette: dark graphite metal, deep teal glass, cyan glow, small gold warning accents, no purple dominant palette.
Materials/textures: beveled metal, glass energy capsules, brushed panels, subtle scratches, light bloom only on edges.
Text: none. Do not include letters, numbers, logos, words, watermarks, UI labels, or fake readable text.
Constraints: single coherent game panel, no web-style rectangles, no cards-with-text, no character art, no large empty flat dark areas, leave the inner sockets clear for overlaid real UI. The image may be opaque; corners can blend into dark game background.
Avoid: gradients as the main design, flat CSS-looking panels, readable or fake text, rounded web cards, random icons inside the empty sockets, clutter that would block overlaid Korean UI.
Runtime source: docs/design/generation/source/reboot/style-lock/20260521-mission-command-board-imagegen.png
Runtime file: src/client/assets/generated/reboot-mission-command-board-v1.png
Postprocess: crop the generated 1024x1536 source to the central board area `(74, 58, 950, 1490)`, boost color/contrast/brightness for phone-scale readability, resize to 768x1152, apply a light unsharp mask, and use it as a single fitted background layer behind mission copy, reward icons, and row controls.
Acceptance: the mission screen reads as one generated operation board instead of floating HTML fragments; mission reward, three contract rows, and action sockets remain readable at 390x844 and compact portrait widths.
```

## Runtime Prompt: Meta Objective Command Slots

```text
Use case: stylized-concept
Asset type: project-bound transparent-background mission/season objective row state atlas for ProjectAuto.
Primary request: Create one premium Korean mobile game objective command slot atlas with four state cells for mission and season rows. The atlas replaces web-like repeated list rails with generated game slots.
Canvas/layout: source can be four stacked or four side-by-side cells on a perfectly flat #00ff00 chroma-key background. Each cell must contain one horizontal objective row frame with a left circular reward socket, a central empty objective nameplate/progress lane, and a right compact command bay. No text, letters, numbers, logos, or watermarks.
Cell order: locked/progress, ready/claimable, claimed/received, current/next target.
Style: high-end Korean mobile game UI, sci-fi toy-board cooperative tower defense, glossy dark graphite metal, teal/cyan glass energy, restrained amber gold trim, crisp bevels, readable at phone scale, matching ProjectAuto Signal Relay assets.
State treatments: locked is dim teal with a mechanical latch; ready is bright cyan with warm reward glow; claimed is subdued gold seal and stable cyan lights; current is cyan tracking brackets with small amber pointer accents.
Transparency/chroma constraints: background must be perfectly flat #00ff00 with no shadows, gradients, texture, reflections, floor plane, or lighting variation. Keep all slot pixels separated from the background. Do not use #00ff00 inside the slots.
Avoid: browser cards, flat CSS panels, plain rounded rectangles, full opaque slabs, casino/gacha/dice cues, random fantasy ornaments, clutter inside the center lane, fake text.
Runtime source: docs/design/generation/source/reboot/style-lock/20260522-meta-objective-command-slots-chromakey-imagegen.png
Runtime file: src/client/assets/generated/reboot-meta-objective-command-slots-v1.png
Postprocess: remove chroma key with soft matte/despill, split the four generated rows into state cells, resize each cell into a 512x384 transparent slot, compose a 2048x384 horizontal atlas, then boost contrast/color and sharpen lightly for compact portrait readability.
Acceptance: mission and season rows read as stateful generated objective slots with clear reward socket, center progress lane, and command bay; the rows no longer look like empty web list rails, and current/ready/claimed/locked states are visually distinct at 390x844.
```

## Runtime Prompt: Collection Training Board

```text
Use case: stylized-concept
Asset type: project-bound mobile game UI background board for ProjectAuto collection / unit upgrade screen, final runtime crop is portrait 768x1152, no text.
Primary request: Create a polished Korean mobile game unit training and upgrade board for a vertical cooperative tower defense app. It must look like one shipped mobile game screen panel, not a web page.
Scene/backdrop: dark teal-black sci-fi toy workshop command room, glossy graphite metal, teal glass energy tubes, warm amber gold accents, compact premium game UI.
Composition: portrait 2:3. Upper 34% contains one large hero unit upgrade pedestal on the left and a clean empty nameplate / command socket area on the right. Middle has a strong mechanical divider. Lower 55% contains a 2-column by 3-row unit roster shelf with six empty toy-unit sockets / display wells, each with small status gem space and tiny cost socket areas. Leave the bottom 12% calmer/darker so an app navigation dock can sit over it. No text, no numbers, no letters, no logos.
Style: high-end 2.5D mobile game UI art, glossy painted toy-mech metal, crisp bevels, readable silhouettes at phone size, consistent with ProjectAuto Signal Relay assets, teal/cyan energy plus restrained amber reward glow.
Avoid: HTML cards, flat vector UI, browser dashboard layout, random fantasy, dice, copied existing games, text, words, labels, watermarks, overly busy noise, black rectangular card backgrounds.
Runtime source: docs/design/generation/source/reboot/style-lock/20260521-collection-training-board-imagegen.png
Runtime file: src/client/assets/generated/reboot-collection-training-board-v1.png
Postprocess: center-crop to 2:3 if needed, resize to 768x1152, boost color/contrast/brightness for phone-scale readability, apply light unsharp mask, and use as a single fitted background behind the featured unit and roster shelf.
Acceptance: the collection screen reads as one generated training board instead of a banner stacked above a web-like catalog; featured unit pedestal, roster sockets, and action/cost labels remain readable at 390x844 and compact portrait widths.
```

## Runtime Prompt: Shop Display Board

```text
Use case: stylized-concept
Asset type: project-bound mobile game UI background board for ProjectAuto cosmetic shop screen, final runtime crop is portrait 768x1152, no text.
Primary request: Create a polished Korean mobile game cosmetic shop display board for a vertical cooperative tower defense app. It must look like one shipped mobile game shop screen panel, not a web page.
Scene/backdrop: premium sci-fi toy store inside a dark teal command room, glossy graphite metal, cyan glass, amber gold trim, collectible capsule lights, clean display-case depth.
Composition: portrait 2:3. Upper 34% contains one large featured cosmetic display pedestal on the left and a clean empty product nameplate / purchase socket area on the right. Middle has a mechanical counter divider. Lower 55% contains a 2-column by 3-row shop shelf with six empty display cases / item pedestals, each with small gem-price socket and status gem space. Leave the bottom 12% darker and calmer for an app navigation dock overlay. No text, no numbers, no letters, no logos.
Style: high-end 2.5D mobile game UI art, premium Korean mobile shop screen, glossy metal and glass, crisp bevels, readable at phone size, teal/cyan energy with restrained amber reward glow, consistent with ProjectAuto Signal Relay assets.
Avoid: HTML cards, flat vector UI, browser dashboard layout, real-money symbols, dollar signs, random fantasy, dice, copied existing games, text, words, labels, watermarks, overly busy noise, black rectangular card backgrounds.
Runtime source: docs/design/generation/source/reboot/style-lock/20260521-shop-display-board-imagegen.png
Runtime file: src/client/assets/generated/reboot-shop-display-board-v1.png
Postprocess: center-crop to 2:3 if needed, resize to 768x1152, boost color/contrast/brightness for phone-scale readability, apply light unsharp mask, and use as a single fitted background behind the featured cosmetic and shop shelf.
Acceptance: the shop screen reads as one generated store display board instead of a banner stacked above web-like item cards; featured item pedestal, display cases, and purchase state labels remain readable at 390x844 and compact portrait widths.
```

## Runtime Prompt: Result Reward Command Board

```text
Use case: stylized-concept
Asset type: project-bound transparent-background reward command board for a portrait Korean mobile cooperative tower-defense game result screen.
Primary request: Create one wide premium in-game reward command board for ProjectAuto. The board will sit behind the result screen reward icon, earned currency chips, and claim payoff copy. It must look like a shipped mobile game loot console, not a web card.
Canvas/layout: one horizontal board on a perfectly flat solid #00ff00 chroma-key background. Compose as a single 1024x320 source with generous transparent-safe padding. Left side contains a large circular empty loot socket for a reward icon. Center/right contains a polished glass value plate with readable empty space for overlaid reward chips. Far right may include a small capsule/chest module and cyan power pipes.
Style: high-end Korean mobile game UI, sci-fi toy-board cooperative tower defense, dark graphite metal, teal/cyan glass, warm gold trim, collectible reward-machine finish, crisp silhouette at phone scale, matching the existing ProjectAuto style-lock assets.
Lighting/mood: concentrated cyan rim light and amber reward glow, strong bevels, premium chest-opening anticipation, no noisy texture behind overlaid text.
Transparency/chroma constraints: background must be one uniform #00ff00 with no shadows, gradients, texture, reflections, floor plane, or lighting variation. Keep board pixels separated from the background. Do not use #00ff00 inside the board.
Avoid: words, letters, numbers, logos, watermark, fake text, browser card borders, flat CSS gradient panels, full opaque rectangular backdrop, excessive purple, dice/gacha machine resemblance, clutter that blocks reward value text.
Runtime source: docs/design/generation/source/reboot/style-lock/20260522-result-reward-board-chromakey-imagegen.png
Runtime file: src/client/assets/generated/reboot-result-reward-board-v1.png
Postprocess: remove the green chroma-key to alpha with soft matte/despill, crop to the board bounds while preserving glow padding, fit into a 1024x320 transparent runtime image, then lightly boost contrast and sharpen for 390px portrait readability.
Acceptance: the result reward area reads as a generated loot console with a clear icon socket and reward value plate; it no longer looks like a plain text strip or CSS card, and it remains legible on compact portrait result screens.
```

## Runtime Prompt: Meta Shelf Nameplates

```text
Use case: stylized-concept
Asset type: project-bound transparent-background four-cell nameplate atlas for ProjectAuto collection/shop shelf labels, prices, roles, and passive states.
Primary request: Create four premium mobile game UI nameplates that replace web-like text ribbons on unit and shop shelf cards. They must read as in-game hardware labels fitted into a generated shop/collection shelf, not CSS badges.
Canvas/layout: four side-by-side horizontal plaques on a perfectly flat solid #00ff00 chroma-key background. Each plaque must have generous padding, crisp transparent-safe silhouette, and a dark readable inner glass area for overlaid Korean text. Cell 1 is a teal silver item-name plate. Cell 2 is a gold currency-price plate with a gem socket. Cell 3 is a compact cyan role tag with a relay emblem. Cell 4 is a dark locked/owned passive-state plate with a lock module.
Style: high-end Korean mobile game sci-fi toy-board UI, dark graphite metal, cyan glass, restrained amber/gold trim, small bevel details, readable at phone size, consistent with ProjectAuto Signal Relay meta shelf assets.
Transparency/chroma constraints: background must be one uniform #00ff00 with no shadows, gradients, texture, reflections, floor plane, or lighting variation. Keep plaque pixels separated from the background. Do not use #00ff00 in the plaques.
Avoid: words, letters, numbers, logos, watermark, browser pill badges, flat CSS gradients, full rectangular black boxes, dice/casino cues, copied existing games, noisy fake text, thin unreadable ornaments.
Runtime source: docs/design/generation/source/reboot/style-lock/20260522-meta-shelf-nameplates-chromakey-imagegen.png
Runtime file: src/client/assets/generated/reboot-meta-shelf-nameplates-v1.png
Postprocess: remove the green chroma-key to alpha with soft matte/despill, crop each plaque to its non-transparent bounds, fit into a 1024x256 transparent atlas with four 256x256 cells, and preserve dark glass fill areas under each frame for Korean text readability.
Acceptance: collection and shop card names, prices, roles, and passive states use generated nameplates with transparent surroundings; buttons still use command ribbons, while shelf labels no longer look like generic web badges.
```

## Runtime Prompt: Result Command Board

```text
Use case: stylized-concept
Asset type: project-bound transparent-background post-battle command board for a portrait Korean mobile cooperative tower-defense result screen.
Primary request: Create one unified premium post-battle command board for ProjectAuto. It must combine the reward payout bay, next-action command bay, and secondary return command bay into one shipped mobile game console so the result screen no longer reads like separate web cards.
Canvas/layout: wide 1024x430 board on a perfectly flat solid #00ff00 chroma-key background. Top half contains a large horizontal reward payout bay with a left loot socket, central chip/value plate, and right capsule module. Bottom half contains two command bays: a larger gold primary action bay on the left and a smaller cyan secondary command bay on the right. Leave clean transparent-safe negative space inside each bay for overlaid Korean UI labels and buttons. Keep the silhouette compact enough for a 390px-wide portrait result panel.
Style: high-end Korean mobile game result UI, dark graphite and gunmetal sci-fi relay console, cyan signal glass, warm amber/gold trim on primary action hardware, polished toy-board cooperative defense aesthetic, consistent with ProjectAuto Signal Relay style-lock assets.
Lighting/mood: premium victory/after-action payoff, crisp bevels, readable phone-scale rim light, concentrated reward glow without noisy texture behind text.
Transparency/chroma constraints: background must be one uniform #00ff00 with no shadows, gradients, texture, reflections, floor plane, or lighting variation. Keep board pixels separated from the background. Do not use #00ff00 inside the board.
Avoid: words, letters, numbers, logos, watermark, fake text, browser card borders, flat CSS gradient panels, full opaque rectangular backdrop, dice/casino cues, copied existing games, clutter that blocks reward chips or action labels, purple-heavy palette.
Runtime source: docs/design/generation/source/reboot/style-lock/20260522-result-command-board-chromakey-imagegen.png
Runtime file: src/client/assets/generated/reboot-result-command-board-v1.png
Postprocess: remove the green chroma-key to alpha with soft matte/despill, crop to the board bounds while preserving glow padding, fit into a 1024x430 transparent runtime image, then lightly boost contrast, color, and sharpness for 390px portrait readability.
Acceptance: the post-battle result area reads as one generated after-action console that visually connects earned rewards and the next command; retry/lobby actions feel embedded in game hardware instead of sitting below as generic web buttons.
```

## Runtime Prompt: Online Waiting Field Overlay

```text
Use case: stylized-concept
Asset type: transparent-background full-canvas online matchmaking field overlay for a portrait Korean mobile cooperative tower-defense battle screen.
Primary request: Create a premium generated co-op matchmaking field overlay for ProjectAuto. It appears only while the player waits for an online partner, before combat starts. It must turn the battlefield into an active relay-link scene instead of an idle empty map.
Canvas/composition: portrait 780x1240 image on a perfectly flat solid #00ff00 chroma-key background. Compose one vertical sci-fi relay bridge with an upper partner gate, lower player gate, and a strong cyan signal beam connecting them. Leave transparent-safe negative space around the center path so the existing HUD and cancel command can overlay without losing readability. No readable text.
Style: high-end Korean mobile cooperative tower-defense game art, dark graphite relay machinery, cyan/teal signal energy, restrained amber lock accents, polished 2.5D production rendering, crisp silhouettes at phone scale, consistent with ProjectAuto Signal Relay assets.
Transparency/chroma constraints: background must be perfectly flat #00ff00 with no shadows, gradients, texture, reflections, floor plane, or lighting variation. Keep all relay pixels separated from the background. Do not use #00ff00 inside the subject.
Avoid: words, letters, numbers, logos, watermark, browser modal, flat CSS panel, rectangular web card, plain spinner, dice/gacha/casino cues, copied existing games, over-bright center that blocks Korean waiting copy, full opaque background.
Runtime source: docs/design/generation/source/reboot/style-lock/20260522-online-waiting-field-chromakey-imagegen.png
Runtime file: src/client/assets/generated/reboot-online-waiting-field-v1.png
Postprocess: remove the green chroma-key to alpha with soft matte/despill, fit into a 780x1240 transparent runtime image, lightly boost contrast and sharpen for 390px portrait readability, then cover-draw over the battle canvas at partial alpha only during online waiting.
Acceptance: online waiting reads as an active generated co-op relay scene with visible upper/lower gates and signal bridge; it does not imply bot partner presence, does not show playable first-summon cues, and the bottom cancel command remains visible on compact portrait screens.
```

## Runtime Prompt: Partner Companion Standby Atlas

```text
Use case: stylized-concept
Asset type: transparent-background sprite atlas for a portrait mobile cooperative tower-defense game battle screen
Primary request: Create a premium Korean mobile game sci-fi/fantasy partner companion standby sprite atlas. The atlas should contain exactly two side-by-side cells on a perfectly flat solid #00ff00 chroma-key background for background removal.
Canvas/composition: 1024x512 image, two equal cells of 512x512. Each cell centered with generous padding and no crop. No readable text.
Cell 1 subject: friendly AI partner relay drone named "Lin" as a compact mechanical support companion, teal/cyan signal core, small gold accents, rounded sci-fi armor, hovering above a circular relay pedestal. It should read as a cooperative partner presence, not an enemy or shop item.
Cell 2 subject: online partner link portal / empty partner slot beacon, a paired relay socket with two small connected signal pillars and a soft cyan bridge, inviting another player to join.
Style: match high-end Korean mobile game production art, semi-realistic fantasy-tech metal/glass, teal cyan energy, dark gunmetal, gold trims, crisp silhouette readable at 80px, polished collectible game asset.
Transparency/chroma constraints: background must be perfectly flat #00ff00 with no shadows, gradients, texture, reflections, floor plane, or lighting variation. Keep all subject pixels separated from the background. Do not use #00ff00 anywhere in the subjects.
Avoid: words, letters, numbers, logos, watermark, dice, casino imagery, web UI cards, rectangular panel, human character, chibi mascot, blurry silhouette, black square background.
Runtime source: docs/design/generation/source/reboot/style-lock/20260522-partner-companion-standby-chromakey-imagegen.png
Runtime file: src/client/assets/generated/reboot-partner-standby-sigils-v2.png
Postprocess: split the generated source into two equal cells, remove the green chroma-key to alpha, crop each subject to its non-transparent bounds, fit into 512x512 cells on a 1024x512 transparent atlas, then lightly boost color/contrast for battle readability.
Acceptance: bot mode shows a large generated partner companion on the upper partner board before the bot acts; online waiting shows the second link-beacon cell without implying the bot partner is present; both states read as cooperative presence, not empty UI.
```

## Runtime Prompt: Lobby Co-op Defense Diorama

```text
Use case: stylized-concept
Asset type: mobile game lobby operation diorama, raster PNG source for a commercial portrait cooperative tower-defense game.
Primary request: Create one polished ProjectAuto lobby mini-diorama panel that instantly communicates two-player cooperative tower defense.
Scene/backdrop: dark graphite sci-fi toy-board arena viewed from a slightly elevated isometric angle, made for a compact phone UI card. A winding neon signal road runs through the center with two small transparent-looking enemy noise creatures advancing on the lane. At the bottom left and bottom right are two allied defense boards with collectible relay units firing short cyan/gold bolts toward the lane, showing co-op support between two players. Include small UI-like metal frame details, cyan glass, warm gold trim, Korean mobile game premium finish.
Composition: wide horizontal panel, no text, no logos, no numbers, no readable letters, no watermark. Leave upper-left and lower-right areas slightly calmer so existing UI copy can overlay. High contrast at small phone size, crisp silhouettes, layered depth, not a web card, not flat CSS, not a generic stock illustration.
Style: high-end Korean mobile game, sci-fi toy-board cooperative defense, dark graphite metal, cyan signal glass, warm amber/gold trim, collectible reward-machine polish, readable at 390px portrait scale, consistent with ProjectAuto style-lock assets.
Avoid: photoreal humans, big text, blank rectangles, flat gradients, browser UI, excessive purple/blue haze, blurry/cropped subject, web dashboard look.
Runtime source: docs/design/generation/source/reboot/style-lock/20260522-lobby-coop-diorama-imagegen.png
Runtime file: src/client/assets/generated/reboot-lobby-coop-diorama.png
Critical preview file: src/client/assets/generated/reboot-lobby-coop-diorama-preview.jpg
Postprocess: keep the generated source intact for archive, then resample to 1024px width for runtime without alpha conversion because the scene is a full-bleed rectangular diorama. Derive a 512px-wide JPEG preview for critical first paint; the lobby card uses that preview as its immediate background while the full PNG loads as the overlaid operation scene.
Acceptance: the first lobby screen reads as a cooperative tower-defense game before the player reads any copy; two allied boards, enemy lane, and attack exchange are visible at 390px portrait scale; no extra buttons or explanatory text are added.
```

## 후처리 기준

필수:

- 배경 제거
- straight alpha export; premultiplied alpha 금지
- alpha edge cleanup; outside subject bbox stray semi-transparent pixels <= 1% of cell pixels
- atlas cell alignment; final dimensions and cell dimensions exactly match the runtime atlas contract
- per-cell transparent pixel ratio matches the runtime atlas contract
- subject bounding box margin meets each atlas contract
- center/pivot deviation meets each atlas contract
- outline/rim consistency
- color correction to shared palette
- 24px/48px/64px proof sheet
- in-game screenshot proof at 375x812, 390x844, 430x932

자동/수동 QA 기준:

- `image.width` and `image.height` exactly equal the atlas contract.
- `image.width % cellWidth === 0` and `image.height % cellHeight === 0`.
- 각 cell을 독립 PNG로 slice했을 때 배경이 투명해야 한다.
- 24px, 48px, 64px proof sheet에서 5초 안에 역할을 말할 수 있어야 한다.
- 390x844 전투 화면에서 적은 track 위 위협체처럼 보여야 하며 UI 아이콘처럼 떠 있으면 실패다.
- 24px 아이콘은 텍스트 없이 소환/합성/구원 중 무엇인지 구분되어야 한다.

Reject 조건:

- 텍스트/숫자/워터마크가 보임
- 검은 사각형 배경이 남음
- 흰색/검은색 matte bleed가 outline 주변에 남음
- premultiplied alpha 때문에 어두운 halo가 생김
- 에셋이 카드처럼 보임
- 64px에서 유닛 역할이 구분되지 않음
- 적이 트랙 위 오브젝트가 아니라 UI 아이콘처럼 보임
- 색상만 다르고 실루엣이 같음
- 홈/전투/상점 화면에서 서로 다른 게임의 에셋처럼 보임
- 피사체가 잘림
- 부품이 비정상적으로 중복되거나 여분의 다리/손잡이/코어가 붙음
- 유닛과 적의 원근이 서로 다름
- edge가 흐리거나 저해상도 업스케일처럼 보임
- baked shadow box가 cell 전체를 덮음
- 더러운 반투명 배경이 남음
- atlas cell이 중복되거나 순서가 manifest와 다름
- 24px에서 pseudo-text, 문자처럼 보이는 장식, 숫자 같은 glyph가 보임

## 승인 체크리스트

- 홈 mockup이 웹페이지가 아니라 게임 준비실처럼 보인다.
- 전투 mockup에서 적 경로, 내 보드, 파트너 보드, 위험, 주 버튼이 보인다.
- 유닛 5종은 64px에서 실루엣으로 구분된다.
- 적 4종은 트랙 위 위협체처럼 보인다.
- 구원 beam은 양쪽 보드를 연결하는 사건처럼 보인다.
- 소환/합성/구원 아이콘은 24px에서 구분된다.
- 모든 에셋은 텍스트 없이 의미가 읽힌다.
- 생성 프롬프트와 후처리 기록이 메타데이터로 남는다.
