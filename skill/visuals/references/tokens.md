# Tokens

Use as `var(--name)` in inline styles or SVG attributes, or read in script with `Visuals.tokens()`. Never write the values. Colours differ between light and dark; the dark column shows which tokens change.

Most visuals need none of these: classes and the chart adapters already use them.


## surfaces

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#f6f8f5` | `#0e1612` |
| `--surface` | `#ffffff` | `#15201a` |
| `--surface-sunken` | `#e8eee9` | `#1b2a21` |
| `--track` | `#e3eae5` | `#223028` |

## text

| Token | Light | Dark |
|---|---|---|
| `--text` | `#17211b` | `#e8f0ea` |
| `--text-2` | `#44544a` | `#b6c5bb` |
| `--text-muted` | `#5d6c63` | `#8c9d92` |

## lines

| Token | Light | Dark |
|---|---|---|
| `--border` | `#d9e1db` | `#263229` |
| `--border-strong` | `#b9c6bd` | `#36473d` |
| `--control-border` | `#84948a` | `#5f7066` |

## Accent

| Token | Light | Dark |
|---|---|---|
| `--accent` | `#1d7a46` | `#3fbf7a` |
| `--accent-hover` | `#17673a` | `#5fd292` |
| `--on-accent` | `#ffffff` | `#07130c` |
| `--accent-soft` | `#e3f1e8` | `#163423` |
| `--accent-text` | `#17673a` | `#6fd9a1` |

## status

| Token | Light | Dark |
|---|---|---|
| `--ok` | `#1d7a46` | `#3fbf7a` |
| `--ok-soft` | `#e3f1e8` | `#163423` |
| `--ok-text` | `#17673a` | `#6fd9a1` |
| `--warn` | `#d99100` | `#e0a93a` |
| `--warn-soft` | `#fbf0d6` | `#33280f` |
| `--warn-text` | `#7a5200` | `#f0c566` |
| `--danger` | `#d03b3b` | `#f26b66` |
| `--danger-soft` | `#fbe4e2` | `#3a1c1b` |
| `--danger-text` | `#a52a26` | `#ff9a95` |
| `--info` | `#2a78d6` | `#6aaaf0` |
| `--info-soft` | `#e1ecf9` | `#14283f` |
| `--info-text` | `#1b5a9e` | `#9cc7f7` |

## Data series (fixed order, six maximum)

| Token | Light | Dark |
|---|---|---|
| `--s1` | `#1d7a46` | `#34ad6c` |
| `--s2` | `#6250d6` | `#9085e9` |
| `--s3` | `#eb6834` | `#d95926` |
| `--s4` | `#2a78d6` | `#3987e5` |
| `--s5` | `#eda100` | `#c98500` |
| `--s6` | `#e87ba4` | `#d55181` |
| `--s-other` | `#8d9a92` | `#6f7f75` |

## Sequential ramp (low to high)

| Token | Light | Dark |
|---|---|---|
| `--seq-1` | `#78c093` | `#1f5a3a` |
| `--seq-2` | `#4ba473` | `#349864` |
| `--seq-3` | `#288552` | `#47b077` |
| `--seq-4` | `#166639` | `#7bd3a0` |
| `--seq-5` | `#0b3f25` | `#b4ecca` |

## Diverging ramp (negative to positive)

| Token | Light | Dark |
|---|---|---|
| `--div-neg-2` | `#1f5fae` | `#8fbcf2` |
| `--div-neg-1` | `#8bb3e3` | `#3366a8` |
| `--div-mid` | `#e4e8e4` | `#2b3a31` |
| `--div-pos-1` | `#efae88` | `#c4703a` |
| `--div-pos-2` | `#c4501c` | `#f0a47a` |

## Text on ramp cells

| Token | Light | Dark |
|---|---|---|
| `--on-seq-1` | `#17211b` | `#e8f0ea` |
| `--on-seq-2` | `#17211b` | `#07130c` |
| `--on-seq-3` | `#ffffff` | `#07130c` |
| `--on-seq-4` | `#ffffff` | `#07130c` |
| `--on-seq-5` | `#ffffff` | `#07130c` |
| `--on-div-neg-2` | `#ffffff` | `#07130c` |
| `--on-div-neg-1` | `#17211b` | `#e8f0ea` |
| `--on-div-mid` | `#17211b` | `#e8f0ea` |
| `--on-div-pos-1` | `#17211b` | `#07130c` |
| `--on-div-pos-2` | `#ffffff` | `#07130c` |

## Chart furniture

| Token | Light | Dark |
|---|---|---|
| `--chart-grid` | `var(--border)` | same |
| `--chart-axis` | `var(--border-strong)` | same |
| `--chart-label` | `var(--text-muted)` | same |
| `--chart-crosshair` | `var(--text-muted)` | same |
| `--chart-tooltip-bg` | `var(--surface)` | same |
| `--chart-tooltip-border` | `var(--border-strong)` | same |
| `--chart-area-alpha` | `0.16` | same |
| `--chart-line-width` | `2px` | same |
| `--chart-point-radius` | `4px` | same |
| `--chart-bar-radius` | `3px` | same |
| `--chart-height` | `240px` | same |
| `--chart-font-size` | `11px` | same |
| `--chart-tension` | `0.3` | same |
| `--chart-legend-box` | `10px` | same |
| `--chart-padding` | `8px` | same |
| `--chart-bar-max` | `44px` | same |
| `--chart-donut-cutout` | `66%` | same |
| `--chart-anim` | `360ms` | same |

