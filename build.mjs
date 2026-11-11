// The Blockchain Wire: reads public feeds, writes a static site into ./dist. No server, no database.
//   node build.mjs            fetch feeds, merge into data/items.json, build
//   node build.mjs --offline  build from data/items.json only
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SOURCES, SECTIONS } from "./sources.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, "dist");
const DATA = path.join(ROOT, "data", "items.json");
const SITE = "https://theblockchainwire.com";
const KEEP = 1500;          // stories kept in the archive file
const ON_PAGE = 400;        // stories listed on the front page wire
const OFFLINE = process.argv.includes("--offline");

// ---------- helpers
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…" };
const decode = (s = "") => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
const text = (s = "") => decode(decode(s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")).replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const tag = (xml, name) => { const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i")); return m ? m[1] : ""; };
const clip = (s, n) => { if (s.length <= n) return s; const c = s.slice(0, n); return c.slice(0, Math.max(c.lastIndexOf(" "), n - 30)).replace(/[\s,;:.–—-]+$/, "") + "…"; };
const sectionOf = (s) => SECTIONS.find((x) => x.re.test(s)).id;
const safeUrl = (u) => { try { const x = new URL(u.trim()); if (!/^https?:$/.test(x.protocol)) return ""; for (const k of [...x.searchParams.keys()]) if (/^utm_|^fbclid$|^ref$/i.test(k)) x.searchParams.delete(k); return x.href; } catch { return ""; } };

function parseFeed(xml, src) {
  const out = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  for (const b of blocks) {
    const title = text(tag(b, "title"));
    let link = text(tag(b, "link"));
    if (!link) { const m = b.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i) || b.match(/<link[^>]*href=["']([^"']+)["']/i); link = m ? decode(m[1]) : ""; }
    link = safeUrl(link);
    const when = new Date(text(tag(b, "pubDate") || tag(b, "published") || tag(b, "updated") || tag(b, "dc:date")));
    if (!title || !link || isNaN(when)) continue;
    const sum = clip(text(tag(b, "description") || tag(b, "summary") || tag(b, "content:encoded") || tag(b, "content")), 170);
    out.push({ t: clip(title, 180), u: link, s: src.name, d: when.toISOString(), x: sum.toLowerCase().startsWith(title.toLowerCase().slice(0, 40)) ? "" : sum });
  }
  return out;
}

async function fetchAll() {
  const report = [];
  const lists = await Promise.all(SOURCES.map(async (src) => {
    try {
      const r = await fetch(src.feed, { signal: AbortSignal.timeout(20000), headers: { "user-agent": "TheBlockchainWire/1.0 (+https://theblockchainwire.com/about/)", accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" } });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const items = parseFeed(await r.text(), src);
      report.push(`${src.name}: ${items.length}`);
      return items;
    } catch (e) { report.push(`${src.name}: FAILED (${e.message})`); return []; }
  }));
  console.log(report.join("\n"));
  return lists.flat();
}

// ---------- data
let items = fs.existsSync(DATA) ? JSON.parse(fs.readFileSync(DATA, "utf8")) : [];
if (!OFFLINE) {
  const fresh = await fetchAll();
  const seen = new Map(items.map((i) => [i.u, i]));
  for (const f of fresh) if (!seen.has(f.u)) seen.set(f.u, f);
  const now = Date.now();
  items = [...seen.values()].filter((i) => new Date(i.d) <= now + 36e5 && new Date(i.d) >= now - 45 * 864e5).sort((a, b) => b.d.localeCompare(a.d)).slice(0, KEEP);
  fs.mkdirSync(path.dirname(DATA), { recursive: true });
  fs.writeFileSync(DATA, JSON.stringify(items));
}
items.forEach((i) => (i.c = sectionOf(i.t + " " + i.x)));
if (!items.length) { console.error("No stories: refusing to build an empty wire."); process.exit(1); }

// ---------- editor pieces (tiny Markdown)
const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, a, h) => `<a href="${h}"${/^https?:/.test(h) ? ' rel="noopener"' : ""}>${a}</a>`);
const md = (src) => src.trim().split(/\n{2,}/).map((b) => (b.startsWith("## ") ? `<h2>${inline(b.slice(3))}</h2>` : /^[-*] /.test(b) ? `<ul>${b.split("\n").map((l) => `<li>${inline(l.slice(2))}</li>`).join("")}</ul>` : `<p>${inline(b.replace(/\n/g, " "))}</p>`)).join("\n");
const EDIR = path.join(ROOT, "content", "editor");
const editor = fs.readdirSync(EDIR).filter((f) => f.endsWith(".md")).map((f) => {
  const raw = fs.readFileSync(path.join(EDIR, f), "utf8").replace(/\r/g, "");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const fm = Object.fromEntries(m[1].split("\n").map((l) => [l.slice(0, l.indexOf(":")).trim(), l.slice(l.indexOf(":") + 1).trim()]));
  return { slug: f.replace(/\.md$/, ""), ...fm, html: md(m[2]), words: m[2].split(/\s+/).length };
}).sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));

