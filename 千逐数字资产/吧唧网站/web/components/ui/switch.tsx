"use client";

import * as React from "react";

export function Switch({ checked, onChange, className = "" }: { checked: boolean; onChange: (c: boolean) => void; className?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${
        checked ? "bg-[--color-primary]/60 border-[--color-primary]/70" : "bg-white/10 border-white/15"
      } ${className}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}

