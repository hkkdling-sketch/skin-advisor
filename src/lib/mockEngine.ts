import type {
  FullResult,
  PhotoState,
  Profile,
  Routine,
  SkinAnalysis,
  WeeklyPlan,
  UserBudget,
} from "./types";
import type { RealScan } from "./scanClient";
import { concernLabels, goalLabels } from "./mockData";
import products from "../products.json";
type Product = (typeof products.products)[number];

function clampScore() {
  return Math.round(30 + Math.random() * 50);
}

/**
 * 综合状态参考分：由 6 项问题指标折算（这些指标数值越低表示越不需要关注）。
 *
 * 这里原来是 `70 + Math.random() * 25` 的纯随机数，和用户在同一屏看到的
 * 6 项指标完全无关 —— 展示一个随机数是误导，已改为从真实数据折算，
 * 保证分数和指标自洽。
 */
function computeProfileScore(analysis: SkinAnalysis): number {
  const keys = ["oiliness", "dryness", "pores", "pigmentation", "redness", "acneRef"] as const;
  const avg = keys.reduce((sum, k) => sum + (analysis[k] ?? 0), 0) / keys.length;
  return Math.max(0, Math.min(100, Math.round(100 - avg)));
}

export function buildMockResult(
  photo: PhotoState,
  answers: Record<string, string[]>,
  budget?: UserBudget,
  real?: RealScan | null
): FullResult {
  const concerns: string[] = [];
  answers.q1?.forEach((c) => {
    if (concernLabels[c]) concerns.push(concernLabels[c]);
  });
  if (concerns.length === 0) concerns.push("T区油光", "毛孔较明显");

  const goals: string[] = [];
  answers.q5?.forEach((g) => {
    if (goalLabels[g]) goals.push(goalLabels[g]);
  });
  if (goals.length === 0) goals.push("维持清爽", "改善肤质");

  let suitType = "中性肌肤";
  const q2 = answers.q2?.[0];
  const q1HasT = answers.q1?.includes("tzone");
  if (q2 === "very" || q2 === "some" || q1HasT) suitType = "混合性肌肤";

  // 拿到真实图像分析结果时：覆盖随机数值；问卷未作答时再据此推断肤质
  const oil = real?.oiliness;
  const dry = real?.dryness;
  if (!q2 && typeof oil === "number" && typeof dry === "number") {
    if (oil >= 60 && dry >= 55) suitType = "混合性肌肤";
    else if (oil >= 60) suitType = "油性肌肤";
    else if (dry >= 55) suitType = "干性肌肤";
    else suitType = "中性肌肤";
  }

  const analysis: SkinAnalysis = {
    oiliness: real?.oiliness ?? clampScore(),
    dryness: real?.dryness ?? clampScore(),
    pores: real?.pores ?? clampScore(),
    pigmentation: real?.pigmentation ?? clampScore(),
    redness: real?.redness ?? clampScore(),
    acneRef: real?.acneRef ?? clampScore(),
    suitType,
    concerns,
    summary:
      real?.summary ??
      "根据照片外观初步观察，你的肌肤整体状态较稳定。此分析仅为外观特征参考，不能作为医疗诊断。",
  };

  const level = analysis.oiliness > 60 ? "中高" : "适中";
  const profile: Profile = {
    suitType,
    score: computeProfileScore(analysis),
    level: level + "活跃度",
    concerns,
    goals,
    description: `基于照片外观与你的回答，生成一份 ${suitType} 的皮肤画像。主要关注 ${concerns.join(
      "、"
    )}，护肤目标为 ${goals.join("、")}。本画像为日常护理参考，不作为疾病诊断依据。`,
    environment: "温和气候",
    habits: ["每天早晚护理"],
    generatedAt: new Date().toLocaleString("zh-CN"),
  };

  const effectiveBudget: UserBudget = budget ?? {
    amount: 0,
    range: "under100",
    customAmount: null,
  };

  const routine: Routine = buildRoutine(analysis, effectiveBudget);
  const plans: WeeklyPlan[] = [weeklyPlanA(suitType), weeklyPlanB(), weeklyPlanC()];
  plans[0] = { ...plans[0], active: true };

  const highValuePlan = buildHighValuePlan(analysis, effectiveBudget);
  const completePlan = buildCompletePlan(analysis, effectiveBudget);

  return {
    photo,
    analysis,
    answers,
    profile,
    routine,
    plans,
    highValuePlan,
    completePlan,
    createdAt: Date.now(),
  };
}

