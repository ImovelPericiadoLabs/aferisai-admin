# Design System Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify all CSS into a token-based design system and redesign Visão Geral, Parceiros, Usuários/Equipe, and Regras Comerciais to enterprise quality.

**Architecture:** Create `src/tokens.css` as the single source of truth for all design decisions; rewrite `src/shell.css` to an icon-rail layout using those tokens; add `src/components.css` with reusable `.btn`, `.badge`, `.card`, `.data-table`, `.detail-panel`, and `.kpi-card` classes; then apply this foundation to each of the four priority screens. Each task must leave the dev server running without TypeScript errors before the next begins.

**Tech Stack:** React 19, plain CSS custom properties (no framework), Vite 8, TypeScript 6, Lexend Deca font (already loaded via `src/index.css`)

**Spec:** `docs/superpowers/specs/2026-10-23-design-system-refactor.md`

## Global Constraints

- No hex colors hardcoded in component CSS — always `var(--token-name)`
- No direct font sizes in component CSS — always `var(--text-*)`
- No `!important` anywhere
- No new npm dependencies
- Login component (the `Login` function in `src/App.tsx`) must not be modified
- `src/api.ts` contracts must not change
- Visual check at 1440px, 768px, and 390px after every task
- `npm run build` must pass (zero TypeScript errors) after every task

## Review Focus

- **Mobile icon rail overlay:** at ≤760px the 60px rail must not overlap content; it must act as an off-canvas panel triggered by the existing `menuOpen` toggle. Add this check to Task 3's visual verification step.
- **Detail panel z-index on mobile:** `.detail-panel` at `position: fixed` must render above the topbar. Add `z-index: 50` assertion to Task 4's interface block and verify visually in Task 6.
- **Token inheritance on untouched screens:** after Task 2, spot-check `RequestDirectory`, `Analyses`, and `FinancialExceptions` in the browser — they must not have broken layout. Add this verification to Task 2.
- **Focus ring on new shell elements:** every `<button>` and `<a>` in the new icon rail must show `outline: 3px solid var(--primary-ring)` on `:focus-visible`. Grep for `focus-visible` in `shell.css` as part of Task 3's commit check.
- **Empty and error states on redesigned tables:** Parceiros and Usuários tables must render a `.empty-state` element (not blank whitespace) when the list is empty or errors. Add to Task 6 and Task 7 respectively.

---

## File Map

| File | Action | Responsible task |
|------|--------|-----------------|
| `src/tokens.css` | Create | Task 1 |
| `src/index.css` | Modify — import tokens, remove hardcoded values | Task 2 |
| `src/App.css` | Modify — remove component styles, keep layout base | Task 2 |
| `src/brand.css` | Modify — replace hex values with tokens | Task 2 |
| `src/shell.css` | Rewrite — icon rail + topbar | Task 3 |
| `src/App.tsx` | Modify — change `sidebarCollapsed` default to `true` | Task 3 |
| `src/components.css` | Create — `.btn`, `.badge`, `.card`, `.data-table`, `.detail-panel`, `.kpi-card` | Task 4 |
| `src/dashboard.css` | Rewrite — Visão Geral layout | Task 5 |
| `src/DashboardOverview.tsx` | Modify — adopt new classes | Task 5 |
| `src/partner-directory.css` | Rewrite — list + detail panel | Task 6 |
| `src/PartnerDirectory.tsx` | Modify — add `selectedOrg` state + detail panel JSX | Task 6 |
| `src/Users.tsx` | Modify — table + detail panel | Task 7 |
| `src/TeamMembers.tsx` | Modify — sub-tab integration with Users | Task 7 |
| `src/commercial-policies.css` | Rewrite — card list + detail panel | Task 8 |
| `src/CommercialPolicies.tsx` | Modify — card list + panel JSX | Task 8 |
| `src/operational-polish.css` | Delete | Task 9 |
| `src/form-system.css` | Delete (if no external import) | Task 9 |

---

### Task 1: Design Token Foundation

**Files:**
- Create: `src/tokens.css`
- (No TSX changes)

**Interfaces:**
- Produces all CSS custom properties consumed by Tasks 2–9:
  - Surface tokens: `--bg`, `--surface`, `--surface-muted`, `--border`, `--border-strong`
  - Text tokens: `--text`, `--text-muted`, `--text-subtle`
  - Primary tokens: `--primary`, `--primary-hover`, `--primary-faint`, `--primary-ring`
  - Semantic tokens: `--success`, `--success-bg`, `--warning`, `--warning-bg`, `--danger`, `--danger-bg`, `--info`, `--info-bg`
  - Typography: `--text-label`, `--text-caption`, `--text-sm`, `--text-base`, `--text-md`, `--text-lg`, `--text-xl`, `--text-2xl`
  - Weight: `--weight-normal`, `--weight-medium`, `--weight-semibold`, `--weight-bold`
  - Radius: `--radius-sm` (4px), `--radius-md` (6px), `--radius-lg` (8px), `--radius-xl` (12px)
  - Spacing: `--space-1` through `--space-12` (4px–48px scale)
  - Layout: `--sidebar-width` (60px), `--sidebar-width-expanded` (220px), `--topbar-height` (52px), `--content-max` (1360px)

