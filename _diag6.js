// 全面体检（修正版）
// 上一版诊断用错了调用方式：buildMockResult 只收 (photo, answers, budget, real) 四个参数，
// 多传的 analysis 被忽略，导致所有用例实际都跑在默认场景上，结论不可信。
// 这里改成：q1 传选项 id、real 传指标（不传 q2 时肤质由 real 推断）。
const { buildMockResult } = require("./.tmp-verify/lib/mockEngine.js");

// q1 选项 id -> 中文困扰
const Q1 = ["tzone", "pores", "acne", "redness", "dryness", "dull"];
// 不传 q2，让肤质由 real 推断
const SKINS = [
  { name: "油性", real: { oiliness: 80, dryness: 25, pores: 60, pigmentation: 30, redness: 25, acneRef: 45 } },
  { name: "干性", real: { oiliness: 20, dryness: 82, pores: 30, pigmentation: 35, redness: 30, acneRef: 15 } },
  { name: "混合性", real: { oiliness: 72, dryness: 70, pores: 65, pigmentation: 40, redness: 35, acneRef: 40 } },
  { name: "中性", real: { oiliness: 40, dryness: 38, pores: 35, pigmentation: 25, redness: 20, acneRef: 15 } },
];
const RANGES = ["under100", "under200", "under300", "under500", "over500", "over1000"];
const CAP = { under100: 100, under200: 200, under300: 300, under500: 500, over500: 1000, over1000: 2000 };

const BAN = /美白|淡斑|祛斑|抗皱|祛痘|消炎|抗炎|提拉|焕肤|闭口|抗老|根治|消除|去除|淡化|治疗|药用|疗效|控油|收敛|祛黄|杀菌|抑菌|排毒|修复|再生|减少痘痘|痘痘反复/i;

const s = {
  combos: 0, plans: 0, empty: 0, one: 0,
  mismatch: [], over: [], banned: new Set(),
  catMiss: {}, byRange: {}, dupInPlan: 0,
};

for (const q1 of Q1) {
  for (const skin of SKINS) {
    for (const range of RANGES) {
      s.combos++;
      const r = buildMockResult(
        { dataUrl: "", name: "t" },
        { q1: [q1] },
        { amount: null, range, customAmount: null },
        skin.real
      );

      for (const [tag, plan] of [["A", r.highValuePlan], ["B", r.completePlan]]) {
        s.plans++;
        if (!plan) { s.empty++; continue; }
        const items = plan.products || [];
        s.byRange[range] = s.byRange[range] || [];
        s.byRange[range].push(items.length);
        if (items.length === 0) { s.empty++; continue; }
        if (items.length === 1) s.one++;

        // 同一方案内重复商品
        const ids = items.map((it) => it.product && it.product.id);
        if (new Set(ids).size !== ids.length) s.dupInPlan++;

        // 总价
        const sum = items.reduce((a, it) => a + (it.product ? it.product.price : 0), 0);
        if (sum > CAP[range]) s.over.push(`${range}/${skin.name}/${q1}/${tag} ¥${sum}>¥${CAP[range]}`);

        // 清单 vs 流程一致性
        const pNames = new Set(items.map((it) => it.product && it.product.name));
        const rNames = new Set([...(plan.routine?.am || []), ...(plan.routine?.pm || [])].map((x) => x.product));
        const onlyRoutine = [...rNames].filter((x) => !pNames.has(x));
        const onlyList = [...pNames].filter((x) => !rNames.has(x));
        if (onlyRoutine.length || onlyList.length) {
          s.mismatch.push(`${range}/${skin.name}/${q1}/${tag} 流程多:${onlyRoutine.join(",")} 清单多:${onlyList.join(",")}`);
        }

        // 风险词（含流程步骤文案）
        for (const it of items) {
          if (BAN.test(it.product ? it.product.name : "")) s.banned.add(it.product.name);
          if (BAN.test(it.reason || "")) s.banned.add("REASON:" + it.reason);
        }
        for (const st of [...(plan.routine?.am || []), ...(plan.routine?.pm || [])]) {
          if (BAN.test(st.detail)) s.banned.add("STEP:" + st.detail);
        }

        // 必备品类覆盖
        const cats = new Set(items.map((it) => it.product && it.product.category));
        for (const need of ["cleanser", "moisturizer", "sunscreen"]) {
          if (!cats.has(need)) s.catMiss[`${range}/${need}`] = (s.catMiss[`${range}/${need}`] || 0) + 1;
        }
      }
    }
  }
}

const avg = (a) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(2);
console.log(`=== 组合 ${s.combos} × 2 方案 = ${s.plans} 套 ===`);
console.log(`空方案: ${s.empty}   |   只有1件: ${s.one}   |   方案内重复商品: ${s.dupInPlan}`);
console.log("\n=== 各档位商品数（平均 / 最少 / 最多）===");
for (const [r, arr] of Object.entries(s.byRange)) {
  console.log(`  ${r.padEnd(9)} ${avg(arr)}  / ${Math.min(...arr)} / ${Math.max(...arr)}`);
}
console.log("\n=== 清单与流程不一致 ===");
console.log(s.mismatch.length ? s.mismatch.slice(0, 4).join("\n") + `\n  …共 ${s.mismatch.length} 例` : "  无 ✓");
console.log("\n=== 总价超预算 ===");
console.log(s.over.length ? s.over.slice(0, 4).join("\n") + `\n  …共 ${s.over.length} 例` : "  无 ✓");
console.log("\n=== 风险词残留 ===");
console.log(s.banned.size ? [...s.banned].slice(0, 8).join("\n") : "  无 ✓");
console.log("\n=== 必备品类缺失（该档位方案数 48，全缺=48）===");
console.log(Object.entries(s.catMiss).map(([k, v]) => `  ${k}: ${v}`).join("\n") || "  无 ✓");
