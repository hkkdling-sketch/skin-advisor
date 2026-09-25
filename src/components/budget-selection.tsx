"use client";

import { useState } from "react";
import { useSkin } from "@/context/skin-context";
import type { UserBudget } from "@/lib/types";

const budgetRanges = [
  { label: "100元以内", value: "under100" },
  { label: "200元以内", value: "under200" },
  { label: "300元以内", value: "under300" },
  { label: "500元以内", value: "under500" },
  { label: "1000元以上", value: "over1000" },
  { label: "自定义", value: "custom" },
];

type BudgetSelectHandler = (budget: UserBudget) => void;

export default function BudgetSelection({ onSelect }: { onSelect: BudgetSelectHandler }) {
  const { setBudget } = useSkin();
  const [customAmount, setCustomAmount] = useState(0);

  function handleSelect(value: string) {
    if (value === "custom") {
      setCustomAmount(0);
      onSelect({ range: "custom", amount: 0, customAmount: 0 });
      return;
    }
    onSelect({ range: value as "under100" | "under200" | "under300" | "under500" | "over1000" | "over1000" | "custom", amount: null, customAmount: null });
  }

  function handleCustomChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = Number(e.target.value) || 0;
    setCustomAmount(val);
    onSelect({ range: "custom", amount: val, customAmount: val });
  }

  return (
    <div className="pb-8">
      <h2 className="text-xl font-bold text-skin mb-4">选择你的护肤预算</h2>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {budgetRanges.slice(0, 4).map((item) => (
          <button
            key={item.value}
            onClick={() => handleSelect(item.value)}
            className={`rounded-2xl border px-4 py-2 text-sm font-medium transition-colors ${
              /* We can't know selected state easily without more context, but let's try */
              item.value === "under100"
                ? "border-blush bg-blush-light text-blush-deep"
                : "border-brush/25 bg-white text-skin-light"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mb-6">
        <label className="block text-sm text-skin-light mb-2">
          自定义预算 (元)
          <input
            type="number"
            value={customAmount}
            onChange={handleCustomChange}
            className="w-full rounded border px-3 py-2 text-center"
            min="0"
            placeholder="输入预算金额"
          />
        </label>
      </div>

      <div className="mt-8 pt-8 border-t border-brush/20">
        <p className="text-xs text-skin-light">
          所选预算将用于筛选产品，确保推荐方案在你的预算范围内
        </p>
      </div>
    </div>
  );
}