// ---------- templates
const built = new Date();
const fmtDay = (d) => new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
const fmtTime = (d) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(d) + " UTC";
const fmtShort = (iso) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(iso));
const secName = Object.fromEntries(SECTIONS.map((s) => [s.id, s.name]));
const time = (iso) => `<time datetime="${iso}" data-rel>${fmtShort(iso)}</time>`;
const sourcesLive = [...new Set(items.map((i) => i.s))];

const story = (i, cls = "") => `<article class="st ${cls}" data-c="${i.c}" data-s="${esc(i.s)}"><div class="meta"><span class="src">${esc(i.s)}</span>${time(i.d)}</div><h3><a href="${esc(i.u)}" rel="noopener nofollow" target="_blank">${esc(i.t)}</a></h3>${i.x ? `<p>${esc(i.x)}</p>` : ""}</article>`;
const row = (i) => `<li class="row" data-c="${i.c}" data-s="${esc(i.s)}">${time(i.d)}<a href="${esc(i.u)}" rel="noopener nofollow" target="_blank">${esc(i.t)}</a><span class="src">${esc(i.s)}</span><span class="sec">${secName[i.c]}</span></li>`;
const edCard = (e, big) => `<article class="ed ${big ? "big" : ""}"><div class="meta"><span class="flag">From the editor</span><time datetime="${e.date}">${fmtDay(new Date(e.date)).replace(/^\w+ /, "")}</time></div><h3><a href="/editor/${e.slug}/">${esc(e.title)}</a></h3><p>${esc(e.summary)}</p></article>`;

const nav = (cur) => `<nav class="nav" aria-label="Sections"><a href="/"${cur === "home" ? ' aria-current="page"' : ""}>Latest</a>${SECTIONS.map((s) => `<a href="/${s.id}/"${cur === s.id ? ' aria-current="page"' : ""}>${s.name}</a>`).join("")}<a href="/editor/"${cur === "editor" ? ' aria-current="page"' : ""}>From the editor</a><a href="/pratyush-shivam/"${cur === "who" ? ' aria-current="page"' : ""}>The editor</a><a href="/about/"${cur === "about" ? ' aria-current="page"' : ""}>About</a></nav>`;
const ticker = () => { const t = items.slice(0, 14).map((i) => `<a href="${esc(i.u)}" rel="noopener nofollow" target="_blank"><b>${esc(i.s)}</b>${esc(clip(i.t, 90))}</a>`).join(""); return `<div class="tick" aria-hidden="true"><span class="live"><i></i>Live</span><div class="tape"><div class="run">${t}${t}</div></div></div>`; };

