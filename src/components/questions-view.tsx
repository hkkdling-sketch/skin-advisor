"use client";

import { useState } from "react";
import { useSkin } from "@/context/skin-context";
import { stepQuestions } from "@/lib/mockData";
import { buildMockResult } from "@/lib/mockEngine";
import { applyAdvice, requestAdvice } from "@/lib/adviceClient";

export default function QuestionsView() {
  const { photo, setResult, setStep, budget, realAnalysis, setAiLoading, setSelectedPlan } = useSkin();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});

  const q = stepQuestions[current];
  const selected = answers[q.id] ?? [];
  const progress = ((current + 1) / stepQuestions.length) * 100;

  function toggle(optionId: string) {
    if (q.type === "single") {
      setAnswers((prev) => ({ ...prev, [q.id]: [optionId] }));
    } else {
      setAnswers((prev) => {
        const cur = prev[q.id] ?? [];
        const next = cur.includes(optionId)
          ? cur.filter((x) => x !== optionId)
          : [...cur, optionId];
        return { ...prev, [q.id]: next };
      });
    }
  }

  function next() {
    if (current < stepQuestions.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      setStep("generating");
      setTimeout(() => {
        // 先用规则引擎出结果，保证任何情况下都有东西可看
        const base = buildMockResult(photo, answers, budget, realAnalysis);
        setResult(base);
        // 直接落到「高性价比方案」，否则用户进结果页只看到一堆指标、
        // 要自己先点一下预算按钮才出商品推荐（预算按钮却已显示选中，两处矛盾）
        setSelectedPlan("highValue");
        setStep("result");

        // 再让大模型补充文案；没配 Key 或调用失败时静默跳过
        setAiLoading(true);
        void requestAdvice(base, budget)
          .then((advice) => {
            if (!advice) return;
            setResult((prev) => (prev ? applyAdvice(prev, advice) : prev));
          })
          .catch(() => undefined)
          .finally(() => setAiLoading(false));
      }, 1600);
    }
  }

  const canNext = q.type === "single" ? selected.length > 0 : selected.length > 0;

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col pb-8 pt-6">
      <div className="mb-6 px-1">
        <div className="mb-2 flex items-center justify-between text-xs text-skin-light">
          <span>
            问题 {current + 1} / {stepQuestions.length}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-cream-deep">
          <div
            className="h-full rounded-full bg-blush transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <h2 className="mb-1 text-xl font-bold text-skin">{q.title}</h2>
      {q.subtitle && <p className="mb-5 text-sm text-skin-light">{q.subtitle}</p>}

      <div className="mt-2 flex flex-col gap-3">
        {q.options.map((opt) => {
          const isSel = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => toggle(opt.id)}
              className={`flex min-h-[56px] items-center rounded-2xl border px-4 text-left text-[15px] transition-colors ${
                isSel
                  ? "border-blush bg-blush-light font-medium text-skin"
                  : "border-brush/25 bg-white text-skin"
              }`}
            >
              <span className="flex-1">{opt.label}</span>
              <span
                className={`ml-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                  isSel ? "border-blush-deep bg-blush-deep text-white" : "border-brush/30"
                }`}
              >
                {isSel && (
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto pt-8">
        <button
          onClick={next}
          disabled={!canNext}
          className="min-h-[56px] w-full rounded-2xl bg-blush-deep text-base font-semibold text-white shadow-lg shadow-blush/30 disabled:opacity-40 disabled:shadow-none"
        >
          {current < stepQuestions.length - 1 ? "下一题" : "生成我的方案"}
        </button>
      </div>
    </div>
  );
}
