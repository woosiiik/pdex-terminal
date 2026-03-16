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
      <body className="bg-[#0d1117] text-[#c9d1d9] antialiased font-sans min-h-screen overflow-hidden">
        {children}
      </body>
    </html>
  );
}
