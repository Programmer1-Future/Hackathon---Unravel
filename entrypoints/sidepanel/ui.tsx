import type { ButtonHTMLAttributes, ReactNode } from 'react';

// Shared UI primitives — the single source of truth for sizing, so heights,
// paddings and radii never drift again. CVA-style variant maps (per the vault's
// ui-ux.md guidance: extract components, fixed size scale, no ad-hoc values).

function cx(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

/* ---------------- Button ---------------- */

type ButtonVariant = 'primary' | 'grass' | 'ghost' | 'option';
type ButtonSize = 'sm' | 'md' | 'lg';

const BTN_BASE =
  'press inline-flex items-center justify-center gap-2 rounded-xl font-extrabold disabled:opacity-50 disabled:pointer-events-none';

const BTN_SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-[15px]',
};

const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white pop-primary',
  grass: 'bg-accent-green text-[#04372b] pop-green',
  ghost: 'bg-card text-ink border-2 border-line-soft pop',
  // "option" = quiz answer row: left-aligned, full-width, quieter.
  option:
    'w-full justify-between !font-bold border-2 border-line bg-paper text-ink hover:border-primary',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  block,
  className,
  children,
  ...rest
}: ButtonProps) {
  // Option rows hold answer text that can wrap — auto height, not fixed.
  const sizing = variant === 'option' ? 'min-h-10 px-4 py-2 text-sm' : BTN_SIZE[size];
  return (
    <button
      className={cx(BTN_BASE, sizing, BTN_VARIANT[variant], block && 'w-full', className)}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ---------------- IconButton ---------------- */

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

// 40px hit area (WCAG-friendly) even though the icon is smaller.
export function IconButton({ className, children, ...rest }: IconButtonProps) {
  return (
    <button
      className={cx(
        'flex h-10 w-10 items-center justify-center rounded-xl text-ink-faint transition-colors hover:bg-line-soft hover:text-ink',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ---------------- Card ---------------- */

type Pad = 'sm' | 'md';
const CARD_PAD: Record<Pad, string> = { sm: 'p-3.5', md: 'p-4' };

interface CardProps {
  pad?: Pad;
  className?: string;
  children: ReactNode;
}

// The raised 2.5D surface. `pop` gives the chunky offset shadow.
export function Card({ pad = 'sm', className, children }: CardProps) {
  return (
    <div className={cx('rounded-2xl border-2 border-line-soft bg-card pop', CARD_PAD[pad], className)}>
      {children}
    </div>
  );
}

/* ---------------- Chip ---------------- */

interface ChipProps {
  className?: string;
  children: ReactNode;
}

export function Chip({ className, children }: ChipProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider',
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ---------------- Stat tile ---------------- */

interface StatProps {
  label: string;
  value: ReactNode;
  size?: 'sm' | 'lg';
}

export function Stat({ label, value, size = 'sm' }: StatProps) {
  return (
    <Card className="px-4 py-3">
      <div className="text-[10px] font-extrabold uppercase tracking-wider text-ink-faint">
        {label}
      </div>
      <div className={cx('mt-1 font-extrabold tabular-nums text-ink', size === 'lg' ? 'text-2xl' : 'text-lg')}>
        {value}
      </div>
    </Card>
  );
}
