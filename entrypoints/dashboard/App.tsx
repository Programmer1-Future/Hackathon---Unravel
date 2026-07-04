import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getState } from '@/utils/storage';
import { useSettings } from '@/utils/useSettings';
import type { UnravelState } from '@/utils/types';
import { Card, Stat } from '../sidepanel/ui';
import { Logo } from '../sidepanel/Logo';

// The "admin page": real accumulated data from chrome.storage.local — nothing
// mocked, it grows as the extension is used (including during a live demo).

export default function App() {
  const [state, setState] = useState<UnravelState | null>(null);
  useSettings(); // applies theme + accessibility settings to this page

  useEffect(() => {
    getState().then(setState);
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.state?.newValue) setState(changes.state.newValue as UnravelState);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  // Aggregate sessions per day for the charts (last 7 days, zero-filled).
  const daily = useMemo(() => {
    const days: { day: string; xp: number; unravels: number; quests: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const sessions = state?.sessions.filter((s) => s.date === date) ?? [];
      days.push({
        day: date.slice(5), // MM-DD
        xp: sessions.reduce((sum, s) => sum + s.xpEarned, 0),
        unravels: sessions.length,
        quests: sessions.reduce((sum, s) => sum + s.questsDone, 0),
      });
    }
    return days;
  }, [state]);

  const topics = useMemo(() => {
    const seen = new Map<string, number>();
    for (const s of state?.sessions ?? []) seen.set(s.topic, (seen.get(s.topic) ?? 0) + 1);
    return [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [state]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="flex items-center gap-2.5 text-2xl font-extrabold tracking-tight">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary pop-primary">
            <Logo className="h-6 w-6 text-white" />
          </span>
          Unravel — your stats
        </h1>
        <p className="mt-1 text-sm text-ink-faint">
          Every unravel, quest, and streak — building up as you learn.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat size="lg" label="Streak" value={`🔥 ${state?.streak.count ?? 0} days`} />
          <Stat size="lg" label="Total XP" value={`${state?.xp ?? 0}`} />
          <Stat size="lg" label="Unravels" value={`${state?.sessions.length ?? 0}`} />
          <Stat
            size="lg"
            label="Quests done"
            value={`${state?.sessions.reduce((s, x) => s + x.questsDone, 0) ?? 0}`}
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <ChartCard title="XP this week">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: '#ffffff',
                    border: '2px solid #dbe3ee',
                    borderRadius: 12,
                    fontWeight: 700,
                  }}
                />
                <Line type="monotone" dataKey="xp" stroke="#0f6cbd" strokeWidth={2.5} dot />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Unravels per day">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: '#ffffff',
                    border: '2px solid #dbe3ee',
                    borderRadius: 12,
                    fontWeight: 700,
                  }}
                />
                <Bar dataKey="unravels" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <ChartCard title="Topics unraveld" className="mt-6">
          {topics.length === 0 ? (
            <p className="text-sm text-ink-faint">
              Nothing yet — highlight some text and hit Unravel.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {topics.map(([topic, count]) => (
                <li
                  key={topic}
                  className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-sm"
                >
                  {topic} <span className="text-primary">×{count}</span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

// Chart card wrapper — title + the shared Card surface.
function ChartCard({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card pad="md" className={`p-5 ${className}`}>
      <h2 className="mb-4 text-sm font-extrabold text-ink">{title}</h2>
      {children}
    </Card>
  );
}