const page = ({ title, desc, url, cur, body, extraHead = "" }) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${url}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${SITE}${url}"><meta property="og:type" content="website"><meta property="og:site_name" content="The Blockchain Wire"><meta name="twitter:card" content="summary">
<link rel="alternate" type="application/rss+xml" title="The Blockchain Wire: from the editor" href="/feed.xml">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/wire.css">${extraHead}</head>
<body>
${ticker()}
<header class="mast"><div class="wrap">
<div class="date"><span>${fmtDay(built)}</span><span>Updated <time datetime="${built.toISOString()}" data-rel>${fmtTime(built)}</time></span><span>${items.length.toLocaleString("en-GB")} stories · ${sourcesLive.length} sources</span></div>
<a class="logo" href="/" aria-label="The Blockchain Wire, home"><span>The</span> <span>Blockchain</span> <span>Wire</span></a>
${nav(cur)}
</div></header>
<main class="wrap">${body}</main>
<footer class="foot"><div class="wrap"><div><b>The Blockchain Wire</b><p>Headlines are read automatically from the public feeds of the outlets named beside them. Every story links to its original. Edited by <a href="/pratyush-shivam/">Pratyush Shivam</a>.</p></div><div class="fl"><a href="/pratyush-shivam/">The editor</a><a href="/about/">About and sources</a><a href="/editor/">From the editor</a><a href="/feed.xml">RSS</a></div></div></footer>
<script src="/wire.js" defer></script>
</body></html>`;

const write = (rel, html) => { const f = path.join(DIST, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
for (const f of fs.readdirSync(path.join(ROOT, "static"))) fs.copyFileSync(path.join(ROOT, "static", f), path.join(DIST, f));

// ---------- front page
const lead = items[0], justIn = items.slice(1, 9), lead2 = items.slice(9, 11);
const used = new Set([lead.u, ...justIn.map((i) => i.u), ...lead2.map((i) => i.u)]);
const blocks = SECTIONS.filter((s) => s.id !== "industry").map((s) => { const list = items.filter((i) => i.c === s.id && !used.has(i.u)).slice(0, 4); list.forEach((i) => used.add(i.u)); return list.length < 2 ? "" : `<section class="blk rv"><header><h2><a href="/${s.id}/">${s.name}</a></h2><a class="more" href="/${s.id}/">All ${s.name.toLowerCase()} →</a></header><div class="grid4">${list.map((i) => story(i)).join("")}</div></section>`; }).join("");
const wire = items.slice(0, ON_PAGE);
const filters = `<div class="filters"><div class="tabs" role="tablist"><button class="on" data-f="">All</button>${SECTIONS.map((s) => `<button data-f="${s.id}">${s.name}</button>`).join("")}</div><input id="q" type="search" placeholder="Search headlines" aria-label="Search headlines"></div>`;
write("index.html", page({
  title: "The Blockchain Wire: every blockchain headline, as it happens",
  desc: `Today's blockchain news from ${sourcesLive.length} outlets on one page: Bitcoin, Ethereum, DeFi, regulation, enterprise and markets. Updated through the day, every story linked to its source.`,
  url: "/", cur: "home",
  body: `<section class="top rv"><div class="lead">${story(lead, "lead1")}${editor[0] ? edCard(editor[0], true) : ""}<div class="lead2">${lead2.map((i) => story(i)).join("")}</div></div><aside class="just"><h2><i></i>Just in</h2><ol>${justIn.map((i) => `<li>${time(i.d)}<a href="${esc(i.u)}" rel="noopener nofollow" target="_blank">${esc(i.t)}</a><span class="src">${esc(i.s)}</span></li>`).join("")}</ol></aside></section>
${editor.length > 1 ? `<section class="blk eds rv"><header><h2><a href="/editor/">From the editor</a></h2><a class="more" href="/editor/">All pieces →</a></header><div class="grid3">${editor.slice(0, 3).map((e) => edCard(e)).join("")}</div></section>` : ""}
${blocks}
<section class="blk wire rv" id="wire"><header><h2>The wire</h2><span class="more" id="count">${wire.length} stories</span></header>${filters}<ol class="rows" id="rows">${wire.map(row).join("")}</ol><p class="none" id="none" hidden>Nothing matches that.</p></section>`,
}));

// ---------- section pages
for (const s of SECTIONS) {
  const list = items.filter((i) => i.c === s.id).slice(0, 200);
  write(`${s.id}/index.html`, page({ title: `${s.name} news · The Blockchain Wire`, desc: `The latest ${s.name.toLowerCase()} headlines in blockchain, read from ${sourcesLive.length} outlets and linked to their sources.`, url: `/${s.id}/`, cur: s.id,
    body: `<section class="blk first"><header><h1>${s.name}</h1><span class="more">${list.length} stories</span></header><div class="grid4">${list.slice(0, 8).map((i) => story(i)).join("")}</div><ol class="rows">${list.slice(8).map(row).join("")}</ol></section>` }));
}

