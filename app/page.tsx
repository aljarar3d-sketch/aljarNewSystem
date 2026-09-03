import Link from 'next/link';
import { TopBar } from '@/components/TopBar';

export default function Home() {
  return (
    <>
      <TopBar />
      <main className="viewport-grid flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
        <div className="reveal flex flex-col gap-3">
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-scan">Internal tool</span>
          <h1 className="font-display text-4xl font-medium tracking-tight text-paper sm:text-5xl">
            AR Asset Platform
          </h1>
          <p className="max-w-md text-dim">
            Upload a client&apos;s 3D file and get back a link that puts it in augmented
            reality on their phone — scan the QR code, see it in the room.
          </p>
        </div>
        <div className="reveal flex gap-3">
          <Link
            href="/admin/upload"
            className="rounded-full bg-scan px-6 py-3 font-medium text-ink transition hover:opacity-90"
          >
            Upload an asset
          </Link>
          <Link
            href="/admin/clients"
            className="rounded-full border border-line px-6 py-3 font-medium text-paper transition hover:border-scan"
          >
            Manage clients
          </Link>
          <Link
            href="/assets"
            className="rounded-full border border-line px-6 py-3 font-medium text-paper transition hover:border-scan"
          >
            Tune assets
          </Link>
        </div>
      </main>
    </>
  );
}
