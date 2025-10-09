"use client";

import * as React from "react";

export function Segmented<T extends string | number>({
  items,
  value,
  onChange,
  className = "",
}: {
  items: { label: React.ReactNode; value: T }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={`inline-flex p-1 rounded-lg bg-white/5 border border-white/10 ${className}`}>
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={String(it.value)}
            onClick={() => onChange(it.value)}
            className={`px-3 py-1.5 rounded-md text-sm transition-all ${
              active
                ? "bg-[--color-primary]/20 text-white border border-[--color-primary]/50"
                : "text-white/80 hover:bg-white/10 border border-transparent"
            }`}
            type="button"
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

