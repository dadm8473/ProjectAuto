# Signal Relay Asset Generation Guide

## Goal

Every visible unit, board surface, loop effect, and premium UI accent should look like one shipped mobile game. Generated assets must reinforce the game's distinct language: Signal loop, Relay devices, Heat, Link Pulse, Saturation, and partner rescue.

## Current Generated Assets

| asset | path | use |
|---|---|---|
| Art direction reference | `src/client/assets/generated/signal-relay-art-direction.png` | Renderer backdrop reference and visual consistency target |
| Playfield frame | `src/client/assets/generated/signal-relay-playfield-frame.png` | Live canvas background for the top board, central loop, and lower board composition |
| Relay icon atlas | `src/client/assets/generated/relay-unit-atlas.png` | 20 Relay icons in roster order |
| Enemy/Noise atlas | `src/client/assets/generated/noise-enemy-atlas.png` | Track Noise and boss sprites in 4x2 order; normalized to 1776x888 |
| Boss disruption atlas | `src/client/assets/generated/boss-disruption-atlas.png` | Boss Orchid, Boss Mirror, Origin Null event-feed cards; normalized to 2106x747 |
| UI icon atlas | `src/client/assets/generated/ui-icon-atlas.png` | Resource and action button icons in 4x3 order; normalized to 1256x1254 |

## Visual Rules

- Primary fantasy: two players stabilizing one luminous Signal loop through tactile Relay devices.
- Materials: dark ceramic panels, brushed metal trims, glass cores, heat vents, cable sockets, subtle holographic UI.
- Palette: charcoal base, teal Signal, amber Charge, coral Saturation/Heat danger, emerald repair, ivory text.
- Avoid: dice, casino pips, guardian statues, generic random-summon circles, chibi heroes, empty wireframes, huge marketing characters.
- UI density: compact, scan-friendly, production mobile game HUD. No landing page composition.
- Every Relay icon must be recognizable at 64px by silhouette before color.
- Text inside generated images should be avoided. UI text is rendered by code.

## Relay Atlas Order

The generated atlas is a 4 columns by 5 rows image. Code slices it by `atlasIndex` in this order:

1. Needle Beam
2. Prism Lance
3. Split Ray
4. Pulse Drum
5. Thunder Bowl
6. Storm Heart
7. Amber Field
8. Gravity Loom
9. Null Cage
10. Coolant Moss
11. Rain Pump
12. Root Clinic
13. Signal Amp
14. Bloom Amp
15. Aurora Amp
16. Sink Stone
17. Dusk Sink
18. Mirror Port
19. Twin Gate
20. Origin Seed

## Base Prompt: Screen Art Direction

```text
Use case: stylized-concept
Asset type: production reference image for a vertical mobile cooperative tower-defense game, to be used as visual direction for in-game UI, board art, and generated unit assets.
Primary request: Create a polished portrait mobile game art reference for a game called Signal Relay, a cooperative tower-defense board where two players stabilize a luminous signal loop. It should feel like a real shipped mobile game, not a mockup.
Scene/backdrop: vertical 9:16 mobile game screen composition with a central glowing signal loop arena, upper partner relay board, lower player relay board, compact resource meters, and restrained premium UI accents.
Subject: fantasy-tech relay devices, heat cores, signal cables, amber charge sparks, teal signal energy, coral danger saturation, emerald repair glow; no dice, no guardians, no summon-spam visual language.
Style: high-end Korean mobile game UI concept art, crisp readable game screen, painterly but clean, semi-realistic devices with tactile metal/glass materials, consistent lighting, dense but organized information.
Palette: deep charcoal base with teal, amber, coral, emerald, ivory text accents; avoid purple/blue gradient dominance, avoid beige/brown dominance.
Composition: portrait phone-safe, first viewport gameplay screen, central loop visible, partner/player co-op relationship obvious, controls implied at bottom, no marketing hero, no large explanatory text.
Quality: polished production art, cohesive visual system, sharp edges, high detail, usable as art direction reference.
Avoid: dice, casino icons, generic card game, copy of any existing game, chibi mascots, stock UI, giant hero character, empty MVP wireframe, unreadable tiny text, watermarks.
```

## Base Prompt: Playfield Frame

