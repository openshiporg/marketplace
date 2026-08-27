"use client";

import { useEffect, useRef } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MarketplaceChatThread } from '@/lib/chat-thread-storage';

interface ChatThreadTabsProps {
  threads: MarketplaceChatThread[];
  activeThreadId: string;
  disabled?: boolean;
  onSelect: (threadId: string) => void;
  onClose: (threadId: string) => void;
  onNew: () => void;
  className?: string;
}

export function ChatThreadTabs({
  threads,
  activeThreadId,
  disabled = false,
  onSelect,
  onClose,
  onNew,
  className,
}: ChatThreadTabsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const activeTab = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    activeTab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeThreadId]);

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Chat threads"
      className={cn(
        "flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {threads.map((thread) => {
        const active = thread.id === activeThreadId;
        return (
          <div
            key={thread.id}
            data-active={active ? 'true' : 'false'}
            className={cn(
              "group/thread flex h-7 w-36 shrink-0 items-center gap-0.5 rounded-[7px] pl-2.5 pr-0.5 text-[12.5px] font-medium transition-colors duration-100",
              active ? "bg-hover-2 text-ink" : "text-ink-3 hover:bg-hover hover:text-ink-2",
              disabled && "pointer-events-none opacity-40",
            )}
          >
            <button
              type="button"
              role="tab"
              data-thread-id={thread.id}
              aria-selected={active}
              aria-controls="marketplace-chat-panel"
              tabIndex={active ? 0 : -1}
              disabled={disabled}
              title={thread.title}
              onClick={() => onSelect(thread.id)}
              onKeyDown={(event) => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const tabs = Array.from(
                  listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') || [],
                );
                const currentIndex = tabs.indexOf(event.currentTarget);
                const targetIndex = event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? tabs.length - 1
                    : event.key === 'ArrowLeft'
                      ? (currentIndex - 1 + tabs.length) % tabs.length
                      : (currentIndex + 1) % tabs.length;
                const target = tabs[targetIndex];
                const targetThreadId = target?.dataset.threadId;
                if (target && targetThreadId) {
                  target.focus();
                  onSelect(targetThreadId);
                }
              }}
              className="min-w-0 flex-1 truncate text-left outline-none"
            >
              {thread.title}
            </button>
            <button
              type="button"
              disabled={disabled}
              aria-label={`Close ${thread.title}`}
              title="Close chat"
              onClick={() => onClose(thread.id)}
              className="-my-1 flex size-6 shrink-0 items-center justify-center rounded-[5px] text-ink-3 opacity-70 transition-[background-color,color,opacity,transform] duration-100 hover:bg-hover-2 hover:text-ink active:scale-[0.94] group-hover/thread:opacity-100 focus-visible:opacity-100"
            >
              <X className="size-3" strokeWidth={2.2} />
            </button>
          </div>
        );
      })}
      <button
        type="button"
        disabled={disabled}
        aria-label="New chat"
        title="New chat"
        onClick={onNew}
        className="ml-0.5 flex size-7 shrink-0 items-center justify-center rounded-[7px] text-ink-3 transition-[background-color,color,transform] duration-100 hover:bg-hover hover:text-ink active:scale-[0.94] disabled:pointer-events-none disabled:opacity-40"
      >
        <Plus className="size-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}
