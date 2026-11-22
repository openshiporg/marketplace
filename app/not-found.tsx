import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-page px-6">
      <div className="w-full max-w-sm text-center">
        <p className="font-[family-name:var(--font-brand)] text-[15px] text-ink-3">the / marketplace</p>
        <h1 className="mt-6 text-[22px] font-normal tracking-[-0.02em] text-ink">This page isn&apos;t here.</h1>
        <p className="mt-2 text-[14px] text-ink-2">The link may be old or mistyped. Your carts and chats are where you left them.</p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-control bg-ink px-5 text-[14px] font-medium text-surface"
        >
          Back to the marketplace
        </Link>
      </div>
    </main>
  );
}
