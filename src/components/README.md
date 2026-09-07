# Components

Grouped by domain, not by technical layer. Directories are empty on purpose — add
a component when a real page needs it, not in anticipation.

| Directory     | Intended contents |
| ------------- | ----------------- |
| `ui/`         | Generic, brand-agnostic primitives (button, field, dialog) |
| `layout/`     | Structural shell — header, footer, navigation, page frames |
| `marketing/`  | Landing and conversion sections |
| `warplan/`    | UI expressing the WARPLAN system — see [`docs/WARPLAN.md`](../../docs/WARPLAN.md) |
| `characters/` | Ranked player archetype UI — see [`docs/PLAYER-RANKS.md`](../../docs/PLAYER-RANKS.md) |
| `poker/`      | Poker primitives — cards, chips, hands, board runouts |

If a component does not clearly belong to one of these, leave it beside the route
that uses it until a second caller appears.
