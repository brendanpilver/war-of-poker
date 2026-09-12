# Public Assets

Static assets served from the site root. Each subdirectory has a single, narrow
purpose. Do not generate placeholder or filler artwork to populate these folders —
they stay empty until real War of Poker assets exist.

| Directory     | Intended contents |
| ------------- | ----------------- |
| `brand/`      | War of Poker logo, wordmarks, lockups, insignia, favicons, social/OG images |
| `warplan/`    | WARPLAN system assets, including the 5x7 WARPLAN field card and WARPLAN diagrams |
| `characters/` | Ranked cartoon army player illustrations and their supporting art |
| `textures/`   | Field-manual textures, paper stock, print/press artifacts, background surfaces |
| `cards/`      | Playing card art, card backs, poker chips, table elements |
| `books/`      | Covers and product imagery for published War of Poker books |

## Conventions

- Prefer SVG for logos, insignia, diagrams, and iconography.
- Prefer optimized raster (WebP/PNG) for illustrations and textures.
- Name files in kebab-case and describe the asset, not its placement:
  `warplan-field-card-5x7-front.png`, not `card-1.png`.
- Source/working files (`.ai`, `.psd`, layered exports) do not belong here.
- Assets referenced by the app should be committed; scratch exports should not.

See [`docs/BRAND.md`](../docs/BRAND.md) for the canonical visual rules that govern
what may be placed in these directories.