- [ ] **Step 1: Create `src/tokens.css`** with all tokens listed in the spec section 2. Values are exact as specified in `docs/superpowers/specs/2026-10-23-design-system-refactor.md` §2.1–2.3. File must open with `:root {` and close with `}`. No selectors other than `:root`.

- [ ] **Step 2: Verify token count**
  ```bash
  grep -c "^\s*--" src/tokens.css
  ```
  Expected: ≥ 42 lines (one per token). If fewer, recheck spec coverage.

- [ ] **Step 3: Commit**
  ```bash
  git add src/tokens.css
  git commit -m "feat: add design token foundation"
  ```

---

### Task 2: Apply Tokens to Global CSS Baseline

**Files:**
- Modify: `src/index.css` (add `@import "./tokens.css";` as first line; change `body { background: ... }` to `var(--bg)`, `color` to `var(--text)`)
- Modify: `src/App.css` (replace every hardcoded hex with the matching token; keep all class definitions, change only values)
- Modify: `src/brand.css` (replace `#075bff` → `var(--primary)`, `#061c3d` → `var(--text)`, etc.)

**Interfaces:**
- Consumes: all tokens from Task 1
- Produces: a build where `grep -rE "color:\s*#|background:\s*#|border.*:\s*#" src/App.css src/brand.css src/index.css` returns zero matches

- [ ] **Step 1: Add token import to `src/index.css`**

  Insert `@import "./tokens.css";` as the first line of `src/index.css`, before any existing `@font-face` or `:root` blocks.

- [ ] **Step 2: Replace hardcoded values in `src/index.css`**

  Change `:root { font-size: 90%; ... }` — keep font-size and font-family, but add `color-scheme: light;` if not present. Remove any hex color variables that duplicate `tokens.css`.

- [ ] **Step 3: Replace hardcoded values in `src/App.css`**

  Mapping to apply:
  - `#075bff` → `var(--primary)`
  - `#061c3d` → `var(--text)` (when used as text color) or leave as-is for sidebar bg (Task 3 removes the dark sidebar entirely)
  - `#f7f9fc` → `var(--bg)`
  - `#fff` → `var(--surface)`
  - `#dfe7f0` or `#e2e8f0` → `var(--border)`
  - `#5f7088` or `#64748b` → `var(--text-muted)`
  - `#172b4d` or `#0f172a` → `var(--text)`
  - Font sizes: `0.78rem` → `var(--text-sm)`, `0.69rem` → `var(--text-label)`, etc.

  Do not change layout values (widths, heights, padding numbers) — only color and font-size values.

- [ ] **Step 4: Replace hardcoded values in `src/brand.css`**

  Same mapping as Step 3.

- [ ] **Step 5: Verify zero hardcoded hex in modified files**
  ```bash
  grep -En "color:\s*#|background(-color)?:\s*#|border[^:]*:\s*[0-9]+px[^;]*#" \
    src/App.css src/brand.css src/index.css
  ```
  Expected: no output.

- [ ] **Step 6: Build check**
  ```bash
  npm run build 2>&1 | tail -5
  ```
  Expected: `built in` with no errors.

- [ ] **Step 7: Visual spot-check of untouched screens**

  Start dev server (`npm run dev`), log in, and open `RequestDirectory`, `Analyses`, and `FinancialExceptions`. Each must render with correct layout — no broken colors, no invisible text. Screenshot or note any regressions before continuing.

- [ ] **Step 8: Commit**
  ```bash
  git add src/index.css src/App.css src/brand.css
  git commit -m "feat: apply design tokens to global CSS baseline"
  ```

---

### Task 3: Shell — Icon Rail + Topbar

**Files:**
- Rewrite: `src/shell.css` (complete replacement)
- Modify: `src/App.tsx` lines 1037–1038 (change `sidebarCollapsed` default) and topbar JSX (lines ~1465–1480)

