# Signal Relay Asset Generation Guide

## Goal

Every visible unit, board surface, loop effect, and premium UI accent should look like one shipped mobile game. Generated assets must reinforce the game's distinct language: Signal loop, Relay devices, Heat, Link Pulse, Saturation, and partner rescue.

## Current Generated Assets

| asset | path | use |
|---|---|---|
| Art direction reference | `src/client/assets/generated/signal-relay-art-direction.png` | Renderer backdrop reference and visual consistency target |
| Relay icon atlas | `src/client/assets/generated/relay-unit-atlas.png` | 20 Relay icons in roster order |

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

## Acceptance Checklist

- The asset can be read at mobile size without relying on text.
- The silhouette does not resemble dice, guardian, card, or random-summon UI.
- The palette matches the current canvas renderer.
- The asset has no watermark and no accidental text.
- Replacing the asset does not require changing game rules.
