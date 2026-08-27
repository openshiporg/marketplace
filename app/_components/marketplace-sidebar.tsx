"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ChevronDown,
  Moon,
  Search,
  Sun,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import type { MarketplaceChatThread } from "@/lib/chat-thread-storage";
import { LogoIcon as OpenFrontIcon } from "@/components/OpenfrontLogo";
import { LogoIcon as OpenShipIcon } from "@/components/OpenshipLogo";
import { LogoIcon as OpenSupportIcon } from "@/components/OpensupportLogo";
import { EthosIcon } from "@/components/EthosIcon";
import { GitHubIcon } from "@/components/GitHubIcon";
import { NewChatIcon } from "@/components/NewChatIcon";
import { SharpStarIcon } from "@/components/SharpStarIcon";

type MarketplaceSidebarProps = {
  threads: MarketplaceChatThread[];
  activeThreadId: string;
  disabled?: boolean;
  collapsed: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onNew: () => void;
  onSelect: (threadId: string) => void;
};

export function MarketplaceSidebar({
  threads,
  activeThreadId,
  disabled = false,
  collapsed,
  mobileOpen = false,
  onMobileClose,
  onNew,
  onSelect,
}: MarketplaceSidebarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  const visibleThreads = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return threads;
    return threads.filter((thread) => thread.title.toLowerCase().includes(normalized));
  }, [query, threads]);

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] lg:hidden"
        />
      ) : null}
      <aside
        id="marketplace-sidebar"
        aria-label="Marketplace navigation"
        data-collapsed={collapsed}
        className={cn(
          "h-full shrink-0 overflow-hidden transition-[width] duration-300 ease-[var(--ease-out)] lg:relative lg:inset-auto lg:z-auto lg:bg-transparent lg:shadow-none",
          mobileOpen
            ? "fixed inset-y-0 left-0 z-50 flex w-56 bg-canvas shadow-raised"
            : "relative hidden lg:flex",
          collapsed ? "lg:w-14" : "lg:w-56",
        )}
      >
      <div className="flex h-full w-56 shrink-0 flex-col">
        <div className="mb-2.5 flex h-10 shrink-0 items-center px-2">
          <Link
            href="/"
            aria-label="The Marketplace"
            className="flex h-8 min-w-0 items-center rounded-control px-2 transition-[background-color,transform] duration-100 hover:bg-hover-2 active:scale-[.99]"
          >
            <span className="flex w-4 shrink-0 flex-col items-center gap-px" aria-hidden="true">
              <OpenFrontIcon className="size-[7px] overflow-visible" suffix="-sidebar-top" />
              <span className="flex items-center gap-px">
                <OpenShipIcon className="size-[7px] overflow-visible" suffix="-sidebar-left" />
                <OpenSupportIcon className="size-[7px] overflow-visible" suffix="-sidebar-right" />
              </span>
            </span>
            <span className={cn("ml-2 truncate font-[family-name:var(--font-brand)] text-[15px] font-medium text-ink", collapsed && "sr-only")}>
              the / <strong className="font-semibold">marketplace</strong>
            </span>
          </Link>
        </div>

        <nav className="flex flex-col gap-px" aria-label="Primary">
          <button
            type="button"
            disabled={disabled}
            onClick={onNew}
            className="mx-2 flex h-8 items-center rounded-control px-2 text-left text-ink-2 transition-[background-color,transform] duration-150 hover:bg-hover-2 active:scale-[.98] disabled:opacity-40"
          >
            <NewChatIcon className="size-[18px] shrink-0 text-signal-ink" />
            <span className={cn("ml-1.5 truncate text-[14px] font-medium", collapsed && "sr-only")}>New chat</span>
          </button>
          <Link
            href="/ethos"
            className={cn(
              "mx-2 flex h-8 items-center rounded-control px-2 text-left text-ink-2 transition-[background-color,transform] duration-150 hover:bg-hover-2 active:scale-[.98]",
              pathname === "/ethos" && "bg-hover-2 text-ink",
            )}
          >
            <EthosIcon className="size-[18px] shrink-0 text-orange" />
            <span className={cn("ml-1.5 truncate text-[14px] font-medium", collapsed && "sr-only")}>Ethos</span>
          </Link>
          <a
            href="https://github.com/openshiporg/marketplace"
            target="_blank"
            rel="noopener noreferrer"
            className="mx-2 flex h-8 items-center rounded-control px-2 text-left text-ink-2 transition-[background-color,transform] duration-150 hover:bg-hover-2 active:scale-[.98]"
          >
            <GitHubIcon className="size-[18px] shrink-0 text-green" />
            <span className={cn("ml-1.5 truncate text-[14px] font-medium", collapsed && "sr-only")}>GitHub</span>
          </a>
        </nav>

        <div className={cn("mt-3 min-h-0 flex-1 overflow-y-auto", collapsed && "invisible")}>
          <div className="relative mx-2 mb-1 h-8">
            {!searchOpen ? (
              <>
                <div className="flex h-8 items-center gap-1.5 px-2 text-[12.5px] font-medium text-ink-3">
                  <ChevronDown className="size-4" />
                  <span>Chats</span>
                </div>
                <button
                  type="button"
                  aria-label="Search chats"
                  onClick={() => setSearchOpen(true)}
                  className="absolute right-0 top-0 flex size-8 items-center justify-center rounded-control text-ink-3 transition-colors hover:bg-hover-2 hover:text-ink"
                >
                  <Search className="size-4" />
                </button>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center overflow-hidden rounded-control bg-field text-ink-2 shadow-hairline">
                <Search className="ml-2 size-4 shrink-0 text-ink-3" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search chats"
                  aria-label="Search chat history"
                  className="ml-1.5 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink-3 sm:text-[13px]"
                />
                <button
                  type="button"
                  aria-label="Close chat search"
                  onClick={() => { setSearchOpen(false); setQuery(""); }}
                  className="flex size-8 shrink-0 items-center justify-center text-ink-3 hover:text-ink"
                >
                  <X className="size-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-px">
            {visibleThreads.map((thread) => {
              const active = thread.id === activeThreadId;
              return (
                <button
                  key={thread.id}
                  type="button"
                  disabled={disabled}
                  title={thread.title}
                  onClick={() => onSelect(thread.id)}
                  className={cn(
                    "mx-2 flex h-8 items-center rounded-control px-2 text-left text-[14px] font-medium transition-[background-color,color,transform] duration-150 active:scale-[.98] disabled:opacity-40",
                    active ? "bg-hover-2 text-ink" : "text-ink-2 hover:bg-hover-2",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{thread.title}</span>
                </button>
              );
            })}
            {visibleThreads.length === 0 ? (
              <p className="px-4 py-3 text-[12.5px] text-ink-3">No chats found</p>
            ) : null}
          </div>
        </div>

        <div className="mx-2 mt-3 flex w-[208px] items-center justify-between pb-2.5">
          <button
            type="button"
            aria-label={dark ? "Use light theme" : "Use dark theme"}
            title={dark ? "Use light theme" : "Use dark theme"}
            onClick={() => setTheme(dark ? "light" : "dark")}
            className="flex size-8 items-center justify-center rounded-control text-ink-3 transition-[background-color,color,transform] duration-150 hover:bg-hover-2 hover:text-ink active:scale-[.96]"
          >
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <a
            href="https://github.com/openshiporg/marketplace"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View marketplace on GitHub, 20 stars"
            title="View marketplace on GitHub"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-control px-1 transition-[background-color,transform] duration-150 hover:bg-hover-2 active:scale-[.96]"
          >
            <SharpStarIcon className="size-4" />
            <span className="bg-[linear-gradient(135deg,var(--ink)_0%,var(--ink-3)_100%)] bg-clip-text font-mono text-[13px] font-normal text-transparent">20</span>
          </a>
        </div>
        </div>
      </aside>
    </>
  );
}
