'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminSession } from '@/lib/admin-session';

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/clients', label: 'Clients' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/upload', label: 'Upload asset' },
  { href: '/admin/assets', label: 'Assets' },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { signOut } = useAdminSession();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-line bg-panel">
      <div className="border-b border-line px-5 py-5">
        <Link href="/" className="font-display text-lg font-medium tracking-tight text-paper transition hover:text-scan">
          AR Asset Platform
        </Link>
        <p className="mt-0.5 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-dim">Admin</p>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-2 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md border-l-2 px-3 py-2 text-sm transition ${
                isActive
                  ? 'border-scan bg-panel-raised text-paper'
                  : 'border-transparent text-dim hover:border-line hover:text-paper'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line p-2">
        <button
          type="button"
          onClick={signOut}
          className="w-full rounded-md px-3 py-2 text-left text-sm text-dim transition hover:text-danger"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
