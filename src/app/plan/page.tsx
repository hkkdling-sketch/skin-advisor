"use client";

import { useSkin } from "@/context/skin-context";
import { useRouter } from "next/navigation";
import EmptyState from "@/components/empty-state";

export default function PlanPage() {
  const { result, reset } = useSkin();
  const router = useRouter();

  if (!result) {
    return (
      <EmptyState
        onReset={() => {
          reset();
          router.push("/");
        }}
      />
    );
  }

  return (
    <div className="pt-6">
      <h1 className="text-xl font-bold text-skin">皮肤护理计划</h1>
      <p className="mb-5 text-xs text-skin-light">分为入门期、调整期、进阶期三个阶段</p>
      <div className="flex flex-col gap-4">
        {result.plans.map((p) => (
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
      </div>
    </div>
  );
}
