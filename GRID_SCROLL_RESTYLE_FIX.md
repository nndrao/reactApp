# Grid scroll performance: the sibling-selector restyle fix

**Status:** fixed 2026-10-09 on `fix/grid-restyle-sibling-selectors` (commit `3a58e932`).
Tracked as `docs/WORKLOG.md` item 33.
**Applies to:** any app that renders a DOM-virtualised grid (AG Grid, or anything
that inserts and removes row `<div>`s while scrolling) on a page whose CSS was built
from Tailwind arbitrary variants or hand-written sibling selectors. That includes
any app that copied the older shadcn/ui `toast` and `alert` components.

This document explains the problem, the evidence, the fix, the guard that keeps it
fixed, and how to check and measure another repo. It also covers the measurement
traps that hid the cause for weeks, because they are the part most likely to waste
someone else's time.

---

## 1. Summary

- **Symptom:** scrolling a starui `MarketsGrid` was clearly less smooth than the same
  AG Grid version running standalone with the same columns, rows and options.
- **Cause:** two CSS rules from shadcn/ui-style component class strings, neither of
  them used by the grid:

  | Source | Tailwind class | Compiled selector |
  |---|---|---|
  | `ToastTitle` (`toast.tsx`) | `[&+div]:text-xs` | `.\[\&\+div\]\:text-xs + div` |
  | `Alert` (`alert.tsx`) | `[&>svg+div]:translate-y-[-3px]` | `.\[\&\>svg\+div\]\:translate-y-\[-3px\] > svg + div` |

  With **both** rules in the shipped stylesheet, Chrome restyled every rendered row
  and cell of the grid each time AG Grid inserted a row while scrolling, instead of
  only the new rows.
- **Effect of the fix,** measured on the production build of
  `stomp-marketsgrid-minimal` (28 columns, 20,000 rows):

  | | Elements restyled per style pass | Restyle time over 4 s of scrolling | ms per pass |
  |---|---|---|---|
  | Before | 515–519 (max 1,035) | ~575–665 ms | 6.2–7.5 |
  | After | **72** (max 96) | ~180–245 ms | 1.5–2.4 |
  | Bare AG Grid with the same grid options (reference) | 63 | ~112 ms | 0.9 |

- **Fix:** rewrite both class strings so no rule has a sibling combinator (`+` or `~`)
  followed by a bare tag or `*`. Add a CI check (`npm run check:css-siblings`) that
  rejects that shape anywhere in package sources and CSS.

---

## 2. Symptoms: how to tell if you have this problem

- Scrolling (wheel, scrollbar drag or keyboard) feels heavier than an AG Grid demo
  with the same data, and the difference shows up as **style recalculation** in a
  Performance trace, not scripting.
- In the trace, many `Recalculate Style` events touch hundreds or thousands of
  elements. A grid that renders ~30 rows × ~10 visible columns should restyle tens
  of elements per scroll step, not the whole grid body.
- The cost is purely scroll-driven: an idle grid with a live feed does almost no
  style recalculation.
- Turning grid features off (checkbox column, floating filters, cell flash, cell
  selection) makes it *somewhat* better but never closes the gap. Removing the row
  checkbox column halves the cost, which looks like a lead. It isn't: the checkbox
  only adds elements to a subtree that is being needlessly restyled anyway.
- **Making your stylesheets smaller or cheaper does nothing measurable.** Per-element
  restyle cost was identical between starui and a bare grid (22.5 vs 23.1 µs). The
  problem is how *many* elements are restyled, not how expensive each one is.

---

## 3. Root cause

### 3.1 In plain terms

The browser decides whether a CSS rule applies to an element by reading the selector
**right to left**. For `.x + div` it first asks "is this element a `div`?", which is
true for every grid row and cell. Then it asks "is the element just before it an
`.x`?" To answer that, it looks at the element's sibling. Looking at siblings
leaves a note on the shared parent: "the order of my children matters to some
rule".

AG Grid virtualises rows. As you scroll it removes rows that leave the viewport and
inserts new ones into the same container. When a child is inserted into a parent
carrying that note, Chrome can no longer assume only the new child is affected. It
conservatively restyles **everything inside the container**: every row, every cell,
every checkbox. That happens on every scroll step.

The rules never actually style anything in the grid. Their mere presence in the
stylesheet is enough.

### 3.2 What the Chrome trace shows

