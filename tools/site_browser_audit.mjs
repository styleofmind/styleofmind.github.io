import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { chromium, firefox, webkit, request as playwrightRequest } from "playwright";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js");
const pagePath = "/development/%D0%BA%D0%BE%D0%BD%D1%86%D0%B5%D0%BF%20%D1%80%D0%B0%D1%81%D1%81%D1%82%D0%B0%D0%BD%D0%BE%D0%B2%D0%BA%D0%B8/concept-4/v4.1/";
const localBase = "http://127.0.0.1:8765";
const localWidths = [320,360,390,420,430,760,761,768,1024,1100,1101,1240,1241,1440,1920];
// Preview concepts are not deployed at the root domain. Browser layout checks use the checked-out files only.
const targets = [
  { name: "local", base: localBase, widths: localWidths }
];
const crossBrowserTargets = [
  { name: "local", base: localBase, widths: [320,390,768,1024,1440] }
];

await fs.mkdir("site-audit", { recursive: true });
const report = {
  generatedAt: new Date().toISOString(),
  commit: process.env.GITHUB_SHA || "manual",
  pagePath,
  checks: [],
  errors: [],
  screenshots: [],
  summary: {}
};

function intersects(a,b) {
  return Boolean(a && b &&
    Math.min(a.right,b.right) - Math.max(a.left,b.left) > 2 &&
    Math.min(a.bottom,b.bottom) - Math.max(a.top,b.top) > 2);
}

