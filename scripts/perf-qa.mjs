import { chromium } from "playwright";

const URLS = [
  "https://japan-chat-web.vercel.app/dos",
  "https://japan-chat-web.vercel.app/dos/golf",
  "https://japan-chat-web.vercel.app/dos/golf/dos_golf_kaho",
  "https://japan-chat-web.vercel.app/beppu/hotel",
  "https://japan-chat-web.vercel.app/beppu/hotel/beppu_hotel_holiday",
  "https://japan-chat-web.vercel.app/dos/restaurant/dos_restaurant_izakaya",
];

async function main() {
  const browser = await chromium.launch({ headless: true });

  console.log("=== RSC Performance QA ===\n");

  for (const url of URLS) {
    const timings = [];
    let cacheStatus = "unknown";

    for (let run = 0; run < 5; run++) {
      const page = await browser.newPage();

      let mainResponse = null;
      page.on("response", (res) => {
        if (res.url().split("?")[0] === url || res.url() === url) {
          if (!mainResponse) mainResponse = res;
        }
      });

      const start = Date.now();
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
      } catch (e) {
        console.log(`  ERROR: ${e.message}`);
      }
      const totalMs = Date.now() - start;

      if (mainResponse) {
        const h = mainResponse.headers();
        cacheStatus = h["x-vercel-cache"] || h["x-nextjs-cache"] || "unknown";
      }

      timings.push({ ms: totalMs, cache: cacheStatus });
      await page.close();
    }

    const avg = Math.round(timings.reduce((s, t) => s + t.ms, 0) / timings.length);
    const min = Math.min(...timings.map((t) => t.ms));
    const max = Math.max(...timings.map((t) => t.ms));
    const caches = timings.map((t) => t.cache).join(", ");

    console.log(`${url}`);
    console.log(`  Avg: ${avg}ms | Min: ${min}ms | Max: ${max}ms`);
    console.log(`  Cache: ${caches}\n`);
  }

  await browser.close();
}

main();
