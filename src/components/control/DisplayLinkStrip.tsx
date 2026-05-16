"use client";

import Link from "next/link";
import { useState } from "react";

type DisplayLinkStripProps = {
  path: string;
};

export function DisplayLinkStrip({ path }: DisplayLinkStripProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  async function copyLink() {
    const url = `${window.location.origin}${path}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1600);
    } catch {
      setCopyState("failed");
      setTimeout(() => setCopyState("idle"), 2200);
    }
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            TV display
          </p>
          <code className="mt-1 block truncate text-sm text-sky-200">
            {path}
          </code>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={copyLink}
            className="min-h-10 rounded-md border border-white/15 px-3 text-sm font-semibold text-white"
          >
            {copyState === "copied"
              ? "Copied"
              : copyState === "failed"
                ? "Copy failed"
                : "Copy link"}
          </button>
          <Link
            href={path}
            target="_blank"
            className="min-h-10 rounded-md bg-sky-300 px-3 py-2 text-sm font-black text-black"
          >
            Open display
          </Link>
        </div>
      </div>
    </section>
  );
}