function buildRoutine(
  analysis: SkinAnalysis,
  budget: UserBudget
): Routine {
  // findBestProduct uses actual price limits — no hardcoded fallbacks
  const cleanser = findBestProduct("cleanser", analysis, budget);
  const toner = findBestProduct("toner", analysis, budget);
  const sunscreen = findBestProduct("sunscreen", analysis, budget);

  const amSteps: Routine["am"] = [];
  const pmSteps: Routine["pm"] = [];

  if (cleanser) {
    amSteps.push({ order: amSteps.length + 1, product: cleanser.name, detail: `${cleanser.name}，洗后不紧绷` });
    pmSteps.push({ order: pmSteps.length + 1, product: cleanser.name, detail: `${cleanser.name}，清除一天污垢` });
  }
  if (toner) {
    amSteps.push({ order: amSteps.length + 1, product: toner.name, detail: `${toner.name}，补水锁水` });
    pmSteps.push({ order: pmSteps.length + 1, product: toner.name, detail: `${toner.name}，平衡水油` });
  }
  if (sunscreen) {
    amSteps.push({ order: amSteps.length + 1, product: sunscreen.name, detail: `${sunscreen.name}，SPF30+` });
  }

  // If no products matched, add a placeholder step that is not a product claim
  if (amSteps.length === 0 && pmSteps.length === 0) {
    amSteps.push({ order: 1, product: "请在方案中选择具体商品", detail: "根据肤质和预算在方案页选择推荐产品" });
    pmSteps.push({ order: 1, product: "请在方案中选择具体商品", detail: "根据肤质和预算在方案页选择推荐产品" });
  }

  return { am: amSteps, pm: pmSteps };
}

interface PlanBase {
  key: "week4" | "week8" | "week12";
  weeks: number;
  title: string;
  phase: string;
  goals: string[];
  adjustments: string[];
}

function weeklyPlanA(suitType: string): PlanBase {
  return {
    key: "week4",
    weeks: 4,
    title: "入门期",
    phase: "稳住基础",
    goals: [
      "建立早晚清洁-保湿-防晒的稳定习惯",
      `适应 ${suitType} 基础护理，维持皮肤稳定状态`,
    ],
    adjustments: [
      "第 1-2 周：只保留洁面 + 保湿 + 防晒",
      "第 3-4 周：如耐受良好，加入针对性夜间护理",
    ],
  };
}

function weeklyPlanB(): PlanBase {
  return {
    key: "week8",
    weeks: 8,
    title: "调整期",
    phase: "针对核心困扰",
    goals: [
      "针对重点问题引入对应功效成分",
      "建立温和去角质节奏（每周 1-2 次）",
      "强化防晒，预防加深",
    ],
    adjustments: [
      "第 5-6 周：白天抗氧化 / 防晒加固",
      "第 7-8 周：夜间功效成分逐步建立耐受",
    ],
  };
}

function weeklyPlanC(): PlanBase {
  return {
    key: "week12",
    weeks: 12,
    title: "进阶期",
    phase: "巩固与观察",
    goals: [
      "让功效成分达到最佳显效周期",
      "根据皮肤反馈微调配比",
      "准备第一次复评与对比照片",
    ],
    adjustments: [
      "第 9-10 周：评估耐受，稳定用量",
      "第 11-12 周：预约复评",
    ],
  };
}

