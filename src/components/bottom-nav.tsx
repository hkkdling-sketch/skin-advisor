"use client";

import { usePathname, useRouter } from "next/navigation";

const items = [
  { key: "home", label: "首页", icon: HomeIcon, path: "/" },
  { key: "analyze", label: "分析", icon: AnalyzeIcon, path: "/analyze" },
  { key: "routine", label: "Routine", icon: DropIcon, path: "/routine" },
  { key: "plan", label: "进度", icon: CalIcon, path: "/plan" },
  { key: "about", label: "我的", icon: InfoIcon, path: "/about" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const active = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <nav
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-mobile -translate-x-1/2 border-t border-brush/20 bg-white/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="底部导航"
    >
      <div className="grid grid-cols-5">
        {items.map((it) => {
          const isActive = active(it.path);
          return (
            <button
              key={it.key}
              onClick={() => router.push(it.path)}
              className="flex min-h-[64px] flex-col items-center justify-center gap-1 py-2"
              style={{ WebkitTapHighlightColor: "transparent" }}
              aria-current={isActive ? "page" : undefined}
            >
              <it.icon
                className={`h-6 w-6 ${isActive ? "text-blush-deep" : "text-skin-light"}`}
              />
              <span
                className={`text-[11px] ${
                  isActive ? "font-semibold text-blush-deep" : "text-skin-light"
                }`}
              >
                {it.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function AnalyzeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="6.5" strokeLinecap="round" />
      <path d="m16 16 4.5 4.5M8.5 11h5M11 8.5v5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8">
      <path d="M3 10.5 12 3l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DropIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3c3 4.5 6 8 6 11.5A6 6 0 0 1 6 14.5C6 11 9 7.5 12 3Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.01" strokeLinecap="round" />
    </svg>
  );
}
