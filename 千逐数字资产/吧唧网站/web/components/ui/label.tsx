import * as React from "react";

export function Label({ className = "", ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={`text-xs text-white/70 ${className}`} {...props} />
  );
}

