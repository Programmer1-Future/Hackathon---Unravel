// The Unravel mark — a ball of yarn with a loose thread coming undone.
// Hand-coded SVG (not AI-generated) so it stays crisp at every size and takes
// the current text colour. This is the product's signature: tangled → unravelled.

export function Logo({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* the ball */}
      <circle cx="10.5" cy="10.5" r="7.6" />
      {/* wound threads — rotated ellipses give the woven look */}
      <ellipse cx="10.5" cy="10.5" rx="7.6" ry="3" transform="rotate(32 10.5 10.5)" />
      <ellipse cx="10.5" cy="10.5" rx="7.6" ry="3" transform="rotate(-32 10.5 10.5)" />
      <ellipse cx="10.5" cy="10.5" rx="3" ry="7.6" transform="rotate(32 10.5 10.5)" />
      {/* the loose thread unravelling out the bottom-right */}
      <path d="M15.8 15.8 q 2.6 2.4 5.4 1.1" />
    </svg>
  );
}
