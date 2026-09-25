"use client";

import { useSkin } from "@/context/skin-context";
import { useRouter } from "next/navigation";
import EmptyState from "@/components/empty-state";

export default function RoutinePage() {
  const { result, selectedPlan, reset } = useSkin();
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

  // 根据 selectedPlan 确定要显示的 Routine
  let routine;
  if (selectedPlan === "highValue") {
    routine = result.highValuePlan?.routine;
  } else if (selectedPlan === "complete") {
    routine = result.completePlan?.routine;
  } else {
    // 默认：使用结果中的常规 routine
    routine = result.routine;
  }

  return (
    <div className="pt-6">
      <h1 className="text-xl font-bold text-skin">我的护肤Routine</h1>
      <p className="mb-5 text-xs text-skin-light">基于你选择的护肤方案生成的早晚护理流程</p>

      <div className="flex flex-col gap-4">
        {routine ? (
          <div>
            <section className="rounded-3xl bg-white p-5">
              <h2 className="mb-4 text-lg font-bold text-skin">🌅 早间 Routine</h2>
              <ol className="flex flex-col gap-3">
                {routine.am.map((s) => (
                  <li key={s.order} className="flex gap-3">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${s.product ? "bg-blush-light text-blush-deep" : "bg-gray-200"}`}>
                      {s.order}
                    </span>
                    <div>
                      <p className={`text-sm font-semibold ${s.product ? "text-skin" : "text-gray-500"}`}>
                        {s.product || "无产品"}
                      </p>
                      <p className={`text-xs ${s.product ? "text-skin-light" : "text-gray-400"}`}>
                        {s.detail || "无详细说明"}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
            <section className="rounded-3xl bg-skin p-5 text-white">
              <h2 className="mb-4 text-lg font-bold">🌙 晚间 Routine</h2>
              <ol className="flex flex-col gap-3">
                {routine.pm.map((s) => (
                  <li key={s.order} className="flex gap-3">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold bg-white/20 text-white`}>
                      {s.order}
                    </span>
                    <div>
                      <p className={`text-sm font-semibold text-white`}>
                        {s.product || "无产品"}
                      </p>
                      <p className={`text-xs text-white/70`}>
                        {s.detail || "无详细说明"}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        ) : (
          <div className="p-6 bg-blush-light rounded-2xl text-center">
            <p className="text-skin">请先生成护肤方案</p>
            <p className="text-skin-light mt-2">点击结果页面的「生成我的护肤方案」按钮</p>
          </div>
        )}
      </div>
    </div>
  );
}