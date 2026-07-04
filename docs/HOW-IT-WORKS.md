# How Untangle Works — team explainer

Short version of "how does a Chrome extension even work", specific to this repo.
For progress/status see `PROGRESS.md`.

## The 5 surfaces

A Chrome extension isn't one app — it's several isolated mini-apps that talk
through messages and shared storage:

```
┌─────────────── any webpage ────────────────┐
│  content.ts (injected into the page)       │
│  • sees your text selections               │
│  • draws the floating ✨ button             │
└──────────────────┬─────────────────────────┘
                   │ chrome.runtime.sendMessage({type:'UNTANGLE_SELECTION',…})
                   ▼
┌── background.ts (service worker, no UI) ───┐
│  • the only place that calls Gemini        │
│  • opens the side panel                    │
│  • writes results to chrome.storage.local  │
└──────────────────┬─────────────────────────┘
                   │ chrome.storage.onChanged (all UIs subscribe)
        ┌──────────┼──────────────┐
        ▼          ▼              ▼
   sidepanel/   popup/       dashboard/
   node map     mini stats   full analytics page
```

Why storage instead of direct messages to the UIs? Because the side panel
might not be open yet when the answer arrives — storage is the reliable
"mailbox" that whoever opens later can read, and `onChanged` gives live
updates to whoever is already open.

## Where the AI happens

`utils/gemini.ts` — three functions, all returning **guaranteed-parseable
JSON** (we send Gemini a `responseSchema`, so it physically can't reply with
free text):

- `decompose(text)` → the concept tree for the node map
- `generateQuest(nodes)` → 3 quick quiz questions (not wired to UI yet)
- `generateSandbox(text)` → formula + slider specs (not wired to UI yet)

No key in `.env`? `background.ts` falls back to `utils/fake-data.ts` (a
photosynthesis tree) so everything is demoable offline.

**Safety rule**: sandbox formulas from Gemini are parsed by mathjs, never
`eval()`'d. Don't change this.

## Debugging each surface (they have SEPARATE consoles!)

| Surface | How to see its console/errors |
|---|---|
| Content script | Normal DevTools (F12) on the webpage itself |
| Background worker | `chrome://extensions` → Untangle card → "service worker" link |
| Side panel | Right-click inside the panel → Inspect |
| Popup | Right-click inside the popup → Inspect |
| Dashboard | Normal DevTools (it's just a tab) |

Extension misbehaving after a code change? `chrome://extensions` → hit the
↻ reload icon on the Untangle card (dev mode usually does this for you).

Inspect stored data: any extension console →
`chrome.storage.local.get(console.log)`

## Editing cheat-sheet

- Node colors / kinds → `KIND_STYLES` in `entrypoints/sidepanel/App.tsx`
- Gemini prompts → `utils/gemini.ts` (the template strings)
- XP amounts / streak rule → `utils/storage.ts` + `background.ts`
- Manifest (name, permissions) → `wxt.config.ts` (WXT generates manifest.json)
- Min selection length for the button → `MIN_SELECTION_CHARS` in `content.ts`
