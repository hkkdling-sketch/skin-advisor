"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSkin } from "@/context/skin-context";
import { buildMockResult } from "@/lib/mockEngine";
import Disclaimer from "@/components/disclaimer";
import ShareCard from "@/components/share-card";
import type { UserBudget, FullResult, WeeklyPlan } from "@/lib/types";

type Tab = "profile" | "routine" | "plan";

/** 商品库已去品牌化，展示时用品类代替品牌名 */
const CATEGORY_LABEL: Record<string, string> = {
  cleanser: "洁面",
  toner: "爽肤水",
  serum: "精华",
  essence: "肌底液",
  moisturizer: "面霜/乳液",
  sunscreen: "防晒",
  mask: "面膜",
  treatment: "局部护理",
  "eye-cream": "眼霜",
  exfoliant: "去角质",
};

/**
 * 预算档位对应的真实价格上限。
 * 注意 over500 / over1000 在引擎里分别映射为 ≤1000 / ≤2000，
 * 页面上若只写「方案总价 ≤ 选择的预算」会误导，这里显示实际数字。
 */
const BUDGET_CAP: Record<string, number> = {
  under100: 100,
  under200: 200,
  under300: 300,
  under500: 500,
  over500: 1000,
  over1000: 2000,
};

const tabs: { key: Tab; label: string }[] = [
  { key: "profile", label: "皮肤画像" },
  { key: "routine", label: "Routine" },
  { key: "plan", label: "计划" },
];

export default function ResultView() {
  const { result, setResult, setBudget, setSelectedPlan, reset, photo, selectedPlan, budget, realAnalysis } = useSkin();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("profile");

  if (!result) {
    return (
      <div className="flex min-h-[calc(100dvh-7rem)] flex-col items-center justify-center">
        <p className="text-skin">暂无分析结果。</p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 min-h-[48px] rounded-2xl bg-blush-deep px-8 font-semibold text-white"
        >
          前往首页
        </button>
      </div>
    );
  }

  // Generate A/B plans when user selects a budget
  function handleBudgetSelect(range: UserBudget["range"], customAmount: number | null = null) {
    if (!result) return;
    const newBudget: UserBudget = {
      amount: null,
      range,
      customAmount: customAmount,
    };
    setBudget(newBudget);
    // Re-generate FullResult with the selected budget and same answers
    const newResult = buildMockResult(photo, result.answers, newBudget, realAnalysis);
    // 商品会随预算重选，但 AI 生成的文案与预算无关，保留下来
    if (result.aiAdvice) newResult.aiAdvice = result.aiAdvice;
    setResult(newResult);
    // 改预算后保持用户当前选的是 A 还是 B，不要硬跳回 A
    setSelectedPlan(selectedPlan ?? "highValue");
  }

  function handleCustomBudget(value: number) {
    handleBudgetSelect("custom", value);
  }

  return (
    <div className="pb-6">
      <div className="flex items-center justify-between pt-5">
        <div>
          <h1 className="text-xl font-bold text-skin">你的护肤方案</h1>
          <p className="text-xs text-skin-light">基于照片外观与你的回答生成</p>
        </div>
        <button
          onClick={reset}
          className="rounded-full border border-brush/30 bg-white px-4 py-2 text-sm font-medium text-blush-deep"
        >
          重新开始
        </button>
      </div>

      <div className="sticky top-0 z-30 -mx-1 mt-4 bg-cream/95 py-2 backdrop-blur">
        <div className="flex rounded-2xl bg-cream-deep p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`min-h-[44px] flex-1 rounded-xl text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-white text-blush-deep shadow-sm"
                  : "text-skin-light"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Budget selector — always visible */}
      <div className="mt-6 p-4 rounded-2xl bg-cream-deep">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-skin">预算设置</span>
          <span className="text-xs text-skin-light">
            方案总价 ≤ ¥
            {budget.range === "custom"
              ? (budget.customAmount ?? 0)
              : (BUDGET_CAP[budget.range] ?? 0)}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <BudgetButton
            label="¥100以下"
            isSelected={budget.range === "under100"}
            onClick={() => handleBudgetSelect("under100")}
          />
          <BudgetButton
            label="¥200以下"
            isSelected={budget.range === "under200"}
            onClick={() => handleBudgetSelect("under200")}
          />
          <BudgetButton
            label="¥300以下"
            isSelected={budget.range === "under300"}
            onClick={() => handleBudgetSelect("under300")}
          />
          <BudgetButton
            label="¥500以下"
            isSelected={budget.range === "under500"}
            onClick={() => handleBudgetSelect("under500")}
          />
          <BudgetButton
            label="¥500以上"
            isSelected={budget.range === "over500"}
            onClick={() => handleBudgetSelect("over500")}
          />
          <BudgetButton
            label="¥1000以上"
            isSelected={budget.range === "over1000"}
            onClick={() => handleBudgetSelect("over1000")}
          />
        </div>
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-skin-light shrink-0">自定义预算:</span>
            <input
              type="number"
              value={budget.range === "custom" ? (budget.customAmount ?? "") : ""}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                handleCustomBudget(val);
              }}
              className="w-24 rounded border bg-white px-2 py-1.5 text-center text-sm"
              placeholder="输入金额"
            />
            <span className="text-xs text-skin-light">元</span>
          </div>
        </div>
      </div>

      {/* A/B Plan Cards — shown when a plan has been selected */}
      {selectedPlan && (
        <div className="mt-6 flex flex-col gap-4">
          <PlanCard
            label="A"
            title="高性价比方案"
            description="用较低预算优先解决最重要的1~2个问题"
            plan={result.highValuePlan}
            isSelected={selectedPlan === "highValue"}
            onSelect={() => setSelectedPlan("highValue")}
          />
          <PlanCard
            label="B"
            title="完整解决方案"
            description="在预算范围内对多个问题进行系统护理"
            plan={result.completePlan}
            isSelected={selectedPlan === "complete"}
            onSelect={() => setSelectedPlan("complete")}
          />
        </div>
      )}

      {tab === "profile" && <ProfileTab result={result} />}
      {tab === "routine" && <RoutineTab />}
      {tab === "plan" && <PlanTab result={result} />}

      <Disclaimer className="mt-6" />
    </div>
  );
}