## Three.js scene

| Token | Light | Dark |
|---|---|---|
| `--three-bg` | `var(--surface-sunken)` | same |
| `--three-grid` | `var(--border-strong)` | same |
| `--three-grid-sub` | `var(--border)` | same |
| `--three-axis-x` | `var(--s3)` | same |
| `--three-axis-y` | `var(--s1)` | same |
| `--three-axis-z` | `var(--s4)` | same |
| `--three-label` | `var(--text-2)` | same |
| `--three-ambient` | `0.65` | same |
| `--three-key` | `1.1` | same |
| `--three-fill` | `0.35` | same |
| `--three-roughness` | `0.55` | same |
| `--three-metalness` | `0.08` | same |
| `--three-fov` | `40` | same |

## Math

| Token | Light | Dark |
|---|---|---|
| `--math-size` | `1.05em` | same |
| `--math-color` | `inherit` | same |
| `--math-error` | `var(--danger-text)` | same |
| `--math-display-gap` | `var(--space-4)` | same |

## Syntax highlighting

| Token | Light | Dark |
|---|---|---|
| `--syn-comment` | `#5d6c63` | `#8c9d92` |
| `--syn-keyword` | `#6a3fc0` | `#b4a8ff` |
| `--syn-string` | `#8a4b00` | `#e6b866` |
| `--syn-number` | `#b0410c` | `#f29a6b` |
| `--syn-function` | `#1b5a9e` | `#7db8f5` |
| `--syn-type` | `#0b6a74` | `#5fd0d8` |
| `--syn-tag` | `#b1275e` | `#f08ab3` |
| `--syn-attr` | `#0b6a74` | `#5fd0d8` |
| `--syn-operator` | `#44544a` | `#b6c5bb` |

## elevation and overlay

| Token | Light | Dark |
|---|---|---|
| `--shadow-color` | `rgba(23, 33, 27, 0.14)` | `rgba(0, 0, 0, 0.55)` |
| `--shadow-sm` | `0 1px 2px var(--shadow-color)` | same |
| `--shadow` | `0 4px 12px var(--shadow-color)` | same |
| `--shadow-lg` | `0 12px 40px var(--shadow-color)` | same |
| `--scrim` | `rgba(10, 17, 13, 0.5)` | `rgba(0, 0, 0, 0.6)` |

## type

| Token | Light | Dark |
|---|---|---|
| `--font-sans` | `"Geist", "Indic", system-ui, -apple-system, "Segoe UI", sans-serif` | same |
| `--font-mono` | `"Geist Mono", ui-monospace, "SF Mono", Menlo, Consolas, "Indic", monospace` | same |
| `--weight-regular` | `400` | same |
| `--weight-medium` | `500` | same |
| `--weight-semibold` | `600` | same |
| `--weight-bold` | `700` | same |
| `--text-xs` | `11px` | same |
| `--text-sm` | `12.5px` | same |
| `--text-base` | `14px` | same |
| `--text-md` | `16px` | same |
| `--text-lg` | `20px` | same |
| `--text-xl` | `26px` | same |
| `--text-2xl` | `32px` | same |
| `--leading` | `1.55` | same |
| `--leading-tight` | `1.2` | same |

## space

| Token | Light | Dark |
|---|---|---|
| `--space-1` | `4px` | same |
| `--space-2` | `8px` | same |
| `--space-3` | `12px` | same |
| `--space-4` | `16px` | same |
| `--space-5` | `20px` | same |
| `--space-6` | `28px` | same |
| `--space-7` | `40px` | same |

## shape

| Token | Light | Dark |
|---|---|---|
| `--radius-sm` | `4px` | same |
| `--radius` | `8px` | same |
| `--radius-lg` | `12px` | same |
| `--control-height` | `36px` | same |
| `--control-height-sm` | `28px` | same |
| `--focus-ring` | `0 0 0 2px var(--bg), 0 0 0 4px var(--accent)` | same |
| `--measure` | `72ch` | same |

## motion

| Token | Light | Dark |
|---|---|---|
| `--dur-fast` | `120ms` | same |
| `--dur` | `200ms` | same |
| `--dur-slow` | `360ms` | same |
| `--ease` | `cubic-bezier(0.2, 0, 0, 1)` | same |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | same |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | same |

## layering

| Token | Light | Dark |
|---|---|---|
| `--z-raised` | `10` | same |
| `--z-sticky` | `20` | same |
| `--z-dropdown` | `30` | same |
| `--z-overlay` | `40` | same |
| `--z-modal` | `50` | same |
| `--z-tooltip` | `60` | same |
