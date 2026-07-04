import { useEffect, useMemo, useState } from 'react';
import { compile } from 'mathjs';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SandboxSpec } from '@/utils/types';

// Live variable isolation: sliders → mathjs evaluates the expression across
// the x-range → Recharts redraws instantly. Gemini output is PARSED by mathjs,
// never eval()'d.
//
// Self-contained: give it the concept text and it fetches its own spec from
// the background worker (real Gemini or fake projectile-motion fallback).

export default function Sandbox({ text }: { text: string }) {
  const [spec, setSpec] = useState<SandboxSpec | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'none'>('loading');

  useEffect(() => {
    let alive = true;
    chrome.runtime.sendMessage({ type: 'SANDBOX_REQUEST', text }).then((res) => {
      if (!alive) return;
      if (res?.spec?.isQuantitative) {
        setSpec(res.spec);
        setState('ready');
      } else {
        setState('none');
      }
    });
    return () => {
      alive = false;
    };
  }, [text]);

  if (state === 'loading')
    return (
      <div className="mt-3 rounded-2xl border-2 border-amber-400/40 bg-card px-4 py-3 text-sm font-bold text-amber-300">
        🧪 Building an interactive model…
      </div>
    );
  if (state === 'none' || !spec) return null;

  return <SandboxPlot spec={spec} />;
}

function SandboxPlot({ spec }: { spec: SandboxSpec }) {
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(spec.variables.map((v) => [v.name, v.default])),
  );

  const compiled = useMemo(() => {
    try {
      return compile(spec.expression);
    } catch {
      return null;
    }
  }, [spec.expression]);

  const data = useMemo(() => {
    if (!compiled) return [];
    const points: { x: number; y: number }[] = [];
    const steps = 60;
    const dx = (spec.xMax - spec.xMin) / steps;
    for (let i = 0; i <= steps; i++) {
      const x = spec.xMin + i * dx;
      try {
        const y = compiled.evaluate({ ...values, [spec.xVar]: x });
        if (typeof y === 'number' && Number.isFinite(y)) {
          points.push({ x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 });
        }
      } catch {
        /* skip invalid points */
      }
    }
    return points;
  }, [compiled, values, spec]);

  if (!compiled) return null;

  return (
    <div className="mt-3 rounded-2xl border-2 border-amber-400/40 bg-paper p-4">
      <div className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
        🧪 Try it — drag the sliders
      </div>

      <ResponsiveContainer width="100%" height={170}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -14 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff14" />
          <XAxis dataKey="x" stroke="#64748b" fontSize={10} tickCount={5} />
          <YAxis stroke="#64748b" fontSize={10} width={40} />
          <Tooltip
            contentStyle={{
              background: '#181A1F',
              border: '1px solid #383E48',
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: '#94a3b8' }}
          />
          <Line
            type="monotone"
            dataKey="y"
            stroke="#fbbf24"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
            name={spec.yLabel}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-2 flex flex-col gap-3">
        {spec.variables.map((v) => (
          <label key={v.name} className="block">
            <div className="mb-1 flex justify-between text-xs font-bold text-ink-soft">
              <span>{v.label}</span>
              <span className="text-amber-300">{values[v.name]}</span>
            </div>
            <input
              type="range"
              min={v.min}
              max={v.max}
              step={v.step}
              value={values[v.name]}
              onChange={(e) => setValues((prev) => ({ ...prev, [v.name]: Number(e.target.value) }))}
              className="w-full accent-amber-400"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
