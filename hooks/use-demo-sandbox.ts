"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DemoAction, DemoSnapshot } from "@/lib/demo/types";

export function useDemoSandbox<T>(view: "donor" | "hospital" | "admin") {
  const [snapshot, setSnapshot] = useState<DemoSnapshot<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const revision = useRef<number | undefined>(undefined);

  const refresh = useCallback(async (force = false) => {
    try {
      const query = new URLSearchParams({ view });
      if (!force && revision.current !== undefined) query.set("since", String(revision.current));
      const response = await fetch(`/api/demo/state?${query.toString()}`, { cache: "no-store" });
      if (response.status === 204) return;
      if (!response.ok) throw new Error("Unable to load the shared demo");
      const next = (await response.json()) as DemoSnapshot<T>;
      revision.current = next.revision;
      setSnapshot(next);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load the shared demo");
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    void refresh(true);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh(false);
    }, 2_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh(false);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  const act = useCallback(async (action: DemoAction) => {
    setMutating(true);
    try {
      const response = await fetch("/api/demo/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId: crypto.randomUUID(), action }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Demo action failed");
      await refresh(true);
      return result as { ok: true; revision: number; duplicate: boolean };
    } finally {
      setMutating(false);
    }
  }, [refresh]);

  const reset = useCallback(async () => {
    setMutating(true);
    try {
      const response = await fetch("/api/demo/reset", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Demo reset failed");
      await refresh(true);
    } finally {
      setMutating(false);
    }
  }, [refresh]);

  return { snapshot, data: snapshot?.data ?? null, loading, error, mutating, refresh, act, reset };
}

export function useDemoAlert(alertId: string) {
  const [snapshot, setSnapshot] = useState<DemoSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/demo/alerts/${encodeURIComponent(alertId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 404 ? "Demo alert not found" : "Unable to load demo alert");
      setSnapshot((await response.json()) as DemoSnapshot);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load demo alert");
    } finally {
      setLoading(false);
    }
  }, [alertId]);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 2_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const act = useCallback(async (action: DemoAction) => {
    const response = await fetch("/api/demo/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionId: crypto.randomUUID(), action }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Demo action failed");
    await refresh();
  }, [refresh]);

  return { snapshot, loading, error, refresh, act };
}

