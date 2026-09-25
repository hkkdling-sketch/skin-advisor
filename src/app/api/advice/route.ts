import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 用大模型把「皮肤分数 + 问卷答案 + 预算」变成个性化的护理说明。
 *
 * 这一层是**可插拔**的：所有主流国产模型服务都兼容 OpenAI 的
 * /chat/completions 协议，所以用「base_url + model + key」三个变量就能切换厂商，
 * 不被任何一家锁死。只需要在 .env.local 里配：
 *
 *   LLM_PROVIDER=deepseek          # 或 zhipu / openrouter / ollama / custom
 *   LLM_API_KEY=sk-...
 *   LLM_MODEL=deepseek-chat        # 可选，不填用该厂商的推荐模型
 *   LLM_BASE_URL=https://...       # 可选，custom 时必须填
 *
 * 未配置 / 调用失败时返回 { ok:false, reason }，前端自动沿用规则生成的内容，不会崩。
 * 也就是说：**没有 Key 这个应用照样能用**，只是少了 AI 润色的文案。
 */

type Provider = "deepseek" | "zhipu" | "openrouter" | "ollama" | "custom";

interface Preset {
  baseUrl: string;
  model: string;
  /** ollama 这种本地服务不需要 key */
  needsKey: boolean;
}

const PROVIDERS: Record<Provider, Preset> = {
  // 中文能力强、价格极低，国内直连 —— 本项目的默认选择
  deepseek: { baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat", needsKey: true },
  // glm-4-flash 是免费模型，适合先跑通验证再决定要不要付费模型
  zhipu: { baseUrl: "https://open.bigmodel.cn/api/paas/v4", model: "glm-4-flash", needsKey: true },
  // 保留原来的聚合通道，已配置 OPENROUTER_API_KEY 时会自动沿用
  openrouter: { baseUrl: "https://openrouter.ai/api/v1", model: "deepseek/deepseek-chat", needsKey: true },
  // 本机 Ollama，完全免费、不上网，但只在本地跑得通（云端部署用不了）
  ollama: { baseUrl: "http://127.0.0.1:11434/v1", model: "qwen2.5:7b", needsKey: false },
  custom: { baseUrl: "", model: "", needsKey: true },
};

function resolveProvider(): { provider: Provider; preset: Preset } {
  const raw = (process.env.LLM_PROVIDER ?? "deepseek").toLowerCase();
  const provider = (raw in PROVIDERS ? raw : "deepseek") as Provider;
  return { provider, preset: PROVIDERS[provider] };
}

const SYSTEM_PROMPT = `你是一名经验丰富的护肤顾问，服务于一款面向普通消费者的护肤规划工具。

规则：
1. 只输出一个 JSON 对象，不要输出任何解释、前后缀或 markdown 代码块。
2. 全程使用简体中文，语气亲切但专业，避免夸张承诺。
3. 严禁给出疾病诊断、用药建议或医美治疗建议；出现疑似皮肤疾病时，统一建议就医。
4. 不要推荐任何具体品牌或商品，商品由系统按预算另行匹配。只描述"品类 + 用法"。
5. routineAm 至少 3 步、最多 5 步；routinePm 至少 3 步、最多 6 步。
6. tips 给 3 条，每条不超过 30 字；cautions 给 1-2 条。

输出结构：
{
  "summary": "2-3 句话的个性化总结，点名最该关注的 1-2 个问题",
  "routineAm": [{ "product": "品类名", "detail": "一句话用法" }],
  "routinePm": [{ "product": "品类名", "detail": "一句话用法" }],
  "tips": ["...", "...", "..."],
  "weekFocus": { "week4": "前4周重点", "week8": "4-8周重点", "week12": "8-12周重点" },
  "cautions": ["..."]
}`;

interface AdviceRequestBody {
  suitType?: string;
  concerns?: string[];
  goals?: string[];
  scores?: Record<string, number>;
  budgetText?: string;
  isRealScan?: boolean;
}

function buildUserPrompt(b: AdviceRequestBody): string {
  const scores = b.scores
    ? Object.entries(b.scores)
        .map(([k, v]) => `${k}: ${v}`)
        .join("，")
    : "无";

  return `用户信息：
- 肤质判断：${b.suitType ?? "未知"}
- 关注问题：${b.concerns?.length ? b.concerns.join("、") : "未指定"}
- 护肤目标：${b.goals?.length ? b.goals.join("、") : "未指定"}
- 外观特征分值（0-100，越高越明显）：${scores}
- 预算：${b.budgetText ?? "未指定"}
- 数据来源：${b.isRealScan ? "真实图像分析" : "用户自述（无图像分析）"}

请生成护理建议。`;
}

function extractJson(text: string): unknown | null {
  const cleaned = text
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

export async function POST(req: NextRequest) {
  const { provider, preset } = resolveProvider();
  // LLM_API_KEY 优先；没改配置的老环境沿用 OPENROUTER_API_KEY
  const apiKey = process.env.LLM_API_KEY ?? process.env.OPENROUTER_API_KEY ?? "";
  const baseUrl = (process.env.LLM_BASE_URL ?? preset.baseUrl).replace(/\/$/, "");
  const model = process.env.LLM_MODEL ?? preset.model;

  if (preset.needsKey && !apiKey) {
    return Response.json(
      { ok: false, reason: "no-key", error: `未配置 LLM_API_KEY（当前 provider=${provider}）` },
      { status: 200 }
    );
  }
  if (!baseUrl) {
    return Response.json(
      { ok: false, reason: "no-key", error: `provider=custom 时必须配置 LLM_BASE_URL` },
      { status: 200 }
    );
  }

  let body: AdviceRequestBody;
  try {
    body = (await req.json()) as AdviceRequestBody;
  } catch {
    return Response.json({ ok: false, reason: "error", error: "请求体解析失败" }, { status: 400 });
  }

  const endpoint = `${baseUrl}/chat/completions`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: 1200,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(body) },
        ],
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const detail = await res.text();
      return Response.json(
        { ok: false, reason: "upstream", error: `模型服务返回 ${res.status}：${detail.slice(0, 300)}` },
        { status: 200 }
      );
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    const parsed = extractJson(content);

    if (!parsed || typeof parsed !== "object") {
      return Response.json(
        { ok: false, reason: "parse", error: "模型输出不是合法 JSON" },
        { status: 200 }
      );
    }

    return Response.json({ ok: true, advice: parsed, model, provider });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, reason: "error", error: message }, { status: 200 });
  }
}
