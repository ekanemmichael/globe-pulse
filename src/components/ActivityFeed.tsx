import { useEffect, useRef, useState } from "react";
import type { GlobalEvent } from "@/types/event";
import { cn } from "@/lib/utils";

interface ActivityFeedProps {
  events: GlobalEvent[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  loading: boolean;
  fetchedAt: string | null;
}

export function ActivityFeed({
  events,
  selectedId,
  onSelect,
  loading,
  fetchedAt,
}: ActivityFeedProps) {
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  // Tick every 30s so relative timestamps stay accurate without refetching.
  const [, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // When the user clicks a globe marker, scroll the feed item into view.
  useEffect(() => {
    if (!selectedId) return;
    const el = itemRefs.current[selectedId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  return (
    <aside className="panel hud-corner relative flex h-full w-full flex-col overflow-hidden rounded-sm">
      {/* Header */}
      <div className="border-b border-border/40 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-blink rounded-full bg-primary shadow-glow" />
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-primary text-glow">
              Live Feed
            </h2>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {events.length} signals
          </span>
        </div>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">
          {fetchedAt
            ? `Last sync · ${new Date(fetchedAt).toLocaleTimeString()}`
            : loading
              ? "Establishing uplink…"
              : "No data"}
        </p>
      </div>

      {/* List */}
      <div className="relative flex-1 overflow-y-auto scroll-smooth">
        {loading && events.length === 0 ? (
          <FeedSkeleton />
        ) : events.length === 0 ? (
          <div className="px-4 py-8 text-center font-mono text-xs text-muted-foreground">
            No signals detected
          </div>
        ) : (
          <ul className="divide-y divide-border/20">
            {events.map((ev) => {
              const isSelected = ev.id === selectedId;
              return (
                <li key={ev.id}>
                  <button
                    ref={(el) => {
                      itemRefs.current[ev.id] = el;
                    }}
                    onClick={() => onSelect(isSelected ? null : ev.id)}
                    className={cn(
                      "group block w-full animate-fade-in-up px-4 py-3 text-left transition-colors",
                      "hover:bg-primary/5",
                      isSelected && "bg-primary/10"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center pt-1">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full bg-primary shadow-glow",
                            isSelected && "animate-blink"
                          )}
                        />
                        <span className="mt-1 h-full w-px bg-border/30" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          <span className="rounded-sm border border-primary/30 bg-primary/10 px-1 py-px text-primary">
                            {ev.countryCode}
                          </span>
                          <span className="truncate">{ev.source}</span>
                          <span className="ml-auto shrink-0">
                            {timeAgo(ev.publishedAt)}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-sm leading-snug text-foreground group-hover:text-primary">
                          {ev.title}
                        </p>
                        {isSelected && ev.description && (
                          <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">
                            {ev.description}
                          </p>
                        )}
                        {isSelected && (
                          <a
                            href={ev.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-block font-mono text-[10px] uppercase tracking-widest text-primary underline-offset-4 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Open source ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

function FeedSkeleton() {
  return (
    <ul className="divide-y divide-border/20">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="px-4 py-3">
          <div className="mb-2 h-2 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-3 w-full animate-pulse rounded bg-muted/70" />
          <div className="mt-1 h-3 w-2/3 animate-pulse rounded bg-muted/50" />
        </li>
      ))}
    </ul>
  );
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}