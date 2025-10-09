"use client";

import * as React from "react";

type DialogProps = {
  open: boolean;
  onOpenChange(open: boolean): void;
  title?: string;
  children: React.ReactNode;
};

export function Dialog({ open, onOpenChange, title, children }: DialogProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={() => onOpenChange(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="muted-card p-4 max-w-sm w-full text-sm text-white/90"
        onClick={(e) => e.stopPropagation()}
      >
        {title ? <h3 className="text-base mb-2">{title}</h3> : null}
        {children}
        <div className="mt-3 flex justify-end">
          <button
            className="px-3 py-2 rounded-md bg-white/10 hover:bg-white/15"
            onClick={() => onOpenChange(false)}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