**Interfaces:**
- Consumes: `--sidebar-width`, `--sidebar-width-expanded`, `--topbar-height`, `--primary`, `--primary-faint`, `--primary-ring`, `--surface`, `--border`, `--text`, `--text-muted`, `--text-subtle`, `--text-sm`, `--text-label`
- Produces CSS classes:
  - `.shell` → `display: grid; grid-template-columns: var(--sidebar-width) 1fr; min-height: 100vh`
  - `.shell.shell-expanded` → `grid-template-columns: var(--sidebar-width-expanded) 1fr`
  - `.sidebar` → `width: var(--sidebar-width); background: var(--surface); border-right: 1px solid var(--border); height: 100dvh; overflow: hidden`
  - `.sidebar-head` → logo area, 56px tall, centered icon
  - `.nav-rail-item` → icon button 40×40px, centered, `border-radius: var(--radius-md)`
  - `.nav-rail-item:hover` → `background: var(--surface-muted); color: var(--text)`
  - `.nav-rail-item.active` → `background: var(--primary-faint); color: var(--primary)`
  - `.nav-rail-item:focus-visible` → `outline: 3px solid var(--primary-ring)`
  - `.nav-rail-tooltip` → CSS-only tooltip: `position: absolute; left: calc(100% + 8px); white-space: nowrap; background: var(--text); color: var(--surface); font-size: var(--text-label); padding: 4px 8px; border-radius: var(--radius-sm); pointer-events: none; opacity: 0`; shown via `.nav-rail-item:hover .nav-rail-tooltip { opacity: 1 }` with `transition-delay: 200ms`
  - `.nav-rail-divider` → `height: 1px; background: var(--border); margin: 4px 8px`
  - `.sidebar-foot` → avatar button centered, 40×40px
  - `.sidebar-expanded-label` → `display: none` in rail mode; `display: block` in `.shell-expanded`
  - `.topbar` → `height: var(--topbar-height); background: var(--surface); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 24px; justify-content: space-between`
  - `.topbar-title` → `font-size: var(--text-md); font-weight: var(--weight-bold); color: var(--text)`
  - `.topbar-actions` → flex row, gap 8px, right side of topbar
  - `.main-area` → `min-width: 0; display: flex; flex-direction: column`
  - Mobile (≤760px): `.sidebar` slides in as overlay (`position: fixed; z-index: 40; transform: translateX(-100%)` → `translateX(0)` when `.open`); `.shell` and `.shell-expanded` both `display: block`

- [ ] **Step 1: Change `sidebarCollapsed` default in `src/App.tsx`**

  At line 1038: change `useState(false)` to `useState(true)`.

  This makes the icon rail the default state. The toggle button expands to 220px.

- [ ] **Step 2: Update topbar JSX in `src/App.tsx`**

  In the topbar `<header>` (around line 1465), ensure:
  - Left: `<span className="topbar-title">{currentSection}</span>` where `currentSection` is the label of the active nav group
  - Right: existing account trigger (avatar + name) moved here from sidebar footer, keeping the same `accountMenuOpen` toggle logic

  The `currentSection` value comes from `navGroups.find(g => g.pages.includes(currentPage))?.title ?? nav.find(n => n.page === currentPage)?.label ?? ""`.

- [ ] **Step 3: Add `topbarActions` slot to topbar JSX in `src/App.tsx`**

  Add `<div className="topbar-actions" id="topbar-actions" />` between the title and the account area. This empty div is populated by individual screens via a portal or a prop passed down — use a simple `topbarAction` prop on each page component if needed. (This is optional — screens can render actions in their own page-header instead.)

- [ ] **Step 4: Rewrite `src/shell.css`**

  Implement all classes listed in the Interfaces block above. Delete the entire previous content. Use only `var(--token)` values.

  Key layout rules:
  ```
  .shell                 → grid: var(--sidebar-width) 1fr
  .shell.shell-expanded  → grid: var(--sidebar-width-expanded) 1fr
  .sidebar               → 60px wide, flex column, fixed height 100dvh
  .sidebar-head          → 56px, display grid, place-items center
  .nav-rail-item         → position relative (for tooltip)
  .sidebar-foot          → margin-top auto
  ```

- [ ] **Step 5: Verify focus ring present**
  ```bash
  grep "focus-visible" src/shell.css
  ```
  Expected: at least one rule targeting `.nav-rail-item:focus-visible`.

- [ ] **Step 6: Build check**
  ```bash
  npm run build 2>&1 | tail -5
  ```

- [ ] **Step 7: Visual check at all 3 viewports**

  Start dev server. Verify:
  - 1440px: 60px icon rail visible, tooltips appear on hover, toggle expands to 220px with labels
  - 768px: same as desktop or mobile overlay, no content overlap
  - 390px: sidebar hidden by default, opens as overlay via existing `menuOpen` toggle, bottom-nav visible

- [ ] **Step 8: Commit**
  ```bash
  git add src/shell.css src/App.tsx
  git commit -m "feat: redesign shell as icon rail with topbar"
  ```

---

### Task 4: Component Library

**Files:**
- Create: `src/components.css`
- Modify: `src/index.css` — add `@import "./components.css";` after the tokens import

