# Untangle — Progress

> Living doc. Mirrored to the Obsidian vault at
> `E:\brain\Projects\Hackathon Extension - Untangle.md` (vault has the summary;
> this file has the detail). Update both when you stop working.
> ⚠️ Vault copy is STALE as of 2026-07-04 evening (E: drive disconnected) —
> everything below "Design system + Coach chat" is not in the vault yet.

## Status: UI craft pass — primitives + fixed selection button ✅

**2026-07-04 latest — stopped the class-soup, fixed the blocking bug:**
- **P0 BUG FIXED — floating ✨ button was near-unclickable.** `content.ts` used
  to remove the button on scroll (so scrolling to reach it killed it) and drifted
  with page coords. Now: viewport-fixed, **tracks the selection as you scroll**,
  clamps on-screen (flips above if it'd clip), 40px hit target, dismiss only on
  click-away/Escape/empty-selection.
- **Root-caused the "sizing is wrong" complaint** (per user's vault ui-ux.md:
  "Claude generating 20-class className strings everywhere"). Extracted shared
  primitives → `entrypoints/sidepanel/ui.tsx`: `Button` (sm/md/lg × primary/
  grass/ghost/option, 2.5D built in), `Card`, `Chip`, `Stat`, `IconButton`.
  ONE size scale, no more per-element guessing.
- **Refactored all 6 surfaces** to use them; deleted the bespoke strings.
- **Quiz CTA fixed** — now full-width `lg` (48px) with proper footer padding
  (was cramped/small). Real empty/loading/error states (icon + title + text).
- **Design system persisted** → `.interface-design/system.md` (gitignored) so
  sizing stops being re-guessed each session.
- Verified via screenshot (light + dark): CTA comfortably tall, even paddings.

## Earlier: 2.5D design system (light + dark) + map redesign + Gemini live ✅

**2026-07-04 latest — real 2.5D retheme (verified visually via screenshot):**
- Root cause of "looks like AI slop": the all-dark theme killed the chunky
  offset shadows that ARE the reference's signature (a dark shadow on a dark
  card is invisible). Interface-design skill confirmed: "shadows don't read on
  dark."