async function checkViewport(browser, target, width, engineName) {
  const height = width <= 430 ? 844 : width <= 768 ? 1024 : 900;
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const badResponses = [];
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", error => pageErrors.push(String(error)));
  page.on("requestfailed", req => {
    const failure = req.failure();
    if (!failure || failure.errorText !== "net::ERR_ABORTED") {
      failedRequests.push({ url: req.url(), error: failure ? failure.errorText : "unknown" });
    }
  });
  page.on("response", response => {
    if (response.status() >= 400) badResponses.push({ url: response.url(), status: response.status() });
  });
  await page.addInitScript(() => {
    window.__auditShifts = [];
    window.__auditLcp = [];
    try {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          window.__auditShifts.push({ value: entry.value, hadRecentInput: entry.hadRecentInput, startTime: entry.startTime });
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch (_) {}
    try {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          window.__auditLcp.push({
            startTime: entry.startTime, size: entry.size,
            element: entry.element ? entry.element.tagName.toLowerCase() : "",
            id: entry.id || ""
          });
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });
    } catch (_) {}
  });

  const url = target.base + pagePath;
  let response = null;
  try {
    response = await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  } catch (error) {
    report.errors.push({ target: target.name, width, stage: "navigate", error: String(error) });
  }

  let metrics = null;
  let a11y = { violations: [], criticalOrSerious: 0, error: null };
  let mobileMenu = null;
  if (response && response.status() === 200) {
    await page.evaluate(async () => {
      await document.fonts.ready;
      const imgs = Array.from(document.images);
      for (const img of imgs) img.loading = "eager";
      await Promise.all(imgs.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
          setTimeout(done, 10000);
        });
      }));
    });
    await page.waitForTimeout(250);
    metrics = await page.evaluate(() => {
      const getRect = selector => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return {
          left: Math.round(r.left*10)/10, right: Math.round(r.right*10)/10,
          top: Math.round(r.top*10)/10, bottom: Math.round(r.bottom*10)/10,
          width: Math.round(r.width*10)/10, height: Math.round(r.height*10)/10,
          display: s.display, position: s.position
        };
      };
      const boxes = {};
      [
        ".hero__copy",".hero__portrait",".hero__aside",
        ".about__copy",".about__visual",".about__photo",".about__photo .about__portrait",".about__quote",
        ".outcomes__grid",".outcomes__quote",
        ".site-header",".site-footer__main"
      ].forEach(sel => { boxes[sel] = getRect(sel); });
      const missingAnchors = [];
      for (const link of document.querySelectorAll('a[href^="#"]')) {
        let id = link.getAttribute("href").slice(1);
        if (!id) continue;
        try { id = decodeURIComponent(id); } catch (_) {}
        if (!document.getElementById(id)) missingAnchors.push("#" + id);
      }
      const images = Array.from(document.images).map(img => ({
        src: img.getAttribute("src"),
        currentSrc: img.currentSrc,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        complete: img.complete,
        loading: img.loading,
        displayWidth: Math.round(img.getBoundingClientRect().width),
        displayHeight: Math.round(img.getBoundingClientRect().height)
      }));
      const brokenImages = images.filter(img => !img.complete || img.naturalWidth === 0);
      const doc = document.documentElement;
      const body = document.body;
      const outOfViewport = [];
      const contentSelectors = [".site-header",".hero__copy",".hero__actions",".hero__note",".about__copy",".about__visual",".about__quote",".section-heading",".request-card",".price-card",".faq__layout",".site-footer__main"];
      for (const selector of contentSelectors) {
        for (const el of document.querySelectorAll(selector)) {
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height) continue;
          if (r.left < -2 || r.right > innerWidth + 2) {
            outOfViewport.push({ selector, left: Math.round(r.left), right: Math.round(r.right), viewport: innerWidth,
              text: (el.innerText || "").trim().replace(/\s+/g," ").slice(0,70) });
          }
        }
      }
      const clippedText = [];
      const textSelectors = ["h1","h2","h3",".hero__lead",".about__subtitle",".about__facts strong",".about__facts small",
        ".about__quote p",".request-card h3",".request-card p",".price-card h3",".price-card__description",
        ".price-card__note",".faq-item summary",".footer-column a",".footer-column p"];
      for (const selector of textSelectors) {
        for (const el of document.querySelectorAll(selector)) {
          const s = getComputedStyle(el);
          if (s.overflowX === "visible" && s.overflowY === "visible") continue;
          if (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2) {
            clippedText.push({ selector, text: (el.innerText || "").trim().replace(/\s+/g," ").slice(0,70),
              client: [el.clientWidth,el.clientHeight], scroll: [el.scrollWidth,el.scrollHeight] });
          }
        }
      }
      const intersectsLocal = (a,b) => Boolean(a && b &&
        Math.min(a.right,b.right)-Math.max(a.left,b.left)>2 &&
        Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2);
      const aboutOverlap = [];
      if (intersectsLocal(boxes[".about__copy"],boxes[".about__visual"])) {
        aboutOverlap.push({ first: ".about__copy", second: ".about__visual",
          firstRect: boxes[".about__copy"], secondRect: boxes[".about__visual"] });
      }
      const aboutFlowIssues = [];
      if (boxes[".about__photo"] && boxes[".about__quote"] &&
          boxes[".about__quote"].top < boxes[".about__photo"].bottom - 1) {
        aboutFlowIssues.push({ photo: boxes[".about__photo"], quote: boxes[".about__quote"] });
      }
      const outcomesOverlap = intersectsLocal(boxes[".outcomes__grid"],boxes[".outcomes__quote"]);
      const shifts = window.__auditShifts || [];
      const cls = shifts.filter(x => !x.hadRecentInput).reduce((sum,x) => sum + x.value,0);
      const lcp = window.__auditLcp || [];
      const paints = performance.getEntriesByType("paint");
      const resources = performance.getEntriesByType("resource").map(entry => ({
        url: entry.name, initiator: entry.initiatorType,
        durationMs: Math.round(entry.duration), bytes: entry.transferSize || entry.encodedBodySize || 0
      }));
      const heroBackground = getComputedStyle(document.querySelector(".hero")).backgroundImage;
      const portraitImages = images.filter(image => /olga-(?:hero-glasses|about)\.png$/.test(image.src || ""));
      const portraitDeliveryFailures = portraitImages.filter(image => !/\.webp(?:$|\?)/.test(image.currentSrc || ""));
      const desktopHeroImage = document.querySelector(".hero__portrait img");
      const desktopHeroCurrentSrc = desktopHeroImage ? desktopHeroImage.currentSrc : "";
      const desktopHeroDeliveryFailure = innerWidth > 760 && !/\.webp(?:$|\?)/.test(desktopHeroCurrentSrc);
      const mobileHeroBackgroundExpected = innerWidth <= 760
        ? heroBackground.includes("section-01-mobile.webp")
        : heroBackground.includes("section-01.jpg");
      const mobileBackgroundBytes = resources
        .filter(resource => resource.url.includes("section-01-mobile.webp"))
        .reduce((sum, resource) => sum + resource.bytes, 0);
      const desktopBackgroundLoaded = resources.some(resource => resource.url.includes("section-01.jpg") && !resource.url.includes("section-01-mobile.webp"));
      return {
        title: document.title,
        viewport: { width: innerWidth, height: innerHeight },
        document: { width: doc.scrollWidth, bodyWidth: body.scrollWidth, height: doc.scrollHeight,
          horizontalOverflow: doc.scrollWidth > innerWidth + 1 || body.scrollWidth > innerWidth + 1 },
        images, brokenImages, missingAnchors: Array.from(new Set(missingAnchors)),
        heroBackground, mobileHeroBackgroundExpected, mobileBackgroundBytes, desktopBackgroundLoaded,
        portraitDeliveryFailures, desktopHeroCurrentSrc, desktopHeroDeliveryFailure,
        boxes, aboutOverlap, aboutFlowIssues, outcomesOverlap, outOfViewport, clippedText,
        fonts: {
          status: document.fonts.status,
          montserratAvailable: document.fonts.check("400 16px Montserrat"),
          playfairAvailable: document.fonts.check('400 16px "Playfair Display"'),
          faces: Array.from(document.fonts).map(f => ({ family:f.family, weight:f.weight, status:f.status, display:f.display }))
        },
        layoutShift: { cls: Math.round(cls*10000)/10000, entries: shifts },
        lcp: lcp.length ? lcp[lcp.length-1] : null,
        paint: Object.fromEntries(paints.map(e => [e.name,Math.round(e.startTime)])),
        resources: { count:resources.length, totalBytes:resources.reduce((sum,x)=>sum+x.bytes,0),
          largest:resources.slice().sort((a,b)=>b.bytes-a.bytes).slice(0,10) }
      };
    });

    if (width <= 760) {
      try {
        const toggle = page.locator(".menu-toggle");
        const nav = page.locator("#site-nav");
        await toggle.click();
        const expanded = await toggle.getAttribute("aria-expanded");
        const opened = await nav.evaluate(el => el.classList.contains("is-open"));
        await nav.locator("a").first().click();
        const closed = await toggle.getAttribute("aria-expanded");
        mobileMenu = { openedCorrectly: expanded === "true" && opened, closedAfterNavigation: closed === "false" };
        mobileMenu.failed = !mobileMenu.openedCorrectly || !mobileMenu.closedAfterNavigation;
      } catch (error) {
        mobileMenu = { failed: true, error: String(error) };
      }
    }

    if (width === 390 || width === 1440) {
      try {
        await page.addScriptTag({ path: axePath });
        a11y = await page.evaluate(async () => {
          const result = await axe.run(document, { runOnly: { type:"tag", values:["wcag2a","wcag2aa","wcag21a","wcag21aa"] } });
          const violations = result.violations.map(v => ({
            id:v.id, impact:v.impact, help:v.help, description:v.description,
            nodeCount:v.nodes.length,
            nodes:v.nodes.slice(0,8).map(n=>({target:n.target,summary:n.failureSummary}))
          }));
          return { violations, criticalOrSerious:violations.filter(v=>v.impact==="critical"||v.impact==="serious").length };
        });
      } catch (error) {
        a11y = { violations:[], criticalOrSerious:0, error:String(error) };
      }
    }
  }

  const firstPartyFailed = failedRequests.filter(x => x.url.startsWith(target.base));
  const firstPartyBad = badResponses.filter(x => x.url.startsWith(target.base));
  const result = {
    browser:engineName, target:target.name, width, height, url, httpStatus:response ? response.status() : null,
    consoleErrors,pageErrors,failedRequests,badResponses,firstPartyFailed,firstPartyBad,
    metrics,a11y,mobileMenu,pass:false
  };
  const noLayoutProblems = metrics &&
    !metrics.document.horizontalOverflow &&
    metrics.brokenImages.length === 0 &&
    metrics.missingAnchors.length === 0 &&
    metrics.aboutOverlap.length === 0 &&
    metrics.aboutFlowIssues.length === 0 &&
    !metrics.outcomesOverlap &&
    metrics.outOfViewport.length === 0 &&
    metrics.clippedText.length === 0 &&
    metrics.mobileHeroBackgroundExpected &&
    metrics.portraitDeliveryFailures.length === 0 &&
    !metrics.desktopHeroDeliveryFailure &&
    (width <= 760 ? metrics.mobileBackgroundBytes > 0 && !metrics.desktopBackgroundLoaded : metrics.desktopBackgroundLoaded);
  result.pass = result.httpStatus === 200 &&
    firstPartyFailed.length === 0 && firstPartyBad.length === 0 &&
    consoleErrors.length === 0 && pageErrors.length === 0 && noLayoutProblems &&
    (!metrics || (metrics.fonts.montserratAvailable && metrics.fonts.playfairAvailable)) &&
    (!mobileMenu || !mobileMenu.failed) &&
    a11y.criticalOrSerious === 0;
  report.checks.push(result);

  console.log(
    (result.pass ? "PASS " : "FAIL ") + engineName + " " + target.name + " " + width +
    "px HTTP=" + result.httpStatus +
    " overflow=" + (metrics ? metrics.document.horizontalOverflow : "n/a") +
    " brokenImages=" + (metrics ? metrics.brokenImages.length : "n/a") +
    " anchors=" + (metrics ? metrics.missingAnchors.length : "n/a") +
    " cls=" + (metrics ? metrics.layoutShift.cls : "n/a") +
    " seriousA11y=" + a11y.criticalOrSerious
  );

  if (metrics && engineName === "chromium" && target.name === "local" && [320,390,768,1440].includes(width)) {
    const screenshot = path.join("site-audit", "local-" + width + ".png");
    await page.screenshot({ path:screenshot, fullPage:true, animations:"disabled" });
    report.screenshots.push(screenshot);
  }
  if (!result.pass) {
    report.errors.push({
      target:result.target, width:result.width, stage:"assertions",
      httpStatus:result.httpStatus, firstPartyFailed, firstPartyBad, pageErrors,
      metrics:metrics ? {
        document:metrics.document, brokenImages:metrics.brokenImages, missingAnchors:metrics.missingAnchors,
        aboutOverlap:metrics.aboutOverlap, aboutFlowIssues:metrics.aboutFlowIssues,
        outcomesOverlap:metrics.outcomesOverlap, outOfViewport:metrics.outOfViewport,
        clippedText:metrics.clippedText, fonts:metrics.fonts,
        heroBackground:metrics.heroBackground,
        mobileHeroBackgroundExpected:metrics.mobileHeroBackgroundExpected,
        mobileBackgroundBytes:metrics.mobileBackgroundBytes,
        desktopBackgroundLoaded:metrics.desktopBackgroundLoaded,
        portraitDeliveryFailures:metrics.portraitDeliveryFailures,
        desktopHeroCurrentSrc:metrics.desktopHeroCurrentSrc,
        desktopHeroDeliveryFailure:metrics.desktopHeroDeliveryFailure
      } : null,
      a11y: { criticalOrSerious:a11y.criticalOrSerious, violations:a11y.violations },
      mobileMenu
    });
  }
  if (metrics && (width === 390 || width === 1440)) {
    console.log("A11Y " + target.name + " " + width + "px " +
      JSON.stringify((a11y.violations||[]).map(v=>({id:v.id,impact:v.impact,nodes:v.nodeCount,help:v.help}))));
    console.log("ABOUT " + target.name + " " + width + "px " +
      JSON.stringify({
        copy:metrics.boxes[".about__copy"],
        visual:metrics.boxes[".about__visual"],
        photo:metrics.boxes[".about__photo"],
        person:metrics.boxes[".about__photo .about__portrait"],
        quote:metrics.boxes[".about__quote"]
      }));
  }
  await page.close();
  return result;
}

