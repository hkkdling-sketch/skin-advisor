import type { FullResult, UserBudget } from "./types";

/** 大模型返回的原始建议结构（字段都可能缺失） */
export interface RawAdvice {
  summary?: string;
  routineAm?: Array<{ product?: string; detail?: string }>;
  routinePm?: Array<{ product?: string; detail?: string }>;
  tips?: string[];
  weekFocus?: { week4?: string; week8?: string; week12?: string };
  cautions?: string[];
}

export function describeBudget(b?: UserBudget | null): string {
  if (!b) return "未指定";
  if (b.range === "custom" && b.customAmount) return `自定义约 ${b.customAmount} 元`;
  const map: Record<string, string> = {
    under100: "100 元以内",
    under200: "200 元以内",
    under300: "300 元以内",
    under500: "500 元以内",
    over500: "500 元以上",
    over1000: "1000 元以上",
  };
  return map[b.range] ?? "未指定";
}

/**
 * 请求大模型建议。未配置 Key / 调用失败时返回 null，调用方保持规则生成的内容。
 */
export async function requestAdvice(
  result: FullResult,
  budget: UserBudget | null,
  timeoutMs = 20000
): Promise<RawAdvice | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);

    const res = await fetch("/api/advice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        suitType: result.profile.suitType,
        concerns: result.profile.concerns,
        goals: result.profile.goals,
        scores: {
          出油: result.analysis.oiliness,
          干燥: result.analysis.dryness,
          毛孔: result.analysis.pores,
          色素: result.analysis.pigmentation,
          泛红: result.analysis.redness,
          瑕疵: result.analysis.acneRef,
        },
        budgetText: describeBudget(budget),
        isRealScan: true,
      }),
    });
    clearTimeout(timer);

    const json = (await res.json()) as { ok?: boolean; advice?: RawAdvice };
    if (!json.ok || !json.advice) return null;
    return json.advice;
  } catch {
    return null;
  }
}

/**
 * 把大模型建议合并进结果。
 * 关键原则：**不替换商品** —— 商品是按预算从 products.json 选出来的（也是变现点），
 * 只让 AI 补充文案：总结、每一步的用法、阶段重点、注意事项。
 */
export function applyAdvice(result: FullResult, advice: RawAdvice | null): FullResult {
  if (!advice) return result;

  const next: FullResult = { ...result };

  if (typeof advice.summary === "string" && advice.summary.trim()) {
    next.profile = { ...next.profile, description: advice.summary.trim() };
  }

  const am = advice.routineAm ?? [];
  const pm = advice.routinePm ?? [];

  /** AI 给的步骤数不够覆盖现有步骤时，保持原样，避免出现"无用法"的空步骤 */
  const enrich = (
    steps: FullResult["routine"]["am"],
    ai: Array<{ product?: string; detail?: string }>
  ) => {
    if (!steps?.length || ai.length < steps.length) return steps;
    return steps.map((s, i) => {
      const detail = ai[i]?.detail?.trim();
      return detail ? { ...s, detail } : s;
    });
  };

  const focus: Record<string, string | undefined> = {
    week4: advice.weekFocus?.week4,
    week8: advice.weekFocus?.week8,
    week12: advice.weekFocus?.week12,
  };
  const hasFocus = Boolean(focus.week4 || focus.week8 || focus.week12);

  const withFocus = (plans: FullResult["plans"]) =>
    plans.map((p) => {
      const f = focus[p.key];
      if (!f) return p;
      return { ...p, goals: [f, ...p.goals.filter((g) => g !== f)] };
    });

  const enrichPlan = (plan: FullResult["highValuePlan"]): FullResult["highValuePlan"] => ({
    ...plan,
    routine: {
      am: enrich(plan.routine.am, am),
      pm: enrich(plan.routine.pm, pm),
    },
    plans: hasFocus ? withFocus(plan.plans) : plan.plans,
  });

  next.routine = {
    am: enrich(next.routine.am, am),
    pm: enrich(next.routine.pm, pm),
  };
  next.plans = hasFocus ? withFocus(next.plans) : next.plans;
  next.highValuePlan = enrichPlan(next.highValuePlan);
  next.completePlan = enrichPlan(next.completePlan);

  const tips = (advice.tips ?? []).map((t) => t.trim()).filter(Boolean).slice(0, 4);
  const cautions = (advice.cautions ?? []).map((t) => t.trim()).filter(Boolean).slice(0, 3);
  if (tips.length || cautions.length) {
    next.aiAdvice = { tips, cautions };
  }

  return next;
}
