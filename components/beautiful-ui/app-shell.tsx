"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Star, Sun } from "lucide-react";
import { LogoIcon as OpenFrontIcon } from "@/components/OpenfrontLogo";
import { LogoIcon as OpenShipIcon } from "@/components/OpenshipLogo";
import { LogoIcon as OpenSupportIcon } from "@/components/OpensupportLogo";

function EthosIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 2 20 6.5v11L12 22l-8-4.5v-11Z" fill="currentColor" opacity=".3" />
      <path d="m12 5.25 4.5 2.55v3L12 13.35 7.5 10.8v-3ZM12 14.75l4-2.25v2.7L12 17.5l-4-2.3v-2.7Z" fill="currentColor" />
    </svg>
  );
}

function ThemeButton() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <span className="size-7" aria-hidden />;

  const dark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      aria-label={dark ? "Use light theme" : "Use dark theme"}
      title={dark ? "Use light theme" : "Use dark theme"}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="flex size-7 items-center justify-center rounded-none border border-line bg-surface text-ink-3 transition-colors duration-100 hover:bg-hover hover:text-ink"
    >
      {dark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
    </button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="beautiful-page-grid min-h-dvh bg-page">
      <header className="fixed inset-x-0 top-0 z-sticky h-12 border-b border-line bg-page/95 backdrop-blur-sm">
        <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between gap-3 px-3 sm:px-4">
          <Link href="/" className="flex min-w-0 items-center gap-2 transition-opacity duration-100 hover:opacity-70">
            <span className="flex shrink-0 flex-col items-center gap-[2px]" aria-hidden>
              <OpenFrontIcon className="size-2 overflow-visible" suffix="-navbar-top" />
              <span className="flex items-center gap-[2px]">
                <OpenShipIcon className="size-2 overflow-visible" suffix="-navbar-left" />
                <OpenSupportIcon className="size-2 overflow-visible" suffix="-navbar-right" />
              </span>
            </span>
            <span className="truncate whitespace-nowrap font-[family-name:var(--font-brand)] text-[15px] font-medium leading-none text-ink sm:text-[15px]">
              the / <strong className="font-semibold">marketplace</strong>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-1">
            <a
              href="https://github.com/openshiporg/marketplace"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View marketplace on GitHub, 20 stars"
              title="View marketplace on GitHub"
              className="inline-flex h-7 items-center justify-center gap-1.5 rounded-none border border-line bg-surface px-2 font-mono text-[10px] font-semibold uppercase leading-none tracking-[0.06em] text-ink-3 transition-colors hover:bg-hover hover:text-ink"
            >
              <Star className="size-2.5 fill-orange text-orange" aria-hidden="true" />
              <span className="h-3 w-px bg-line" aria-hidden="true" />
              <span>20</span>
            </a>
            <Link
              href="/ethos"
              aria-label="Read our ethos"
              title="Read our ethos"
              className="flex size-7 items-center justify-center rounded-none border border-line bg-surface text-ink-3 transition-colors duration-100 hover:bg-hover hover:text-ink"
            >
              <EthosIcon />
            </Link>
            <ThemeButton />
          </div>
        </div>
      </header>

      <main className="min-h-dvh pt-12">{children}</main>
    </div>
  );
}