**Interfaces:**
- Consumes: all tokens from Task 1
- Produces reusable classes (these names are locked — Tasks 5–8 use them):

  **Buttons:**
  - `.btn` → base: `display: inline-flex; align-items: center; gap: 6px; border: 1px solid transparent; border-radius: var(--radius-md); font: inherit; font-size: var(--text-sm); font-weight: var(--weight-semibold); cursor: pointer; transition: background 140ms`
  - `.btn-sm` → `height: 30px; padding: 0 10px; font-size: var(--text-caption)`
  - `.btn-md` → `height: 36px; padding: 0 14px` (default)
  - `.btn-lg` → `height: 42px; padding: 0 18px; font-size: var(--text-base)`
  - `.btn-primary` → `background: var(--primary); color: var(--surface); border-color: var(--primary)`
  - `.btn-primary:hover` → `background: var(--primary-hover)`
  - `.btn-secondary` → `background: var(--surface); color: var(--text); border-color: var(--border-strong)`
  - `.btn-ghost` → `background: transparent; color: var(--text-muted); border-color: transparent`
  - `.btn-ghost:hover` → `background: var(--surface-muted); color: var(--text)`
  - `.btn-danger` → `background: var(--danger); color: var(--surface); border-color: var(--danger)`
  - All `.btn` variants: `:focus-visible` → `outline: 3px solid var(--primary-ring); outline-offset: 2px`

  **Badges:**
  - `.badge` → `display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: var(--radius-sm); font-size: var(--text-label); font-weight: var(--weight-semibold)`
  - `.badge-success` → `background: var(--success-bg); color: var(--success)`
  - `.badge-warning` → `background: var(--warning-bg); color: var(--warning)`
  - `.badge-danger` → `background: var(--danger-bg); color: var(--danger)`
  - `.badge-info` → `background: var(--info-bg); color: var(--info)`
  - `.badge-neutral` → `background: var(--surface-muted); color: var(--text-muted)`

  **Cards:**
  - `.card` → `background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg)`
  - `.card-body` → `padding: var(--space-5)`
  - `.card-header` → `padding: var(--space-4) var(--space-5); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between`
  - `.card-footer` → `padding: var(--space-3) var(--space-5); border-top: 1px solid var(--border)`

  **Data table:**
  - `.data-table` → `width: 100%; border-collapse: collapse; font-size: var(--text-sm)`
  - `.data-table thead th` → `font-size: var(--text-label); font-weight: var(--weight-semibold); text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); padding: 8px 12px; border-bottom: 1px solid var(--border-strong); text-align: left`
  - `.data-table tbody td` → `padding: 10px 12px; border-bottom: 1px solid var(--border); color: var(--text); vertical-align: middle`
  - `.data-table tbody tr:hover` → `background: var(--surface-muted); cursor: pointer`
  - `.data-table tbody tr.selected` → `background: var(--primary-faint)`
  - `.data-table-wrap` → `overflow-x: auto; border: 1px solid var(--border); border-radius: var(--radius-lg)`

  **Detail panel:**
  - `.detail-panel` → `position: fixed; top: 0; right: 0; width: 480px; max-width: 100vw; height: 100dvh; background: var(--surface); border-left: 1px solid var(--border); z-index: 50; display: flex; flex-direction: column; transform: translateX(100%); transition: transform 240ms ease`
  - `.detail-panel.open` → `transform: translateX(0)`
  - `.detail-panel-header` → `flex: none; padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: flex-start; justify-content: space-between; gap: 12px`
  - `.detail-panel-body` → `flex: 1; overflow-y: auto; padding: 20px`
  - `.detail-panel-footer` → `flex: none; padding: 12px 20px; border-top: 1px solid var(--border); display: flex; gap: 8px`
  - `.detail-panel-section` → `margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid var(--border)`
  - `.detail-panel-section:last-child` → `border-bottom: 0; margin-bottom: 0`
  - `.detail-panel-section-title` → `font-size: var(--text-label); font-weight: var(--weight-semibold); text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 12px`
  - `.detail-panel-field` → `display: grid; grid-template-columns: 1fr 1fr; gap: 12px 8px; font-size: var(--text-sm)`
  - `.detail-panel-field dt` → `color: var(--text-muted)`
  - `.detail-panel-field dd` → `color: var(--text); font-weight: var(--weight-medium); margin: 0`
  - `.detail-panel-overlay` → `position: fixed; inset: 0; background: rgba(15,23,42,0.35); z-index: 49`

  **KPI card:**
  - `.kpi-card` → `.card` + no extra class needed; internal structure uses these:
  - `.kpi-icon` → `width: 32px; height: 32px; border-radius: var(--radius-md); display: grid; place-items: center; flex: none`
  - `.kpi-label` → `font-size: var(--text-label); font-weight: var(--weight-medium); color: var(--text-muted); margin-bottom: 8px`
  - `.kpi-value` → `font-size: var(--text-xl); font-weight: var(--weight-bold); color: var(--text); letter-spacing: -0.04em; line-height: 1.1`
  - `.kpi-sub` → `font-size: var(--text-caption); color: var(--text-subtle); margin-top: 4px`

  **Page layout:**
  - `.page` → `width: min(100%, var(--content-max)); margin: 0 auto; padding: clamp(16px, 2vw, 24px)`
  - `.page-header` → `display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 20px`
  - `.page-title` → `font-size: var(--text-lg); font-weight: var(--weight-bold); color: var(--text); margin: 0`
  - `.page-subtitle` → `font-size: var(--text-sm); color: var(--text-muted); margin: 4px 0 0`

  **Empty and error states:**
  - `.empty-state` → `display: grid; place-items: center; padding: 48px 24px; border: 1px dashed var(--border-strong); border-radius: var(--radius-lg); text-align: center; color: var(--text-muted); font-size: var(--text-sm)`
  - `.error-state` → same as `.empty-state` but `border-color: var(--danger); color: var(--danger)`