```text
Use case: stylized-concept
Asset type: project-bound in-game playfield background for a vertical mobile cooperative tower-defense game canvas.
Primary request: Create a polished playable 390:500 portrait game playfield background for Signal Relay. It must be usable behind live canvas UI, with no text and no labels.
Scene/backdrop: compact vertical gameplay board: upper partner relay board area, central circular signal loop arena, lower player relay board area, dark mechanical stone/metal floor, teal signal cables, amber charge conduits, coral danger lane accents.
Subject: two empty 4x3 relay socket boards with beveled square-ish socket plates, a central circular signal track with a crystal core, small mechanical pylons around the loop, subtle side machinery, premium mobile game frame edges.
Style/medium: high-end Korean mobile game production background art, fantasy-tech, semi-realistic metal/glass devices, crisp readable mobile game surfaces, not a mockup.
Composition/framing: exact portrait playfield composition, top 25% partner board, middle 35% circular loop arena, bottom 25% player board, safe empty spaces where live UI text and sprites can be rendered by code, no embedded buttons.
Lighting/mood: luminous teal signal glow, amber energy highlights, restrained coral danger glow, deep charcoal base, ivory edge highlights.
Color palette: charcoal/black ceramic, teal, amber, coral, emerald, ivory; avoid purple dominance, beige dominance, casino/dice/card language.
Materials/textures: brushed metal trims, glass cores, cable sockets, stone-metal plates, beveled panel seams, subtle holographic glow.
Constraints: no text, no words, no letters, no numbers, no watermark, no dice, no cards, no characters, no UI copy. The image must read as a game screen background and align with live overlay elements.
Avoid: marketing hero art, giant characters, chibi, random summon circles, empty wireframe, blurry dark atmosphere, copied game UI.
```

## Base Prompt: Relay Icon Atlas

```text
Use case: stylized-concept
Asset type: 4x5 relay unit icon atlas for a vertical mobile cooperative tower-defense game; project-bound bitmap asset.
Primary request: Create 20 distinct fantasy-tech Relay device icons in one clean 4 columns by 5 rows sprite-sheet style image for Signal Relay. Each cell should contain one centered device, no labels or text.
Subject list by row order: Needle Beam, Prism Lance, Split Ray, Pulse Drum, Thunder Bowl, Storm Heart, Amber Field, Gravity Loom, Null Cage, Coolant Moss, Rain Pump, Root Clinic, Signal Amp, Bloom Amp, Aurora Amp, Sink Stone, Dusk Sink, Mirror Port, Twin Gate, Origin Seed.
Style: cohesive premium mobile game unit icons, semi-realistic small machines, glass cores, metal trims, readable silhouettes, consistent top-left key light, no characters, no dice, no guardian statues.
Background: each icon on a dark neutral square tile with subtle rim light and no text; make grid gutters visible enough for slicing.
Palette: charcoal base with teal signal energy, amber charge, coral danger, emerald repair, ivory highlights; varied enough that each device is recognizable.
Composition: perfectly aligned 4x5 grid, equal cell sizes, generous padding, square overall image, crisp icon silhouettes.
Quality: shipped-game asset atlas, high detail but readable at 64px.
Avoid: words, letters, numbers, dice pips, random summon icons, chibi units, fantasy heroes, inconsistent camera angles, watermarks.
```

## Enemy/Noise Atlas Order

The generated atlas is a 4 columns by 2 rows image. Code slices it by `NOISE_TYPES[id].atlasIndex` in this order:
The committed file must have dimensions divisible by 4 and 2. The current normalized target is 1776x888.

1. Flicker
2. Crawler
3. Bulwark
4. Splitter
5. Null
6. Null Spore
7. Boss Orchid visual used for generic Boss
8. Boss Mirror reserve visual

## UI Icon Atlas Order

The generated atlas is a 4 columns by 3 rows image. CSS slices it with `background-position` in this order:
The committed file must have dimensions divisible by 4 and 3. The current normalized target is 1256x1254.

1. Charge
2. Link Energy
3. Gem
4. Supply
5. Merge
6. Swap
7. Focus
8. Link Pulse
9. Overclock
10. Bot
11. Online
12. BM / Missions

## Boss Disruption Atlas Order

The generated atlas is a 3 columns by 1 row image. Code slices it in this order:
The committed file must have dimensions divisible by 3 and 1. The current normalized target is 2106x747.

1. Boss Orchid Heatroot
2. Boss Mirror Linkbreak
3. Origin Null Spore

## Base Prompt: Enemy/Noise Atlas

