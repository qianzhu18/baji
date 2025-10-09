"use client";

import * as React from "react";

export function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full h-10 rounded-md px-3 bg-white/5 border border-white/10 text-sm text-white/90 placeholder:text-white/40 outline-none focus:ring-2 focus:ring-[--color-primary]/50 ${className}`}
      {...props}
    />
  );
}