- [ ] **Step 1: Create `src/components.css`** with all classes above.

- [ ] **Step 2: Import in `src/index.css`**

  Add `@import "./components.css";` as the third import line (after `tokens.css`).

- [ ] **Step 3: Verify class names exist**
  ```bash
  for cls in btn btn-primary btn-secondary badge badge-success card card-body \
    data-table detail-panel detail-panel-header kpi-icon kpi-value \
    empty-state page page-title; do
    grep -q "\.$cls[^-]" src/components.css && echo "✓ $cls" || echo "✗ MISSING $cls"
  done
  ```
  Expected: all `✓`.

- [ ] **Step 4: Build check**
  ```bash
  npm run build 2>&1 | tail -5
  ```

- [ ] **Step 5: Commit**
  ```bash
  git add src/components.css src/index.css
  git commit -m "feat: add reusable component CSS library"
  ```

---

### Task 5: Visão Geral Redesign (Reference Screen)

**Files:**
- Rewrite: `src/dashboard.css`
- Modify: `src/DashboardOverview.tsx` — adopt new class names + restructure JSX

**Interfaces:**
- Consumes from Task 4: `.page`, `.page-header`, `.page-title`, `.card`, `.card-body`, `.card-header`, `.kpi-icon`, `.kpi-label`, `.kpi-value`, `.kpi-sub`, `.empty-state`, `.badge-*`
- Consumes from Task 1: `--warning`, `--warning-bg`, `--primary`, `--primary-faint`, `--border`, `--text-muted`, `--text-subtle`, `--text-label`, `--text-xl`, `--text-2xl`
- Produces dashboard-specific classes:
  - `.dash-kpi-strip` → `display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-4); margin-bottom: var(--space-5)`
  - `.dash-kpi-card` → `.card` semantics + `padding: var(--space-5); display: flex; flex-direction: column; gap: var(--space-2)`
  - `.dash-attention` → `display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); border-left: 3px solid var(--warning); background: var(--warning-bg); border-radius: var(--radius-md); margin-bottom: var(--space-4); font-size: var(--text-sm)`
  - `.dash-trend-card` → `.card` semantics + full-width, `margin-bottom: var(--space-4)`
  - `.dash-trend-tabs` → period selector: flex, gap 4px; active button: `background: var(--primary-faint); color: var(--primary)`
  - `.dash-groups` → `display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-4); margin-bottom: var(--space-4)`
  - `.dash-group-card` → `.card` semantics
  - `.dash-status-row` → `display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-top: 1px solid var(--border); font-size: var(--text-sm)`
  - `.dash-status-dot` → `width: 6px; height: 6px; border-radius: 50%; flex: none`
  - `.dash-mini-chart` → bar chart, `height: 48px`, bars use `var(--primary)` at varying opacities
  - `.dash-card-link` → `display: inline-flex; align-items: center; gap: 4px; margin-top: var(--space-3); font-size: var(--text-sm); font-weight: var(--weight-semibold); color: var(--primary); background: none; border: none; cursor: pointer; padding: 0`
  - `.dash-reports-cta` → `.card` semantics + link to Relatórios, full-width row at bottom

**DashboardOverview.tsx structure changes:**

The exported components (`DashboardOverview` and `DashboardReports`) keep their signatures unchanged. Internal JSX restructure only:

```
DashboardOverview returns:
  <div className="page">
    <div className="page-header">
      <div>
        <h1 className="page-title">Visão Geral</h1>
      </div>
      <div> [refresh button: btn btn-ghost btn-sm + timestamp] </div>
    </div>
    <div className="dash-kpi-strip">
      {4 × <div className="dash-kpi-card card card-body">
              <div className="kpi-label">...</div>
              <div className="kpi-value">...</div>
              <div className="kpi-sub">...</div>
            </div>}
    </div>
    {attention && <div className="dash-attention">...</div>}
    <div className="dash-trend-card card">
      <div className="card-header">Tendência <span className="dash-trend-tabs">...</span></div>
      <div className="card-body">[SVG chart]</div>
    </div>
    <div className="dash-groups">
      {4 × <div className="dash-group-card card card-body">...</div>}
    </div>
    <button className="dash-reports-cta card card-body" onClick={...}>...</button>
  </div>
```

- [ ] **Step 1: Rewrite `src/dashboard.css`**

  Delete all previous content. Write only dashboard-specific classes listed above. All values must use tokens.

- [ ] **Step 2: Verify zero hardcoded hex in `src/dashboard.css`**
  ```bash
  grep -E ":\s*#[0-9a-fA-F]" src/dashboard.css
  ```
  Expected: no output.

