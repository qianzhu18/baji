"use client";

import * as React from "react";

export function Slider({
  min = 0,
  max = 100,
  step = 1,
  value,
  onChange,
  className = "",
}: {
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`slider ${className}`}
    />
  );
}

