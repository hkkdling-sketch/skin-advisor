"use client";

import { useSkin } from "@/context/skin-context";
import AnalyzingView from "@/components/analyzing-view";
import QuestionsView from "@/components/questions-view";
import GeneratingView from "@/components/generating-view";
import ResultView from "@/components/result-view";

function AnalyzeInner() {
  const { step } = useSkin();
  if (step === "analyzing") return <AnalyzingView />;
  if (step === "questions") return <QuestionsView />;
  if (step === "generating") return <GeneratingView />;
  if (step === "result") return <ResultView />;
  return <AnalyzingView />;
}

export default function AnalyzePage() {
  return <AnalyzeInner />;
}
