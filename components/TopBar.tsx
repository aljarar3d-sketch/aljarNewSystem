import Link from 'next/link';

export interface TopBarProps {
  crumb?: string;
}

const NAV_LINKS = [
  { href: '/admin/upload', label: 'Upload an asset' },
  { href: '/admin/clients', label: 'Manage clients' },
  { href: '/assets', label: 'Tune assets' },
];

export function TopBar({ crumb }: TopBarProps) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-line px-6 py-4 font-mono text-xs uppercase tracking-[0.2em] text-dim">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-paper transition hover:text-scan">
          AR Asset Platform
        </Link>
        <nav className="hidden items-center gap-4 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-paper">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
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
