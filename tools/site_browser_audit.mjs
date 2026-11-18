import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { chromium, firefox, webkit } from "playwright";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js");
const base = "http://127.0.0.1:8765";
const widths = [320, 360, 390, 430, 760, 768, 1024, 1440, 1920];
const report = { generatedAt: new Date().toISOString(), commit: process.env.GITHUB_SHA || "manual", checks: [], errors: [], screenshots: [], summary: {} };

await fs.mkdir("site-audit", { recursive: true });

async function auditViewport(browser, engine, width) {
  const height = width <= 430 ? 844 : width <= 768 ? 1024 : 900;
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const badResponses = [];
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", error => pageErrors.push(String(error)));
  page.on("requestfailed", request => {
    const failure = request.failure();
    if (!failure || failure.errorText !== "net::ERR_ABORTED") failedRequests.push({ url: request.url(), error: failure?.errorText || "unknown" });
  });
  page.on("response", response => {
    if (response.url().startsWith(base) && response.status() >= 400) badResponses.push({ url: response.url(), status: response.status() });
  });

  let response = null;
  let metrics = null;
  let a11y = { violations: [], seriousOrCritical: 0, error: null };
  const interactions = {};
  try {
    response = await page.goto(base + "/", { waitUntil: "networkidle", timeout: 60000 });
    if (response?.status() === 200) {
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(Array.from(document.images, image => {
          if (image.complete) return Promise.resolve();
          return new Promise(resolve => {
            const done = () => resolve();
            image.addEventListener("load", done, { once: true });
            image.addEventListener("error", done, { once: true });
            setTimeout(done, 10000);
          });
        }));
      });
      metrics = await page.evaluate(() => {
        const html = document.documentElement;
        const ids = Array.from(document.querySelectorAll("[id]"), node => node.id);
        const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
        const missingAnchors = [];
        for (const link of document.querySelectorAll('a[href^="#"]')) {
          const id = link.getAttribute("href").slice(1);
          if (id && !document.getElementById(id)) missingAnchors.push("#" + id);
        }
        const images = Array.from(document.images, image => ({
          src: image.getAttribute("src"),
          complete: image.complete,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight
        }));
        return {
          title: document.title,
          viewport: { width: innerWidth, height: innerHeight },
          document: { width: html.scrollWidth, height: html.scrollHeight, horizontalOverflow: html.scrollWidth > innerWidth + 1 },
          duplicateIds,
          missingAnchors: [...new Set(missingAnchors)],
          brokenImages: images.filter(image => !image.complete || image.naturalWidth === 0),
          imageCount: images.length,
          fontsReady: document.fonts.status === "loaded"
        };
      });

      if (width === 390 || width === 1440) {
        try {
          await page.addScriptTag({ path: axePath });
          a11y = await page.evaluate(async () => {
            const result = await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
            const violations = result.violations.map(item => ({ id: item.id, impact: item.impact, help: item.help, nodes: item.nodes.length }));
            return { violations, seriousOrCritical: violations.filter(item => item.impact === "serious" || item.impact === "critical").length };
          });
        } catch (error) { a11y = { violations: [], seriousOrCritical: 0, error: String(error) }; }
      }

      if (width === 390) {
        try {
          const menu = page.locator(".mobile-menu");
          await menu.locator("summary").click();
          const opened = await menu.evaluate(element => element.open);
          await menu.locator('nav a[href="#about"]').click();
          const closed = await menu.evaluate(element => !element.open);
          interactions.mobileMenu = { opened, closed };
        } catch (error) { interactions.mobileMenu = { error: String(error) }; }

        try {
          await page.locator("#hero-transcript-open").click();
          const opened = await page.locator("#hero-transcript-dialog").evaluate(element => element.open);
          await page.locator("#hero-transcript-dialog [data-transcript-close]").click();
          const closed = await page.locator("#hero-transcript-dialog").evaluate(element => !element.open);
          interactions.transcript = { opened, closed };
        } catch (error) { interactions.transcript = { error: String(error) }; }

        try {
          const trigger = page.locator('a[data-booking-message]').first();
          if (await trigger.count()) {
            await trigger.click();
            const dialog = page.locator("#bookingMenu");
            const opened = await dialog.evaluate(element => element.open);
            await dialog.locator(".booking-menu__close").click();
            const closed = await dialog.evaluate(element => !element.open);
            interactions.bookingDialog = { opened, closed };
          } else interactions.bookingDialog = { skipped: true };
        } catch (error) { interactions.bookingDialog = { error: String(error) }; }

        try {
          await page.locator("#hero-video-link").click();
          const player = page.locator("#hero-kinescope-player");
          const src = await player.getAttribute("src");
          interactions.video = { iframeCreated: Boolean(src), autoplay: Boolean(src && new URL(src).searchParams.get("autoplay") === "1") };
        } catch (error) { interactions.video = { error: String(error) }; }
      }
    }
  } catch (error) {
    report.errors.push({ engine, width, stage: "navigation", error: String(error) });
  }

  const firstPartyFailed = failedRequests.filter(item => item.url.startsWith(base));
  const interactionFailures = Object.entries(interactions).filter(([, value]) => value.error || value.opened === false || value.closed === false || value.iframeCreated === false || value.autoplay === false);
  const pass = response?.status() === 200 &&
    metrics && !metrics.document.horizontalOverflow &&
    metrics.duplicateIds.length === 0 && metrics.missingAnchors.length === 0 &&
    metrics.brokenImages.length === 0 && metrics.fontsReady &&
    consoleErrors.length === 0 && pageErrors.length === 0 &&
    firstPartyFailed.length === 0 && badResponses.length === 0 &&
    a11y.seriousOrCritical === 0 && interactionFailures.length === 0;
  const result = { engine, width, height, status: response?.status() || null, pass, metrics, a11y, interactions, consoleErrors, pageErrors, failedRequests, badResponses };
  report.checks.push(result);
  console.log((pass ? "PASS " : "FAIL ") + engine + " " + width + "px HTTP=" + result.status +
    " overflow=" + (metrics?.document.horizontalOverflow ?? "n/a") +
    " brokenImages=" + (metrics?.brokenImages.length ?? "n/a") +
    " seriousA11y=" + a11y.seriousOrCritical);

  if (engine === "chromium" && [320, 390, 768, 1440].includes(width) && response?.status() === 200) {
    const screenshot = path.join("site-audit", "production-" + width + ".png");
    await page.screenshot({ path: screenshot, fullPage: true, animations: "disabled" });
    report.screenshots.push(screenshot);
  }
  if (!pass) report.errors.push({
    engine, width, stage: "assertions", status: result.status, metrics, a11y, interactions,
    consoleErrors, pageErrors, firstPartyFailed, badResponses
  });
  await page.close();
}

for (const [engine, launcher, viewports] of [
  ["chromium", chromium, widths],
  ["firefox", firefox, [320, 390, 768, 1440]],
  ["webkit", webkit, [320, 390, 768, 1440]]
]) {
  const browser = await launcher.launch({ headless: true });
  try { for (const width of viewports) await auditViewport(browser, engine, width); }
  finally { await browser.close(); }
}

report.summary = {
  total: report.checks.length,
  passed: report.checks.filter(check => check.pass).length,
  failed: report.checks.filter(check => !check.pass).length,
  browsers: [...new Set(report.checks.map(check => check.engine))],
  screenshots: report.screenshots
};
await fs.writeFile("site-audit/browser-report.json", JSON.stringify(report, null, 2), "utf8");
console.log("FINAL SUMMARY " + JSON.stringify(report.summary, null, 2));
if (report.summary.failed) process.exitCode = 1;
