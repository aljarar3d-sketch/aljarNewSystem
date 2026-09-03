'use client';

import type { ReactNode } from 'react';
import { useAdminSession } from '@/lib/admin-session';
import { AdminSidebar } from '@/components/AdminSidebar';
import { AdminSignIn } from '@/components/AdminSignIn';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAdminSession();

  if (!isSignedIn) {
    return <AdminSignIn />;
  }

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex-1 overflow-x-auto">{children}</div>
    </div>
  );
}
