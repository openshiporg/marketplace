export function SharpStarIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="sharp-star-gradient" x1="4" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--gold-deep)" />
          <stop offset="1" stopColor="var(--gold-light)" />
        </linearGradient>
      </defs>
      <path
        fill="url(#sharp-star-gradient)"
        d="m12 1.6 3.18 6.44 7.11 1.03-5.14 5.01 1.21 7.08L12 17.82l-6.36 3.34 1.21-7.08-5.14-5.01 7.11-1.03Z"
      />
    </svg>
  );
}
