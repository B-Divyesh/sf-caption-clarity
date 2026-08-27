# Caption Clarity — visual thesis

## Direction: topographic cartography

Caption Clarity treats difficult dialogue like terrain: captions are not corrected or regenerated, but the words that need attention rise above the surrounding line like contour peaks. The interface resembles a quiet field map spread beside a video, with measured rules, coordinate labels, contour rings, and a bright route marker for the current action. This is functional decoration—the terrain metaphor explains adjustable emphasis and the viewer’s personal “listening map”—rather than a generic outdoors theme.

## Palette

The light treatment is a sun-warmed paper map and the dark treatment is a night navigation chart. Both meet WCAG AA for normal text.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| paper / background | `#f2efe4` | `#111a18` | page field |
| sheet / surface | `#fffdf5` | `#192522` | raised working areas |
| ink / text | `#172421` | `#f4f1e6` | primary copy |
| muted | `#58645f` | `#aebbb5` | secondary copy |
| contour | `#b9c4ad` | `#3f5650` | rules and topography |
| route / accent | `#c9462d` | `#ff7a5c` | primary action and emphasis |
| route contrast | `#ffffff` | `#17201e` | text on route |
| water | `#176b75` | `#70c5c9` | links and focus |
| success | `#2f6b47` | `#78c692` | loaded/verified |
| warning | `#8a5808` | `#f2bf5e` | offline/pause |
| danger | `#a12d2d` | `#ff8d82` | errors |

Color is never the only state signal; icons and text label loaded, paused, offline, and error conditions.

## Type and spacing

- Display and UI: `Avenir Next`, `Segoe UI`, system sans-serif. It is open and geometric without requiring a network font.
- Coordinates, file metadata, cue timestamps: `ui-monospace`, `SFMono-Regular`, `Consolas`, monospace.
- Scale: 14 metadata, 16 body, 20 section, 28 workspace heading, clamp(38–64) product h1. Body is never below 16px.
- Rhythm: a 4px base grid. Main intervals are 8, 12, 16, 24, 32, 48, and 72px. Reading measure is capped at 68 characters.

## Layout and interaction grammar

The masthead is a map legend. The landing/workspace transition is one continuous page: the intro occupies the left map margin and the file drop zone is the obvious first waypoint. Once media is loaded, the video becomes the dominant “map sheet” with the control bench beside it. Settings use grouped fieldsets, not card confetti. Status chips read like coordinate stamps. On phones, orientation copy and decorative overview art drop away; the player leads and controls stack in task order.

Buttons have clipped route-marker corners and a two-pixel pressed translation. Inputs use dark ink outlines and a teal focus halo. Dragging files raises the drop zone. Active caption terms gain a warm summit fill plus weight and underline, preserving meaning without color alone.

## Motion

UI changes last 160–220ms and animate only opacity and transform. The player rises from its drop-zone origin; active words appear without pulsing. No decorative animation loops. Under `prefers-reduced-motion: reduce`, all movement becomes an immediate state change and smooth scrolling is disabled.

## Asset plan and provenance

- `public/assets/terrain-listening.webp`: original generated hero illustration, a tactile paper topographic landscape whose contour peaks become abstract caption blocks and sound paths. It explains the product metaphor without depicting people or claiming speech recognition. Generated with the factory Azure image model (`factory-image`) on 2026-08-27, then reviewed and optimized locally to WebP. Original prompt is stored beside the source in `assets/src/terrain-listening.json`. No text, logos, brands, watermarks, or copyrighted characters.
- App mark and PWA icons: original hand-authored SVG contour rings plus a caption baseline. Created for this product on 2026-08-27; MIT-licensed with the repository.
- CSS contour textures: original inline radial/elliptical line patterns; no external assets.

### Prompt sheet

Subject: an abstract listening landscape where topographic contour ridges gently lift selected caption-like paper tiles above a flat text path. World: precise field cartography on warm archival paper. Materials: layered cut paper, blind embossing, fine ink contour lines. Light: quiet raking morning light from upper left, soft physical shadows. Lens: slightly elevated orthographic editorial still life, wide landscape composition, useful negative space. Palette words: lichen, warm paper, charcoal ink, oxidized teal, vermilion route marker. Negative list: no people, ears, hearing aids, screens, UI mockups, readable text, letters, logos, brands, medical imagery, gradients, watermarks, photorealistic scenery, clutter.
