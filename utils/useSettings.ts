import { useEffect, useState } from 'react';
import { getState, setState } from './storage';
import type { UnravelState } from './types';

type Settings = UnravelState['settings'];
type BoolSetting = 'dyslexiaFont' | 'reducedMotion';

// Applies accessibility + theme settings to the current document and keeps them
// in sync across surfaces via storage. Call once per React root.
export function useSettings() {
  const [settings, setSettings] = useState<Settings>({
    dyslexiaFont: false,
    reducedMotion: false,
    theme: 'light',
  });

  useEffect(() => {
    getState().then((s) => setSettings(s.settings));
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      const next = (changes.state?.newValue as UnravelState | undefined)?.settings;
      if (next) setSettings(next);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.dyslexia = String(settings.dyslexiaFont);
    root.dataset.reducedMotion = String(settings.reducedMotion);
    root.dataset.theme = settings.theme;
  }, [settings]);

  async function toggle(key: BoolSetting) {
    const state = await getState();
    state.settings[key] = !state.settings[key];
    await setState(state);
    setSettings(state.settings);
  }

  async function setTheme(theme: 'light' | 'dark') {
    const state = await getState();
    state.settings.theme = theme;
    await setState(state);
    setSettings(state.settings);
  }

  return { settings, toggle, setTheme };
}
