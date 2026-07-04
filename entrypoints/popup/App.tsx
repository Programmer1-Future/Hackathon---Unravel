import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { getState } from '@/utils/storage';
import { useSettings } from '@/utils/useSettings';
import type { UnravelState } from '@/utils/types';
import { Button, Stat } from '../sidepanel/ui';

// Quick-glance stats. The full analytics live on the dashboard page.
export default function App() {
  const [state, setState] = useState<UnravelState | null>(null);
  const { settings, toggle, setTheme } = useSettings();

  useEffect(() => {
    getState().then(setState);
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const todayXp =
    state?.sessions.filter((s) => s.date === today).reduce((sum, s) => sum + s.xpEarned, 0) ?? 0;

  return (
    <div className="w-64 bg-paper p-4 font-sans text-ink">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-extrabold">✨ Unravel</h1>
        <div className="flex rounded-full border-2 border-line-soft bg-card p-0.5">
          <button
            onClick={() => setTheme('light')}
            title="Light"
            className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
              settings.theme === 'light' ? 'bg-primary text-white' : 'text-ink-faint'
            }`}
          >
            <Sun className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setTheme('dark')}
            title="Dark"
            className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
              settings.theme === 'dark' ? 'bg-primary text-white' : 'text-ink-faint'
            }`}
          >
            <Moon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Stat label="Streak" value={`🔥 ${state?.streak.count ?? 0}`} />
        <Stat label="Total XP" value={`${state?.xp ?? 0}`} />
        <Stat label="Today" value={`+${todayXp} XP`} />
        <Stat label="Unravels" value={`${state?.sessions.length ?? 0}`} />
      </div>

      <Button
        block
        size="md"
        className="mt-4"
        onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL('/dashboard.html') })}
      >
        Open dashboard
      </Button>

      <div className="mt-4 flex flex-col gap-2 border-t border-line pt-3">
        <Toggle
          label="Dyslexia-friendly font"
          on={settings.dyslexiaFont}
          onClick={() => toggle('dyslexiaFont')}
        />
        <Toggle
          label="Reduce motion"
          on={settings.reducedMotion}
          onClick={() => toggle('reducedMotion')}
        />
      </div>

      <p className="mt-3 text-xs font-semibold leading-relaxed text-ink-faint">
        Highlight text on any page and hit ✨ Unravel to break it down.
      </p>
    </div>
  );
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between text-left text-xs font-bold text-ink-soft"
    >
      {label}
      <span
        className={`relative h-5 w-9 rounded-full transition-colors ${on ? 'bg-primary' : 'bg-line'}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
            on ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  );
}

