import type { ConceptTree, SessionRecord, UnravelState } from './types';

// Two storage keys:
//  - 'state'       → long-lived gamification data (xp, streak, sessions, settings)
//  - 'currentTree' → the tree for the page being unraveld right now;
//                    the side panel watches this key via storage.onChanged.

const DEFAULT_STATE: UnravelState = {
  xp: 0,
  streak: { count: 0, lastActiveDate: '' },
  sessions: [],
  settings: { dyslexiaFont: false, reducedMotion: false, theme: 'light' },
};

export async function getState(): Promise<UnravelState> {
  const { state } = await chrome.storage.local.get('state');
  return { ...DEFAULT_STATE, ...(state as Partial<UnravelState> | undefined) };
}

export async function setState(state: UnravelState): Promise<void> {
  await chrome.storage.local.set({ state });
}

export async function getCurrentTree(): Promise<ConceptTree | null> {
  const { currentTree } = await chrome.storage.local.get('currentTree');
  return (currentTree as ConceptTree | undefined) ?? null;
}

export async function setCurrentTree(tree: ConceptTree): Promise<void> {
  await chrome.storage.local.set({ currentTree: tree });
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// Small in-session rewards (expanding nodes, finishing quests) bump the
// current session instead of creating a new one per click.
export async function bumpSession(delta: {
  xp?: number;
  nodes?: number;
  quests?: number;
}): Promise<UnravelState> {
  const state = await getState();
  state.xp += delta.xp ?? 0;
  const last = state.sessions[state.sessions.length - 1];
  if (last) {
    last.xpEarned += delta.xp ?? 0;
    last.nodesExpanded += delta.nodes ?? 0;
    last.questsDone += delta.quests ?? 0;
  }
  await setState(state);
  return state;
}

// Streak rule: consecutive calendar days with at least one unravel.
// Same-day activity keeps the streak; a 1-day gap increments continues;
// anything longer resets to 1.
export async function recordActivity(partial: Omit<SessionRecord, 'date'>): Promise<UnravelState> {
  const state = await getState();
  const today = todayStr();

  if (state.streak.lastActiveDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    state.streak.count = state.streak.lastActiveDate === yesterday ? state.streak.count + 1 : 1;
    state.streak.lastActiveDate = today;
  }

  state.xp += partial.xpEarned;
  state.sessions.push({ date: today, ...partial });
  await setState(state);
  return state;
}
