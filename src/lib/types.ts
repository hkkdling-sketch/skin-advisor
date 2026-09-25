export interface PhotoState {
  dataUrl: string | null;
  name: string;
}

export type Step =
  | "upload"
  | "analyzing"
  | "questions"
  | "generating"
  | "result";

export interface UserBudget {
  amount: number | null;
  range: "under100" | "under200" | "under300" | "under500" | "over500" | "over1000" | "custom";
  customAmount: number | null;
}

export interface SkinAnalysis {
  oiliness: number;
  dryness: number;
  pores: number;
  pigmentation: number;
  redness: number;
  acneRef: number;
  suitType: string;
  concerns: string[];
  summary: string;
}

export interface QuestionOption {
  id: string;
  label: string;
}

export interface Question {
  id: string;
  title: string;
  subtitle?: string;
  type: "single" | "multi";
  options: QuestionOption[];
}

export interface Profile {
  suitType: string;
  score: number;
  level: string;
  concerns: string[];
  goals: string[];
  description: string;
  environment: string;
  habits: string[];
  generatedAt: string;
}

export interface RoutineStep {
  order: number;
  product: string;
  detail: string;
}

export interface Routine {
  am: RoutineStep[];
  pm: RoutineStep[];
}

export interface WeeklyPlan {
  key: "week4" | "week8" | "week12";
  weeks: number;
  title: string;
  phase: string;
  goals: string[];
  adjustments: string[];
  active?: boolean;
}

export interface HighValuePlan {
  plans: WeeklyPlan[];
  routine: Routine;
  products: Array<{ product: any; reason: string }>;
  title: string;
}

export interface CompletePlan {
  plans: WeeklyPlan[];
  routine: Routine;
  products: Array<{ product: any; reason: string }>;
  title: string;
}

export interface AiAdvice {
  tips: string[];
  cautions: string[];
}

export interface FullResult {
  photo: PhotoState;
  analysis: SkinAnalysis;
  answers: Record<string, string[]>;
  profile: Profile;
  routine: Routine;
  plans: WeeklyPlan[];
  highValuePlan: HighValuePlan;
  completePlan: CompletePlan;
  createdAt: number;
  /** 由大模型生成的补充建议；未配置 API Key 时为空 */
  aiAdvice?: AiAdvice;
}
