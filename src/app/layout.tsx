import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { SkinProvider } from "@/context/skin-context";
import BottomNav from "@/components/bottom-nav";
import { SITE_URL } from "@/lib/site";

const DESCRIPTION =
  "上传一张照片、回答几个问题，得到属于你的早晚护肤方案，以及预算内的产品清单。";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "AI 肌肤管理助手",
  description: DESCRIPTION,
  openGraph: {
    title: "AI 肌肤管理助手",
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "AI 肌肤管理助手",
    locale: "zh_CN",
    type: "website",
    images: [
      { url: "/og.png", width: 1200, height: 630, alt: "AI 肌肤管理助手" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI 肌肤管理助手",
    description: DESCRIPTION,
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <SkinProvider>
          <div className="mx-auto flex min-h-dvh w-full max-w-mobile flex-col bg-cream">
            <main className="flex-1 px-4 pb-28">{children}</main>
            <BottomNav />
          </div>
        </SkinProvider>
      </body>
    </html>
  );
}
