import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const errors = [];
const passed = [];

const productionPages = [
  { file: "index.html", url: "https://styleofmind.github.io/" },
  { file: "privacy-policy.html", url: "https://styleofmind.github.io/privacy-policy.html" },
  { file: "online-family-constellations.html", url: "https://styleofmind.github.io/online-family-constellations.html" },
  { file: "group-constellations-spb.html", url: "https://styleofmind.github.io/group-constellations-spb.html" },
  { file: "how-family-constellations-work.html", url: "https://styleofmind.github.io/how-family-constellations-work.html" },
];

const providerPattern = /googletagmanager\.com|google-analytics\.com|mc\.yandex\.ru|metrika\/tag\.js|G-L3K3HMRF2Z|113093974|\bgtag\s*\(|\bym\s*\(|\btrackEvent\s*\(/i;

function fail(message) {
  errors.push(message);
}

function pass(message) {
  passed.push(message);
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else files.push(absolute);
  }
  return files;
}

function tags(html, name, attribute) {
  const found = [];
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const key = tag.match(new RegExp(`\\b${attribute}\\s*=\\s*["']([^"']+)["']`, "i"));
    const content = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i);
    if (key && key[1].toLowerCase() === name.toLowerCase()) found.push(content ? content[1].trim() : "");
  }
  return found;
}

function canonicalLinks(html) {
  return [...html.matchAll(/<link\b[^>]*>/gi)].flatMap(match => {
    const tag = match[0];
    const rel = tag.match(/\brel\s*=\s*["']([^"']+)["']/i);
    const href = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i);
    return rel && rel[1].toLowerCase().split(/\s+/).includes("canonical") ? [href?.[1] || ""] : [];
  });
}

function countHeading(html, level) {
  return [...html.matchAll(new RegExp("<h" + level + "\\b", "gi"))].length;
}

async function checkProduction() {
  const seenTitles = new Map();
  const seenDescriptions = new Map();

  for (const page of productionPages) {
    const fullPath = path.join(root, page.file);
    let html;
    try {
      html = await readFile(fullPath, "utf8");
    } catch {
      fail("Production page missing: " + page.file);
      continue;
    }

    const title = (html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.replace(/<[^>]+>/g, "").trim() || "";
    const description = tags(html, "description", "name");
    const canonical = canonicalLinks(html);
    const requiredMeta = [
      ["og:type", "property"], ["og:title", "property"], ["og:description", "property"],
      ["og:url", "property"], ["og:image", "property"], ["og:image:alt", "property"],
      ["twitter:card", "name"], ["twitter:title", "name"], ["twitter:description", "name"],
      ["twitter:image", "name"], ["twitter:image:alt", "name"],
    ];

    if (!title) fail(page.file + ": title is missing");
    else if (seenTitles.has(title)) fail(page.file + ": duplicate title also used by " + seenTitles.get(title));
    else seenTitles.set(title, page.file);

    if (description.length !== 1 || !description[0]) fail(page.file + ": expected one non-empty meta description");
    else if (seenDescriptions.has(description[0])) fail(page.file + ": duplicate description also used by " + seenDescriptions.get(description[0]));
    else seenDescriptions.set(description[0], page.file);

    if (canonical.length !== 1 || canonical[0] !== page.url) fail(page.file + ": canonical must be exactly " + page.url);
    if (countHeading(html, 1) !== 1) fail(page.file + ": expected exactly one H1");

    const metaValue = (name, attribute) => tags(html, name, attribute)[0] || "";
    if (metaValue("og:title", "property") !== title) fail(page.file + ": og:title must match title");
    if (metaValue("twitter:title", "name") !== title) fail(page.file + ": twitter:title must match title");
    if (description.length === 1 && metaValue("og:description", "property") !== description[0]) fail(page.file + ": og:description must match meta description");
    if (description.length === 1 && metaValue("twitter:description", "name") !== description[0]) fail(page.file + ": twitter:description must match meta description");
    if (metaValue("og:url", "property") !== page.url) fail(page.file + ": og:url must match canonical URL");
    if (metaValue("og:image", "property") !== metaValue("twitter:image", "name")) fail(page.file + ": Open Graph and Twitter images must match");

    for (const [name, attribute] of requiredMeta) {
      const values = tags(html, name, attribute);
      if (values.length !== 1 || !values[0]) fail(page.file + ": expected one non-empty " + name);
    }

    const jsonLdBlocks = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    if (page.file !== "privacy-policy.html" && jsonLdBlocks.length === 0) fail(page.file + ": structured data block is missing");
    for (const block of jsonLdBlocks) {
      try {
        JSON.parse(block[1]);
      } catch (error) {
        fail(page.file + ": invalid JSON-LD: " + error.message);
      }
    }
    if (/\bname=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) {
      fail(page.file + ": production page must not have noindex");
    }
  }

  if (errors.length === 0) pass("Production SEO metadata: " + productionPages.length + " pages");
}

async function checkDevelopment() {
  const directory = path.join(root, "development");
  const files = await walk(directory);
  const htmlFiles = files.filter(file => file.toLowerCase().endsWith(".html"));
  const scriptFiles = files.filter(file => file.toLowerCase().endsWith(".js"));
  let htmlPassed = 0;

  if (htmlFiles.length === 0) fail("No HTML pages found under development/");

  for (const file of files) {
    const base = path.basename(file).toLowerCase();
    if (base === "robots.txt" || base === "sitemap.xml") {
      fail("Nested crawler file is not allowed: " + path.relative(root, file));
    }
    if (["privacy.html", "privacy-policy.html", "legal.html"].includes(base)) {
      fail("Duplicate privacy/legal page is not allowed in development: " + path.relative(root, file));
    }
  }

  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    const relative = path.relative(root, file);
    const robots = tags(html, "robots", "name");
    if (robots.length !== 1 || !/noindex\s*,\s*nofollow/i.test(robots[0])) {
      fail(relative + ": expected one robots noindex,nofollow directive");
    }
    if (canonicalLinks(html).length !== 0) fail(relative + ": development page must not declare canonical");
    for (const [name, attribute] of [["description", "name"], ["og:title", "property"], ["og:description", "property"], ["twitter:title", "name"], ["twitter:description", "name"]]) {
      if (tags(html, name, attribute).length !== 0) fail(relative + ": remove production SEO metadata " + name);
    }
    if (/application\/ld\+json/i.test(html)) fail(relative + ": structured production SEO data is not allowed");
    if (/cookieConsent|cookieSettingsTrigger|cookieAccept|cookieReject|analyticsConsent/i.test(html)) {
      fail(relative + ": analytics-consent UI must not exist in a preview");
    }
    const stalePolicyLinks = ['href="privacy.html"', 'href="./privacy.html"', 'href="pages/privacy.html"', 'href="privacy-policy.html"', 'href="./privacy-policy.html"', 'href="legal.html"', 'href="./legal.html"', 'href="./legal.html#privacy"', 'href="./legal.html#consent"'];
    if (stalePolicyLinks.some(link => html.includes(link))) fail(relative + ": preview must link to the single root /privacy-policy.html");
    if (providerPattern.test(html)) fail(relative + ": analytics provider or tracking code found in HTML");
    if (/\b(?:googletagmanager|google-analytics|metrika\/tag\.js|mc\.yandex\.ru)/i.test(html)) {
      fail(relative + ": external analytics script reference found");
    }
    htmlPassed++;
  }

  for (const file of scriptFiles) {
    const source = await readFile(file, "utf8");
    const relative = path.relative(root, file);
    const base = path.basename(file).toLowerCase();
    if (/^analytics(?:-config)?\.js$/.test(base)) fail(relative + ": analytics loader/config file is not allowed in development");
    if (/cookieConsent|cookieSettingsTrigger|cookieAccept|cookieReject|analyticsConsent|olgaConsentChanged/i.test(source)) {
      fail(relative + ": analytics-consent handlers are not allowed in development");
    }
    if (providerPattern.test(source)) fail(relative + ": analytics provider, counter ID or tracking hook found in JavaScript");
  }

  if (errors.length === 0) pass("Development isolation: " + htmlPassed + " HTML pages; " + scriptFiles.length + " JS files");
}

