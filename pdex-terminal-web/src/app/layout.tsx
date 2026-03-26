import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Calico Terminal",
  description: "Hyperliquid 실시간 모니터링 및 AI 분석 터미널",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body className="bg-[#080818] text-[#c9d1d9] antialiased font-sans min-h-screen overflow-hidden">
        {/* Global glow orbs — fixed so they're never clipped by overflow:hidden panels */}
        <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'rgba(124,58,237,0.2)', top: -150, left: -100, filter: 'blur(100px)' }} />
          <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'rgba(59,130,246,0.15)', bottom: -100, right: 50, filter: 'blur(100px)' }} />
          <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'rgba(167,139,250,0.12)', top: '30%', right: '25%', filter: 'blur(80px)' }} />
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </div>
      </body>
    </html>
  );
}