function getSuitType(analysis: SkinAnalysis): string {
  const { oiliness, dryness, pores, redness, acneRef } = analysis;
  if (oiliness > 70 && dryness < 40) return "油性";
  if (dryness > 70 && oiliness < 40) return "干性";
  if (pores > 70) return "粗大毛孔";
  if (redness > 70) return "敏感";
  if (acneRef > 70) return "痘痘肌";
  return "中性肌肤";
}

/**
 * 引擎内部算出的肤质标签 → 商品库 skinTypes 里实际使用的标签。
 * 两边口径不一致时（"中性肌肤" 在商品库里没有、"敏感" vs "敏感性"）会导致推荐为空，
 * 这里做一次对齐；兜底时宁可选"所有肤质"的通用品，也不要一个都推不出来。
 */
const SKIN_TYPE_ALIAS: Record<string, string[]> = {
  中性肌肤: ["所有肤质", "干性", "油性", "混合性", "敏感性", "成熟肌"],
  粗大毛孔: ["油性", "混合性", "所有肤质"],
  敏感: ["敏感性", "所有肤质"],
  痘痘肌: ["痘痘肌", "油性", "所有肤质"],
  油性: ["油性", "所有肤质"],
  干性: ["干性", "所有肤质"],
  混合性: ["混合性", "所有肤质"],
};

/**
 * 用户困扰（问卷措辞）→ 商品库 suitableProblems 的等价说法。
 * 例："T区油光" 在商品库里写作 "出油"，二者互不包含，必须显式映射。
 */
const CONCERN_ALIAS: Record<string, string[]> = {
  T区油光: ["出油", "毛孔", "T区油光"],
  毛孔较明显: ["毛孔", "毛孔粗大"],
  局部泛红: ["泛红"],
  干燥紧绷: ["干燥", "缺水", "紧绷"],
  暗沉不均: ["暗沉"],
  少量痘痘: ["痘痘", "痘印"],
};

function concernHitsProduct(concern: string, problem: string): boolean {
  // "所有问题" 是商品库里的通配件写法（对应肤质的 "所有肤质"），必须当通配符处理，
  // 否则防晒这类没有具体功效标签的商品会被误判为"不相关"而整条流程漏掉。
  if (problem === "所有问题" || concern === "所有问题") return true;
  if (problem.includes(concern) || concern.includes(problem)) return true;
  return (CONCERN_ALIAS[concern] ?? []).some(
    (alt) => problem.includes(alt) || alt.includes(problem)
  );
}

function getMaxPriceForRange(range: string, customAmount: number | null): number {
  switch (range) {
    case "under100": return 100;
    case "under200": return 200;
    case "under300": return 300;
    case "under500": return 500;
    case "over500": return 1000;   // actual product price ≤ ¥1000
    case "over1000": return 2000;  // actual product price ≤ ¥2000
    case "custom": return customAmount ?? 0;
    default: return 100;
  }
}

/**
 * 洁面 / 爽肤水 / 保湿 / 防晒 是任何护肤流程的必备项，不该因为"没有针对用户某个困扰的
 * 功效标签"就被跳过。找不到功效匹配的商品时，对这几个品类放宽到只看肤质和预算。
 */
const STAPLE_CATEGORIES = new Set(["cleanser", "toner", "moisturizer", "sunscreen"]);

/** 必备品类的占位顺序：预算不够时，排在后面的先被放弃 */
const STAPLE_ORDER = ["cleanser", "moisturizer", "sunscreen", "toner"];

function matchesProduct(
  product: Product,
  suitType: string,
  concerns: string[],
  maxPrice: number,
  ignoreConcerns = false
): boolean {
  const { skinTypes, suitableProblems, avoidWith } = product;

  // Filter by actual price (covers all budget tiers including over500/over1000)
  if (product.price > maxPrice) return false;

  // Skin type check（含口径对齐）
  if (skinTypes && skinTypes.length > 0) {
    const accepted = SKIN_TYPE_ALIAS[suitType] ?? [suitType];
    const suitMatch = skinTypes.some(
      (st) => st === "所有肤质" || accepted.includes(st)
    );
    if (!suitMatch) return false;
  }

  // Problem relevance check（含同义映射）
  if (!ignoreConcerns && suitableProblems && suitableProblems.length > 0) {
    const problemMatch = concerns.some((c) =>
      suitableProblems.some((p) => concernHitsProduct(c, p))
    );
    if (!problemMatch) return false;
  }

  // Conflict check：这里刻意不做同义扩展，避免把只是措辞相近的商品误判为冲突
  if (avoidWith && avoidWith.length > 0) {
    const conflict = concerns.some((c) =>
      avoidWith.some((a) => a.includes(c) || c.includes(a))
    );
    if (conflict) return false;
  }

  return true;
}

