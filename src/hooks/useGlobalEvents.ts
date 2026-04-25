import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { GlobalEvent } from "@/types/event";

const REFRESH_MS = 60_000;

export function useGlobalEvents() {
  const [events, setEvents] = useState<GlobalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "gnews-feed",
          { method: "GET" }
        );
        if (cancelled) return;
        if (fnError) throw fnError;
        if (data?.events) {
          setEvents(data.events as GlobalEvent[]);
          setFetchedAt(data.fetchedAt ?? new Date().toISOString());
          setError(null);
        }
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Failed to load feed";
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const id = window.setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return { events, loading, error, fetchedAt };
}