- [ ] **Step 3: Update `src/DashboardOverview.tsx` JSX structure**

  Restructure to the layout described in the Interfaces block. Keep all existing data-fetching logic (`useDashboardData`, `useDashboardSeries`, `getDashboardMetrics`) unchanged — only change JSX and class names.

- [ ] **Step 4: Build check**
  ```bash
  npm run build 2>&1 | tail -5
  ```

- [ ] **Step 5: Visual check — Visão Geral at 3 viewports**

  At 1440px: KPI strip shows 4 cards in a row; groups grid is 2 columns; trend chart full-width.
  At 768px: groups drop to 1 column; KPI strip wraps to 2×2.
  At 390px: everything single-column; page padding ≥ 16px.

- [ ] **Step 6: Commit**
  ```bash
  git add src/dashboard.css src/DashboardOverview.tsx
  git commit -m "feat: redesign Visão Geral as reference screen"
  ```

---

### Task 6: Parceiros Redesign

**Files:**
- Rewrite: `src/partner-directory.css`
- Modify: `src/PartnerDirectory.tsx` — add `selectedOrg` state and detail panel

**Interfaces:**
- Consumes from Task 4: `.page`, `.page-header`, `.page-title`, `.btn`, `.btn-primary`, `.btn-md`, `.btn-ghost`, `.btn-sm`, `.badge-success`, `.badge-neutral`, `.data-table`, `.data-table-wrap`, `.detail-panel`, `.detail-panel-header`, `.detail-panel-body`, `.detail-panel-footer`, `.detail-panel-section`, `.detail-panel-section-title`, `.detail-panel-field`, `.detail-panel-overlay`, `.empty-state`, `.error-state`
- Produces only layout-specific classes:
  - `.partner-dir` → `display: flex; gap: var(--space-4)` (wraps table + panel side-by-side when panel open, otherwise table full-width)
  - `.partner-dir-main` → `flex: 1; min-width: 0`
  - `.partner-dir-toolbar` → `display: flex; gap: var(--space-3); margin-bottom: var(--space-4); align-items: center`
  - `.partner-search` → search input: `height: 36px; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 0 12px; font-size: var(--text-sm); flex: 1; max-width: 320px`
  - `.partner-filter` → filter select: same height/border as search

**PartnerDirectory.tsx state changes:**

Add to existing state:
```tsx
const [selectedOrg, setSelectedOrg] = useState<OrganizationListItem | null>(null);
```

Table rows: `onClick={() => setSelectedOrg(item)}` and `aria-selected={selectedOrg?.slug === item.slug}` + `.selected` class on the `<tr>`.

Detail panel rendered after the table wrap:
```tsx
<>
  <div
    className={`detail-panel${selectedOrg ? " open" : ""}`}
    role="dialog"
    aria-label={selectedOrg?.name ?? ""}
    aria-modal="true"
  >
    <div className="detail-panel-header">
      <div>
        <strong>{selectedOrg?.name}</strong>
        <div className="kpi-sub">{selectedOrg?.document}</div>
      </div>
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => setSelectedOrg(null)}
        aria-label="Fechar"
      >✕</button>
    </div>
    <div className="detail-panel-body">
      {/* sections: Informações, Plano, Aplicações, Histórico */}
      {/* content populated from existing OrganizationDetail data or inline summary */}
    </div>
    <div className="detail-panel-footer">
      <button className="btn btn-ghost btn-sm" style={{color: "var(--danger)"}}>Desativar</button>
      <button className="btn btn-primary btn-sm" onClick={() => props.navigate(selectedOrg!.slug)}>
        Abrir página completa
      </button>
    </div>
  </div>
  {selectedOrg && (
    <div
      className="detail-panel-overlay"
      onClick={() => setSelectedOrg(null)}
    />
  )}
</>
```

The existing `navigate` prop to `OrganizationDetail` is preserved — "Abrir página completa" still works.

- [ ] **Step 1: Rewrite `src/partner-directory.css`**

  Delete all previous content. Implement only the layout classes listed above. All other styling comes from `components.css`.

- [ ] **Step 2: Update `src/PartnerDirectory.tsx`**

  Add `selectedOrg` state. Add `onClick` and `aria-selected` to table rows. Add detail panel + overlay JSX after the table wrap. Keep all API calls and data-fetching unchanged.

- [ ] **Step 3: Verify empty and error states**

  In the browser, temporarily set `organizations = []` in component state (or rely on API returning empty). The `.empty-state` element must be visible with a descriptive message and a "Criar parceiro" action.

- [ ] **Step 4: Verify detail panel z-index**

  Open a panel. Inspect in DevTools: `.detail-panel` must have computed `z-index: 50`, higher than `.topbar` (which has no z-index set and stacks at auto / 0). Panel must visually overlay the topbar if the viewport is narrow.

- [ ] **Step 5: Build check**
  ```bash
  npm run build 2>&1 | tail -5
  ```

- [ ] **Step 6: Visual check at 3 viewports**

  1440px: panel slides in from right alongside the table (table narrows or panel overlays).
  768px: panel overlays the table as a full-overlay with backdrop.
  390px: panel is full-screen, close button accessible.

