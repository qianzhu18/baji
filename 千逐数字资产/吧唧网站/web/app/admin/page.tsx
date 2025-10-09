"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type LeadRecord = {
  leadId: string;
  createdAt?: string;
  nickname?: string;
  sizeMm?: number;
  count?: number;
  note?: string;
  [key: string]: unknown;
};

export default function AdminHome() {
  const r = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<LeadRecord[]>([]);
  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me", { cache: "no-store" }).then((r) => r.json());
      if (!me.user) { r.replace("/admin/login"); return; }
      const res = await fetch("/api/admin/leads", { cache: "no-store" });
      if (!res.ok) { r.replace("/admin/login"); return; }
      const data = (await res.json()) as { items?: LeadRecord[] };
      setItems(data.items ?? []);
      setLoading(false);
    })();
  }, [r]);

  async function logout(){ await fetch("/api/auth/logout", { method: "POST" }); r.replace("/admin/login"); }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="skeleton w-64 h-16"/></div>;

  return (
    <div className="min-h-screen p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg">线索管理</h1>
        <Button variant="outline" onClick={logout}>退出登录</Button>
      </div>
      <div className="glass p-4 overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-white/70">
            <tr><th className="text-left p-2">时间</th><th className="text-left p-2">ID</th><th className="text-left p-2">昵称</th><th className="text-left p-2">尺寸</th><th className="text-left p-2">数量</th><th className="text-left p-2">备注</th></tr>
          </thead>
          <tbody>
            {items.map((x) => (
              <tr key={x.leadId} className="border-t border-white/10">
                <td className="p-2">{formatDate(x.createdAt)}</td>
                <td className="p-2">{x.leadId}</td>
                <td className="p-2">{x.nickname || "-"}</td>
                <td className="p-2">{x.sizeMm ?? "-"}</td>
                <td className="p-2">{x.count ?? 1}</td>
                <td className="p-2">{x.note || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDate(iso?: string) {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")} ${`${date.getHours()}`.padStart(2, "0")}:${`${date.getMinutes()}`.padStart(2, "0")}`;
}
