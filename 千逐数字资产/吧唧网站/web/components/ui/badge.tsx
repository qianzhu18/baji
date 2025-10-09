import * as React from "react";

export function Badge({ className = "", ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`badge inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] leading-none ${className}`}
      {...props}
    />
  );
}

