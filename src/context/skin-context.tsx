"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type {
  FullResult,
  PhotoState,
  Step,
  UserBudget,
} from "@/lib/types";
import type { RealScan } from "@/lib/scanClient";

interface SkinContextValue {
  step: Step;
  photo: PhotoState;
  result: FullResult | null;
  budget: UserBudget;
  selectedPlan: "highValue" | "complete" | null;
  /** 真实图像分析结果；为 null 表示后端不可用，回退示例数据 */
  realAnalysis: RealScan | null;
  /** 大模型补充建议是否正在生成；未配 Key 时会很快变回 false */
  aiLoading: boolean;
  setStep: (s: Step) => void;
  setPhoto: (p: PhotoState) => void;
  setResult: Dispatch<SetStateAction<FullResult | null>>;
  setBudget: (b: UserBudget) => void;
  setSelectedPlan: (p: "highValue" | "complete" | null) => void;
  setRealAnalysis: (r: RealScan | null) => void;
  setAiLoading: (b: boolean) => void;
  reset: () => void;
}

const SkinContext = createContext<SkinContextValue | null>(null);

export function SkinProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<Step>("upload");
  const [photo, setPhoto] = useState<PhotoState>({ dataUrl: null, name: "" });
  const [result, setResult] = useState<FullResult | null>(null);
  const [budget, setBudget] = useState<UserBudget>({
    amount: null,
    range: "under100",
    customAmount: null,
  });
  const [selectedPlan, setSelectedPlan] = useState<
    "highValue" | "complete" | null
  >(null);
  const [realAnalysis, setRealAnalysis] = useState<RealScan | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const reset = useCallback(() => {
    setStep("upload");
    setPhoto({ dataUrl: null, name: "" });
    setResult(null);
    setRealAnalysis(null);
    setAiLoading(false);
    setBudget({
      amount: null,
      range: "under100",
      customAmount: null,
    });
    setSelectedPlan(null);
  }, [setBudget, setSelectedPlan]);

  const value = useMemo<SkinContextValue>(() => ({
    step,
    photo,
    result,
    budget,
    selectedPlan,
    realAnalysis,
    aiLoading,
    setStep,
    setPhoto,
    setResult,
    setBudget,
    setSelectedPlan,
    setRealAnalysis,
    setAiLoading,
    reset,
  }), [
    step,
    photo,
    result,
    budget,
    selectedPlan,
    realAnalysis,
    aiLoading,
    reset,
    setStep,
    setPhoto,
    setResult,
    setBudget,
    setSelectedPlan,
    setAiLoading,
  ]);

  return <SkinContext.Provider value={value}>{children}</SkinContext.Provider>;
}

export function useSkin() {
  const ctx = useContext(SkinContext);
  if (!ctx) throw new Error("useSkin must be used within SkinProvider");
  return ctx;
}
