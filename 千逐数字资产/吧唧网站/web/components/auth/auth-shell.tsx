import Link from "next/link";
import type { ReactNode } from "react";

import { AuthBadgeShowcase } from "@/components/auth/badge-showcase";

type Switcher = {
  prompt: string;
  actionLabel: string;
  actionHref: string;
};

type AuthShellProps = {
  title: string;
  subtitle: string;
  description?: string;
  switcher: Switcher;
  children: ReactNode;
};

export function AuthShell({
  title,
  subtitle,
  description,
  switcher,
  children,
}: AuthShellProps) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-32 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,_rgba(59,167,255,0.28),_transparent_70%)] blur-3xl" />
        <div className="absolute right-[-8%] top-[-10%] h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,_rgba(255,0,229,0.25),_transparent_72%)] blur-3xl" />
        <div className="absolute bottom-[-15%] left-[20%] h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,_rgba(0,242,255,0.22),_transparent_70%)] blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(360px,_420px)_minmax(320px,_1fr)]">
          <section className="relative z-10 glass p-8 shadow-2xl">
            <div className="mb-8 space-y-3">
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">
                Badge Studio Admin
              </span>
              <h1 className="text-2xl font-semibold text-white">{title}</h1>
              <p className="text-sm text-white/70">{subtitle}</p>
              {description ? (
                <p className="text-xs text-white/50">{description}</p>
              ) : null}
            </div>

            <div className="space-y-6">{children}</div>

            <p className="mt-10 text-xs text-white/50">
              {switcher.prompt}{" "}
              <Link
                href={switcher.actionHref}
                className="text-[--color-primary] underline-offset-4 hover:underline"
              >
                {switcher.actionLabel}
              </Link>
            </p>
          </section>

          <aside className="relative hidden lg:block">
            <AuthBadgeShowcase />
          </aside>
        </div>

        <div className="mt-10 block lg:hidden">
          <AuthBadgeShowcase compact />
        </div>
      </div>
    </div>
  );
}