With `disabled-by-default-devtools.timeline.invalidationTracking` enabled while
scrolling:

- `StyleInvalidatorInvalidationTracking` reports **"Invalidation set invalidates
  subtree"** with `allDescendantsMightBeInvalid: true` on
  `div.ag-grid-scrolling-container`, about 25 times in 2 s.
- `StyleRecalcInvalidationTracking` shows the preceding events are
  **"Node was inserted into tree"** for `div.ag-row` elements, which is AG Grid's
  row recycling.
- `UpdateLayoutTree` events (the "Recalculate Style" blocks) carry
  `args.elementCount`. That is the number to watch: ~515 before the fix, ~72 after.

### 3.3 What we know and what we don't

What was measured, on the shipped CSS (edited build file, served, fresh page load,
two or three repeats each, all reproducible):

| Shipped CSS | Elements per pass |
|---|---|
| Original (all 21 rules containing `+` or `~` present) | 515–519 |
| All 21 removed | 72 |
| **Only** `[&+div]:text-xs` **and** `[&>svg+div]:translate-y-[-3px]` kept | 480–482 |
| Only `[&+div]:text-xs` kept | 72 |
| Only `[&>svg+div]:translate-y-[-3px]` kept | 72 |
| `[&>svg+div]` + `[&>svg~*]:pl-7` kept | 72 |
| All 18 Tailwind `space-*` / `divide-*` rules kept | 72 |
| Only `space-y-2` kept | 72 |

**Unknown:** why it takes both rules rather than either one. It is internal to
Chrome's style-invalidation bookkeeping and we did not determine the exact
mechanism. Treat the shape of the rules as the hazard, not the specific pair. That
is why the guard in §5 bans the whole shape rather than only these two selectors.

**Measured harmless** in the same app, so don't spend time on them:

- Tailwind `space-x-*`, `space-y-*` and `divide-*` (`> :not([hidden]) ~ :not([hidden])`)
- `:has(...)` rules, e.g. `:has([aria-selected])`, `:has([role="checkbox"])`
- Sibling rules whose subject has a class or attribute, e.g.
  `[cmdk-group] ~ [cmdk-group]`, `.peer:disabled ~ .peer-disabled\:opacity-70`,
  `.fx-toolbar-group + .fx-toolbar-group`
- AG Grid's own structural selectors (`:last-child`, `:nth-child(...)`, `+`)
- Overall stylesheet size, the number of design-system CSS custom properties per
  element, and universal `*` rules without sibling combinators

Only Chrome was measured, version 154 on Windows. Firefox and Safari have different
style engines and may behave differently.

---

## 4. The fix

Both components keep their visual behaviour. The rules are expressed without a
sibling combinator: the condition moves onto the parent with `:has()`, or onto an
element that carries a class or attribute.

### 4.1 Toast

The description under a title is `text-xs`. Before, the title styled whichever
`div` came right after it:

```tsx
// Before — ToastTitle
className={cn('text-sm font-semibold [&+div]:text-xs', className)}

// Before — ToastDescription
className={cn('text-sm opacity-90', className)}
```

After: the title carries an attribute, and the description shrinks itself when its
parent contains a title:

```tsx
// After — ToastTitle
<ToastPrimitives.Title
  ref={ref}
  className={cn('text-sm font-semibold', className)}
  toast-title=""
  {...props}
/>

// After — ToastDescription
className={cn('text-sm opacity-90 [div:has(>[toast-title])>&]:text-xs', className)}
```

Compiled:

```css
div:has(>[toast-title]) > .\[div\:has\(\>\[toast-title\]\)\>\&\]\:text-xs {
  font-size: 0.75rem; line-height: 1rem;
}
```

The rule's subject is the description's own utility class. Chrome files it under
that class and never even tries it against a grid row. Specificity (0,2,1) still
beats `.text-sm` (0,1,0), as the old rule did.

### 4.2 Alert

Before:

```ts
'relative w-full rounded-md border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7'
```

After:

```ts
'relative w-full rounded-md border px-4 py-3 text-sm has-[>svg]:pl-11 [&:has(>svg):not(:has(>h5))>div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground'
```