function findBestProduct(
  category: string,
  analysis: SkinAnalysis,
  budget: UserBudget,
  /** 剩余预算。挑必备品类时要按"还剩下多少钱"找，否则会把预算撑爆 */
  maxPriceOverride?: number
): Product | null {
  const suitType = getSuitType(analysis);
  const maxPrice = maxPriceOverride ?? getMaxPriceForRange(budget.range, budget.customAmount);

  if (maxPrice <= 0) return null;

  const filterBy = (ignoreConcerns: boolean) =>
    products.products.filter(
      (p: Product) =>
        matchesProduct(p, suitType, analysis.concerns, maxPrice, ignoreConcerns) && p.category === category
    );

  let candidates = filterBy(false);
  // 必备品类：功效匹配不到时，退一步只看肤质 + 预算，保证流程完整
  if (candidates.length === 0 && STAPLE_CATEGORIES.has(category)) {
    candidates = filterBy(true);
  }

  if (candidates.length === 0) return null;

  // Sort by price ascending (within budget)
  candidates.sort((a, b) => a.price - b.price);
  return candidates[0] ?? null;
}

/**
 * 组装一套方案真正会用到的商品：先把必备品类（洁面 / 保湿 / 防晒…）按剩余预算
 * 逐个占位，再用剩下的钱补功效型商品（精华、面膜等）。
 *
 * 这个函数的存在是为了修一个真实 bug：原先功效商品由 selectProducts 挑、洁面和
 * 防晒由流程步骤另外挑，两边各选各的，导致方案卡片写着「1 件 ¥69」、流程里却出现
 * 3 件商品，实际总价远超预算。现在商品清单和 routine 共用这一套，卡片上的件数
 * 与总价就是用户真正要买的。
 */
function buildPlanItems(
  analysis: SkinAnalysis,
  budget: UserBudget,
  targetCount: number
): Array<{ product: (typeof products.products)[number]; reason: string }> {
  const suitType = getSuitType(analysis);
  const concerns = analysis.concerns;
  const maxPrice = getMaxPriceForRange(budget.range, budget.customAmount);

  if (maxPrice <= 0) return [];

  const chosen: Product[] = [];
  const used = new Set<string>();
  let total = 0;

  /** 在剩余预算内加入一件商品；买不起或已选过则返回 false */
  const tryAdd = (p: Product | null): boolean => {
    if (!p || used.has(p.id)) return false;
    if (total + p.price > maxPrice) return false;
    chosen.push(p);
    used.add(p.id);
    total += p.price;
    return true;
  };

  // 1) 必备品类优先占位。每次都用「剩余预算」去找，避免第一件就把预算吃光
  for (const category of STAPLE_ORDER) {
    if (chosen.length >= targetCount) break;
    tryAdd(findBestProduct(category, analysis, budget, maxPrice - total));
  }

  // 2) 剩余预算补功效型商品。同一品类最多 1 件，避免连选一堆同类的低价品
  if (chosen.length < targetCount) {
    const remaining = maxPrice - total;
    const pickCandidates = (ignoreConcerns: boolean) =>
      products.products.filter(
        (p: Product) =>
          !used.has(p.id) &&
          !STAPLE_ORDER.includes(p.category) &&
          matchesProduct(p, suitType, concerns, remaining, ignoreConcerns)
      );
    // 预算紧的时候常常一件功效匹配的商品都挑不出来，此时退一步只看肤质 + 预算；
    // 否则低预算档最后只剩一支洁面，方案残缺得没法看。
    let candidates = pickCandidates(false);
    if (candidates.length === 0) candidates = pickCandidates(true);
    candidates.sort((a, b) => {
      const aMatch = a.suitableProblems?.some((p) =>
        concerns.some((c) => concernHitsProduct(c, p))
      ) ? 0 : 1;
      const bMatch = b.suitableProblems?.some((p) =>
        concerns.some((c) => concernHitsProduct(c, p))
      ) ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return a.price - b.price;   // 便宜优先，把预算留给后面的商品
    });
    const perCategory = new Map<string, number>();
    for (const p of candidates) {
      if (chosen.length >= targetCount) break;
      if ((perCategory.get(p.category) ?? 0) >= 1) continue;
      if (tryAdd(p)) perCategory.set(p.category, 1);
    }
  }

  // 3) 推荐理由
  return chosen.map((product) => {
    const reasons: string[] = [];
    if (product.skinTypes?.includes(suitType)) reasons.push(`适配${suitType}肤质`);
    const matched = concerns.filter((c) =>
      product.suitableProblems?.some((p) => concernHitsProduct(c, p))
    );
    if (matched.length > 0) reasons.push(`针对${matched.join("、")}`);
    if (reasons.length === 0 && product.benefits) reasons.push(product.benefits);
    return { product, reason: reasons.join("；") };
  });
}

