import Image from "next/image";

const SAMPLES = [
  {
    id: "solo",
    title: "洛天依蓝 · 单人像",
    meta: "58mm 抛光亮面",
    highlight: "纯色底 + 透明通道，黑线干净无锯齿",
    image: "/badges/badge-aqua.svg",
    rotation: "-rotate-4",
  },
  {
    id: "starlight",
    title: "星光限定 · 漸层透光",
    meta: "75mm 防水覆膜",
    highlight: "渐层+镭射泛光，保留面部细节",
    image: "/badges/badge-starlight.svg",
    rotation: "rotate-2",
  },
  {
    id: "team",
    title: "社团合影 · 大面径",
    meta: "88mm 团购专用",
    highlight: "多人合影自动居中，随图适配主色",
    image: "/badges/badge-team.svg",
    rotation: "-rotate-1",
  },
];

type AuthBadgeShowcaseProps = {
  compact?: boolean;
};

export function AuthBadgeShowcase({ compact }: AuthBadgeShowcaseProps) {
  return (
    <div
      className={`glass relative overflow-hidden border border-white/10 ${
        compact ? "p-5" : "p-8"
      }`}
    >
      <div className="pointer-events-none absolute -right-20 top-[-60px] h-56 w-56 rounded-full bg-[radial-gradient(circle_at_center,_rgba(59,167,255,0.32),_transparent_72%)] blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-[-32px] h-48 w-48 rounded-full bg-[radial-gradient(circle_at_center,_rgba(255,0,229,0.25),_transparent_70%)] blur-3xl" />

      <div className="relative space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.4em] text-white/35">
            Preview
          </p>
          <h2 className="text-lg font-medium text-white">真实成品效果</h2>
          <p className="text-sm text-white/60">
            取样自近期交付的吧唧，展示不同尺寸和覆膜效果，便于现场演示质感。
          </p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2">
          {SAMPLES.map((sample) => (
            <BadgeCard key={sample.id} {...sample} compact={compact} />
          ))}
        </div>

        <footer className="text-[11px] text-white/45">
          每个生成请求同步输出挂包/上衣/帽子三类着装预览，辅助线上确认质感。
        </footer>
      </div>
    </div>
  );
}

type BadgeCardProps = {
  title: string;
  meta: string;
  rotation: string;
  highlight: string;
  image: string;
  compact?: boolean;
};

function BadgeCard({ title, meta, rotation, highlight, image, compact }: BadgeCardProps) {
  return (
    <div
      className={`group relative flex flex-col items-start gap-4 rounded-2xl border border-white/10 bg-white/3 p-5 text-white/80 backdrop-blur-lg transition duration-300 hover:border-[--color-primary]/40 hover:text-white ${rotation}`}
    >
      <div className="flex w-full items-center justify-between text-xs uppercase tracking-[0.35em] text-white/45">
        <span>{meta}</span>
        <span>实拍</span>
      </div>

      <div className={`relative w-full ${compact ? "h-44" : "h-48"}`}>
        <div className="absolute inset-0 rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.25),rgba(8,11,18,0.85))] shadow-[0_24px_35px_rgba(0,0,0,0.45)]" />
        <div className="absolute inset-[12px] rounded-[22px] border border-white/12 bg-[#0f1625]" />
        <div className={`absolute inset-[18px] overflow-hidden rounded-full border border-white/10 bg-[#09101c] ${compact ? "" : "glow-pulse"}`}>
          <Image
            src={image}
            alt={`${title} 的吧唧实拍`}
            fill
            sizes="(max-width: 768px) 220px, 260px"
            className="object-cover"
            priority={false}
          />
        </div>
        <div className="absolute left-10 top-4 h-12 w-12 -rotate-12 rounded-full border border-white/10 bg-white/15 blur-2xl opacity-50" />
        <div className="absolute right-9 bottom-5 h-10 w-10 rotate-12 rounded-full border border-white/10 bg-[--color-primary]/30 blur-xl opacity-50" />
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="text-[11px] text-white/55">{highlight}</p>
      </div>

      <div className="flex w-full items-center justify-between text-[10px] text-white/40">
        <span>72h 可重复下载</span>
        <span>附品牌水印</span>
      </div>
    </div>
  );
}