- [ ] **Step 7: Commit**
  ```bash
  git add src/partner-directory.css src/PartnerDirectory.tsx
  git commit -m "feat: redesign Parceiros with detail panel"
  ```

---

### Task 7: Usuários / Equipe Redesign

**Files:**
- Modify: `src/Users.tsx` — table + detail panel for platform users
- Modify: `src/TeamMembers.tsx` — same pattern for internal members
- Create: `src/users.css` — layout-specific only (same pattern as partner-directory.css)

**Interfaces:**
- Consumes from Task 4: `.page`, `.page-header`, `.page-title`, `.btn`, `.btn-primary`, `.btn-md`, `.btn-ghost`, `.btn-sm`, `.btn-danger`, `.badge-success`, `.badge-neutral`, `.badge-danger`, `.data-table`, `.data-table-wrap`, `.detail-panel`, `.detail-panel-*`, `.detail-panel-overlay`, `.empty-state`, `.error-state`
- Produces:
  - `.users-tabs` → sub-tab bar switching between Usuários and Equipe: `display: flex; border-bottom: 1px solid var(--border); margin-bottom: var(--space-4)`
  - `.users-tab` → tab button: `padding: 8px 16px; font-size: var(--text-sm); font-weight: var(--weight-medium); border: none; background: transparent; color: var(--text-muted); border-bottom: 2px solid transparent`
  - `.users-tab.active` → `color: var(--primary); border-bottom-color: var(--primary); font-weight: var(--weight-semibold)`
  - `.users-avatar` → `width: 28px; height: 28px; border-radius: var(--radius-md); background: var(--primary-faint); color: var(--primary); display: grid; place-items: center; font-size: var(--text-label); font-weight: var(--weight-bold); flex: none`

**Users.tsx structural changes:**

The sub-tab switcher lives in the parent (`App.tsx` renders either `<Users>` or `<TeamMembers>` based on `currentPage`). Instead, merge both into a tabbed view: App.tsx passes `currentPage` to `<Users>` and renders it for both `"users"` and `"team-members"` pages. `<Users>` renders the `.users-tabs` header and switches between user data and team member data internally.

State to add in `Users.tsx`:
```tsx
const [selectedUser, setSelectedUser] = useState<TeamUser | null>(null);
const [activeTab, setActiveTab] = useState<"users" | "team">("users");
```

Detail panel for users contains:
- Header: avatar initials + name + email + role badge
- Body sections:
  1. Conta: created date, last login, 2FA status (boolean from API)
  2. Permissões: role label (display-only for now, editable select if PUT endpoint exists)
  3. Acesso: passkeys count
- Footer: [Suspender conta — btn-danger btn-sm] [Fechar — btn-ghost btn-sm]

- [ ] **Step 1: Create `src/users.css`** with `.users-tabs`, `.users-tab`, `.users-tab.active`, `.users-avatar`.

- [ ] **Step 2: Modify `src/Users.tsx`**

  Add import for `./users.css`. Add `selectedUser` and `activeTab` state. Add `.users-tabs` header. Render `<data-table>` with `.users-avatar` in the first cell. Add detail panel JSX identical in structure to Task 6 but for `TeamUser` type. Keep all existing API calls.

- [ ] **Step 3: Update `src/TeamMembers.tsx`**

  If still a separate route, import `./users.css` and adopt the same `.data-table` class. Otherwise merge it into Users per the plan above.

- [ ] **Step 4: Verify empty state**

  Empty list must show `.empty-state` with message "Nenhum usuário encontrado" and a clear reason.

- [ ] **Step 5: Build check**
  ```bash
  npm run build 2>&1 | tail -5
  ```

- [ ] **Step 6: Visual check at 3 viewports**

  Check both tabs. Verify detail panel opens with correct user data. Verify role badge colors match badge-* classes.

- [ ] **Step 7: Commit**
  ```bash
  git add src/users.css src/Users.tsx src/TeamMembers.tsx
  git commit -m "feat: redesign Usuários/Equipe with tabbed detail panel"
  ```

---

### Task 8: Regras Comerciais Redesign

**Files:**
- Rewrite: `src/commercial-policies.css`
- Modify: `src/CommercialPolicies.tsx` — card list layout + detail panel + context copy

**Interfaces:**
- Consumes from Task 4: `.page`, `.page-header`, `.page-title`, `.page-subtitle`, `.btn`, `.btn-primary`, `.btn-md`, `.btn-ghost`, `.btn-sm`, `.badge-success`, `.badge-neutral`, `.card`, `.card-body`, `.card-header`, `.card-footer`, `.data-table`, `.detail-panel`, `.detail-panel-*`, `.detail-panel-overlay`, `.empty-state`
- Produces:
  - `.policies-list` → `display: grid; gap: var(--space-4)`
  - `.policy-card` → `.card` + internal structure:
    - Header: rule name + status badge + "Ver →" button
    - Body: 3 preview items (service + price) + "+ N serviços" if more
    - Meta footer: "Criada em DATE · Aplicada a N parceiros"
  - `.policy-preview-item` → `display: flex; justify-content: space-between; font-size: var(--text-sm); padding: 6px 0; border-top: 1px solid var(--border); color: var(--text-muted)` with `strong` for price in `var(--text)`
  - `.policy-meta` → `font-size: var(--text-caption); color: var(--text-subtle)`

