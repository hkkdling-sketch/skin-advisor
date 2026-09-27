/**
 * README 截图自动生成
 *
 * 用系统已安装的 Edge 走一遍完整流程（上传照片 → 问卷 → 结果页 → 分享卡片），
 * 输出到 docs/screenshots/。无需下载 Chromium。
 *
 * 前置：
 *   1. 本地服务已启动（npm run dev 或 npm run build && npm start）
 *   2. 装好 puppeteer-core：npm i -D puppeteer-core
 *
 * 用法：
 *   node scripts/capture-screenshots.cjs [页面地址] [照片路径]
 *
 * 默认地址 http://127.0.0.1:3000，默认照片 docs/screenshots/demo-face.jpg
 * （程序合成的示意图，非真人；换真人照片前请自行确认肖像权）
 */
const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer-core");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs", "screenshots");

const BASE_URL = process.argv[2] || "http://127.0.0.1:3000";
const PHOTO = path.resolve(process.argv[3] || path.join(OUT, "demo-face.jpg"));

// 系统 Edge 的常见安装位置，按顺序找第一个存在的
const EDGE_CANDIDATES = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/microsoft-edge",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 用 DOM click 按文字点按钮 */
async function clickText(page, text) {
  return page.evaluate((t) => {
    const btns = Array.from(document.querySelectorAll("button"));
    const target = btns.find((b) => (b.textContent || "").includes(t));
    if (!target) return false;
    target.click();
    return true;
  }, text);
}

/** 用真实鼠标事件按文字点按钮（对 React 受控组件更稳） */
async function realClickText(page, text) {
  const handles = await page.$$("button");
  for (const h of handles) {
    const t = await page.evaluate((el) => el.textContent || "", h);
    if (t.includes(text)) {
      await h.click();
      return true;
    }
  }
  return false;
}

function findEdge() {
  const hit = EDGE_CANDIDATES.find((p) => fs.existsSync(p));
  if (!hit) {
    throw new Error(
      "没找到 Edge，请手动改 EDGE_CANDIDATES 指向本机浏览器可执行文件"
    );
  }
  return hit;
}

/**
 * 作答计划，索引对应每题的选项顺序。
 * 这里刻意与 demo-face.jpg 的检测结果保持自洽：该图判为混合性，
 * 干燥 78 偏高、泛红 43 中等。若每题都点第一项，「困扰」只会剩 T区油光
 * 一项，结果页每件商品的推荐理由会一模一样，看起来像 bug。
 */
const ANSWER_PLAN = [
  [0, 3, 4], // q1 困扰（多选）：T区油光 / 局部泛红 / 干燥紧绷
  [1],       // q2 出油（单选）：T区较油
  [1],       // q3 紧绷（单选）：经常
  [0, 3],    // q4 在用产品（多选）：洁面 / 乳液或面霜
  [3, 4],    // q5 目标（多选）：舒缓泛红 / 保湿
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  if (!fs.existsSync(PHOTO)) {
    throw new Error(`找不到演示照片：${PHOTO}`);
  }

  const browser = await puppeteer.launch({
    executablePath: findEdge(),
    headless: "new",
    args: ["--no-proxy-server", "--disable-gpu", "--hide-scrollbars"],
  });

  const page = await browser.newPage();
  // 手机视口，dpr 2 保证 Retina 下清晰
  await page.setViewport({ width: 430, height: 932, deviceScaleFactor: 2 });

  console.log("打开首页…");
  await page.goto(BASE_URL, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/01-home.png` });
  console.log("  ✓ 01-home.png");

  console.log("上传演示照片…");
  const input = await page.$("input[type=file]");
  if (!input) throw new Error("找不到文件输入框");
  await input.uploadFile(PHOTO);
  await sleep(1000);

  console.log("开始分析…");
  await clickText(page, "开始分析");
  await sleep(1600);
  await page.screenshot({ path: `${OUT}/02-analyzing.png` });
  console.log("  ✓ 02-analyzing.png");

  console.log("等待问卷出现…");
  await page.waitForFunction(() => document.body.innerText.includes("问题 1"), {
    timeout: 40000,
  });
  await sleep(600);

  console.log("自动答题…");
  for (let i = 0; i < ANSWER_PLAN.length; i++) {
    const picked = await page.evaluate((idxs) => {
      const box =
        document.querySelector("div.mt-2.flex.flex-col.gap-3") ||
        document.querySelector(".flex.flex-col.gap-3");
      if (!box) return 0;
      const btns = Array.from(box.querySelectorAll("button"));
      let n = 0;
      for (const idx of idxs) {
        if (btns[idx]) {
          btns[idx].click();
          n++;
        }
      }
      return n;
    }, ANSWER_PLAN[i]);

    if (!picked) {
      console.log(`  ! 第 ${i + 1} 题没点到选项`);
      break;
    }
    await sleep(700);

    if (i === 0) {
      await page.screenshot({ path: `${OUT}/03-questions.png` });
      console.log("  ✓ 03-questions.png");
    }

    if (await clickText(page, "下一题")) {
      await sleep(900);
      continue;
    }
    if (await clickText(page, "生成我的方案")) {
      console.log("  已提交，生成方案中…");
      break;
    }
  }

  console.log("等待结果页…");
  // 必须等结果真正渲染出来再点预算，否则点击会被随后的渲染覆盖掉
  await page.waitForFunction(
    () => document.body.innerText.includes("预算设置"),
    { timeout: 60000 }
  );
  await sleep(2500);

  // ¥100 档可选商品太少，A/B 两套方案会几乎一样，切到 ¥300 更能体现对比
  // 注意按钮文案是「¥300以下」，中间没有空格
  const budgetOk = await realClickText(page, "¥300以下");
  console.log(`  预算切换: ${budgetOk ? "¥300以下 ✓" : "未找到按钮 ✗"}`);
  await sleep(3000);
  const cap = await page.evaluate(() => {
    const m = document.body.innerText.match(/方案总价\s*≤\s*¥(\d+)/);
    return m ? m[1] : "?";
  });
  console.log(`  当前预算上限: ¥${cap}`);

  await page.screenshot({ path: `${OUT}/04-plan.png` });
  console.log("  ✓ 04-plan.png");

  console.log("截取分区热力图…");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/05-heatmap.png` });
  console.log("  ✓ 05-heatmap.png");

  console.log("截取分享卡片…");
  if (await clickText(page, "生成分享卡片")) {
    await sleep(3000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(1200);
    await page.screenshot({ path: `${OUT}/06-share-card.png` });
    console.log("  ✓ 06-share-card.png");
  } else {
    console.log("  ! 没找到「生成分享卡片」按钮");
  }

  await browser.close();
  console.log("完成，输出目录：" + OUT);
})().catch((e) => {
  console.error("失败:", e.message);
  process.exit(1);
});