/**
 * 按品类把商品排成早晚流程：洁面打头，防晒收尾（仅白天），面膜/去角质只放晚上。
 * 之前流程步骤是另挑的一套商品，和方案卡片上的清单对不上，这里统一来源。
 */
const ROUTINE_ORDER: Record<string, number> = {
  cleanser: 0,
  toner: 1,
  essence: 2,
  serum: 3,
  "eye-cream": 4,
  moisturizer: 5,
  treatment: 6,
  exfoliant: 7,
  mask: 8,
  sunscreen: 9,
};
/** 只在晚上用的品类 */
const PM_ONLY_CATEGORIES = new Set(["mask", "exfoliant"]);

function buildRoutineFromItems(
  items: Array<{ product: Product; reason: string }>
): Routine {
  const am: Routine["am"] = [];
  const pm: Routine["pm"] = [];

  const sorted = [...items].sort(
    (a, b) =>
      (ROUTINE_ORDER[a.product.category] ?? 5) -
      (ROUTINE_ORDER[b.product.category] ?? 5)
  );

  for (const { product } of sorted) {
    const benefits = product.benefits || "按产品说明使用";
    if (product.category === "cleanser") {
      am.push({ order: am.length + 1, product: product.name, detail: `${product.name}，洗后不紧绷` });
      pm.push({ order: pm.length + 1, product: product.name, detail: `${product.name}，清除一天污垢` });
    } else if (product.category === "sunscreen") {
      am.push({ order: am.length + 1, product: product.name, detail: `${product.name}，白天最后一步，帮助抵御紫外线` });
    } else if (PM_ONLY_CATEGORIES.has(product.category)) {
      pm.push({ order: pm.length + 1, product: product.name, detail: `${product.name}，${benefits}` });
    } else {
      am.push({ order: am.length + 1, product: product.name, detail: `${product.name}，${benefits}` });
      pm.push({ order: pm.length + 1, product: product.name, detail: `${product.name}，${benefits}` });
    }
  }

  return { am, pm };
}
function buildHighValuePlan(
  analysis: SkinAnalysis,
  budget: UserBudget
): { plans: WeeklyPlan[]; routine: Routine; products: Array<{ product: (typeof products.products)[number]; reason: string }>; title: string } {
  const suitType = getSuitType(analysis);
  const budgetRange = budget.range;

  const productCount = budgetRange === "under100" ? 2 : budgetRange === "under200" ? 3 : 3;
  const selectedProducts = buildPlanItems(analysis, budget, productCount);

  // 流程步骤与商品清单同源，卡片上的件数/总价就是实际要买的
  const { am: amSteps, pm: pmSteps } = buildRoutineFromItems(selectedProducts);

  const plans: WeeklyPlan[] = [weeklyPlanA(suitType), weeklyPlanB(), weeklyPlanC()];
  plans[0] = { ...plans[0], active: true };

  const title = budgetRange === "under100" ? "高性价比护肤方案" : "预算控制护肤方案";

  return { plans, routine: { am: amSteps, pm: pmSteps }, products: selectedProducts, title };
}