// ---------- editor
write("editor/index.html", page({ title: "From the editor · The Blockchain Wire", desc: "Notes and announcements written by Pratyush Shivam, who edits The Blockchain Wire.", url: "/editor/", cur: "editor",
  body: `<section class="blk first"><header><h1>From the editor</h1><span class="more">Written, not aggregated</span></header><div class="grid3">${editor.map((e) => edCard(e)).join("")}</div></section>` }));
for (const e of editor) {
  const ld = { "@context": "https://schema.org", "@type": "Article", headline: e.title, description: e.summary, datePublished: e.date, author: { "@type": "Person", name: "Pratyush Shivam", url: "https://www.pratyushshivam.com" }, publisher: { "@type": "Organization", name: "The Blockchain Wire", url: SITE }, mainEntityOfPage: `${SITE}/editor/${e.slug}/` };
  write(`editor/${e.slug}/index.html`, page({ title: `${e.title} · The Blockchain Wire`, desc: e.summary, url: `/editor/${e.slug}/`, cur: "editor", extraHead: `<script type="application/ld+json">${JSON.stringify(ld)}</script>`,
    body: `<article class="art"><div class="meta"><span class="flag">From the editor</span><time datetime="${e.date}">${fmtDay(new Date(e.date))}</time><span>${Math.max(1, Math.round(e.words / 220))} min read</span></div><h1>${esc(e.title)}</h1><p class="stand">${esc(e.summary)}</p><div class="by">By <a href="/pratyush-shivam/">Pratyush Shivam</a>, editor</div><div class="prose">${e.html}</div><a class="back" href="/editor/">← All pieces from the editor</a></article>` }));
}


// ---------- the editor
{
  const ld = { "@context": "https://schema.org", "@type": "ProfilePage", mainEntity: { "@type": "Person", name: "Pratyush Shivam", jobTitle: "Chief Technology Officer", worksFor: { "@type": "Organization", name: "Konfidio" }, url: "https://www.pratyushshivam.com", image: `${SITE}/pratyush-shivam.jpg`, sameAs: ["https://www.linkedin.com/in/pratyushshivam/", "https://github.com/pratyushshivam", "https://www.pratyushshivam.com"] } };
  write("pratyush-shivam/index.html", page({ title: "Pratyush Shivam, editor · The Blockchain Wire", desc: "Pratyush Shivam is the CTO of Konfidio, where he leads the technology behind TrustedTrucks, and the editor of The Blockchain Wire.", url: "/pratyush-shivam/", cur: "who", extraHead: `<script type="application/ld+json">${JSON.stringify(ld)}</script><meta property="og:image" content="${SITE}/pratyush-shivam.jpg">`,
    body: `<div class="who"><div class="pic"><img src="/pratyush-shivam.jpg" alt="Pratyush Shivam" width="720" height="720"><ul class="facts"><li><span>Role</span>CTO, Konfidio</li><li><span>Building</span><a href="https://www.trustedtrucks.com" rel="noopener">TrustedTrucks</a></li><li><span>Here</span>Editor</li><li><span>Site</span><a href="https://www.pratyushshivam.com" rel="noopener">pratyushshivam.com</a></li><li><span>LinkedIn</span><a href="https://www.linkedin.com/in/pratyushshivam/" rel="noopener">in/pratyushshivam</a></li><li><span>GitHub</span><a href="https://github.com/pratyushshivam" rel="noopener">pratyushshivam</a></li></ul></div>
<article class="art"><div class="meta"><span class="flag">The editor</span></div><h1>Pratyush Shivam</h1><p class="stand">Chief Technology Officer at Konfidio, where he leads the technology behind TrustedTrucks. He builds systems that let companies who do not fully trust each other work from the same record.</p><div class="prose">
<h2>What he builds</h2><p>TrustedTrucks is a permissioned blockchain network that gives European freight one shared record. A shipper, a forwarder, a carrier and a consignee work from the same shipment, from the first quote to payment, instead of each keeping a copy that drifts from the others. Pratyush led the build from architecture to production, on the web and on Android.</p>
<p>The part closest to this site is the evidence layer. Shipment documents are fingerprinted on chain, so any party can check that a file is the one that was approved, while the document itself stays private. He wrote about what that does and does not prove in <a href="/editor/what-a-document-fingerprint-proves/">this piece</a>.</p>
<h2>How he thinks about blockchain</h2><p>As infrastructure, not as a product. A ledger is useful when several independent companies need to rely on the same facts and none of them should own those facts. Where one company can simply keep a database, it should.</p>
<h2>Outside work</h2><p>He builds small, open source things that run in a browser tab: a game about the speed of light, the universe at true scale, a language model you can watch choose its next word. They are collected in <a href="/editor/five-things-that-run-in-a-browser-tab/">Five things I built that run in a browser tab</a>.</p>
<h2>Why he runs this wire</h2><p>To have one page for the day's blockchain news. The wire is automatic; nobody picks or ranks the stories. Anything he writes here is marked <strong>From the editor</strong>.</p>
<h2>His pieces</h2><ul>${editor.map((e) => `<li><a href="/editor/${e.slug}/">${esc(e.title)}</a></li>`).join("")}</ul>
</div></article></div>` }));
}

