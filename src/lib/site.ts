/**
 * 站点对外地址。og/绝对链接、sitemap 都从这里取，换域名只改这一处
 * （或设置环境变量 NEXT_PUBLIC_SITE_URL）。
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://6b0d502a49e648ce83dc8302acf4274c.sg2.agentos-app.run";