function BudgetButton({
  label,
  isSelected,
  onClick,
}: {
  label: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
        isSelected
          ? "border-blush bg-blush-light text-blush-deep"
          : "border-brush/25 bg-white text-skin-light"
      }`}
    >
      {label}
    </button>
  );
}

function PlanCard({
  label,
  title,
  description,
  plan,
  isSelected,
  onSelect,
}: {
  label: string;
  title: string;
  description: string;
  plan: FullResult["highValuePlan"];
  isSelected: boolean;
  onSelect: () => void;
}) {
  if (!plan) return null;

  const totalPrice = plan.products.reduce(
    (sum, item) => sum + (item.product?.price ?? 0),
    0
  );
  // 低预算档常常买不下防晒（洁面+保湿已占满），与其硬塞不如明说
  const hasSunscreen = plan.products.some(
    (item) => item.product?.category === "sunscreen"
  );

  return (
    <div
      className={`rounded-3xl border-2 p-5 transition-colors ${
        isSelected ? "border-blush-deep bg-white shadow-md" : "border-transparent bg-white"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blush-deep text-xs font-bold text-white">
            {label}
          </span>
          <h3 className="text-base font-bold text-skin">{title}</h3>
          {isSelected && (
            <span className="rounded-full bg-blush-light px-2 py-0.5 text-xs text-blush-deep">
              已选择
            </span>
          )}
        </div>
        <span className="text-sm font-semibold text-blush-deep">¥{totalPrice}</span>
      </div>
      <p className="mb-3 text-xs text-skin-light">{description}</p>

      {plan.products.length > 0 ? (
        <ul className="mb-4 flex flex-col gap-1.5">
          {plan.products.map((item, i) =>
            item.product ? (
              <li key={i} className="flex items-start gap-2 text-sm text-skin">
                <span className="mt-0.5 text-blush">•</span>
                <div>
                  <span className="font-medium">{item.product.name}</span>
                  <span className="ml-1 text-xs text-skin-light">
                    {CATEGORY_LABEL[item.product.category] ?? "护理"} · ¥{item.product.price}
                  </span>
                  {item.reason && (
                    <span className="ml-1 text-xs text-skin-light">({item.reason})</span>
                  )}
                </div>
              </li>
            ) : null
          )}
        </ul>
      ) : (
        <p className="mb-4 text-xs text-skin-light">当前预算下暂无匹配商品</p>
      )}

      {plan.products.length > 0 && !hasSunscreen && (
        <p className="mb-4 rounded-xl bg-cream px-3 py-2 text-xs leading-relaxed text-skin-light">
          当前预算没能把防晒装进去。白天出门建议另外备一支，
          这是日常护理里最值得单独花钱的一步。
        </p>
      )}

      <button
        onClick={onSelect}
        className={`min-h-[44px] w-full rounded-2xl font-semibold transition-colors ${
          isSelected
            ? "bg-blush-deep text-white"
            : "border-2 border-blush-deep bg-white text-blush-deep"
        }`}
      >
        {isSelected ? "已选择此方案" : "选择此方案"}
      </button>
    </div>
  );
}

