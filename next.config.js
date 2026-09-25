/**
 * 部署环境兜底地址（公开信息，不是密钥）。
 *
 * 背景：og 缩略图与 sitemap 需要绝对地址。发布平台不会自动注入
 * VERCEL_URL 之类的变量，也不方便在部署时传环境变量，所以在这里兜一层。
 *
 * 优先级：环境变量 NEXT_PUBLIC_SITE_URL > 这里的值 > localhost
 * 别人 fork 这个项目后，请把下面这行改成自己的域名（或直接配环境变量）。
 */
const DEPLOY_URL =
  "https://6b0d502a49e648ce83dc8302acf4274c.sg2.agentos-app.run";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // 只有外部没显式配置时才注入，不覆盖用户自己的设置
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || DEPLOY_URL,
  },
};

module.exports = nextConfig;
