import Link from 'next/link';

export interface TopBarProps {
  crumb?: string;
}

export function TopBar({ crumb }: TopBarProps) {
  return (
    <header className="flex items-center justify-between border-b border-line px-6 py-4 font-mono text-xs uppercase tracking-[0.2em] text-dim">
      <Link href="/" className="text-paper transition hover:text-scan">
        AR Asset Platform
      </Link>
      <div className="flex items-center gap-4">
        {crumb && <span>{crumb}</span>}
        <span className="flex items-center gap-2 text-ready">
          <span className="scan-pulse h-1.5 w-1.5 rounded-full bg-ready" aria-hidden="true" />
          dev
        </span>
      </div>
    </header>
  );
}
