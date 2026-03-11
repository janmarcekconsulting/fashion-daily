import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Configuration ─────────────────────────────────────────────────────────────

const RSS_FEEDS = {
  'Vogue US':        'https://www.vogue.com/feed/rss',
  'Vogue UK':        'https://www.vogue.co.uk/feed/rss',
  'Elle':            'https://www.elle.com/rss/all.xml',
  "Harper's Bazaar": 'https://www.harpersbazaar.com/rss/all.xml',
  'WWD':             'https://wwd.com/feed/',
  'Who What Wear':   'https://www.whowhatwear.com/rss',
  'Dazed':           'https://www.dazeddigital.com/rss',
  'Refinery29':      'https://www.refinery29.com/rss.xml',
};

const BRANDS = [
  'Balenciaga', 'Rick Owens', 'Maison Margiela', 'Prada', 'Miu Miu',
  'Loewe', 'Jacquemus', 'Bottega Veneta', 'Saint Laurent', 'YSL',
  'Dior', 'Chanel', 'Louis Vuitton', 'Alexander McQueen', 'Valentino',
  'Acne Studios', 'Off-White', 'Vetements', 'Raf Simons', 'Fear of God',
  'Diesel', 'Gucci', 'Versace', 'Fendi', 'Burberry', 'Givenchy',
  'Celine', 'The Row', 'Jil Sander', 'Issey Miyake', 'Comme des Garcons',
  'Vivienne Westwood', 'Stella McCartney', 'Coperni', 'Marine Serre',
  'Amiri', 'Casablanca', 'Palm Angels', 'Stone Island', 'Moncler',
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getImage(item) {
  // media:content or media:thumbnail
  const media = item['media:content'] || item['media:thumbnail'];
  if (media) {
    if (typeof media === 'string') return media;
    if (media.$ && media.$.url) return media.$.url;
    if (Array.isArray(media) && media[0]?.$?.url) return media[0].$.url;
  }
  // enclosure
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image')) {
    return item.enclosure.url;
  }
  // parse image from content or summary HTML
  const html = item['content:encoded'] || item.content || item.summary || '';
  if (html) {
    const $ = cheerio.load(html);
    const src = $('img').first().attr('src');
    if (src) return src;
  }
  return '';
}

function findBrands(text) {
  const lower = text.toLowerCase();
  return BRANDS.filter(b => lower.includes(b.toLowerCase()));
}

function stripHtml(html = '') {
  const $ = cheerio.load(html);
  return $.text().trim();
}

