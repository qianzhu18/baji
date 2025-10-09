"use client";

import * as React from "react";

export function Tabs({
  items,
  value,
  onChange,
  className = "",
}: {
  items: { label: React.ReactNode; value: number }[];
  value: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  const index = Math.max(0, items.findIndex((x) => x.value === value));
  return (
    <div className={`tabs ${className}`}>
      {items.map((it) => (
        <button
          key={String(it.value)}
          className={`tab text-sm ${it.value === value ? "active" : ""}`}
          onClick={() => onChange(it.value)}
          type="button"
        >
          {it.label}
        </button>
      ))}
      <div className="indicator" style={{ transform: `translateX(${index * 100}%)` }} />
    </div>
  );
}