const engines = [
  { name: "chromium", launcher: chromium, targets },
  { name: "firefox", launcher: firefox, targets: crossBrowserTargets },
  { name: "webkit", launcher: webkit, targets: crossBrowserTargets }
];
for (const engine of engines) {
  const browser = await engine.launcher.launch({ headless:true });
  try {
    for (const target of engine.targets) {
      for (const width of target.widths) {
        await checkViewport(browser,target,width,engine.name);
      }
    }
  } finally {
    await browser.close();
  }
}
report.summary = {
  total:report.checks.length,
  passed:report.checks.filter(c=>c.pass).length,
  failed:report.checks.filter(c=>!c.pass).length,
  failures:report.errors.length,
  browsers:[...new Set(report.checks.map(c=>c.browser))],
  viewportResults:report.checks.map(c=>({browser:c.browser,target:c.target,width:c.width,pass:c.pass})),
  screenshots:report.screenshots,
  a11yViolations:report.checks.filter(c=>c.a11y && c.a11y.violations?.length).map(c=>({
    browser:c.browser,target:c.target,width:c.width,violations:c.a11y.violations.map(v=>({id:v.id,impact:v.impact,nodeCount:v.nodeCount}))
  }))
};
await fs.writeFile("site-audit/browser-report.json", JSON.stringify(report,null,2), "utf8");
console.log("FINAL SUMMARY " + JSON.stringify(report.summary,null,2));
if (report.summary.failed > 0) process.exitCode = 1;