| Old rule | New rule | Why it's equivalent |
|---|---|---|
| `[&>svg~*]:pl-7`: every child after the icon gets 28px left padding | `has-[>svg]:pl-11`: the alert gets 44px left padding when it has an icon | Content starts at 16px (`px-4`) + 28px = 44px either way. The icon is `absolute` at `left-4`, so container padding doesn't move it. |
| `[&>svg+div]:translate-y-[-3px]`: the `div` straight after the icon is nudged up | `[&:has(>svg):not(:has(>h5))>div]:translate-y-[-3px]`: direct `div` children are nudged when there's an icon and no `AlertTitle` (`h5`) | Standard compositions: icon + description gets nudged in both; icon + title + description gets nudged in neither. |

Compiled:

```css
.has-\[\>svg\]\:pl-11:has(>svg) { padding-left: 2.75rem }
.\[\&\:has\(\>svg\)\:not\(\:has\(\>h5\)\)\>div\]\:translate-y-\[-3px\]:has(>svg):not(:has(>h5)) > div { --tw-translate-y: -3px; /* … */ }
```

`has-[...]` needs **Tailwind 3.4+**.

**One behaviour change**, for non-standard markup only: an alert whose icon is not
its first child (e.g. title, icon, description) no longer nudges the description.

### 4.3 Rewrite patterns for your own code

| Instead of | Use |
|---|---|
| `.a + div`, `[&+div]:…` | Give the target a class or attribute: `.a + .b`, or condition on the parent: `div:has(>.a) > .b` |
| `.a ~ *`, `[&>svg~*]:…` | Style the parent: `has-[>svg]:pl-…`, or give the siblings a class |
| `.a > svg + div` | `.a:has(>svg) > .target-class` |
| Tailwind `space-y-*` / `divide-*` | Measured harmless here. If you prefer to avoid any sibling combinator, `flex flex-col gap-*` is the modern equivalent. |

The rule of thumb: **after a `+` or `~`, the rightmost part of the selector must
include a class, an id or an attribute.** `div`, `*`, `svg ~ p` and `:not(...)`
alone are not enough.

---

## 5. The guard: `npm run check:css-siblings`

`scripts/check-css-sibling-selectors.mjs` fails CI if the shape comes back. It runs:

