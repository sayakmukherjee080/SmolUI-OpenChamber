# Math (KaTeX, `libs: katex`)

Mark maths in the HTML; the theme renders it, follows dark mode, and re-renders on theme change. Do not call KaTeX yourself unless you need dynamic maths (`Visuals.katex.render(el, tex)`).

```html
<p>For <span data-math>n</span> values the mean is <span data-math>\bar{x} = \tfrac{1}{n}\sum_i x_i</span>.</p>
<div data-math="display">\accent{r} = \left\lceil \frac{p}{100}\, n \right\rceil</div>
```
- Inline: `<span data-math>`. Display: `<div data-math="display">` (any `div` is display).
- TeX goes in the element text. Write `\lt` and `\gt` instead of `<` and `>`. A literal `&` (in `aligned`) is fine inside a `div`.
- `\text{...}` for words inside a formula.

## Macros available
- Sets: `\R \N \Z \Q \C`. Statistics: `\E`, `\Var`. Optimisation: `\argmax`, `\argmin`.
- Colour (theme-aware, follows dark mode): `\accent{x}`, `\muted{x}`, `\sA{x}` .. `\sF{x}` (series colours 1 to 6). Colour a term to tie it to a chart colour or to the explanation beside it; never colour alone: also name the term in the text.
- No raw colour commands (`\color`, `\textcolor` with hex): the lint rejects hex.

## Structure of a good derivation
1. Definition (one formula, symbols defined right after in a `<dl>`).
2. Worked example with real numbers from the user's data.
3. Result sentence.
Keep each display formula under about 60 characters of TeX where possible; split long ones with `\\` inside `aligned`:
```
<div data-math="display">\begin{aligned} a &= b + c \\ &= d \end{aligned}</div>
```
Wide formulas scroll horizontally; prefer splitting.

## Rules
- Numbers inside worked examples must be computed, not recalled.
- Source caption: name the method or reference ("nearest-rank method"); mark invented values as illustrative.
- KaTeX does not support everything LaTeX does (no `\usepackage`, no TikZ). Errors show inline in red text with the source; check the render if the formula is unusual.
- `\href`, `\url`, `\includegraphics` are disabled.

## Example
`examples/07-formula.visual.html`
