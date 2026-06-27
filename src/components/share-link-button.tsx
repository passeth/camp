"use client";

import { useState } from "react";

function getShareUrl() {
  const url = new URL(window.location.href);
  url.hash = "";
  return url.toString();
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "-1000px";
  textarea.style.left = "-1000px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function ShareLinkButton() {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  const handleClick = async () => {
    try {
      await copyText(getShareUrl());
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 1800);
    } catch {
      setStatus("failed");
      window.setTimeout(() => setStatus("idle"), 2200);
    }
  };

  const label = status === "copied" ? "Copied" : status === "failed" ? "Copy failed" : "Copy share link";

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--foreground)] hover:bg-[var(--surface-soft)]"
      aria-live="polite"
    >
      <span>{label}</span>
      <span className="text-sm text-[var(--muted)] transition group-hover:text-[var(--foreground)]" aria-hidden="true">
        ↗
      </span>
    </button>
  );
}