- **Rebuilt light-first** matching the reference `minimalist-ai-learning-
  dashboard`: soft paper canvas (#F1F4FA), white raised cards with solid
  `0 4px 0 0` offset shadows (`.pop` / `.pop-primary` / `.pop-green`), Nunito
  extrabold, blue+grass accents, press-down `.press` interaction. The 2.5D
  now actually reads.
- **All color goes through semantic tokens** (paper/card/line/ink in
  `assets/tailwind.css`), so **dark mode is a single token flip** under
  `:root[data-theme='dark']`.
- **Light/dark toggle** in the popup (`setTheme` in `utils/useSettings.ts`,
  applied to every surface via `data-theme` on <html>, persisted in settings).
- Floating ✨ button on the page is also chunky 2.5D now.
- Verified with a rendered preview screenshot (light + dark side by side)
  before shipping — not asserted.

## Earlier: map redesigned to vertical Progressive Path + Gemini key live ✅

**2026-07-04 latest — the big map rework (why it matters):**
- The React Flow pannable canvas was the WRONG metaphor for an ADHD focus
  tool — a 2D canvas you drag/zoom around adds cognitive load, and a
  horizontal tree in a 380px panel is cramped by construction. Every earlier
  UX bug (zoom-mush, hand-tool, sideways sprawl) was a symptom of that.
- **Replaced with `sidepanel/ConceptPath.tsx`**: a vertical column of concept
  cards. Tap a card → explanation reveals inside it + children indent below
  with a connector line (framer-motion height animation). You read
  top-to-bottom like a learning path. Explored cards get a green ✓.
- **Zero pan/zoom/drag** — it's just a scroll, so all those bugs are gone by
  construction. Removed @xyflow/react, d3-hierarchy, utils/layout.ts.
- Formula cards now show the **sandbox inline** when opened (Sandbox.tsx is
  now self-contained: fetches its own spec).
- **Gemini key is in `.env` (real file, git-ignored) and VERIFIED live**
  (200 from gemini-2.5-flash). `.env.example` scrubbed back to placeholder.
  `.gitignore` fixed — WXT template was missing `.env`.

## Earlier: ALL PLANNED FEATURES BUILT ✅

**2026-07-04 late — full feature set complete, all build+typecheck green:**
- **Micro-quests** (`sidepanel/Quest.tsx`): "Quiz me" button appears once
  you've explored a node → 3 questions from the explored concepts → per-correct
  confetti + XP, completion bonus + confetti. Keyless demo uses a photosynthesis
  quiz (`fakeQuest`).
- **Sandbox** (`sidepanel/Sandbox.tsx`): clicking a *formula* node fetches a
  spec and shows sliders → mathjs evaluates → Recharts line redraws live.
  Keyless demo = projectile motion (`fakeSandbox`). Gemini output is PARSED by
  mathjs, never eval()'d.
- **In-panel gamification**: XP counter chip in the panel header with a
  floating "+N" pop animation on every gain; +3 XP per new branch explored,
  +5 per correct quiz answer, +15 per quest completed. All persisted via
  `bumpSession` in storage → shows through to popup + dashboard.
- **Accessibility toggles** (popup): dyslexia-friendly font (bundled
  OpenDyslexic, swaps whole UI + opens letter/line spacing) and reduce-motion
  (kills confetti + animations). Applied via `utils/useSettings.ts` →
  `data-*` attributes on `<html>`, synced across surfaces through storage.

Remaining optional stretch (NOT built): PDF.js viewer for PDF support,
speechSynthesis read-aloud. Everything from the core plan is done.

## Earlier: scaffold VERIFIED in Chrome + design system + Coach chat ✅

**2026-07-04 evening update:**
- End-to-end verified in Ahmed's Chrome (highlight → button → panel → tree)
- Map UX fixed after real testing: scroll pans (not zooms), nodes not
  draggable (click = expand only), camera auto-focuses clicked node + its
  children at readable zoom (fitView 0.85–1.1)
- Full redesign to the team's reference design system
  (`Downloads/minimalist-ai-learning-dashboard`): Nunito (bundled
  @fontsource, CSP-safe), primary #0F6CBD, 2.5D chunky shadows, rounded-20
  cards, dark palette (ink #181A1F / panel #22262D), tokens in
  `assets/tailwind.css`
- Side panel: **tabs Map | Coach** + context banner with exploration progress
- **Coach tab**: chat that automatically uses the WHOLE current webpage as
  context (captured by content script at untangle time — the student never
  screenshots/pastes into an AI app). Quick chips (Explain simply / Quiz me /
  Summarize), image attachments (≤3, → Gemini inline_data), history persists
  in `chrome.storage.local` (`chatHistory`/`chatStatus`), keyless demo mode
  answers with a canned line
- Popup + dashboard rethemed to the same tokens

## Original scaffold status (2026-07-04 afternoon)

Everything below builds clean (`npm run compile` + `npm run build` both pass).
The full pipeline works **without an API key** using a fake response — add
`WXT_GEMINI_API_KEY` to `.env` to switch on real Gemini calls (zero code changes).

## What's Built

- [x] WXT + React 19 + Tailwind v4 project, all feature libraries installed
- [x] **Content script** (`entrypoints/content.ts`) — watches selections ≥30
      chars, shows a floating "✨ Untangle" button near the selection (Shadow
      DOM, page CSS can't touch it), sends the text to the background worker
- [x] **Background worker** (`entrypoints/background.ts`) — opens the side
      panel (while the click gesture is fresh — this ordering matters),
      decomposes via Gemini or fake data, writes tree + XP/streak to storage.
      Toolbar icon also opens the panel (fallback path)
- [x] **Side panel** (`entrypoints/sidepanel/`) — React Flow node map with
      working progressive disclosure: root visible first, click to
      expand/collapse children, click shows plain-language explanation in a
      footer card. Nodes color-coded by kind (concept/definition/example/formula).
      d3-hierarchy tidy-tree layout = deterministic, no physics surprises
- [x] **Popup** (`entrypoints/popup/`) — streak/XP/today mini-stats + button
      to open the dashboard
- [x] **Dashboard** (`entrypoints/dashboard/`) — full-page analytics from real
      `chrome.storage.local` data: stat tiles, XP line chart, untangles bar
      chart (Recharts), topic chips. Live-updates via storage.onChanged
- [x] **Gemini client** (`utils/gemini.ts`) — all 3 prompts (decompose /
      quest / sandbox) with strict `responseSchema` JSON; quest + sandbox are
      written but not yet called from any UI (that's hackathon-day work)
- [x] **Storage** (`utils/storage.ts`) — xp/streak/sessions schema, streak
      logic (consecutive calendar days)

## Not Built Yet (hackathon-day playbook)

| Hours | Work |
|---|---|
| H0–5 | Node map polish: expand animations, better styling with design teammate, XP-per-expansion |
| H5–7 | Micro-quests UI (calls `generateQuest`), confetti (`canvas-confetti` is installed), XP awards |
| H7–9 | Dashboard polish, quest stats wiring |
| H9–11 | Sandbox UI (calls `generateSandbox`): sliders + mathjs eval + Recharts live plot. **Cut this first if behind** |
| H11–12 | Demo script + run-through. Demo on a Wikipedia physics page (guarantees a formula for the sandbox) |
| Stretch | Dyslexia font toggle, speechSynthesis read-aloud, PDF.js viewer |

## Known gotchas (read before debugging)

- Chrome's **built-in PDF viewer blocks content scripts** — that's why PDF is
  a stretch goal needing a bundled PDF.js viewer, not a bug in our code.
- `chrome.sidePanel.open()` **requires a user gesture** — that's why
  background.ts opens the panel FIRST, before the (slow) Gemini call.
- The **API key is baked into the build** via `.env` — fine for a demo build,
  never publish this extension with a key in it.
- Gemini sometimes returns `"null"` (string) for the root node's parentId —
  already normalized in `utils/gemini.ts`.

## How To Run

```
npm install
npm run dev              # dev build w/ hot reload → .output/chrome-mv3-dev
# or: npm run build      # production build → .output/chrome-mv3
```
Then: `chrome://extensions` → Developer mode ON → Load unpacked → select the
`.output/chrome-mv3-dev` (or `chrome-mv3`) folder. One-time; WXT reloads after.

Try it: open any Wikipedia article → select a paragraph (30+ chars) →
click the floating "✨ Untangle" button → side panel opens with the node map.
No `.env` key = photosynthesis fake tree (pipeline demo). With key = real AI.

## Where things live

See `docs/HOW-IT-WORKS.md` for the architecture walkthrough and debugging guide.
