# How Unravel uses Gemini

Unravel is built around Gemini — it is not a bolt-on. The whole product (turn a
wall of text a struggling student can't face into a calm, interactive breakdown)
only exists because Gemini can read, structure, and reason over messy real-world
material. Five distinct Gemini call types, all in `utils/gemini.ts`, model
`gemini-2.5-flash`.

## The five ways we use Gemini

| # | Call | Gemini capability | Where |
|---|------|-------------------|-------|
| 1 | **Decompose (text)** | Structured output (`responseSchema`) → typed concept tree | `decompose()` |
| 2 | **Decompose (vision)** | **Multimodal** — reads a screenshot of a PDF/diagram/notes | `decomposeImage()` |
| 3 | **Coach chat** | Long-context (whole page) + **multimodal** image context + `system_instruction` | `chat()` |
| 4 | **Micro-quest** | Structured output → quiz JSON from the concepts | `generateQuest()` |
| 5 | **Sandbox** | Structured output → a parameterised math model extracted from prose | `generateSandbox()` |

### 1 & 2 — Decompose: the core
A highlighted paragraph (or a screenshot) becomes a strict-JSON concept tree
(`{ topic, nodes: [{ id, parentId, label, kind, summary, explanation }] }`) via
`responseSchema`, so the model *cannot* return unparseable text. The prompt is
tuned for the audience: ≤3 levels deep, ≤4 children, summaries ≤12 words —
because the users have ADHD and small chunks are the point.

### 2 — Vision is how PDFs work
Chrome sandboxes its PDF viewer, so no extension can read PDF text with a content
script. We sidestep that entirely: `chrome.tabs.captureVisibleTab()` → the PNG
goes to Gemini vision (`inline_data`) → the same concept tree. This means Unravel
works on the PDFs students actually study from (e.g. PMT), on diagrams, and on
photos of handwritten notes — **only possible because Gemini is multimodal.**

### 3 — Coach chat with automatic context
The Coach tab answers questions using the **whole page** (or the captured image)
as context, passed every turn — the student never screenshots-and-pastes into a
separate AI app. Uploaded images (a worksheet photo) ride along as `inline_data`.
A `system_instruction` enforces short, plain-language, non-patronising answers.

### 4 & 5 — Quests and the interactive sandbox
Quests: Gemini turns the explored concepts into a 3-question confidence check
(strict JSON). Sandbox: for a formula, Gemini returns a parameterised spec
(`expression`, variables, ranges) that we evaluate **safely with mathjs — never
`eval`** — and plot live. Both are structured-output calls.

## Why this is *provably* Gemini
- A **"Gemini 2.5 Flash" status strip** sits at the bottom of the panel and its
  dot **pulses while a real call is in flight** — a judge sees the AI working,
  live, not a canned response. In demo mode (no key) it honestly says so.
- Every call uses `responseSchema` / multimodal `inline_data` — Gemini-specific
  features, visible in `utils/gemini.ts`.

## Engineering notes
- Plain REST `fetch` from the background service worker (no SDK needed there),
  `responseMimeType: application/json` + `responseSchema` for reliable parsing.
- Key from `.env` → `WXT_GEMINI_API_KEY`, baked at build (fine for a hackathon
  demo, never a published build; `.env` is git-ignored).
- Graceful fallback to bundled sample data when no key is set, so the UX is
  always demoable — but the status strip never claims live AI when it isn't.
