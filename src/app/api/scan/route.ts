import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 图像分析代理：把上传的照片转发给本地 skin-scan 后端（FastAPI）。
 * 后端地址通过环境变量 SKIN_SCAN_URL 配置，默认 http://127.0.0.1:8000
 *
 * 失败时带 reason，便于前端区分处理：
 *  - "no-face"      后端在线，但图里没检测到人脸（应提示用户换照片）
 *  - "unavailable"  后端没启动或连不上（静默回退示例数据）
 *  - "error"        其他错误
 */
const BACKEND = (process.env.SKIN_SCAN_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

type FailReason = "no-face" | "unavailable" | "error";

function fail(reason: FailReason, error: string, status: number) {
  return Response.json({ ok: false, reason, error }, { status });
}

export async function POST(req: NextRequest) {
  let image: File | null = null;

  try {
    const incoming = await req.formData();
    const maybe = incoming.get("image");
    if (maybe instanceof File) image = maybe;
  } catch {
    return fail("error", "无法解析上传内容", 400);
  }

  if (!image) {
    return fail("error", "缺少 image 字段", 400);
  }

  try {
    const upstream = new FormData();
    upstream.append("image", image, image.name || "face.jpg");

    const res = await fetch(`${BACKEND}/scan`, {
      method: "POST",
      body: upstream,
      cache: "no-store",
    });

    if (!res.ok) {
      let detail = "";
      try {
        const body = (await res.json()) as { detail?: unknown };
        detail = typeof body?.detail === "string" ? body.detail : JSON.stringify(body);
      } catch {
        detail = "";
      }

      // skin-scan 检测不到人脸时返回 400 + {"detail":"No face detected in image"}
      if (/no face|face detected/i.test(detail)) {
        return fail("no-face", detail || "未检测到人脸", 422);
      }
      return fail("error", `分析服务返回 ${res.status}${detail ? `：${detail}` : ""}`, 502);
    }

    const data = await res.json();
    return Response.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return fail("unavailable", `无法连接分析服务（${BACKEND}）：${message}`, 503);
  }
}

/** 健康检查：便于确认后端是否在线 */
export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/health`, { cache: "no-store" });
    if (!res.ok) return Response.json({ ok: false, backend: BACKEND, status: res.status });
    return Response.json({ ok: true, backend: BACKEND, status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, backend: BACKEND, error: message });
  }
}
