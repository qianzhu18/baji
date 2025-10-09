"use client";

import { useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminRegister() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordCapsLock, setPasswordCapsLock] = useState(false);
  const [confirmCapsLock, setConfirmCapsLock] = useState(false);

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
      } catch (err) {
        console.error("[auth] session preflight failed", err);
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

  const confirmError = useMemo(() => {
    if (!confirm) return null;
    if (confirm.length < 8) return "确认密码至少 8 位";
    return confirm === password ? null : "两次输入的密码不一致";
  }, [confirm, password]);

  const disabled =
    loading ||
    !email ||
    !password ||
    !confirm ||
    Boolean(emailError) ||
    Boolean(passwordError) ||
    Boolean(confirmError);

  function onPasswordKey(event: KeyboardEvent<HTMLInputElement>) {
    setPasswordCapsLock(event.getModifierState && event.getModifierState("CapsLock"));
  }

  function onConfirmKey(event: KeyboardEvent<HTMLInputElement>) {
    setConfirmCapsLock(event.getModifierState && event.getModifierState("CapsLock"));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (disabled) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, inviteCode: inviteCode.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        switch (body?.error) {
          case "exists":
            setError("邮箱已存在，请直接登录");
            break;
          case "email":
            setError("邮箱格式不正确");
            break;
          case "password":
            setError("密码至少 8 位");
            break;
          case "invite":
            setError("邀请码无效，请联系管理员确认");
            break;
          case "closed":
            setError("已关闭开放注册，请使用管理员入口创建账号");
            break;
          default:
            setError("注册失败，请稍后再试");
        }
        return;
      }
      setMessage("注册成功，正在为你跳转到登录页…");
      setTimeout(() => router.push("/admin/login"), 1100);
    } catch (err) {
      console.error(err);
      setError("网络异常，请稍后再试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="创建管理员账号"
      subtitle="注册后即可在线管理生成额度与线索数据。"
      description="首版仅邀请制开放，注册成功后可在后台继续添加团队成员。"
      switcher={{ prompt: "已有账号？", actionLabel: "返回登录", actionHref: "/admin/login" }}
    >
      <form className="space-y-5" onSubmit={onSubmit} noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">邮箱</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="admin@campus.cn"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value.trim().toLowerCase());
              setError(null);
              setMessage(null);
            }}
            required
          />
          {emailError ? <p className="text-xs text-red-400">{emailError}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">密码</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="至少 8 位，建议包含字母+数字"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
                setMessage(null);
              }}
              onKeyUp={onPasswordKey}
              onKeyDown={onPasswordKey}
              onBlur={() => setPasswordCapsLock(false)}
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
          {passwordCapsLock ? (
            <p className="text-xs text-amber-300/80">注意：当前启用了大写锁定</p>
          ) : null}
          {passwordError ? <p className="text-xs text-red-400">{passwordError}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">确认密码</Label>
          <div className="relative">
            <Input
              id="confirm"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              placeholder="再次输入密码"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setError(null);
                setMessage(null);
              }}
              onKeyUp={onConfirmKey}
              onKeyDown={onConfirmKey}
              onBlur={() => setConfirmCapsLock(false)}
              required
              minLength={8}
              className="pr-16"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((prev) => !prev)}
              className="absolute inset-y-0 right-2 text-xs text-white/60 transition hover:text-white"
            >
              {showConfirm ? "隐藏" : "显示"}
            </button>
          </div>
          {confirmCapsLock ? (
            <p className="text-xs text-amber-300/80">注意：当前启用了大写锁定</p>
          ) : null}
          {confirmError ? <p className="text-xs text-red-400">{confirmError}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="invite">邀请码</Label>
          <Input
            id="invite"
            placeholder="内部邀请码"
            value={inviteCode}
            onChange={(e) => {
              setInviteCode(e.target.value);
              setError(null);
              setMessage(null);
            }}
          />
          <p className="text-xs text-white/50">
            首次开放仅限受邀管理员注册，若未获取邀请码请联系负责人开通。
          </p>
        </div>

        {error ? <p className="text-xs text-red-400">{error}</p> : null}
        {message ? <p className="text-xs text-[--color-primary]">{message}</p> : null}

        <Button type="submit" disabled={disabled} className="w-full">
          {loading ? "注册中…" : "注册"}
        </Button>
      </form>
    </AuthShell>
  );
}
