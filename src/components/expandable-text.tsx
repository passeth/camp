"use client";

import { useState } from "react";

export function ExpandableText({
  className = "",
  collapsedClassName = "line-clamp-2",
  text,
  threshold = 120,
}: {
  readonly className?: string;
  readonly collapsedClassName?: string;
  readonly text: string;
  readonly threshold?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const canExpand = text.length > threshold;

  return (
    <div>
      <p className={`${className} ${canExpand && !isExpanded ? collapsedClassName : ""}`}>{text}</p>
      {canExpand ? (
        <button
          type="button"
          onClick={() => setIsExpanded((value) => !value)}
          className="mt-2 text-xs font-semibold text-[var(--foreground)] underline-offset-4 hover:underline"
        >
          {isExpanded ? "접기" : "더 보기"}
        </button>
      ) : null}
    </div>
  );
}
