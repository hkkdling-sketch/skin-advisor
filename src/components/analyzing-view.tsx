"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSkin } from "@/context/skin-context";
import { requestRealAnalysis } from "@/lib/scanClient";

const steps = [
  "读取照片信息…",
  "观察肤质外观特征…",
  "评估出油与干燥程度…",
  "检测泛红 / 毛孔等外观细节…",
  "整理分析结果…",
];

const MIN_MS = steps.length * 600 + 400;
/** 硬兜底：哪怕请求一直挂着，也不能让用户永远停在分析页 */
const HARD_TIMEOUT_MS = 20000;

type Status = "pending" | "ok" | "fallback" | "no-face";
type Outcome = Awaited<ReturnType<typeof requestRealAnalysis>>;

export default function AnalyzingView() {
  const { setStep, photo, setRealAnalysis, reset } = useSkin();
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [status, setStatus] = useState<Status>("pending");

  /**
   * 同一张照片只发一次分析请求。
   * 注意：这里不能用「已启动就 return」的写法 —— React 严格模式下 effect 会
   * 先执行再清理再执行，一旦第二次直接 return，进度定时器就再也装不回去，
   * 界面会永久停在第一格（20%）。正确做法是缓存请求，但每次都重装定时器。
   */
  const inflightRef = useRef<{ key: string; promise: Promise<Outcome> } | null>(
    null
  );

  useEffect(() => {
    if (!photo?.dataUrl) {
      setStatus("fallback");
      const t = setTimeout(() => setStep("questions"), 600);
      return () => clearTimeout(t);
    }

    let cancelled = false;
    let handoff: ReturnType<typeof setTimeout> | undefined;
    const timers = steps.map((_, i) => setTimeout(() => setIdx(i), i * 600));

    const key = photo.dataUrl;
    if (inflightRef.current?.key !== key) {
      inflightRef.current = {
        key,
        promise: requestRealAnalysis(key, 15000),
      };
    }

    // requestRealAnalysis 自己有 15s 超时，但取 blob 那一步不受它管，
    // 所以再兜一层，确保一定会 resolve。
    const hardFail = new Promise<Outcome>((r) =>
      setTimeout(
        () => r({ ok: false, reason: "unavailable", message: "分析超时" }),
        HARD_TIMEOUT_MS
      )
    );

    Promise.all([
      Promise.race([inflightRef.current.promise, hardFail]),
      new Promise((r) => setTimeout(r, MIN_MS)),
    ]).then(([outcome]) => {
      if (cancelled) return;

      if (outcome.ok) {
        setRealAnalysis(outcome.scan);
        setStatus("ok");
        handoff = setTimeout(() => setStep("questions"), 700);
        return;
      }

      setRealAnalysis(null);

      // 图里没人脸：不要静默用假数据，明确让用户换照片
      if (outcome.reason === "no-face") {
        setStatus("no-face");
        return;
      }

      setStatus("fallback");
      handoff = setTimeout(() => setStep("questions"), 700);
    });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      if (handoff) clearTimeout(handoff);
    };
  }, [setStep, photo?.dataUrl, setRealAnalysis]);

  // 请求还没回来时最多走到倒数第二格（80%），只有真正出结果才跳 100%，
  // 避免出现「进度条满了但还停在这页」的假象。
  const shown =
    status === "pending" ? Math.min(idx, steps.length - 2) : steps.length - 1;
  const progress = Math.min(100, Math.round(((shown + 1) / steps.length) * 100));

  if (status === "no-face") {
    return (
      <div className="flex min-h-[calc(100dvh-7rem)] flex-col items-center justify-center px-6 pb-20 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-cream-deep">
          <span className="text-3xl">🖼️</span>
        </div>
        <h2 className="text-lg font-semibold text-skin">这张照片没识别到人脸</h2>
        <p className="mt-3 text-sm leading-relaxed text-skin-light">
          请使用<strong className="text-skin">正面、光线充足、无遮挡</strong>的照片，
          <br />
          尽量不要戴口罩、墨镜，也不要用侧脸或合照。
        </p>
        <button
          onClick={() => {
            reset();
            router.push("/");
          }}
          className="mt-8 min-h-[52px] w-full max-w-xs rounded-2xl bg-blush-deep text-base font-semibold text-white"
        >
          换一张照片
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col items-center justify-center pb-20 text-center">
      <div className="relative mb-8 flex h-24 w-24 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full bg-blush-light/60" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-blush">
          <span className="text-3xl">🔍</span>
        </div>
      </div>

      <div className="w-full max-w-xs px-6">
        <div className="mb-4 flex justify-between text-xs text-skin-light">
          <span>准备分析你的肌肤</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-cream-deep">
          <div
            className="h-full rounded-full bg-blush transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-5 text-base font-medium text-skin">
          {steps[idx] ?? "整理中…"}
        </p>

        {status === "ok" && (
          <p className="mt-2 text-xs text-blush-deep">
            已完成真实图像分析 · 结果仅供参考，不作为医疗诊断
          </p>
        )}
        {status === "fallback" && (
          <p className="mt-2 text-xs text-skin-light">
            将结合你的回答生成分析 · 仅供参考
          </p>
        )}
        {status === "pending" && (
          <p className="mt-2 text-xs text-skin-light">
            分析仅为外观特征参考，不作为医疗诊断
          </p>
        )}
      </div>
    </div>
  );
}