function buildCompletePlan(
  analysis: SkinAnalysis,
  budget: UserBudget
): { plans: WeeklyPlan[]; routine: Routine; products: Array<{ product: (typeof products.products)[number]; reason: string }>; title: string } {
  const suitType = getSuitType(analysis);
  const budgetRange = budget.range;

  const productCount = budgetRange === "under100" ? 3 : budgetRange === "under200" ? 4 : 5;
  const selectedProducts = buildPlanItems(analysis, budget, productCount);

  // 流程步骤与商品清单同源，卡片上的件数/总价就是实际要买的
  const { am: amSteps, pm: pmSteps } = buildRoutineFromItems(selectedProducts);

  const plans: WeeklyPlan[] = [weeklyPlanA(suitType), weeklyPlanB(), weeklyPlanC()];
  plans[0] = { ...plans[0], active: true };

  const title = "完整护肤方案";

  return { plans, routine: { am: amSteps, pm: pmSteps }, products: selectedProducts, title };
}

export function buildResult(
  photo: PhotoState,
  answers: Record<string, string[]>,
  budget: UserBudget
): FullResult {
  const concerns: string[] = [];
  answers.q1?.forEach((c) => {
    if (concernLabels[c]) concerns.push(concernLabels[c]);
  });
  if (concerns.length === 0) concerns.push("T区油光", "毛孔较明显");

  const goals: string[] = [];
  answers.q5?.forEach((g) => {
    if (goalLabels[g]) goals.push(goalLabels[g]);
  });
  if (goals.length === 0) goals.push("维持清爽", "改善肤质");

  let suitType = "中性肌肤";
  const q2 = answers.q2?.[0];
  const q1HasT = answers.q1?.includes("tzone");
  if (q2 === "very" || q2 === "some" || q1HasT) suitType = "混合性肌肤";

  const analysis: SkinAnalysis = {
    oiliness: Math.round(30 + Math.random() * 50),
    dryness: Math.round(30 + Math.random() * 50),
    pores: Math.round(30 + Math.random() * 50),
    pigmentation: Math.round(30 + Math.random() * 50),
    redness: Math.round(30 + Math.random() * 50),
    acneRef: Math.round(30 + Math.random() * 50),
    suitType,
    concerns,
    summary:
      "根据照片外观初步观察，你的肌肤整体状态较稳定。此分析仅为外观特征参考，不能作为医疗诊断。",
  };

  const level = analysis.oiliness > 60 ? "中高" : "适中";
  const profile: Profile = {
    suitType,
    score: computeProfileScore(analysis),
    level: level + "活跃度",
    concerns,
    goals,
    description: `基于照片外观与你的回答，生成一份 ${suitType} 的皮肤画像。主要关注 ${concerns.join(
      "、"
    )}，护肤目标为 ${goals.join("、")}。本画像为日常护理参考，不作为疾病诊断依据。`,
    environment: "温和气候",
    habits: ["每天早晚护理"],
    generatedAt: new Date().toLocaleString("zh-CN"),
  };

  const routine: Routine = buildRoutine(analysis, budget);
  const plans: WeeklyPlan[] = [weeklyPlanA(suitType), weeklyPlanB(), weeklyPlanC()];
  plans[0] = { ...plans[0], active: true };

  const highValuePlan = buildHighValuePlan(analysis, budget);
  const completePlan = buildCompletePlan(analysis, budget);

  return {
    photo,
    analysis,
    answers,
    profile,
    routine,
    plans,
    highValuePlan,
    completePlan,
    createdAt: Date.now(),
  };
}
