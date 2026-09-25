"use client";

import { useEffect, useState } from "react";

const lines = [
  "正在生成你的 Skin Profile…",
  "匹配早晚护理步骤…",
  "整理 4 / 8 / 12 周计划…",
];

export default function GeneratingView() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setIdx(1), 600);
    const t2 = setTimeout(() => setIdx(2), 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col items-center justify-center pb-20 text-center">
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-blush-light">
        <span className="animate-spin text-3xl">✨</span>
      </div>
      <p className="text-base font-semibold text-skin">{lines[idx]}</p>
      <p className="mt-2 text-xs text-skin-light">生成你的专属护肤方案，请稍候</p>
    </div>
  );
}