async function fetchBody(url) {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
    const html = await res.text();
    const $ = cheerio.load(html);
    return $('p').slice(0, 25).map((_, el) => $(el).text()).get().join(' ').slice(0, 3000);
  } catch {
    return '';
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Scraping ──────────────────────────────────────────────────────────────────

async function scrape() {
  const parser = new Parser({
    customFields: {
      item: [
        ['media:content', 'media:content'],
        ['media:thumbnail', 'media:thumbnail'],
        ['content:encoded', 'content:encoded'],
      ],
    },
  });

  const articles = [];

  for (const [source, feedUrl] of Object.entries(RSS_FEEDS)) {
    process.stdout.write(`  → ${source} ... `);
    try {
      const feed = await parser.parseURL(feedUrl);
      let count = 0;

      for (const item of feed.items.slice(0, 20)) {
        const title = item.title?.trim() ?? '';
        const link  = item.link ?? '';
        const desc  = stripHtml(item.content || item.contentSnippet || item.summary || '').slice(0, 280);
        const image = getImage(item);

        // Brand check on title + RSS description only (fast, no extra requests)
        const brands = findBrands(title + ' ' + desc);

        articles.push({ source, title, desc, link, image, brands });
        count++;
      }
      console.log(`${count} articles`);
    } catch (e) {
      console.log(`✗ ${e.message}`);
    }
  }

  // Brand articles first, then articles with images
  articles.sort((a, b) => {
    const aScore = (a.brands.length ? 0 : 2) + (a.image ? 0 : 1);
    const bScore = (b.brands.length ? 0 : 2) + (b.image ? 0 : 1);
    return aScore - bScore;
  });

  return articles;
}

// ─── TikTok Prompt ─────────────────────────────────────────────────────────────

function buildTikTokPrompt(articles, dateStr) {
  const brandCounts = {};
  const headlines = [];

  for (const a of articles.slice(0, 40)) {
    for (const b of a.brands) brandCounts[b] = (brandCounts[b] ?? 0) + 1;
    if (headlines.length < 4) headlines.push(a.title);
  }

  const topBrands = Object.entries(brandCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([b]) => b)
    .join(', ') || 'major fashion houses';

  const headlinesStr = headlines.map(h => `- ${h}`).join('\n');

  return `You are a TikTok fashion creator writing a short video script.

Today's date: ${dateStr}
Today's top mentioned brands: ${topBrands}
Today's biggest fashion headlines:
${headlinesStr}

Write a 30-second TikTok script (about 80 words):
- Hook in the FIRST 3 SECONDS (surprising or provocative)
- Mention 2-3 visual outfit/trend ideas viewers can recreate
- End with a question or CTA to boost comments
- Casual Gen-Z tone, fast-paced, no filler words`;
}

// ─── HTML ──────────────────────────────────────────────────────────────────────

const CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #080808; --surface: #111; --surface2: #1a1a1a;
  --accent: #c9a84c; --text: #f0f0f0; --muted: #777; --radius: 12px;
}
body { background: var(--bg); color: var(--text); font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; min-height: 100vh; }
header { padding: 24px 32px 20px; border-bottom: 1px solid #1c1c1c; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.logo { font-size: 1.5rem; font-weight: 900; letter-spacing: .18em; text-transform: uppercase; color: var(--accent); }
.date-badge { font-size: .8rem; color: var(--muted); letter-spacing: .08em; }
.day-nav { padding: 14px 32px; display: flex; gap: 8px; overflow-x: auto; border-bottom: 1px solid #1c1c1c; scrollbar-width: none; }
.day-nav::-webkit-scrollbar { display: none; }
.day-link { white-space: nowrap; padding: 5px 14px; border-radius: 20px; border: 1px solid #2a2a2a; color: var(--muted); text-decoration: none; font-size: .75rem; transition: all .18s; }
.day-link:hover, .day-link.active { background: var(--accent); color: #000; border-color: var(--accent); font-weight: 700; }
.tiktok-box { margin: 28px 32px 12px; background: var(--surface); border: 1px solid #222; border-left: 3px solid var(--accent); border-radius: var(--radius); padding: 20px 24px; }
.tiktok-box h2 { font-size: .7rem; letter-spacing: .18em; text-transform: uppercase; color: var(--accent); margin-bottom: 14px; }
.prompt-text { font-size: .82rem; color: #bbb; line-height: 1.65; white-space: pre-wrap; font-family: 'Courier New', monospace; background: var(--surface2); padding: 14px 16px; border-radius: 8px; margin-bottom: 14px; max-height: 200px; overflow-y: auto; }
.copy-btn { background: var(--accent); color: #000; border: none; padding: 10px 22px; border-radius: 6px; font-weight: 800; font-size: .8rem; cursor: pointer; letter-spacing: .06em; transition: opacity .2s; }
.copy-btn:hover { opacity: .82; }
.stats { padding: 10px 32px 20px; color: var(--muted); font-size: .75rem; letter-spacing: .05em; }
.stats strong { color: var(--accent); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 18px; padding: 0 32px 64px; }
.card { background: var(--surface); border-radius: var(--radius); overflow: hidden; text-decoration: none; color: var(--text); border: 1px solid #1a1a1a; transition: transform .2s, border-color .2s; display: flex; flex-direction: column; }
.card:hover { transform: translateY(-4px); border-color: #2e2e2e; }
.card-img { width: 100%; aspect-ratio: 16/9; overflow: hidden; background: #141414; }
.card-img img { width: 100%; height: 100%; object-fit: cover; transition: transform .35s; }
.card:hover .card-img img { transform: scale(1.05); }
.no-img { width: 100%; aspect-ratio: 16/9; background: linear-gradient(135deg,#1a1a1a,#111); display: flex; align-items: center; justify-content: center; color: #2a2a2a; font-size: 2rem; }
.card-body { padding: 15px 16px 18px; display: flex; flex-direction: column; gap: 7px; flex: 1; }
.source { font-size: .65rem; text-transform: uppercase; letter-spacing: .14em; color: var(--accent); font-weight: 700; }
.brand-tags { display: flex; flex-wrap: wrap; gap: 5px; }
.brand-tag { font-size: .62rem; padding: 2px 9px; background: #1e1c10; border: 1px solid #3a3010; border-radius: 20px; color: var(--accent); }
.card-body h3 { font-size: .9rem; font-weight: 600; line-height: 1.4; }
.card-body p { font-size: .78rem; color: var(--muted); line-height: 1.55; flex: 1; }
`;

function cardHtml(a) {
  const brandTags = a.brands.length
    ? `<div class="brand-tags">${a.brands.map(b => `<span class="brand-tag">${b}</span>`).join('')}</div>`
    : '';

  const imgBlock = a.image
    ? `<div class="card-img"><img src="${a.image}" alt="" loading="lazy" onerror="this.parentElement.innerHTML='<div class=no-img>◆</div>'"></div>`
    : `<div class="no-img">◆</div>`;

  return `<a class="card" href="${a.link}" target="_blank" rel="noopener">
  ${imgBlock}
  <div class="card-body">
    <span class="source">${a.source}</span>
    ${brandTags}
    <h3>${a.title}</h3>
    <p>${a.desc}</p>
  </div>
</a>`;
}

function generateHtml(articles, dateStr, allDays, prompt) {
  const cards = articles.map(cardHtml).join('\n');
  const brandCount = articles.filter(a => a.brands.length).length;

  const dayLinks = allDays.map(d =>
    `<a class="day-link ${d === dateStr ? 'active' : ''}" href="${d}.html">${d}</a>`
  ).join('\n');

  const promptSafe = prompt.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Fashion Daily — ${dateStr}</title>
  <style>${CSS}</style>
</head>
<body>

<header>
  <div class="logo">Fashion Daily</div>
  <div class="date-badge">${dateStr}</div>
</header>

<nav class="day-nav">
${dayLinks}
</nav>

<div class="tiktok-box">
  <h2>🎬 TikTok Script Prompt — paste into ChatGPT</h2>
  <div class="prompt-text" id="prompt">${promptSafe}</div>
  <button class="copy-btn" onclick="copyPrompt()">📋 Copy Prompt</button>
</div>

<div class="stats">
  <strong>${articles.length}</strong> articles today &nbsp;·&nbsp;
  <strong>${brandCount}</strong> with brand mentions
</div>

<main class="grid">
${cards}
</main>

<script>
function copyPrompt() {
  const text = document.getElementById('prompt').innerText;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector('.copy-btn');
    btn.textContent = '✓ Copied!';
    setTimeout(() => btn.textContent = '📋 Copy Prompt', 2200);
  });
}
</script>
</body>
</html>`;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  console.log(`Fashion Daily Scraper — ${today}`);
  console.log('Fetching RSS feeds...');

  const articles = await scrape();

  const daysDir   = path.join(__dirname, 'days');
  const indexPath = path.join(daysDir, 'index.json');

  fs.mkdirSync(daysDir, { recursive: true });

  let allDays = fs.existsSync(indexPath)
    ? JSON.parse(fs.readFileSync(indexPath, 'utf8'))
    : [];

  if (!allDays.includes(today)) allDays.unshift(today);
  allDays = [...new Set(allDays)].sort((a, b) => b.localeCompare(a));
  fs.writeFileSync(indexPath, JSON.stringify(allDays, null, 2));

  const prompt = buildTikTokPrompt(articles, today);
  const html   = generateHtml(articles, today, allDays, prompt);

  fs.writeFileSync(path.join(daysDir, `${today}.html`), html, 'utf8');
  console.log(`✓  days/${today}.html  (${articles.length} articles)`);

  const indexHtml = `<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url=days/${today}.html">
  <title>Fashion Daily</title>
</head><body>
  <p>Redirecting to <a href="days/${today}.html">today's issue (${today})</a>…</p>
</body></html>`;

  fs.writeFileSync(path.join(__dirname, 'index.html'), indexHtml, 'utf8');
  console.log('✓  index.html updated');
  console.log(`\nDone. Archive: ${allDays.length} day(s)`);
}

main().catch(err => { console.error(err); process.exit(1); });
