"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSkin } from "@/context/skin-context";
import Disclaimer from "@/components/disclaimer";
import type { PhotoState } from "@/lib/types";

export default function HomePage() {
  const { setPhoto, setStep } = useSkin();
  const [preview, setPreview] = useState<PhotoState>({
    dataUrl: null,
    name: "",
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleFile(file: File | undefined | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : null;
      const st: PhotoState = { dataUrl, name: file.name };
      setPreview(st);
      setPhoto(st);
    };
    reader.readAsDataURL(file);
  }

  function startAnalysis() {
    if (!preview.dataUrl) return;
    setStep("analyzing");
    router.push("/analyze");
  }

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col pt-8">
      <header className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blush-light">
          <span className="text-2xl">🧴</span>
        </div>
        <h1 className="text-2xl font-bold text-skin">AI 肌肤管理助手</h1>
        <p className="mt-1 text-sm text-skin-light">
          拍一张照片，了解你的肌肤状态
        </p>
      </header>

      <section className="flex flex-1 flex-col">
        <div
          onClick={() => inputRef.current?.click()}
          className="relative flex min-h-[300px] flex-1 flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-blush/40 bg-white/60"
          role="button"
          tabIndex={0}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {preview.dataUrl ? (
            <>
              {/* base64 data URL，next/image 无法优化，故用原生 img */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.dataUrl}
                alt="已上传的正脸照片"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-skin">
                照片已就绪 · 点击可更换
              </span>
            </>
          ) : (
            <div className="flex flex-col items-center px-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blush-light">
                <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-blush-deep" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 16V8M8 12l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-base font-semibold text-skin">点击拍照或选择照片</p>
              <p className="mt-1 text-xs text-skin-light">
                请使用自然光、素颜或尽量少妆、正面拍摄
              </p>
              <p className="mt-1 text-xs text-skin-light">
                仅用于本次分析 · 照片会送到你本机的分析服务，不会外传
              </p>
            </div>
          )}
        </div>
      </section>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => inputRef.current?.click()}
          className="min-h-[52px] flex-1 rounded-2xl border border-blush/40 bg-white text-base font-semibold text-blush-deep"
        >
          {preview.dataUrl ? "更换照片" : "拍照 / 相册"}
        </button>
        <button
          onClick={startAnalysis}
          disabled={!preview.dataUrl}
          className="min-h-[52px] flex-1 rounded-2xl bg-blush-deep text-base font-semibold text-white shadow-lg shadow-blush/30 disabled:opacity-40 disabled:shadow-none"
        >
          开始分析
        </button>
      </div>

      <Disclaimer className="mt-4" />
    </div>
  );
}