"use client";

import * as React from "react";

type Variant = "primary" | "ghost" | "outline";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base =
    "inline-flex items-center justify-center rounded-md text-sm h-10 px-4 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--color-primary]/60 disabled:opacity-50 disabled:cursor-not-allowed";
  const styles: Record<Variant, string> = {
    primary:
      "neon-btn text-white bg-[--color-primary]/20 border border-[--color-primary]/60 hover:bg-[--color-primary]/30",
    ghost:
      "text-white/80 bg-white/5 hover:bg-white/10 border border-white/10",
    outline:
      "text-[--color-primary] bg-transparent border border-[--color-primary]/60 hover:bg-[--color-primary]/10",
  };
  return <button className={`${base} ${styles[variant]} ${className}`} {...props} />;
}

