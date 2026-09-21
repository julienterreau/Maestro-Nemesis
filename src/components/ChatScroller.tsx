"use client";

import { ArrowDownIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

const NEAR_BOTTOM_PX = 96;

export function ChatScroller({
  children,
  follow,
}: {
  children: ReactNode;
  follow?: boolean;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [showJump, setShowJump] = useState(false);

  function nearBottom() {
    const el = viewportRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  }

  function scrollToBottom(smooth = false) {
    const el = viewportRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    setShowJump(false);
  }

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    if (follow || nearBottom()) {
      el.scrollTop = el.scrollHeight;
      setShowJump(false);
    } else {
      setShowJump(true);
    }
  }, [children, follow]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        ref={viewportRef}
        onScroll={() => setShowJump(!nearBottom())}
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto [scrollbar-gutter:auto]"
      >
        <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-4">
          {children}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background to-transparent" />
      {showJump ? (
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          aria-label="Aller en bas"
          className="absolute bottom-3 left-1/2 z-10 flex size-8 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border border-border bg-card/90 text-muted-foreground shadow-lg backdrop-blur-sm transition-colors hover:border-primary/40 hover:bg-card hover:text-primary"
        >
          <ArrowDownIcon className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
