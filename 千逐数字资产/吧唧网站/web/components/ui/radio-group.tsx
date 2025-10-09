"use client";

import * as React from "react";

export type RadioItem<T extends string | number> = {
  label: React.ReactNode;
  value: T;
};

export function RadioGroup<T extends string | number>({
  items,
  value,
  onChange,
  name,
  className = "",
  variant = "round",
}: {
  items: RadioItem<T>[];
  value: T;
  onChange: (v: T) => void;
  name: string;
  className?: string;
  variant?: "round" | "chip";
}) {
  return (
    <div role="radiogroup" className={`flex gap-2 ${className}`}>
      {items.map((it) => {
        const checked = it.value === value;
        const baseLabel =
          variant === "round"
            ? `radio ${checked ? "radio-checked" : ""}`
            : `px-3 py-1.5 rounded-md border text-sm ${
                checked
                  ? "border-[--color-primary] bg-[--color-primary]/15 text-white"
                  : "border-white/12 text-white/80 hover:bg-white/6"
              }`;
        return (
          <label key={String(it.value)} className={`${baseLabel} cursor-pointer select-none transition-all`}>
            <input
              className="sr-only"
              type="radio"
              name={name}
              value={String(it.value)}
              checked={checked}
              onChange={() => onChange(it.value)}
            />
            {variant === "round" ? (
              <>
                <span className="radio-dot" />
                <span className="text-sm text-white/85">{it.label}</span>
              </>
            ) : (
              <span className="text-sm">{it.label}</span>
            )}
          </label>
        );
      })}
    </div>
  );
}
