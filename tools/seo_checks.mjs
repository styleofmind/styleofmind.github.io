import { readFile, stat } from "node:fs/promises";
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

function fail(message) {
  errors.push(message);
}

function pass(message) {
  passed.push(message);
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
  if (!/<urlset\b/.test(sitemap) || !/<\/urlset>\s*$/.test(sitemap)) fail("Root sitemap XML structure is incomplete");
  if ([...sitemap.matchAll(/<url>/gi)].length !== urls.length) fail("Root sitemap contains an invalid URL entry");
  if (errors.length === 0) pass("Root robots.txt and sitemap.xml");
}

async function checkLocalReferences() {
  const htmlFiles = ["index.html","privacy-policy.html","online-family-constellations.html","group-constellations-spb.html","how-family-constellations-work.html","404.html","blog/index.html","direct/index.html","max/index.html","tg/index.html","vk/index.html","wa/index.html"];
  let checkedFiles = 0, checkedReferences = 0;
  for (const file of htmlFiles) {
    let html;
    try { html = await readFile(path.join(root,file),"utf8"); checkedFiles++; }
    catch { fail("HTML page missing: "+file); continue; }
    const ids=[...html.matchAll(/\bid=["']([^"']+)["']/gi)].map(m=>m[1]);
    for(const id of new Set(ids.filter((v,i)=>ids.indexOf(v)!==i))) fail(file+": duplicate id "+id);
    for(const m of html.matchAll(/\b(?:href|src|poster|data-full-src|data-src)=["']([^"']+)["']/gi)){
      const value=m[1].trim();
      if(!value||/^(?:https?:|mailto:|tel:|data:|javascript:|\/\/)/i.test(value)) continue;
      const hash=value.indexOf("#"), pathPart=(hash>=0?value.slice(0,hash):value).split("?")[0];
      if(!pathPart) continue;
      let decoded; try{decoded=decodeURIComponent(pathPart);}catch{decoded=pathPart;}
      const target=decoded.startsWith("/")?path.join(root,decoded.replace(/^\/+/, "")):path.resolve(root,path.dirname(file),decoded);
      checkedReferences++;
      try{await stat(target);}catch{fail(file+": local reference not found: "+value);}
    }
  }
  for(const file of ["css/styles.css","fonts/fonts.css"]){
    let source; try{source=await readFile(path.join(root,file),"utf8");}catch{fail("Stylesheet missing: "+file);continue;}
    for(const m of source.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)){
      const value=m[1].trim(); if(!value||/^(?:https?:|data:|\/\/)/i.test(value))continue;
      let decoded;try{decoded=decodeURIComponent(value.split(/[?#]/)[0]);}catch{decoded=value.split(/[?#]/)[0];}
      const target=decoded.startsWith("/")?path.join(root,decoded.replace(/^\/+/, "")):path.resolve(root,path.dirname(file),decoded);
      checkedReferences++;try{await stat(target);}catch{fail(file+": local CSS resource not found: "+value);}
    }
  }
  if(errors.length===0)pass("Local HTML/CSS references: "+checkedFiles+" HTML pages; "+checkedReferences+" resources");
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
await checkCrawlerFiles();
await checkLocalReferences();
await checkPresentationFiles();

for (const message of passed) console.log("PASS " + message);
for (const message of errors) console.error("FAIL " + message);
console.log("SEO CHECKS: " + passed.length + " passed, " + errors.length + " failed");
if (errors.length) process.exitCode = 1;
