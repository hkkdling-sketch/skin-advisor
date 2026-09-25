import type { Question } from "./types";

export const concernLabels: Record<string, string> = {
  tzone: "T区油光",
  pores: "毛孔较明显",
  acne: "少量痘痘",
  redness: "局部泛红",
  dryness: "干燥紧绷",
  dull: "暗沉不均",
};

export const goalLabels: Record<string, string> = {
  oil: "维持清爽",
  acne: "保持洁净",
  texture: "改善肤质",
  soothe: "舒缓泛红",
  brighten: "提亮肤色",
  moist: "保湿",
};

export const stepQuestions: Question[] = [
  {
    id: "q1",
    title: "你的主要肌肤困扰是什么？",
    subtitle: "可多选",
    type: "multi",
    options: [
      { id: "tzone", label: "T区油光" },
      { id: "pores", label: "毛孔较明显" },
      { id: "acne", label: "少量痘痘" },
      { id: "redness", label: "局部泛红" },
      { id: "dryness", label: "干燥紧绷" },
      { id: "dull", label: "暗沉不均" },
    ],
  },
  {
    id: "q2",
    title: "你的肌肤容易出油吗？",
    type: "single",
    options: [
      { id: "very", label: "很容易" },
      { id: "some", label: "T区较油" },
      { id: "normal", label: "一般" },
      { id: "less", label: "不太会" },
    ],
  },
  {
    id: "q3",
    title: "洗脸后是否容易紧绷？",
    type: "single",
    options: [
      { id: "always", label: "总是紧绷" },
      { id: "often", label: "经常" },
      { id: "sometimes", label: "偶尔" },
      { id: "never", label: "不会" },
    ],
  },
  {
    id: "q4",
    title: "你目前使用哪些护肤产品？",
    subtitle: "可多选",
    type: "multi",
    options: [
      { id: "cleanser", label: "洁面" },
      { id: "toner", label: "爽肤水" },
      { id: "serum", label: "精华" },
      { id: "moisturizer", label: "乳液或面霜" },
      { id: "sunscreen", label: "防晒" },
      { id: "none", label: "几乎不用" },
    ],
  },
  {
    id: "q5",
    title: "你的主要护肤目标是什么？",
    subtitle: "可多选",
    type: "multi",
    options: [
      { id: "oil", label: "维持清爽" },
      { id: "acne", label: "保持洁净" },
      { id: "texture", label: "改善肤质" },
      { id: "soothe", label: "舒缓泛红" },
      { id: "brighten", label: "提亮肤色" },
      { id: "moist", label: "保湿" },
    ],
  },
];
