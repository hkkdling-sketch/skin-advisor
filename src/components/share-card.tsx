"use client";

import { useEffect, useState } from "react";
import type { FullResult } from "@/lib/types";

// 与 tailwind.config.js 保持一致，canvas 里没法用 CSS 变量
const C = {
  cream: "#FCF7F2",
  creamDeep: "#F4EAE1",
  blush: "#E39C8E",
  blushLight: "#F6DCD4",
  blushDeep: "#C97C6C",
  skin: "#8A6E5C",
  skinLight: "#B39A88",
  brush: "#D8C0AE",
};

const W = 750;
const H = 1120;
const FONT = '"PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif';

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 按 cover 方式把图片填满目标矩形，避免照片被拉变形 */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let sw = img.width;
  let sh = img.height;
  let sx = 0;
  let sy = 0;
  if (imgRatio > boxRatio) {
    sw = img.height * boxRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / boxRatio;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function barColor(v: number): string {
  return v >= 67 ? C.blushDeep : v >= 34 ? C.blush : C.blushLight;
}

async function render(result: FullResult): Promise<string> {
  const canvas = document.createElement("canvas");
  const dpr = 2; // 2 倍图，手机上不发虚
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.scale(dpr, dpr);

  // 背景
  ctx.fillStyle = C.cream;
  ctx.fillRect(0, 0, W, H);

  // 顶部色块
  ctx.fillStyle = C.blushLight;
  ctx.fillRect(0, 0, W, 260);

  // 标题
  ctx.fillStyle = C.skin;
  ctx.font = `bold 40px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("我的皮肤状态", W / 2, 100);
  ctx.font = `22px ${FONT}`;
  ctx.fillStyle = C.skinLight;
  ctx.fillText(
    new Date().toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    W / 2,
    140
  );

  // 照片（白色卡片 + 圆角图）
  const photoSize = 200;
  const px = (W - photoSize) / 2;
  const py = 170;
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, px - 12, py - 12, photoSize + 24, photoSize + 24, 28);
  ctx.fill();

  if (result.photo?.dataUrl) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = result.photo.dataUrl;
    try {
      await img.decode();
      ctx.save();
      roundRect(ctx, px, py, photoSize, photoSize, 20);
      ctx.clip();
      drawImageCover(ctx, img, px, py, photoSize, photoSize);
      ctx.restore();
    } catch {
      // 图片解码失败就留白，不影响其余内容
    }
  }

  // 肤质 + 综合分
  let y = py + photoSize + 70;
  ctx.fillStyle = C.skin;
  ctx.font = `bold 52px ${FONT}`;
  ctx.fillText(String(result.profile.suitType ?? "—"), W / 2, y);

  y += 48;
  ctx.font = `24px ${FONT}`;
  ctx.fillStyle = C.skinLight;
  ctx.fillText(`综合状态 ${result.profile.score} 分`, W / 2, y);

  // 关注点标签
  const concerns = (result.profile.concerns ?? []).slice(0, 4);
  if (concerns.length > 0) {
    y += 56;
    ctx.font = `24px ${FONT}`;
    const gap = 16;
    const padX = 22;
    const pillH = 46;
    const widths = concerns.map((c) => ctx.measureText(c).width + padX * 2);
    const totalW = widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1);
    let x = (W - totalW) / 2;
    concerns.forEach((c, i) => {
      ctx.fillStyle = C.creamDeep;
      roundRect(ctx, x, y, widths[i], pillH, pillH / 2);
      ctx.fill();
      ctx.fillStyle = C.skin;
      ctx.textAlign = "center";
      ctx.fillText(c, x + widths[i] / 2, y + 30);
      x += widths[i] + gap;
    });
    y += pillH + 44;
  } else {
    y += 44;
  }

  // 指标：2 列 × 3 行
  const meters: { label: string; value: number }[] = [
    { label: "出油", value: result.analysis.oiliness },
    { label: "干燥", value: result.analysis.dryness },
    { label: "毛孔", value: result.analysis.pores },
    { label: "色素", value: result.analysis.pigmentation },
    { label: "泛红", value: result.analysis.redness },
    { label: "痘痘", value: result.analysis.acneRef },
  ];

  ctx.textAlign = "left";
  const colW = 300;
  const startX = (W - colW * 2 - 30) / 2;
  meters.forEach((m, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = startX + col * (colW + 30);
    const my = y + row * 92;

    ctx.fillStyle = C.skin;
    ctx.font = `26px ${FONT}`;
    ctx.textAlign = "left";
    ctx.fillText(m.label, x, my);

    const v = Math.max(0, Math.min(100, Math.round(m.value)));
    ctx.fillStyle = C.skinLight;
    ctx.font = `26px ${FONT}`;
    ctx.textAlign = "right";
    ctx.fillText(String(v), x + colW, my);

    const by = my + 16;
    ctx.fillStyle = C.creamDeep;
    roundRect(ctx, x, by, colW, 14, 7);
    ctx.fill();
    if (v > 0) {
      ctx.fillStyle = barColor(v);
      roundRect(ctx, x, by, Math.max(14, (colW * v) / 100), 14, 7);
      ctx.fill();
    }
  });

  // 底部说明
  ctx.textAlign = "center";
  ctx.fillStyle = C.skinLight;
  ctx.font = `20px ${FONT}`;
  ctx.fillText("数值越高表示越需要关注", W / 2, H - 120);
  ctx.font = `22px ${FONT}`;
  ctx.fillStyle = C.blushDeep;
  ctx.fillText("AI 肌肤管理助手", W / 2, H - 78);
  ctx.font = `18px ${FONT}`;
  ctx.fillStyle = C.brush;
  ctx.fillText("外观特征参考，不构成医疗诊断", W / 2, H - 46);

  return canvas.toDataURL("image/png");
}

export default function ShareCard({
  result,
  onClose,
}: {
  result: FullResult;
  onClose: () => void;
}) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let alive = true;
    setBusy(true);
    void render(result).then((u) => {
      if (!alive) return;
      setUrl(u);
      setBusy(false);
    });
    return () => {
      alive = false;
    };
  }, [result]);

  function save() {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `皮肤分析-${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-full w-full max-w-[430px] flex-col overflow-y-auto rounded-3xl bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-skin">分享卡片</h3>
          <button
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm text-skin-light"
          >
            关闭
          </button>
        </div>

        {busy ? (
          <div className="flex h-64 items-center justify-center text-sm text-skin-light">
            生成中…
          </div>
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt="皮肤分析分享卡片"
            className="w-full rounded-2xl"
          />
        ) : (
          <p className="py-10 text-center text-sm text-skin-light">
            生成失败，请重试
          </p>
        )}

        <button
          onClick={save}
          disabled={!url}
          className="mt-4 min-h-[48px] w-full rounded-2xl bg-blush-deep font-semibold text-white disabled:opacity-40"
        >
          保存图片
        </button>
        <p className="mt-2 text-center text-[11px] text-skin-light">
          手机上可长按图片直接保存
        </p>
      </div>
    </div>
  );
}