/**
 * 单项指标卡片。之前 6 项全是同一个颜色、也没有任何语义，
 * 用户看不出 62 分到底是好还是坏；这里补上状态分级。
 */
function MetricCard({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const level = v >= 67 ? "需关注" : v >= 34 ? "一般" : "良好";
  // 这些指标都是「数值越高越需要关注」，所以颜色随强度加深
  const bar = v >= 67 ? "bg-blush-deep" : v >= 34 ? "bg-blush" : "bg-blush-light";

  return (
    <div className="rounded-2xl bg-cream p-3">
      <div className="mb-0.5 flex items-baseline justify-between">
        <span className="text-xs text-skin-light">{label}</span>
        <span className="text-xs font-medium text-skin">{level}</span>
      </div>
      <div className="mb-1.5 text-xl font-bold leading-none text-skin">{v}</div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-cream-deep">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

function ProfileTab({ result }: { result: FullResult }) {
  const { profile, analysis, photo } = result;
  const [share, setShare] = useState(false);

  const meters: { label: string; value: number }[] = [
    { label: "出油", value: analysis.oiliness },
    { label: "干燥", value: analysis.dryness },
    { label: "毛孔", value: analysis.pores },
    { label: "色素", value: analysis.pigmentation },
    { label: "泛红", value: analysis.redness },
    { label: "痘痘", value: analysis.acneRef },
  ];

  return (
    <section className="mt-5">
      <div className="rounded-3xl bg-white p-5">
        {/* 头部：照片 + 肤质 + 综合分（原来肤质名在这里和上面各出现一次） */}
        <div className="mb-4 flex items-center gap-4">
          {photo.dataUrl && (
            // 用户上传的照片是 base64 data URL，next/image 无法优化，故用原生 img
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.dataUrl}
              alt="你的照片"
              className="h-20 w-20 shrink-0 rounded-2xl object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-skin-light">你的肤质类型</p>
            <p className="text-2xl font-bold text-skin">{profile.suitType}</p>
            <p className="mt-1 text-xs text-skin-light">
              综合状态 {profile.score} · 由 6 项指标折算
            </p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {profile.concerns.map((c) => (
            <span
              key={c}
              className="rounded-full bg-blush-light px-3 py-1 text-xs font-medium text-blush-deep"
            >
              {c}
            </span>
          ))}
        </div>
        {profile.goals.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-sm font-semibold text-skin">目标</p>
            <div className="flex flex-wrap gap-2">
              {profile.goals.map((g) => (
                <span
                  key={g}
                  className="rounded-full bg-cream-deep px-3 py-1 text-xs font-medium text-skin"
                >
                  {g}
                </span>
              ))}
            </div>
          </div>
        )}
        <p className="text-sm leading-relaxed text-skin">{profile.description}</p>

        <AiAdviceBlock result={result} />

        <div className="mt-5">
          <p className="mb-3 text-sm font-semibold text-skin">各项指标</p>
          <div className="grid grid-cols-2 gap-3">
            {meters.map((m) => (
              <MetricCard key={m.label} label={m.label} value={m.value} />
            ))}
          </div>
          <p className="mt-2 text-[11px] text-skin-light">
            数值越高表示越需要关注；综合状态分由这 6 项折算
          </p>
        </div>
      </div>

      <HeatmapPanel result={result} />

      <button
        onClick={() => setShare(true)}
        className="mt-4 min-h-[48px] w-full rounded-2xl border-2 border-blush-deep bg-white font-semibold text-blush-deep"
      >
        生成分享卡片
      </button>

      {share && (
        <ShareCard result={result} onClose={() => setShare(false)} />
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-skin-light">
        AI分析仅用于日常护肤参考，不构成医学诊断或医疗建议。
      </p>
    </section>
  );
}

/** 后端 /scan 返回的 7 个维度 → 中文名 + 对应到页面上的分值 */
const HEATMAP_ITEMS: Array<{
  key: string;
  label: string;
  /** true 表示分值越高越好，只有「水润」一项；其余都是越高越需要关注 */
  higherIsBetter?: boolean;
  score: (r: FullResult) => number | undefined;
}> = [
  { key: "redness", label: "泛红", score: (r) => r.analysis.redness },
  { key: "oiliness", label: "出油", score: (r) => r.analysis.oiliness },
  { key: "pores", label: "毛孔", score: (r) => r.analysis.pores },
  { key: "blemishes", label: "瑕疵", score: (r) => r.analysis.acneRef },
  { key: "pigment", label: "色斑", score: (r) => r.analysis.pigmentation },
  { key: "hydration", label: "水润", higherIsBetter: true, score: (r) => 100 - r.analysis.dryness },
  { key: "texture", label: "纹理", score: () => undefined },
];

/**
 * 分区热力图：把后端生成的半透明 RGBA 热力图叠在用户原图上。
 * 后端不可用时 overlays 为空，整块不渲染（和没有这个功能之前一样）。
 */
function HeatmapPanel({ result }: { result: FullResult }) {
  const { realAnalysis } = useSkin();
  const [active, setActive] = useState<string | null>(null);

  const overlays = realAnalysis?.overlays;
  const available = HEATMAP_ITEMS.filter((i) => overlays?.[i.key]);

  if (!available.length) return null;

  const currentKey = active ?? available[0].key;
  const currentItem =
    available.find((i) => i.key === currentKey) ?? available[0];
  const score = currentItem.score(result);

  return (
    <section className="mt-4 rounded-3xl bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-skin">分区热力图</h3>
        <span className="text-xs text-skin-light">
          {currentItem.label}
          {typeof score === "number"
            ? ` · 分值 ${Math.round(score)}（${
                currentItem.higherIsBetter ? "越高越好" : "越高越需关注"
              }）`
            : ""}
        </span>
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-cream">
        {result.photo.dataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={result.photo.dataUrl} alt="原图" className="block w-full" />
        )}
        {overlays?.[currentKey] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={overlays[currentKey]}
            alt={`${currentItem.label}分区热力图`}
            className="absolute inset-0 h-full w-full"
          />
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {available.map((i) => (
          <button
            key={i.key}
            onClick={() => setActive(i.key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              i.key === currentKey
                ? "border-blush bg-blush-light text-blush-deep"
                : "border-brush/25 bg-white text-skin-light"
            }`}
          >
            {i.label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-skin-light">
        颜色越亮表示该区域此项特征越明显。为图像算法估算结果，不同光线与角度会有差异，仅供日常护理参考。
      </p>
    </section>
  );
}

/**
 * 大模型补充建议。未配置 API Key 时 /api/advice 会直接返回 no-key，
 * 这里整块不渲染，页面表现和接 LLM 之前完全一致。
 */
function AiAdviceBlock({ result }: { result: FullResult }) {
  const { aiLoading } = useSkin();
  const advice = result.aiAdvice;

  if (!aiLoading && !advice) return null;

  const tips = advice?.tips ?? [];
  const cautions = advice?.cautions ?? [];

  return (
    <div className="mt-4 rounded-2xl bg-blush-light p-4">
      <div className="mb-2 flex items-center gap-2">
        <span aria-hidden className="text-base">
          ✨
        </span>
        <p className="text-sm font-semibold text-skin">AI 护理建议</p>
        {aiLoading && !advice && (
          <span className="text-xs text-skin-light">生成中…</span>
        )}
      </div>

      {tips.length > 0 && (
        <ul className="mb-2 flex flex-col gap-1.5">
          {tips.map((t, i) => (
            <li key={i} className="flex gap-2 text-sm text-skin">
              <span className="text-blush">•</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      )}

      {cautions.length > 0 && (
        <ul className="flex flex-col gap-1.5 border-t border-blush/30 pt-2">
          {cautions.map((c, i) => (
            <li key={i} className="flex gap-2 text-xs text-skin-light">
              <span className="text-brush">•</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RoutineTab() {
  const { result, selectedPlan } = useSkin();
  if (!result) return null;

  let routine;
  if (selectedPlan === "highValue") {
    routine = result.highValuePlan?.routine;
  } else if (selectedPlan === "complete") {
    routine = result.completePlan?.routine;
  } else {
    routine = result.routine;
  }

  if (!routine || (routine.am.length === 0 && routine.pm.length === 0)) {
    return (
      <div className="mt-5 rounded-2xl bg-blush-light p-6 text-center">
        <p className="text-skin">请先选择预算生成护肤方案</p>
        <p className="mt-2 text-xs text-skin-light">
          上方选择预算后，系统将生成早晚护肤流程
        </p>
      </div>
    );
  }

  return (
    <section className="mt-5 flex flex-col gap-4">
      <RoutineCard
        title="早间 Routine"
        icon="🌅"
        dark={false}
        steps={routine.am}
      />
      <RoutineCard
        title="晚间 Routine"
        icon="🌙"
        dark={true}
        steps={routine.pm}
      />
      <p className="text-[11px] leading-relaxed text-skin-light">
        步骤为依据常见护理逻辑生成的参考建议，请根据实际产品说明使用。
      </p>
    </section>
  );
}

function RoutineCard({
  title,
  icon,
  dark,
  steps,
}: {
  title: string;
  icon: string;
  dark: boolean;
  steps: { order: number; product: string; detail: string }[];
}) {
  return (
    <div
      className={`rounded-3xl p-5 ${dark ? "bg-skin text-white" : "bg-white"}`}
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <h2 className={`text-lg font-bold ${dark ? "text-white" : "text-skin"}`}>
          {title}
        </h2>
      </div>
      <ol className="flex flex-col gap-3">
        {steps.map((s) => (
          <li key={s.order} className="flex gap-3">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                dark ? "bg-white/20 text-white" : "bg-blush-light text-blush-deep"
              }`}
            >
              {s.order}
            </span>
            <div>
              <p className={`text-sm font-semibold ${dark ? "text-white" : "text-skin"}`}>
                {s.product}
              </p>
              <p className={`text-xs ${dark ? "text-white/70" : "text-skin-light"}`}>
                {s.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function PlanTab({ result }: { result: FullResult }) {
  if (!result?.plans || result.plans.length === 0) {
    return (
      <div className="mt-5 rounded-2xl bg-blush-light p-6 text-center">
        <p className="text-skin">暂无护理计划</p>
      </div>
    );
  }

  return (
    <section className="mt-5 flex flex-col gap-4">
      {result.plans.map((p: WeeklyPlan) => (
        <div key={p.key} className="rounded-3xl bg-white p-5">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-lg font-bold text-skin">
              {p.weeks} 周 · {p.title}
            </h2>
            {p.active && (
              <span className="rounded-full bg-blush-light px-3 py-1 text-xs font-medium text-blush-deep">
                当前
              </span>
            )}
          </div>
          <p className="mb-4 text-xs text-skin-light">阶段：{p.phase}</p>
          <p className="mb-2 text-sm font-semibold text-skin">目标</p>
          <ul className="mb-4 flex flex-col gap-1.5">
            {p.goals.map((g, i) => (
              <li key={i} className="flex gap-2 text-sm text-skin">
                <span className="text-blush">•</span>
                <span>{g}</span>
              </li>
            ))}
          </ul>
          <p className="mb-2 text-sm font-semibold text-skin">调整建议</p>
          <ul className="flex flex-col gap-1.5">
            {p.adjustments.map((a, i) => (
              <li key={i} className="flex gap-2 text-sm text-skin-light">
                <span className="text-brush">•</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
