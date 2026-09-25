import type { SkinAnalysis } from "./types";

/**
 * 真实图像分析结果（由 skin-scan 后端返回，分数已换算到 0-100）
 * 只包含由图像真实测出的字段；suitType / concerns 仍以用户问卷为准。
 */
export type RealScan = Partial<
  Pick<
    SkinAnalysis,
    "oiliness" | "dryness" | "pores" | "pigmentation" | "redness" | "acneRef"
  >
> & {
  summary?: string;
  regions?: string[];
  isReal?: boolean;
  /**
   * 分区热力图：维度名 → data URI（`data:image/png;base64,...`）。
   * 后端返回 7 张 RGBA 半透明热力图（redness/oiliness/texture/pores/
   * blemishes/hydration/pigment），尺寸与原图同比缩放，可直接叠在照片上显示。
   */
  overlays?: Record<string, string>;
};

/** skin-scan 后端 /scan 返回的原始分数，取值 0-1 */
interface RawScores {
  redness?: number;
  oiliness?: number;
  texture?: number;
  pores?: number;
  blemishes?: number;
  hydration?: number;
  pigment?: number;
}

const to100 = (v: unknown): number | undefined => {
  if (typeof v !== "number" || Number.isNaN(v)) return undefined;
  const n = v <= 1 ? v * 100 : v;
  return Math.max(0, Math.min(100, Math.round(n)));
};

function buildSummary(scores: RawScores, regions?: string[]): string {
  const picked: Array<[string, number]> = [];
  const push = (label: string, v: unknown) => {
    const n = to100(v);
    if (typeof n === "number") picked.push([label, n]);
  };
  push("泛红", scores.redness);
  push("出油", scores.oiliness);
  push("毛孔", scores.pores);
  push("色斑", scores.pigment);
  push("瑕疵", scores.blemishes);
  push("纹理粗糙", scores.texture);

  picked.sort((a, b) => b[1] - a[1]);
  const top = picked.slice(0, 3).map(([label, v]) => `${label} ${v}`);

  const regionText = regions?.length ? `已识别区域：${regions.join("、")}。` : "";

  return top.length
    ? `基于图像特征检测（0-100 分值，越高越明显）：${top.join("、")}。${regionText}此分析仅为外观特征参考，不能作为医疗诊断。`
    : "已完成图像特征检测。此分析仅为外观特征参考，不能作为医疗诊断。";
}

/** 只保留合法的 PNG data URI，避免把异常内容塞进 <img src> */
function pickOverlays(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string" && v.startsWith("data:image/")) out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

/** 把后端原始分数映射成前端 SkinAnalysis 的数值字段 */
export function mapScores(
  raw: RawScores,
  regions?: string[],
  overlays?: Record<string, string>
): RealScan {
  const hydration = to100(raw.hydration);
  return {
    oiliness: to100(raw.oiliness),
    dryness: hydration === undefined ? undefined : 100 - hydration,
    pores: to100(raw.pores),
    pigmentation: to100(raw.pigment),
    redness: to100(raw.redness),
    acneRef: to100(raw.blemishes),
    summary: buildSummary(raw, regions),
    regions,
    isReal: true,
    // 再过滤一次：mapScores 是导出的，兜底保证脏数据进不了 <img src>
    overlays: pickOverlays(overlays),
  };
}

export type ScanOutcome =
  | { ok: true; scan: RealScan }
  | { ok: false; reason: "no-face" | "unavailable" | "error"; message: string };

/**
 * 调用本站 /api/scan（服务端转发到 skin-scan 后端）。
 * 后端不可用时静默回退示例数据；检测到"无人脸"时需要明确告知用户换照片。
 */
export async function requestRealAnalysis(
  dataUrl: string,
  timeoutMs = 20000
): Promise<ScanOutcome> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);

    const blob = await (await fetch(dataUrl)).blob();
    const form = new FormData();
    form.append("image", blob, "face.jpg");

    const res = await fetch("/api/scan", {
      method: "POST",
      body: form,
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    const json = (await res.json()) as {
      ok?: boolean;
      reason?: "no-face" | "unavailable" | "error";
      error?: string;
      data?: {
        scores?: RawScores;
        regions?: string[];
        overlays?: unknown;
      };
    };

    if (!res.ok || !json.ok) {
      return {
        ok: false,
        reason: json.reason ?? "error",
        message: json.error ?? `分析失败（${res.status}）`,
      };
    }
    if (!json.data?.scores) {
      return { ok: false, reason: "error", message: "分析结果缺少分数字段" };
    }

    return {
      ok: true,
      scan: mapScores(
        json.data.scores,
        json.data.regions,
        pickOverlays(json.data.overlays)
      ),
    };
  } catch {
    return { ok: false, reason: "unavailable", message: "无法连接分析服务" };
  }
}
