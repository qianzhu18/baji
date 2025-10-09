"use client";

import * as React from "react";

type Toast = { id: number; title?: string; desc?: string; type?: "success" | "error" | "info" };

const Ctx = React.createContext<{ show: (t: Omit<Toast, "id">) => void } | null>(null);

export function useToast() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [list, setList] = React.useState<Toast[]>([]);
  const show = React.useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    const toast: Toast = { id, ...t };
    setList((s) => [...s, toast]);
    setTimeout(() => setList((s) => s.filter((x) => x.id !== id)), 3000);
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-2">
        {list.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg px-3 py-2 text-sm shadow-lg border ${
              t.type === "error"
                ? "bg-red-500/20 border-red-400 text-red-100"
                : t.type === "success"
                ? "bg-emerald-500/20 border-emerald-400 text-emerald-100"
                : "bg-white/10 border-white/20 text-white"
            }`}
          >
            <div className="font-medium">{t.title}</div>
            {t.desc ? <div className="text-xs opacity-80">{t.desc}</div> : null}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