// ---------- about
write("about/index.html", page({ title: "About and sources · The Blockchain Wire", desc: "How The Blockchain Wire works, which outlets it reads, and who edits it.", url: "/about/", cur: "about",
  body: `<article class="art"><div class="meta"><span class="flag">About</span></div><h1>One page for the day's blockchain news.</h1><p class="stand">The wire reads the public feeds of the outlets below every couple of hours and lists what they published: headline, source, time and a one-line summary. Every story links to the original.</p><div class="prose">
<h2>How it works</h2><p>Nothing here is picked, ranked or rewritten by hand. Stories are sorted by the time their publisher gave them and filed into sections by keyword rules, so a story will sometimes sit in the wrong one. The full text is never copied; you read it where it was reported.</p>
<h2>Who edits it</h2><p>The Blockchain Wire is edited by <a href="/pratyush-shivam/">Pratyush Shivam</a>, CTO of Konfidio, who builds blockchain infrastructure. Pieces marked <strong>From the editor</strong> are written by him and are always labelled. There are no adverts, no trackers and no sponsored stories.</p>
<h2>Sources</h2><ul class="srcs">${SOURCES.map((s) => `<li><a href="${s.site}" rel="noopener">${esc(s.name)}</a><span>${items.filter((i) => i.s === s.name).length} stories in the archive</span></li>`).join("")}</ul>
<h2>For publishers</h2><p>If you run one of these outlets and would rather not be listed, or you run one that should be, write to the editor through <a href="https://www.pratyushshivam.com" rel="noopener">pratyushshivam.com</a> and it will be changed.</p></div></article>` }));

// ---------- feeds, sitemap, robots
const rss = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>The Blockchain Wire: from the editor</title><link>${SITE}/editor/</link><description>Pieces written by the editor of The Blockchain Wire.</description>${editor.map((e) => `<item><title>${esc(e.title)}</title><link>${SITE}/editor/${e.slug}/</link><guid>${SITE}/editor/${e.slug}/</guid><pubDate>${new Date(e.date).toUTCString()}</pubDate><description>${esc(e.summary)}</description></item>`).join("")}</channel></rss>`;
write("feed.xml", rss);
const urls = ["/", ...SECTIONS.map((s) => `/${s.id}/`), "/editor/", ...editor.map((e) => `/editor/${e.slug}/`), "/pratyush-shivam/", "/about/"];
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${SITE}${u}</loc><lastmod>${built.toISOString().slice(0, 10)}</lastmod></url>`).join("")}</urlset>`);
write("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
write("404.html", page({ title: "Not found · The Blockchain Wire", desc: "That page is not on the wire.", url: "/404", cur: "", body: `<article class="art"><h1>That page is not on the wire.</h1><p class="stand"><a href="/">Back to the latest headlines →</a></p></article>` }));
console.log(`Built ${urls.length} pages, ${items.length} stories, ${sourcesLive.length} live sources, ${editor.length} editor pieces.`);