```text
Use case: stylized-concept
Asset type: 4 columns by 2 rows enemy/noise icon atlas for a vertical mobile cooperative tower-defense game; project-bound bitmap asset.
Primary request: Create 8 distinct Signal Relay enemy icons in one clean 4x2 sprite-sheet style image. Each cell contains one centered enemy body, no labels or text.
Subject list by row order: Flicker, Crawler, Bulwark, Splitter, Null, Null Spore, Boss Orchid, Boss Mirror.
Scene/backdrop: each icon on a dark neutral square tile with very subtle rim light and visible grid gutters for slicing.
Style/medium: cohesive premium Korean mobile game enemy icons, fantasy-tech signal corruption creatures, semi-realistic energy constructs, clean silhouettes readable at 48px, no characters, no dice, no cards.
Composition/framing: square overall atlas, perfectly aligned 4x2 grid, equal cell sizes, generous padding, centered subjects, consistent three-quarter/top-down game icon camera.
Lighting/mood: top-left key light, teal signal contamination, coral saturation danger, amber sparks, emerald repair contrast only as tiny accents.
Color palette: deep charcoal base, coral/red for danger, amber for crawler/splitter, cyan for bulwark, violet-magenta for null and spores, teal rim highlights.
Materials/textures: glassy signal shards, digital static, metal-like corrupted cores, soft glow edges but crisp silhouettes.
Constraints: no text, no letters, no numbers, no watermark, no dice pips, no humanoid heroes, no marketing illustration, no random-summon circles.
Avoid: cluttered backgrounds, inconsistent camera angles, unreadable tiny detail, copyrighted game lookalikes.
```

## Base Prompt: Boss Disruption Atlas

```text
Use case: stylized-concept
Asset type: 3 columns by 1 row boss disruption card atlas for Signal Relay, project-bound bitmap asset.
Primary request: Create three polished boss disruption event cards in one clean 3x1 sprite-sheet style image. Each card has a visual emblem only, no text.
Subject list left to right: Boss Orchid Heatroot, Boss Mirror Linkbreak, Origin Null Spore.
Scene/backdrop: dark premium mobile game event banner tiles, each card has a cinematic boss emblem and subtle abstract board-pressure background.
Style/medium: high-end Korean mobile game boss warning art, semi-realistic fantasy-tech, sharp emblem silhouettes, glass/metal/signal corruption materials, compact enough to read as a small in-game event banner.
Composition/framing: 3 equal horizontal cards in one landscape atlas, visible gutters, centered emblem, generous safe padding, no words, no numerals.
Lighting/mood: urgent but restrained; coral danger glow for Orchid, cold silver/cyan fracture glow for Mirror, violet-magenta void glow for Origin Null.
Color palette: deep charcoal and black ceramic base, coral heat roots, teal/cyan broken links, violet null spores, amber sparks as accents, ivory edge highlights.
Materials/textures: crystalline petals and roots, broken reflective mirror shards, void spores and corrupted signal rings.
Constraints: no text, no letters, no numbers, no watermark, no dice, no characters, no copied game UI.
Avoid: busy full-screen scene, unreadable tiny details, large UI text, pure gradient background, inconsistent frame sizes.
```

## Base Prompt: UI Icon Atlas

```text
Use case: stylized-concept
Asset type: 4 columns by 3 rows UI icon atlas for Signal Relay mobile game buttons and currencies; project-bound bitmap asset.
Primary request: Create 12 distinct compact UI icons in one clean 4x3 sprite-sheet style image. Each cell contains one centered icon, no labels or text.
Subject list by row order: Charge currency, Link Energy currency, Gem currency, Supply action, Merge action, Swap action, Focus upgrade, Link Pulse action, Overclock action, Bot co-op, Online co-op, Missions/BM shop.
Scene/backdrop: each icon on a dark transparent-looking neutral square tile with subtle rim light and visible gutters for slicing.
Style/medium: premium mobile game UI icon set, fantasy-tech, glass cores, metal trim, crisp symbolic silhouettes, readable at 24px, matching Signal Relay's relay-device aesthetic.
Composition/framing: square overall atlas, 4 columns by 3 rows, equal cells, centered symbols, generous padding, consistent icon weight.
Lighting/mood: clean high-contrast game UI lighting, subtle teal signal glow, amber charge glow, emerald gem glow, coral overclock danger glow.
Color palette: charcoal base, amber Charge, cyan Link, emerald Gems, ivory highlights, coral danger, restrained saturation.
Materials/textures: brushed metal, luminous glass, small cable motifs, holographic rings.
Constraints: no text, no letters, no numbers, no watermark, no dice pips, no casino language, no generic emoji symbols.
Avoid: cluttered backgrounds, oversized decorative frames, unreadable micro-detail, inconsistent perspective, copied app-store icon style.
```

## Acceptance Checklist

- The asset can be read at mobile size without relying on text.
- The silhouette does not resemble dice, guardian, card, or random-summon UI.
- The palette matches the current canvas renderer.
- The asset has no watermark and no accidental text.
- Replacing the asset does not require changing game rules.