- as its own step in `.github/workflows/ci.yml` ("No CSS that restyles the whole
  grid per scroll step"), and
- in `npm run lint:all`.

### 5.1 What it scans

1. **Tailwind arbitrary variants** in every non-test `.ts`/`.tsx` file under
   `packages/`. These are tokens of the form `[...&...]:` such as `[&+div]:text-xs`.
   Underscores become spaces, as Tailwind does.
2. **Every selector** in every `.css` file under `packages/`, parsed with postcss.

It skips `node_modules`, `dist`, `coverage` and `.turbo`. It also fails if it
scanned zero files, so a broken path can't print PASS on an empty walk.

Plain Tailwind utilities such as `space-y-2` are not arbitrary variants and are not
scanned. They measured harmless.

### 5.2 The rule it applies

```js
/** True when the selector's subject follows `+`/`~` and has no class/id/attribute. */
export function isBareSiblingSubject(selector) {
  let s = selector;
  // Contents of :has()/:not()/:is() never become the subject — drop them.
  while (/\([^()]*\)/.test(s)) s = s.replace(/\([^()]*\)/g, '');
  s = s.replace(/\[[^\]]*\]/g, '[]').trim(); // `[class~=x]` is not a combinator
  const combinators = [...s.matchAll(/\s*[>+~]\s*|\s+/g)];
  const last = combinators.at(-1);
  if (!last || !/[+~]/.test(last[0])) return false;
  const subject = s.slice(last.index + last[0].length);
  // `&` is the element carrying the utility class, so it counts as a class.
  return !/[.#[&]/.test(subject);
}
```

Examples:

| Selector | Result |
|---|---|
| `&+div` | **rejected** |
| `&>svg+div` | **rejected** |
| `&>svg~*` | **rejected** |
| `h5 ~ p` | **rejected** |
| `.peer:disabled~.peer-x` | ok (class subject) |
| `& [cmdk-group]:not([hidden]) ~[cmdk-group]` | ok (attribute subject) |
| `div:has(>[toast-title])>&` | ok (no sibling combinator; `&` is a class) |
| `&:has(>svg):not(:has(>h5))>div` | ok (last combinator is `>`) |
| `.a [class~=x]` | ok (`~=` is inside an attribute) |
| `.a + div .b` | ok (subject `.b` has a class) |

On `main` before the fix the check reported exactly three hits: `toast.tsx: &+div`,
`alert.tsx: &>svg+div` and `alert.tsx: &>svg~*`. After the fix it reports
`PASS — 937 files scanned`.

### 5.3 Porting the guard to another repo

1. Copy `scripts/check-css-sibling-selectors.mjs`. Its only dependency is `postcss`,
   which any Tailwind project already has.
2. Point the `walk(...)` root at wherever your components and CSS live. It is
   `packages/` here; for a single app it's usually `src/`.
3. Add `"check:css-siblings": "node scripts/check-css-sibling-selectors.mjs"` to
   `package.json` and run it in CI.
4. If you ship third-party CSS you can't edit, run the same `isBareSiblingSubject`
   over your **built** CSS (`dist/**/*.css`) as a second check. That catches rules
   coming from dependencies.

---

## 6. Checking another repo in five minutes

### 6.1 Grep for the shape

```bash
# Tailwind arbitrary variants with + or ~ (review each hit's subject by eye)
grep -rnoE "\[&[^] '\"]*[+~][^] '\"]*\]:" --include=*.tsx --include=*.ts --include=*.jsx --include=*.vue --include=*.html src/

# The two exact strings from shadcn/ui's older templates
grep -rn "\[&+div\]:text-xs\|\[&>svg+div\]:translate-y\|\[&>svg~\*\]:pl-7" src/

# Hand-written CSS: a + or ~ followed by a bare tag or *
# (noisy: also matches "+" in comments; the script in §5 parses CSS properly)
grep -rnE "[+~]\s*(\*|[a-z][a-z0-9-]*)\s*(\{|,|$)" --include=*.css src/
```

If you vendored shadcn/ui's `toast.tsx` or `alert.tsx` before they changed upstream,
you almost certainly have the first two strings.

### 6.2 Confirm in DevTools (no tooling needed)

1. Use a **production build**. Dev builds work too, but measure what ships.
2. DevTools → Performance → enable "Enable advanced rendering instrumentation
   (slow)" → record while wheel-scrolling the grid for a few seconds.
3. Click several **Recalculate Style** blocks during the scroll and read
   **Elements affected**. Tens means healthy; hundreds or thousands while only a few
   rows entered the viewport means you have this problem.
4. Optional: in the same trace, look for invalidation entries on the grid's row
   container (`.ag-grid-scrolling-container` on AG Grid 36,
   `.ag-center-cols-container` on older versions) reporting "invalidates subtree".

### 6.3 Measure with a script

Playwright + Chrome DevTools Protocol, averaging `elementCount` across style
passes. This is the core of the harness used here:

```js
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto(process.argv[2]);
await page.waitForFunction(() => document.querySelectorAll('.ag-row').length > 10);
await page.waitForTimeout(2000);

const cdp = await page.context().newCDPSession(page);
const box = await page.locator('.ag-grid-viewport, .ag-body-viewport').first().boundingBox();
await page.mouse.move(box.x + 400, box.y + 150);

const events = [];
cdp.on('Tracing.dataCollected', (d) => events.push(...d.value));
const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
await cdp.send('Tracing.start', {
  categories: 'devtools.timeline,disabled-by-default-devtools.timeline',
  transferMode: 'ReportEvents',
});
for (const t = Date.now(); Date.now() - t < 4000; ) {
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(16);
}
await cdp.send('Tracing.end');
await done;

const passes = events.filter((e) => e.name === 'UpdateLayoutTree' && e.ph === 'X');
const counts = passes.map((e) => e.args?.elementCount ?? 0);
const ms = passes.reduce((a, e) => a + (e.dur ?? 0), 0) / 1000;
console.log({
  passes: passes.length,
  elementsPerPass: Math.round(counts.reduce((a, b) => a + b, 0) / passes.length),
  maxElements: Math.max(...counts),
  restyleMs: Math.round(ms),
});
await browser.close();
```

Run it against your build and against a bare AG Grid page with the same columns,
rows and grid options. Your elements per pass should be within ~15% of the bare
page.

### 6.4 Prove a specific rule is responsible

**Edit the built CSS file and serve it.** Don't delete rules from a running page
(see §7). With postcss:

```js
const postcss = require('postcss');
const fs = require('fs');
const file = 'dist/assets/index-XXXX.css';
const root = postcss.parse(fs.readFileSync(file, 'utf8'));
root.walkRules((r) => {
  if (r.selectors.some((s) => /\+div$|svg~\*$/.test(s))) r.remove();
});
fs.writeFileSync(file, root.toString());
```

Serve the edited `dist/` folder, re-run §6.3, and compare against the untouched
build. Alternate the two (A/B/A/B): a single run can wander ±20%.

---

## 7. Measurement traps (read this before investigating)

Each of these produced a confident wrong answer during this investigation.

1. **Deleting rules from a live page lies.** Removing CSS rules through the CSSOM
   (`sheet.deleteRule`) or `sheet.disabled = true` made single Tailwind `space-y-*`
   rules look sufficient to cause the full slowdown (~505 elements). On the shipped
   CSS the same rule measured 72. Live mutation changes Chrome's internal state in
   ways that don't match a fresh load.
2. **Injecting a rule lies too.** Adding `<style>.x + div {…}</style>`, even from
   page start, never reproduced the effect, not even for the original rule.
3. **Selector cost isn't invalidation.** Chrome's "Selector Stats" (time and match
   attempts per selector) pointed at AG Grid's own selectors. It measures the cost
   of matching, not how many elements each change invalidates, so it can't see this
   problem.
4. **Per-element cost is a red herring.** Shrinking stylesheets, removing design
   tokens and stripping universal rules all measured nothing, because each element
   was never the expensive part.
5. **Frame counts under CPU throttling are too noisy to rely on.** With
   `Emulation.setCPUThrottlingRate` 4×, the same bare AG Grid page gave between 28
   and 106 frames in 4 s across runs. Use `elementCount` and restyle milliseconds,
   which were stable to a few percent.
6. **Feature toggles mislead.** Turning off the checkbox column halved the cost and
   looked like the answer. It only shrank the subtree being thrown away.
7. **Check which input path you are measuring.** Wheel, scrollbar drag and held
   arrow keys go through different code. A throttle that only gated the scrollbar
   was invisible in every wheel-driven profile (see `docs/WORKLOG.md` and the
   2026-09-29 scrollbar-throttle removal, `39ff8f84`).

---

## 8. What is left after the fix

With the fix, starui scrolls close to bare AG Grid running the **same** options
(72 vs 63 elements per pass). The rest of the gap to a *plain* AG Grid comes from
features and data, not the framework:

| Remaining cost | Detail | Suggested follow-up |
|---|---|---|
| Row checkbox column | In bare AG Grid, row checkboxes alone take restyle work from ~60 to ~32 elements per pass when off. Intrinsic to AG Grid's checkbox markup. | Make row checkboxes opt-in per blotter. |
| Live feed decoding | The SharedWorker's columnar delta frames are decoded on the main thread (`decodeColumnar` via `SharedWorkerDataServicesClient.handleMessage`) even while ticks are parked during a scroll: ~5% of the main thread. | Defer decoding until the parked ticks are replayed, or decode in the worker. |
| AG Grid `onHScroll` forced layout | AG Grid reads `scrollLeft` in its scroll handler, forcing a layout. Present in bare AG Grid too (24 ms vs 33 ms). | Nothing to do on our side. |

---

## 9. Reference: environment and method

- **App:** `apps/source/stomp-marketsgrid-minimal`, production build (`vite build`),
  served statically. 28 columns, 20,000 rows over STOMP, AG Grid Community +
  Enterprise **36.1.0**, client-side row model, row checkboxes on, cell selection on,
  floating filters on, cell flash on, side bar, status bar, pinned grand-total row.
- **Bare reference:** a single HTML page with `ag-grid-enterprise.min.js` 36.1.0, the
  same 20,000 rows (trimmed to the 28 displayed fields) and the same grid options.
- **Browser:** Google Chrome 154.0.8037.95, headless, Windows 11, 1600×900 viewport.
- **Input:** Playwright `mouse.wheel(0, 120)` every 16 ms for 4 s from the top of the
  grid.
- **Metrics:** CDP tracing; `UpdateLayoutTree.args.elementCount` and `dur`;
  `invalidationTracking` for the cause; `Profiler` CPU profiles for the leftover
  script cost.
- **Related history:** `docs/WORKLOG.md` item 33 (the original 524-vs-74 finding
  against `velocitygrid-rusthub` on a 361-column feed, which these numbers match).
