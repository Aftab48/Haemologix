"use client";

import Link from "next/link";
import { RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

type Target = { label: string; href: string };

export default function DemoControls({
  targets,
  onReset,
  busy = false,
}: {
  targets: Target[];
  onReset: () => Promise<void>;
  busy?: boolean;
}) {
  const reset = async () => {
    if (!window.confirm("Reset the shared global demo for every visitor?")) return;
    await onReset();
  };
  return (
    <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-dark">
        <ShieldCheck className="h-4 w-4 text-yellow-600" />
        Shared demo controls
      </div>
      <div className="flex flex-wrap gap-2">
        {targets.map((target) => (
          <Button key={target.href} asChild variant="outline" size="sm">
            <Link href={target.href}>Switch to {target.label}</Link>
          </Button>
        ))}
        <Button type="button" variant="destructive" size="sm" disabled={busy} onClick={() => void reset()}>
          <RotateCcw className="mr-2 h-4 w-4" />
          {busy ? "Resetting…" : "Reset demo session"}
        </Button>
      </div>
      <p className="mt-3 text-xs text-text-dark/70">
        This is a global synthetic sandbox. Changes synchronize to all open demo dashboards in about two seconds.
      </p>
    </div>
  );
}

