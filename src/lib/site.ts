/**
 * 站点对外地址。og 绝对链接、sitemap 都从这里取。
 *
 * 解析顺序：
 *  1. NEXT_PUBLIC_SITE_URL —— 显式配置，最优先（换域名/自定义域名时设它）
 *  2. VERCEL_URL / 类似平台的部署地址 —— 部署时自动注入，不用手动填
 *  3. localhost —— 本地开发兜底
 *
 * 这里**不写死任何具体域名**：别人 clone 这个项目后，og 图和 sitemap 会指向
 * 他们自己的部署地址，而不是本项目作者的站点。
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  // 各平台注入的部署域名（不带协议）
  const deployed =
    process.env.NEXT_PUBLIC_VERCEL_URL ??
    process.env.VERCEL_URL ??
    process.env.URL;
  if (deployed) {
    const host = deployed.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${host}`;
  }

  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();
