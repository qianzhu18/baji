"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  useEffect(() => {
    let active = true;
    router.prefetch("/admin");
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json();
        if (active && data.user) {
          router.replace("/admin");
        }
      } catch (error) {
        console.error("[auth] session preflight failed", error);
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  const emailError = useMemo(() => {
    if (!email) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? null : "邮箱格式不正确";
  }, [email]);

  const passwordError = useMemo(() => {
    if (!password) return null;
    return password.length >= 8 ? null : "密码至少 8 位";
  }, [password]);

  const disabled =
    loading ||
    !email ||
    !password ||
    Boolean(emailError) ||
    Boolean(passwordError);

  function onPasswordKey(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState && event.getModifierState("CapsLock"));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (disabled) return;
    setLoading(true);
    setServerError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body?.error === "invalid") {
          setServerError("邮箱或密码不正确");
        } else if (body?.error === "email") {
          setServerError("邮箱格式不正确");
        } else {
          setServerError("登录失败，请稍后再试");
        }
        return;
      }
      router.replace("/admin");
    } catch (err) {
      console.error(err);
      setServerError("网络异常，请稍后再试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="管理员登录"
      subtitle="登陆后台，管理线索、配额与生成记录。"
      switcher={{ prompt: "没有账号？", actionLabel: "立即注册", actionHref: "/admin/register" }}
    >
      <form className="space-y-5" onSubmit={onSubmit} noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">邮箱</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value.trim().toLowerCase());
              setServerError(null);
            }}
            required
          />
          {emailError ? <p className="text-xs text-red-400">{emailError}</p> : null}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-white/60">
            <Label htmlFor="password" className="text-white/70">
              密码
            </Label>
            <Link href="#" className="text-[--color-primary] hover:underline">
              忘记密码？
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="至少 8 位字符"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setServerError(null);
              }}
              onKeyUp={onPasswordKey}
              onKeyDown={onPasswordKey}
              onBlur={() => setCapsLock(false)}
              required
              minLength={8}
              className="pr-16"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-2 text-xs text-white/60 transition hover:text-white"
            >
              {showPassword ? "隐藏" : "显示"}
            </button>
          </div>
          {capsLock ? <p className="text-xs text-amber-300/80">注意：当前启用了大写锁定</p> : null}
          {passwordError ? <p className="text-xs text-red-400">{passwordError}</p> : null}
        </div>

        {serverError ? <p className="text-xs text-red-400">{serverError}</p> : null}

        <Button type="submit" disabled={disabled} className="w-full">
          {loading ? "登录中…" : "登录"}
        </Button>
      </form>
    </AuthShell>
  );
}
