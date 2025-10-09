"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { RadioGroup } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Segmented } from "@/components/ui/segmented";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { Tabs } from "@/components/ui/tabs";

const WX_QR = process.env.NEXT_PUBLIC_WX_QR_URL ||
  "https://youke1.picui.cn/s1/2025/09/08/68bea85ed0b44.jpg";

type GenResp = {
  status: string;
  previewWearUrls: string[];
};

export default function Home() {
  const [preview, setPreview] = useState<string | null>(null);
  const [sizeMm, setSizeMm] = useState<58 | 75>(58);
  const [bg, setBg] = useState<"solid" | "gradient">("solid");
  const [scale, setScale] = useState<number>(100);
  const [dragOver, setDragOver] = useState(false);
  const [pending, setPending] = useState(false);
  const [cooldownMs, setCooldownMs] = useState(0);
  const [wearUrls, setWearUrls] = useState<string[] | null>(null);
  const [activeWear, setActiveWear] = useState(0);
  const [showQR, setShowQR] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [badgeUrl, setBadgeUrl] = useState<string | null>(null);
  const [lead, setLead] = useState<{ nickname: string; count: number; note: string }>({ nickname: "", count: 1, note: "" });
  const [agree, setAgree] = useState(true);

  const overlay = useMemo(() => {
    const d = sizeMm === 58 ? 70 : 82; // diameter percent of container
    const inner = `${d}%`;
    const stop = d / 2;
    const mask = `radial-gradient(circle at 50% 50%, transparent ${stop}%, rgba(0,0,0,0.55) ${stop + 0.5}%)`;
    return { inner, mask };
  }, [sizeMm]);

  useEffect(() => {
    const id = setInterval(() => {
      setCooldownMs((ms) => (ms > 1000 ? ms - 1000 : ms > 0 ? 0 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch("/api/quota")
      .then((r) => r.json())
      .then((d) => {
        setCooldownMs(d.cooldownMs || 0);
      })
      .catch(() => {});
  }, []);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setPreview(url);
  }

  async function onGenerate() {
    setPending(true);
    try {
      const res = await fetch("/api/generate", { method: "POST" });
      if (res.status === 429) {
        const body = await res.json();
        if (body.error === "cooldown") {
          setCooldownMs(body.retryInMs || 60000);
        }
        return;
      }
      const data: GenResp = await res.json();
      setWearUrls(data.previewWearUrls);
      const badge = await composeBadge();
      if (badge) setBadgeUrl(badge);
      // refresh quota
      const q = await fetch("/api/quota").then((r) => r.json());
      setCooldownMs(q.cooldownMs || 60000);
    } catch (e) {
      console.error(e);
    } finally {
      setPending(false);
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!preview) return;
    setDrag({ sx: e.clientX, sy: e.clientY, ox: offset.x, oy: offset.y });
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const dx = e.clientX - drag.sx;
    const dy = e.clientY - drag.sy;
    // Increase sensitivity: scale by a speed factor that slightly grows with zoom level
    const speed = 1.35 * (1 + (scale - 100) / 300);
    setOffset({ x: drag.ox + dx * speed, y: drag.oy + dy * speed });
  }
  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    setDrag(null);
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {}
  }

  function onWheel(e: React.WheelEvent<HTMLDivElement>) {
    if (!preview) return;
    e.preventDefault();
    const delta = -e.deltaY; // up = zoom in
    const step = Math.max(1, Math.min(8, Math.abs(delta) * 0.05));
    setScale((s) => {
      const next = Math.max(40, Math.min(240, s + step * Math.sign(delta)));
      return next;
    });
  }

  function resetView() {
    setScale(100);
    setOffset({ x: 0, y: 0 });
  }

  function centerView() {
    setOffset({ x: 0, y: 0 });
  }

  async function composeBadge() {
    if (!preview) return null;
    const containerW = containerRef.current?.getBoundingClientRect().width || 600;
    const canvasSize = 600;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = canvasSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    if (bg === "gradient") {
      const g = ctx.createRadialGradient(canvasSize*0.5, canvasSize*0.35, 10, canvasSize*0.5, canvasSize*0.5, canvasSize*0.6);
      g.addColorStop(0, "rgba(59,167,255,0.18)");
      g.addColorStop(1, "rgba(0,0,0,0.0)");
      ctx.fillStyle = g;
      ctx.fillRect(0,0,canvasSize,canvasSize);
    } else {
      ctx.fillStyle = "rgba(0,0,0,0)";
      ctx.fillRect(0,0,canvasSize,canvasSize);
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(canvasSize/2, canvasSize/2, canvasSize/2 - 2, 0, Math.PI*2);
    ctx.closePath();
    ctx.clip();

    const img = new window.Image();
    img.src = preview;
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });
    const base = Math.max(canvasSize / img.width, canvasSize / img.height);
    const scaleMul = scale / 100;
    const drawW = img.width * base * scaleMul;
    const drawH = img.height * base * scaleMul;

    const k = canvasSize / containerW;
    const dx = canvasSize/2 - drawW/2 + offset.x * k;
    const dy = canvasSize/2 - drawH/2 + offset.y * k;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, dx, dy, drawW, drawH);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(canvasSize/2, canvasSize/2, canvasSize/2 - 1, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(255,0,229,0.6)";
    ctx.lineWidth = 2;
    ctx.stroke();

    return canvas.toDataURL("image/png");
  }

  function LeadForm() {
    const { show } = useToast();
    async function submit() {
      try {
        const res = await fetch("/api/lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...lead, sizeMm }),
        });
        const data = await res.json();
        show({ title: "已提交意向", desc: `编号 ${data.leadId}`, type: "success" });
      } catch (error) {
        console.error(error);
        show({ title: "提交失败", type: "error" });
      }
    }
    return (
      <div className="glass p-4 elev-1">
        <h2 className="text-base mb-3">可选：提交意向</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <Label htmlFor="nickname">昵称</Label>
            <Input id="nickname" placeholder="可留空" value={lead.nickname}
                   onChange={(e) => setLead({ ...lead, nickname: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="count">数量</Label>
            <Input id="count" type="number" min={1} value={lead.count}
                   onChange={(e) => setLead({ ...lead, count: Number(e.target.value || 1) })} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="note">备注</Label>
            <Input id="note" placeholder="如：急用/期望样式等" value={lead.note}
                   onChange={(e) => setLead({ ...lead, note: e.target.value })} />
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <Switch checked={agree} onChange={setAgree} />
            <span className="text-xs text-white/70">同意使用预览图用于下单沟通</span>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button onClick={submit} disabled={!agree}>提交意向</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
    <div className="min-h-screen px-4 sm:px-8 py-8 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 reveal" style={{animationDelay:'.06s'}}>
          <Image src="/logo.svg" alt="logo" width={32} height={32} />
          <div className="text-sm text-white/80">
            长沙理工大学：一件可送（校内，可含邮）
          </div>
        </div>
        {/* 限制关闭，暂不展示额度/冷却 */}
      </header>

      {/* 限制关闭，隐藏进度条 */}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload/Crop */}
        <section className="glass p-4 lg:col-span-1 elev-1 reveal" style={{animationDelay:'.18s'}}>
          <h2 className="text-base mb-3">① 上传 / 裁切</h2>
          <div
            className={`${!preview ? "dropzone-empty " : ""}${dragOver ? "drop-anim " : ""}relative aspect-square w-full rounded-lg overflow-hidden flex items-center justify-center touch-pan-x touch-pan-y cursor-grab active:cursor-grabbing`}
            style={{
              background:
                bg === "solid"
                  ? "var(--color-card)"
                  : "radial-gradient(800px 400px at 50% 0%, rgba(59,167,255,0.18), transparent), var(--color-card)",
            }}
            
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            ref={containerRef}
            onClick={() => (document.getElementById('file-input') as HTMLInputElement)?.click()}
            onWheel={onWheel}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) {
                setPreview(URL.createObjectURL(f));
              }
            }}
          >
            {preview ? (
              <Image
                src={preview}
                alt="上传预览"
                fill
                unoptimized
                draggable={false}
                className="object-cover"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale / 100})`,
                  touchAction: "none",
                }}
              />
            ) : (
              <div className="text-white/70 text-sm text-center">拖拽图片到此处，或点击下方选择文件</div>
            )}

            {/* Circular crop overlay & guides */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0" style={{ background: overlay.mask }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative" style={{ width: overlay.inner, height: overlay.inner }}>
                  <div className="absolute inset-0 rounded-full border border-white/30" />
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-white/30" />
                  <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-white/30" />
                  <div className="absolute inset-0 rounded-full" style={{ boxShadow: "0 0 24px rgba(59,167,255,0.15) inset" }} />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <input id="file-input" type="file" accept="image/*" onChange={onFileChange} className="hidden" />
            <Button variant="outline" onClick={() => (document.getElementById('file-input') as HTMLInputElement)?.click()}>选择图片</Button>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span>缩放</span>
              <span className="text-white/60">{scale}%</span>
            </div>
            <Slider min={40} max={240} step={1} value={scale} onChange={setScale} />
            <div className="mt-2 flex gap-2">
              <Button variant="ghost" onClick={resetView}>重置</Button>
              <Button variant="ghost" onClick={centerView}>居中</Button>
            </div>
          </div>
        </section>

        {/* Template/Controls */}
        <section className="glass p-4 lg:col-span-1 elev-1">
          <h2 className="text-base mb-3">② 模板 / 尺寸</h2>
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <span>圆形尺寸:</span>
              <RadioGroup
                name="sizeMm"
                items={[
                  { label: "58mm", value: 58 },
                  { label: "75mm", value: 75 },
                ]}
                value={sizeMm}
                onChange={(v) => setSizeMm(v as 58 | 75)}
                variant="round"
              />
            </div>
            <div className="flex items-center gap-3">
              <span>背景:</span>
              <Segmented
                items={[
                  { label: "纯色", value: "solid" },
                  { label: "渐变", value: "gradient" },
                ]}
                value={bg}
                onChange={(v) => setBg(v as typeof bg)}
              />
            </div>

            <div className="text-xs text-white/60">提示：若生成失败，将回退为仅裁切模板预览。</div>
            <Button
              className={`reveal ${cooldownMs > 0 ? "cooldown" : ""}`}
              disabled={pending || cooldownMs > 0}
              onClick={onGenerate}
            >
              {pending
                ? "生成中…"
                : cooldownMs > 0
                ? `等待 ${Math.ceil(cooldownMs / 1000)}s`
                : "生成/再次生成 ▶"}
            </Button>
          </div>
        </section>
        
        <section className="glass p-4 lg:col-span-1 elev-1">
          <h2 className="text-base mb-3">③ 佩戴预览</h2>
          <div className="mb-2">
            <Tabs items={[{ label: "上衣", value: 0 }, { label: "背包", value: 1 }, { label: "帽子", value: 2 }]} value={activeWear} onChange={(v) => setActiveWear(v)} />
          </div>
          <div className="rounded-md overflow-hidden bg-[--color-card] border border-white/10">
            <div className="relative h-48 w-full">
              {pending ? (
                <div className="skeleton absolute inset-0" />
              ) : (
                <Image
                  onClick={() => setShowPreview(true)}
                  src={
                    (wearUrls || [
                      "/mock/wear-shirt.svg",
                      "/mock/wear-backpack.svg",
                      "/mock/wear-cap.svg",
                    ])[activeWear]
                  }
                  alt="佩戴预览"
                  fill
                  className="fade-in cursor-zoom-in object-cover"
                  sizes="(max-width: 1024px) 100vw, 360px"
                  unoptimized
                />
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {(wearUrls || [
              "/mock/wear-shirt.svg",
              "/mock/wear-backpack.svg",
              "/mock/wear-cap.svg",
            ]).map((u, i) => (
              <button
                key={i}
                onClick={() => setActiveWear(i)}
                className={`rounded-md overflow-hidden border hover:border-[--color-primary] hover:scale-[1.01] transition ${
                  activeWear === i
                    ? "border-[--color-primary]"
                    : "border-white/10"
                }`}
                aria-label={`预览 ${i + 1}`}
              >
                <div className="relative h-20 w-full">
                  {pending ? (
                    <div className="skeleton absolute inset-0" />
                  ) : (
                    <Image
                      src={u}
                      alt="佩戴预览缩略图"
                      fill
                      className="fade-in object-cover"
                      sizes="120px"
                      unoptimized
                    />
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <Button className="reveal" style={{animationDelay:'.22s'}} onClick={() => setShowQR(true)}>加微信下单</Button>
            <span className="text-xs text-white/60">
              长沙理工大学：一件可送（校内，可含邮）
            </span>
          </div>

          <Dialog open={showQR} onOpenChange={setShowQR} title="微信二维码">
            <div className="relative mx-auto aspect-square w-full max-w-xs">
              <Image
                src={WX_QR}
                alt="微信二维码"
                fill
                className="rounded-md object-cover"
                sizes="(max-width: 640px) 70vw, 220px"
                unoptimized
              />
            </div>
          </Dialog>
          <Dialog open={showPreview} onOpenChange={setShowPreview} title="预览放大">
            <div className="relative w-full max-w-[90vw] max-h-[70vh] overflow-hidden">
              <Image
                src={
                  (wearUrls || [
                    "/mock/wear-shirt.svg",
                    "/mock/wear-backpack.svg",
                    "/mock/wear-cap.svg",
                  ])[activeWear]
                }
                alt="预览放大"
                width={900}
                height={600}
                className={`transition ${zoomed ? "scale-110 cursor-zoom-out" : "cursor-zoom-in"}`}
                onClick={() => setZoomed((z) => !z)}
                unoptimized
              />
            </div>
          </Dialog>
      </section>
      </div>

      {/* Lead form */}
      <div className="mt-6">
        <LeadForm />
      </div>

      {/* Badge result preview */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="glass p-4 elev-1 lg:col-span-1">
          <h2 className="text-base mb-3">Badge 预览</h2>
          <div className="rounded-md overflow-hidden bg-[--color-card] border border-white/10 flex items-center justify-center aspect-square">
            {badgeUrl ? (
              <div className="relative h-full w-full">
                <Image
                  src={badgeUrl}
                  alt="生成吧唧预览"
                  fill
                  className="fade-in object-contain"
                  sizes="(max-width: 1024px) 100vw, 360px"
                  unoptimized
                />
              </div>
            ) : (
              <div className="skeleton w-full h-full" />
            )}
          </div>
          <p className="text-xs text-white/60 mt-2">点击生成后更新此预览。</p>
        </section>
      </div>

      <footer className="mt-8 text-xs text-white/40">
        说明：本演示为MVP骨架，生成接口已设配额/冷却占位；后续将接入火山引擎抠图与Supabase持久化。
      </footer>
    </div>
    </ToastProvider>
  );
}