async function checkCrawlerFiles() {
  const robots = await readFile(path.join(root, "robots.txt"), "utf8");
  const sitemap = await readFile(path.join(root, "sitemap.xml"), "utf8");
  if (!/^User-agent:\s*\*/im.test(robots) || !/^Allow:\s*\//im.test(robots)) fail("Root robots.txt must allow crawling");
  if (!/Sitemap:\s*https:\/\/styleofmind\.github\.io\/sitemap\.xml/i.test(robots)) fail("Root robots.txt must reference the production sitemap");

  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gi)].map(match => match[1].trim());
  const expected = productionPages.map(page => page.url);
  if (urls.length !== expected.length || expected.some(url => !urls.includes(url))) {
    fail("Root sitemap must contain exactly the five production canonical URLs");
  }
  if (urls.some(url => url.includes("/development/"))) fail("Root sitemap must not include development preview URLs");
  if (!/<urlset\b/.test(sitemap) || !/<\/urlset>\s*$/.test(sitemap)) fail("Root sitemap XML structure is incomplete");
  if ([...sitemap.matchAll(/<url>/gi)].length !== urls.length) fail("Root sitemap contains an invalid URL entry");
  if (errors.length === 0) pass("Root robots.txt and sitemap.xml");
}

async function checkPresentationFiles() {
  const notFound = await readFile(path.join(root, "404.html"), "utf8");
  const readme = await readFile(path.join(root, "README.md"), "utf8");
  if (!/жизнь иногда отправляет не туда, куда хочется/i.test(notFound)) fail("404.html must contain the agreed reassuring message");
  if (!notFound.includes('href="/"')) fail("404.html must link to the homepage");
  if (!notFound.includes('href="https://t.me/olga_styleofmind"')) fail("404.html must link to Olga's Telegram");
  if (!readme.includes("Ольга Сусленникова")) fail("Root README must present Olga, not the software project");
  if (!readme.includes("https://t.me/olga_styleofmind")) fail("Root README must link to Telegram");
  if (!readme.includes("https://styleofmind.github.io/")) fail("Root README must link to the official website");
  if (!readme.includes("assets/og/olga-social-preview.webp")) fail("Root README must include the existing portrait preview");
  try {
    await readFile(path.join(root, "assets/og/olga-social-preview.webp"));
  } catch {
    fail("Root README portrait image is missing");
  }
  if (errors.length === 0) pass("404 page and personal root README");
}

await checkProduction();
await checkDevelopment();
await checkCrawlerFiles();
await checkPresentationFiles();

for (const message of passed) console.log("PASS " + message);
for (const message of errors) console.error("FAIL " + message);
console.log("SEO CHECKS: " + passed.length + " passed, " + errors.length + " failed");
if (errors.length) process.exitCode = 1;
