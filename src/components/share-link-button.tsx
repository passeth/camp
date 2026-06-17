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
      className="group flex w-full items-center justify-between rounded-xl border border-[#d9d6ca] bg-white px-3.5 py-3 text-left text-sm font-semibold text-[#171717] transition hover:border-[#171717] hover:bg-[#f7f5ee]"
      aria-live="polite"
    >
      <span>{label}</span>
      <span className="text-base text-[#7a8190] transition group-hover:text-[#171717]" aria-hidden="true">
        ↗
      </span>
    </button>
  );
}
