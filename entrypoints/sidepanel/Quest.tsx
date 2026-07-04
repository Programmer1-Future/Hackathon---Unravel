import { useState } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, ListChecks, XCircle } from 'lucide-react';
import { bumpSession } from '@/utils/storage';
import type { QuestQuestion } from '@/utils/types';
import { Button, Card } from './ui';

// The dopamine loop: a 30-60s check on the nodes you just explored. Right
// answers pop confetti + XP; "beat the section to move on."

type Phase = 'idle' | 'loading' | 'playing' | 'done';

// Confetti that respects both the OS setting and our in-app reduced-motion toggle.
function pop(particleCount: number, spread: number) {
  if (document.documentElement.dataset.reducedMotion === 'true') return;
  confetti({ particleCount, spread, origin: { y: 0.65 }, disableForReducedMotion: true });
}

export default function Quest({ nodeIds, onXp }: { nodeIds: string[]; onXp: (n: number) => void }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [questions, setQuestions] = useState<QuestQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);

  async function start() {
    setPhase('loading');
    const res = await chrome.runtime.sendMessage({ type: 'QUEST_REQUEST', nodeIds });
    setQuestions(res?.questions ?? []);
    setCurrent(0);
    setCorrect(0);
    setPicked(null);
    setPhase('playing');
  }

  function choose(option: string) {
    if (picked) return;
    setPicked(option);
    const q = questions[current];
    if (option === q.answer) {
      setCorrect((c) => c + 1);
      pop(60, 55);
      bumpSession({ xp: 5 }).then((s) => onXp(s.xp));
    }
  }

  function next() {
    if (current + 1 < questions.length) {
      setCurrent((c) => c + 1);
      setPicked(null);
    } else {
      pop(120, 80);
      bumpSession({ xp: 15, quests: 1 }).then((s) => onXp(s.xp));
      setPhase('done');
    }
  }

  if (phase === 'idle') {
    return (
      <div className="px-4 py-3">
        <Button variant="grass" size="lg" block onClick={start}>
          <ListChecks className="h-4 w-4" />
          Quiz me on this
        </Button>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="px-4 py-4 text-center text-sm font-bold text-ink-faint">
        Building your quest…
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="px-4 py-3">
        <Card pad="md" className="border-accent-green bg-accent-green/10 text-center">
          <div className="text-3xl font-extrabold tabular-nums text-emerald-600">
            {correct}/{questions.length}
          </div>
          <p className="mt-1 text-sm font-bold text-ink">Section beaten! +{correct * 5 + 15} XP</p>
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => setPhase('idle')}>
            Play again
          </Button>
        </Card>
      </div>
    );
  }

  const q = questions[current];
  return (
    <div className="px-4 py-3">
      <Card pad="md">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-faint">
            Question {current + 1} / {questions.length}
          </span>
          <span className="text-[10px] font-extrabold text-emerald-600">{correct} ✓</span>
        </div>
        <p className="mb-3 text-sm font-extrabold leading-snug text-ink">{q.prompt}</p>
        <div className="flex flex-col gap-2">
          {q.options.map((opt) => {
            const isAnswer = opt === q.answer;
            const isPicked = opt === picked;
            const show = picked !== null;
            return (
              <Button
                key={opt}
                variant="option"
                onClick={() => choose(opt)}
                disabled={show}
                className={
                  show && isAnswer
                    ? '!border-accent-green !bg-accent-green/15 !text-emerald-600'
                    : show && isPicked
                      ? '!border-red-400 !bg-red-500/10 !text-red-500'
                      : ''
                }
              >
                {opt}
                {show && isAnswer && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                {show && isPicked && !isAnswer && <XCircle className="h-4 w-4 shrink-0" />}
              </Button>
            );
          })}
        </div>
        {picked && (
          <Button variant="primary" size="md" block className="mt-3" onClick={next}>
            {current + 1 < questions.length ? 'Next' : 'Finish'}
          </Button>
        )}
      </Card>
    </div>
  );
}
