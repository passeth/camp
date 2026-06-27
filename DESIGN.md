# Camp Design System

## 1. Atmosphere & Identity

Camp feels like a working study archive: calm, lightweight, and editorial enough for reading, but practical enough for repeated publishing. The signature is a paper-like neutral surface with compact research-window panels and one clear black action language.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
|------|-------|-------|------|-------|
| Surface/primary | --background | #f7f7f2 | #171717 | Page background |
| Surface/elevated | --surface | #ffffff | #242424 | Cards, forms, modal panels |
| Surface/soft | --surface-soft | #eef8f6 | #193832 | Gentle callouts |
| Text/primary | --foreground | #171717 | #f7f7f2 | Headlines, body |
| Text/secondary | --muted | #6d7280 | #b8bec8 | Captions, metadata |
| Border/default | --line | #e7e5dc | #3a3a34 | Dividers, inputs, card outlines |
| Accent/primary | --brand | #111111 | #f7f7f2 | Primary actions |
| Accent/blue | --accent-blue | #5b9dff | #88c8ff | Topic and informational accents |
| Accent/mint | --accent-mint | #76dec6 | #76dec6 | Press and upload success accents |
| Accent/lime | --accent-lime | #d7f45a | #d7f45a | Highlights |
| Accent/violet | --accent-violet | #9a6cff | #b79cff | Study-log accent |
| Status/warning-bg | --status-warning-bg | #fff4d6 | #3c2f14 | Recoverable upload errors |
| Status/warning-text | --status-warning-text | #8a5a00 | #f0c766 | Warning text |

### Rules

- Use `--brand` only for primary actions and high-contrast surfaces.
- Use one accent per content type or screen. Do not mix accents decoratively.
- Raw colors in new UI should map to this table first.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| Display | 72px | 500 | 0.98 | -0.055em | Large page titles |
| H1 | 48px | 500 | 1.02 | -0.05em | Primary section titles |
| H2 | 36px | 500 | 1.08 | -0.04em | Secondary section titles |
| H3 | 24px | 600 | 1.2 | -0.035em | Card titles |
| Body/lg | 18px | 400 | 1.75 | 0 | Lead paragraphs |
| Body | 16px | 400 | 1.6 | 0 | Default text |
| Body/sm | 14px | 400 | 1.5 | 0 | Secondary info |
| Caption | 12px | 600 | 1.4 | 0.08em | Metadata and labels |

### Font Stack

- Primary: `var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif`
- Mono: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`

### Rules

- Use compact tracking only where existing components already rely on it.
- Body text never goes below 14px.

## 4. Spacing & Layout

### Base Unit

All spacing derives from 4px.

| Token | Value | Usage |
|-------|-------|-------|
| --space-1 | 4px | Icon-to-label gaps |
| --space-2 | 8px | Tight inline groups |
| --space-3 | 12px | Compact control padding |
| --space-4 | 16px | Default card inner spacing |
| --space-5 | 20px | Form field groups |
| --space-6 | 24px | Comfortable panel padding |
| --space-8 | 32px | Card groups |
| --space-10 | 40px | Section inner spacing |
| --space-12 | 48px | Major section gaps |
| --space-16 | 64px | Page-level rhythm |

### Grid

- Max content width: 1280px.
- Breakpoints follow Tailwind defaults.
- Multi-column layouts collapse to one column below 768px.

## 5. Components

### Mesh Card

- **Structure**: patterned visual panel with one or two `research-window` overlays.
- **Variants**: content-type accent through `--mesh-color`.
- **Spacing**: `--space-4` to `--space-6`.
- **States**: hover may translate upward by 4px.
- **Accessibility**: decorative panels are hidden with `aria-hidden` when not informative.

### Research Window

- **Structure**: elevated white panel inside cards or hero visuals.
- **Variants**: compact metadata panel, large preview panel.
- **Spacing**: `--space-3` to `--space-5`.
- **States**: static by default.
- **Accessibility**: use semantic text when the panel contains real content.

### Pill Button

- **Structure**: rounded full button or link with high-contrast border.
- **Variants**: primary black fill, secondary white fill.
- **Spacing**: horizontal `--space-4` to `--space-5`, vertical `--space-2`.
- **States**: hover, active, and focus-visible states are required.

### Community Shell

- **Structure**: sticky top header, desktop left navigation rail, central content feed, and right recent-post rail.
- **Spacing**: rails use `--space-3` to `--space-4`; page grid gaps use `--space-6`.
- **States**: active navigation uses `--foreground` fill; inactive links use surface hover.
- **Responsiveness**: left rail collapses into top horizontal nav below the desktop breakpoint; recent posts move below the content on narrow screens.
- **Sticky behavior**: the right recent-post rail sticks at the shell/grid-item level on desktop so it remains visible while the central feed scrolls.

### Feed Item

- **Structure**: one bordered surface per post with category/date meta, title, excerpt, tags, optional pinned state, and a compact open action.
- **Spacing**: inner padding uses `--space-4`; stacked feed gap uses `--space-3`.
- **States**: hover strengthens the border and title color without changing layout dimensions.
- **Usage**: default post-list pattern for Topics, News Digest, Study Log, and home recent posts.

### Wall Climb Item

- **Structure**: two-part row with an external-link preview card and a shared-note summary. The preview card uses the source link's provided image metadata when available, with title, description, and host below the image.
- **Spacing**: item padding uses `--space-4`; preview content uses `--space-4`.
- **States**: preview card hover strengthens the border and opens the source link in a new tab.
- **Usage**: 벽타기 link collection entries where the original link should stay one click away from the listing page while preserving the link's native preview image.

### Community Header

- **Structure**: compact bordered surface above a feed with eyebrow, page title, one-line description, and one or two compact actions.
- **Spacing**: inner padding uses `--space-4`; bottom gap uses `--space-5`.
- **Typography**: title uses H2/H3 scale rather than Display scale so posts remain visible in the first viewport.
- **Usage**: home and board-style index pages where the feed is the primary experience.

### Comment Thread

- **Structure**: reply composer followed by comment rows with a slim left rail and inline delete controls.
- **Spacing**: composer and rows use `--space-4`; comment list gap uses `--space-3`.
- **States**: loading, empty, success, and error messages stay inline inside the thread area.
- **Accessibility**: inputs keep explicit labels, with compact labels visually hidden when needed.

## 6. Motion & Interaction

### Timing

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | 150ms | ease-out | Button hover and active states |
| Standard | 200ms | ease-in-out | Card hover and panel changes |
| Emphasis | 300ms | cubic-bezier(0.16, 1, 0.3, 1) | Modal entry and preview focus |

### Rules

- Animate only `transform`, `opacity`, and color transitions.
- Every interactive element needs visible hover and focus states.
- Keep automatic motion minimal for reading surfaces.

## 7. Depth & Surface

### Strategy

Mixed, with borders as the default and soft shadows reserved for preview panes or modal-level surfaces.

| Level | Value | Usage |
|-------|-------|-------|
| Border/default | 1px solid var(--line) | Cards, dividers, form controls |
| Shadow/preview | 0 20px 60px rgba(23, 23, 23, 0.09) | Deck and content previews |
| Shadow/modal | 0 24px 80px rgba(23, 23, 23, 0.18) | Fullscreen overlays |
