import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Camera,
  FileText,
  ImagePlus,
  ListChecks,
  Send,
  X,
  Zap,
  Highlighter,
} from 'lucide-react';
import { Logo } from './Logo';
import { bumpSession, getCurrentTree, getState } from '@/utils/storage';
import { hasApiKey } from '@/utils/gemini';
import { useSettings } from '@/utils/useSettings';
import type { ChatAttachment, ChatMessage, ConceptTree, PageContext } from '@/utils/types';
import ConceptPath from './ConceptPath';
import Quest from './Quest';
import { Button, Card, IconButton } from './ui';

type Status = 'empty' | 'loading' | 'ready' | 'error';
type Tab = 'map' | 'coach';

export default function App() {
  return <Panel />;
}

function Panel() {
  const [treeData, setTreeData] = useState<ConceptTree | null>(null);
  const [status, setStatus] = useState<Status>('empty');
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [explored, setExplored] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>('map');
  const [pageContext, setPageContext] = useState<PageContext | null>(null);
  const [xp, setXp] = useState(0);
  const [xpPop, setXpPop] = useState<{ amount: number; key: number } | null>(null);
  useSettings(); // applies dyslexia font / reduced-motion to this document

  // XP counter with a little "+N" pop whenever it goes up.
  function applyXp(newTotal: number) {
    setXp((prev) => {
      if (newTotal > prev) setXpPop({ amount: newTotal - prev, key: Date.now() });
      return newTotal;
    });
  }

  // Vision path: screenshot the visible tab and unravel it. Works on PDFs,
  // diagrams, images — anywhere the highlight button can't reach.
  function captureView() {
    setTab('map');
    chrome.runtime.sendMessage({ type: 'CAPTURE_UNRAVEL' });
  }

  // Initial load + live updates from the background worker via storage.
  useEffect(() => {
    getCurrentTree().then((t) => {
      if (t) {
        setTreeData(t);
        setStatus('ready');
      }
    });
    chrome.storage.local.get('pageContext').then(({ pageContext }) => {
      if (pageContext) setPageContext(pageContext as PageContext);
    });
    getState().then((s) => setXp(s.xp));

    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.treeStatus) {
        const s = changes.treeStatus.newValue as Status;
        setStatus(s);
        if (s === 'loading') {
          setExpanded(new Set());
          setExplored(new Set());
          setTab('map');
        }
      }
      if (changes.treeError) setError((changes.treeError.newValue as string) ?? '');
      if (changes.currentTree?.newValue) setTreeData(changes.currentTree.newValue as ConceptTree);
      if (changes.pageContext?.newValue) setPageContext(changes.pageContext.newValue as PageContext);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  function onToggle(id: string) {
    // Reward the FIRST time a node with children is opened.
    const firstExplore = !explored.has(id);
    const hasKids = treeData?.nodes.some((n) => n.parentId === id) ?? false;

    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setExplored((prev) => new Set(prev).add(id));

    if (firstExplore && hasKids) {
      bumpSession({ xp: 3, nodes: 1 }).then((s) => applyXp(s.xp));
    }
  }

  const exploredCount = explored.size;
  const expandableCount = useMemo(() => {
    if (!treeData) return 0;
    const parents = new Set(treeData.nodes.map((n) => n.parentId).filter(Boolean));
    return parents.size;
  }, [treeData]);

  return (
    <div className="flex h-screen flex-col bg-paper font-sans text-ink">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary shadow-[0_2px_8px_rgba(15,108,189,0.4)]">
            <Logo className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-lg font-extrabold tracking-tight">Unravel</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* XP counter with a floating +N pop on gain */}
          <div className="relative flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-extrabold text-primary">{xp}</span>
            {xpPop && (
              <span
                key={xpPop.key}
                className="animate-xp-pop pointer-events-none absolute -top-3 right-1 text-xs font-extrabold text-accent-green"
                onAnimationEnd={() => setXpPop(null)}
              >
                +{xpPop.amount}
              </span>
            )}
          </div>
          <IconButton title="Unravel this view (works on PDFs)" onClick={captureView}>
            <Camera className="h-4 w-4" />
          </IconButton>
          <IconButton
            title="Open dashboard"
            onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL('/dashboard.html') })}
          >
            <BarChart3 className="h-4 w-4" />
          </IconButton>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex shrink-0 gap-6 border-b border-line px-5 pt-3">
        {(
          [
            ['map', 'Map'],
            ['coach', 'Coach'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`border-b-2 pb-2.5 text-sm font-extrabold transition-colors ${
              tab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-ink-faint hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Context banner */}
      {treeData && status === 'ready' && (
        <div className="shrink-0 px-4 pt-3">
          <Card pad="md">
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-primary">
              <FileText className="h-3 w-3" /> Current page
            </span>
            <h2 className="mt-1.5 text-base font-extrabold leading-tight">{treeData.topic}</h2>
            <p className="mt-0.5 text-xs font-bold text-ink-faint">
              {treeData.nodes.length} concepts • {exploredCount} explored
            </p>
            <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-paper">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{
                  width: `${expandableCount ? Math.min(100, (exploredCount / expandableCount) * 100) : 0}%`,
                }}
              />
            </div>
          </Card>
        </div>
      )}

      {/* Body */}
      {tab === 'map' ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
            {status === 'empty' && (
              <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
                <Empty
                  icon="logo"
                  title="Nothing unravelled yet"
                  text="Highlight text on any page for the Unravel button — or unravel a PDF or diagram straight from the screen:"
                />
                <Button variant="primary" size="lg" onClick={captureView}>
                  <Camera className="h-4 w-4" />
                  Unravel this view
                </Button>
              </div>
            )}
            {status === 'loading' && (
              <Empty
                icon="⏳"
                title="Unravelling…"
                text="Breaking this down into small, calm pieces."
              />
            )}
            {status === 'error' && (
              <Empty icon="😕" title="Something went wrong" text={error} />
            )}
            {status === 'ready' && treeData && (
              <ConceptPath
                tree={treeData}
                expanded={expanded}
                explored={explored}
                onToggle={onToggle}
              />
            )}
          </div>

          {/* Quest: available once you've explored something */}
          {status === 'ready' && treeData && explored.size > 0 && (
            <div className="shrink-0 border-t border-line bg-paper pt-3">
              <Quest nodeIds={[...explored]} onXp={applyXp} />
            </div>
          )}
        </div>
      ) : (
        <Coach pageContext={pageContext} topic={treeData?.topic ?? null} />
      )}

      <GeminiBar live={status === 'loading'} />
    </div>
  );
}

// ---------- Coach tab: chat with the page as automatic context ----------

const QUICK_CHIPS = [
  { icon: Zap, label: 'Explain simply', prompt: 'Explain this page to me in the simplest way possible.' },
  { icon: ListChecks, label: 'Quiz me', prompt: 'Give me 3 quick questions to check I understood this page.' },
  { icon: Highlighter, label: 'Summarize', prompt: 'Summarize the key points of this page in a short bullet list.' },
];

function Coach({ pageContext, topic }: { pageContext: PageContext | null; topic: string | null }) {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chrome.storage.local.get(['chatHistory', 'chatStatus']).then((r) => {
      setHistory((r.chatHistory as ChatMessage[]) ?? []);
      setThinking(r.chatStatus === 'thinking');
    });
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.chatHistory?.newValue) setHistory(changes.chatHistory.newValue as ChatMessage[]);
      if (changes.chatStatus) setThinking(changes.chatStatus.newValue === 'thinking');
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [history, thinking]);

  function send(question: string) {
    const q = question.trim();
    if (!q || thinking) return;
    chrome.runtime.sendMessage({ type: 'CHAT_ASK', question: q, attachments });
    setDraft('');
    setAttachments([]);
  }

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])].slice(0, 3 - attachments.length);
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setAttachments((prev) => [
          ...prev,
          { mimeType: file.type, data: dataUrl.split(',')[1], name: file.name },
        ]);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Thread */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
        {history.length === 0 && !thinking ? (
          <div className="flex h-full flex-col items-center justify-center text-center opacity-70">
            <Logo className="mb-3 h-11 w-11 text-ink-faint" />
            <p className="text-sm font-extrabold">I can see this whole page.</p>
            <p className="mt-1 max-w-[220px] text-xs font-semibold text-ink-faint">
              No copying, no screenshots — just ask.
              {pageContext ? ` I'm reading “${pageContext.pageTitle}”.` : ''}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {history.map((m) => (
              <div
                key={m.ts + m.role}
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl border-2 px-3.5 py-2.5 text-sm font-medium leading-relaxed ${
                  m.role === 'user'
                    ? 'self-end border-primary-dark bg-primary text-white pop-primary'
                    : 'self-start border-line-soft bg-card text-ink pop-sm'
                }`}
              >
                {m.text}
              </div>
            ))}
            {thinking && (
              <div className="flex items-center gap-2 self-start rounded-2xl border-2 border-line-soft bg-card px-3.5 py-2.5 text-sm font-bold text-ink-faint pop-sm">
                <span className="inline-flex gap-1">
                  <Dot delay="0ms" />
                  <Dot delay="150ms" />
                  <Dot delay="300ms" />
                </span>
                thinking…
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dock */}
      <div className="shrink-0 border-t border-line px-3 pb-3 pt-2.5">
        <div className="no-scrollbar -mx-1 mb-2.5 flex gap-2 overflow-x-auto px-1">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip.label}
              onClick={() => send(chip.prompt)}
              disabled={thinking}
              className="press flex h-8 shrink-0 items-center gap-1.5 rounded-full border-2 border-line bg-card px-3 text-[11px] font-extrabold text-ink-soft transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
            >
              <chip.icon className="h-3.5 w-3.5" />
              {chip.label}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-[20px] border-2 border-line-soft bg-card transition-all focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(15,108,189,0.15)]">
          <div className="flex items-center gap-2 px-3 pb-1 pt-2.5">
            <span className="flex items-center gap-1.5 rounded-lg bg-primary/10 py-1 pl-1.5 pr-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary">
                <Logo className="h-3.5 w-3.5 text-white" />
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-primary">
                Context
              </span>
            </span>
            <span className="truncate text-[11px] font-bold text-ink-soft">
              {topic ?? pageContext?.pageTitle ?? 'This page'}
            </span>
          </div>

          {attachments.length > 0 && (
            <div className="flex gap-2 px-3 pt-1.5">
              {attachments.map((a, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 rounded-lg bg-paper px-2 py-1 text-[10px] font-bold text-ink-soft"
                >
                  {a.name.slice(0, 18)}
                  <button
                    onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                    className="text-ink-faint hover:text-ink"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
            placeholder="Ask about this page…"
            className="min-h-[52px] w-full resize-none bg-transparent px-4 pb-2 pt-1 text-sm font-medium text-ink placeholder:text-ink-faint focus:outline-none"
          />

          <div className="flex items-center justify-between px-2.5 pb-2.5">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={attachments.length >= 3}
              title="Attach an image (worksheet, diagram…)"
              className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-line-soft hover:text-ink disabled:opacity-40"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={onPickFiles}
            />
            <Button
              size="sm"
              onClick={() => send(draft)}
              disabled={thinking || !draft.trim()}
            >
              Ask
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-faint"
      style={{ animationDelay: delay }}
    />
  );
}

// Honest "powered by" strip — the dot pulses while a real Gemini call is in
// flight, so it's visibly, provably doing the AI work (not faked). Amber in
// demo mode (no API key) so we never overclaim.
function GeminiBar({ live }: { live: boolean }) {
  const real = hasApiKey();
  return (
    <div className="flex shrink-0 items-center justify-center gap-1.5 border-t border-line px-4 py-1.5">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          live ? 'animate-pulse bg-primary' : real ? 'bg-accent-green' : 'bg-amber-400'
        }`}
      />
      <span className="text-[10px] font-bold tracking-wide text-ink-faint">
        {live
          ? 'Gemini 2.5 Flash is reading this…'
          : real
            ? 'Powered by Gemini 2.5 Flash'
            : 'Demo mode — add a Gemini key for live AI'}
      </span>
    </div>
  );
}

function Empty({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      {icon === 'logo' ? (
        <Logo className="mb-1 h-12 w-12 text-ink-faint" />
      ) : (
        <div className="text-4xl">{icon}</div>
      )}
      <p className="text-base font-extrabold text-ink">{title}</p>
      <p className="max-w-[240px] text-sm font-semibold leading-relaxed text-ink-faint">{text}</p>
    </div>
  );
}