**CommercialPolicies.tsx structural changes:**

Current component is 759 lines — the redesign simplifies the rendered output significantly. Keep all form state and API logic; change only the render tree.

Page structure:
```
<div className="page">
  <div className="page-header">
    <div>
      <h1 className="page-title">Regras Comerciais</h1>
      <p className="page-subtitle">Versões de preço e condições aplicadas a organizações.</p>
    </div>
    <button className="btn btn-primary btn-md" onClick={openCreateForm}>+ Nova regra</button>
  </div>
  <div className="policies-list">
    {policies.map(p => (
      <div className="policy-card card" key={p.id}>
        <div className="card-header">
          <strong>{p.name}</strong>
          <span className={`badge badge-${p.active ? "success" : "neutral"}`}>
            {p.active ? "Ativa" : "Arquivada"}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelected(p)}>Ver →</button>
        </div>
        <div className="card-body">
          {previewItems(p).map(item => (
            <div className="policy-preview-item" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.price}</strong>
            </div>
          ))}
          {p.items.length > 3 && (
            <p className="policy-meta">+ {p.items.length - 3} serviços</p>
          )}
        </div>
        <div className="card-footer">
          <span className="policy-meta">
            Criada em {formatDate(p.valid_from)} · Aplicada a {p.org_count ?? "—"} parceiros
          </span>
        </div>
      </div>
    ))}
  </div>
  [detail panel for selected policy]
</div>
```

Detail panel body for a policy:
- Section 1: Serviços — `.data-table` with item label + price columns
- Section 2: Parceiros — list of org names using this rule
- Section 3: Versões — timeline or simple list of previous `valid_from` dates

- [ ] **Step 1: Rewrite `src/commercial-policies.css`** with only the classes listed above.

- [ ] **Step 2: Verify zero hardcoded hex**
  ```bash
  grep -E ":\s*#[0-9a-fA-F]" src/commercial-policies.css
  ```

- [ ] **Step 3: Modify `src/CommercialPolicies.tsx`**

  Add `selectedPolicy` state. Restructure render to card list. Keep all existing form logic for creating/editing policies — the creation form can open in the detail panel or remain as a modal. Add detail panel JSX.

- [ ] **Step 4: Build check**
  ```bash
  npm run build 2>&1 | tail -5
  ```

- [ ] **Step 5: Visual check**

  Verify the page now has a clear title and subtitle explaining what it is. Verify each policy card shows name, status, preview items, and meta. Verify the detail panel shows the full item table.

- [ ] **Step 6: Commit**
  ```bash
  git add src/commercial-policies.css src/CommercialPolicies.tsx
  git commit -m "feat: redesign Regras Comerciais with context and detail panel"
  ```

---

### Task 9: Cleanup and Final Verification

**Files:**
- Delete: `src/operational-polish.css` (after confirming no external import)
- Delete: `src/form-system.css` (after confirming no external import)
- Modify: any file still importing deleted CSS

**Interfaces:**
- Produces: zero hardcoded hex across all component CSS files; zero imports to deleted files

- [ ] **Step 1: Check for imports of files to delete**
  ```bash
  grep -rn "operational-polish\|form-system" src/
  ```
  For each result: remove the import line from the importing file.

- [ ] **Step 2: Delete deprecated files**
  ```bash
  git rm src/operational-polish.css src/form-system.css
  ```
  If either file has content still needed, move it to `components.css` or `tokens.css` first.

- [ ] **Step 3: Global hardcoded-hex audit**
  ```bash
  grep -rEn "color:\s*#[0-9a-fA-F]|background(-color)?:\s*#[0-9a-fA-F]" src/*.css
  ```
  Expected: zero results in any `.css` file under `src/`. If results exist, replace each with the nearest token.

- [ ] **Step 4: Full build**
  ```bash
  npm run build
  ```
  Expected: exits 0 with no errors or warnings about missing files.

- [ ] **Step 5: Full visual walkthrough**

  Open dev server. Walk every route in the nav. For each of the 4 redesigned screens, verify:
  - Loading state (skeleton or spinner visible)
  - Populated state (data renders correctly)
  - Empty state (`.empty-state` visible if applicable)
  - Responsive at 390px

- [ ] **Step 6: Run existing tests**
  ```bash
  npm test 2>&1 | tail -20
  ```
  Expected: all passing. If any fail due to CSS class renames, update the test to use new class names.

- [ ] **Step 7: Final commit**
  ```bash
  git add -A
  git commit -m "chore: remove deprecated CSS files and pass final audit"
  ```
