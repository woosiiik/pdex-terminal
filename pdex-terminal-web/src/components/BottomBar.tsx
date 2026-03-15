"use client";

import { useState } from "react";
import { useStore } from "@/stores/useStore";

type BottomTab = "alerts" | "journal";

export default function BottomBar() {
  const [activeTab, setActiveTab] = useState<BottomTab>("alerts");
  const alerts = useStore((s) => s.alerts);

  const typeIcon: Record<string, { icon: string; color: string }> = {
    warning: { icon: "⚠", color: "text-yellow-500" },
    success: { icon: "✓", color: "text-green-500" },
    error: { icon: "✕", color: "text-red-500" },
  };

  return (
    <div className="flex flex-col h-[120px] shrink-0 border-t border-[#30363d] bg-[#161b22]">
      {/* Tab Header */}
      <div className="flex border-b border-[#30363d]">
        {(["alerts", "journal"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs cursor-pointer border-b-2 transition-colors ${
              activeTab === tab
                ? "text-[#58a6ff] border-[#58a6ff]"
                : "text-[#8b949e] border-transparent hover:text-[#c9d1d9]"
            }`}
          >
            {tab === "alerts" ? "알림" : "Trade Journal"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-2 text-xs">
        {activeTab === "alerts" && (
          <>
            {alerts.length === 0 ? (
              <div className="text-[#484f58] text-center py-4">
                알림이 없습니다
              </div>
            ) : (
              alerts.map((alert) => {
                const t = typeIcon[alert.type] ?? typeIcon.warning;
                const time = new Date(alert.timestamp).toLocaleTimeString(
                  "ko-KR",
                  { hour: "2-digit", minute: "2-digit", second: "2-digit" }
                );
                return (
                  <div
                    key={alert.id}
                    className="flex items-center gap-2 py-1 border-b border-[#21262d]"
                  >
                    <span className={t.color}>{t.icon}</span>
                    <span className="text-[#8b949e]">{time}</span>
                    <span className="text-[#c9d1d9]">{alert.message}</span>
                  </div>
                );
              })
            )}
          </>
        )}

        {activeTab === "journal" && (
          <div className="text-[#484f58] text-center py-4">
            Trade Journal은 추후 지원 예정입니다
          </div>
        )}
      </div>
    </div>
  );
}
