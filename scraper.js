import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Configuration ─────────────────────────────────────────────────────────────

const RSS_FEEDS = {
  'VIRAL': {
    'Vogue US':          'https://www.vogue.com/feed/rss',
    'Vogue UK':          'https://www.vogue.co.uk/feed/rss',
    'Elle':              'https://www.elle.com/rss/all.xml',
    "Harper's Bazaar":   'https://www.harpersbazaar.com/rss/all.xml',
    'WWD':               'https://wwd.com/feed/',
    'Who What Wear':     'https://www.whowhatwear.com/rss',
    'PopSugar Fashion':  'https://www.popsugar.com/fashion/feed',
  },
  'STREETWEAR': {
    'Hypebeast':         'https://hypebeast.com/feed',
    'Highsnobiety':      'https://www.highsnobiety.com/feed/',
    'Dazed':             'https://www.dazeddigital.com/rss',
    'Sleek Magazine':    'https://www.sleek-mag.com/feed',
  },
  'GOTH': {
    'Gothic Beauty':     'https://www.gothicbeauty.com/feed',
    'La Carmina':        'https://lacarmina.com/blog/feed',
    'Fashionista Dark':  'https://fashionista.com/feed',
  },
  'Y2K': {
    'Y2K Zone':          'https://y2kzone.com/blogs/y2k.atom',
    'Y2K Fusion':        'https://y2kfusion.com/blogs/y2k-blog.atom',
    'Teen Vogue':        'https://www.teenvogue.com/feed/rss',
    'Refinery29':        'https://www.refinery29.com/rss.xml',
  },
  'KAWAII': {
    'Tokyo Fashion':     'https://tokyofashion.com/feed/',
    'Tokyo Otaku Mode':  'https://otakumode.com/rss/pickup',
    'Japan Info':        'https://japaninfo.jp/feed',
  },
  'COQUETTE': {
    'Glamour':           'https://www.glamour.com/feed/rss',
    'Cosmopolitan':      'https://www.cosmopolitan.com/rss/all.xml',
    'Marie Claire':      'https://www.marieclaire.com/rss/all.xml',
  },
  'OLD MONEY': {
    'Esquire':           'https://www.esquire.com/rss/all.xml',
    'GQ':                'https://www.gq.com/feed/rss',
    'Business of Fashion': 'https://www.businessoffashion.com/feed',
    'The Guardian Fashion': 'https://www.theguardian.com/fashion/rss',
  },
  'TECHWEAR': {
    'WIRED':             'https://www.wired.com/feed/rss',
    'Dezeen':            'https://www.dezeen.com/feed/',
    'Highsnobiety':      'https://www.highsnobiety.com/feed/',
  },
  'COTTAGECORE': {
    'The Cottagecore Life': 'https://thecottagecorelife.com/feed',
    'Wit & Delight':     'https://witanddelight.com/feed/',
    'My Cottagecore':    'https://mycottagecore.com/feed',
  },
  'VINTAGE': {
    'Vintage Dancer':    'https://vintagedancer.com/feed/',
    'The Vintage News':  'https://www.thevintagenews.com/feed/',
    'Racked Vintage':    'https://www.refinery29.com/rss.xml',
  },
  'PUNK GRUNGE': {
    'NME':               'https://www.nme.com/feed',
    'Alternative Press': 'https://www.altpress.com/feed/',
    'Dazed':             'https://www.dazeddigital.com/rss',
  },
  'E-GIRL': {
    'Teen Vogue':        'https://www.teenvogue.com/feed/rss',
    'Nylon':             'https://nylon.com/feed',
    'Highsnobiety':      'https://www.highsnobiety.com/feed/',
  },
  'JEWELRY': {
    'The Jewellery Editor': 'https://thejewelleryeditor.com/feed/',
    'Robb Report':       'https://robbreport.com/feed/',
    'Who What Wear':     'https://www.whowhatwear.com/rss',
  },
  'BAGS': {
    'PurseBlog':         'https://www.purseblog.com/feed/',
    'Spotted Fashion':   'https://www.spottedfashion.com/feed/',
    'Harper\'s Bazaar':  'https://www.harpersbazaar.com/rss/all.xml',
  },
  'WATCHES': {
    'Hodinkee':          'https://www.hodinkee.com/articles.rss',
    'Monochrome Watches':'https://monochrome-watches.com/feed/',
    'A Blog To Watch':   'https://www.ablogtowatch.com/feed/',
    'Robb Report':       'https://robbreport.com/feed/',
  },
  'SNEAKERS': {
    'Sneaker News':      'https://sneakernews.com/feed/',
    'Nice Kicks':        'https://www.nicekicks.com/feed/',
    'SneakerFiles':      'https://www.sneakerfiles.com/feed/',
    'Hypebeast':         'https://hypebeast.com/feed',
  },
  'ACCESSORIES': {
    'Camille Styles':    'https://camillestyles.com/feed/',
    'Classy Yet Trendy': 'https://www.classyyettrendy.com/feed/',
    'Glamour':           'https://www.glamour.com/feed/rss',
  },
};

const BRANDS = [
  // Luxury fashion
  'Balenciaga', 'Rick Owens', 'Maison Margiela', 'Prada', 'Miu Miu',
  'Loewe', 'Jacquemus', 'Bottega Veneta', 'Saint Laurent', 'YSL',
  'Dior', 'Chanel', 'Louis Vuitton', 'Alexander McQueen', 'Valentino',
  'Acne Studios', 'Off-White', 'Vetements', 'Raf Simons', 'Fear of God',
  'Diesel', 'Gucci', 'Versace', 'Fendi', 'Burberry', 'Givenchy',
  'Celine', 'The Row', 'Jil Sander', 'Issey Miyake', 'Comme des Garcons',
  'Vivienne Westwood', 'Stella McCartney', 'Coperni', 'Marine Serre',
  'Amiri', 'Casablanca', 'Palm Angels', 'Stone Island', 'Moncler',
  // Streetwear
  'Supreme', 'Palace', 'Stussy', 'Carhartt', 'A Bathing Ape', 'BAPE',
  'Noah NYC', 'Aimé Leon Dore', 'Kith', 'Anti Social Social Club',
  // Sneakers
  'Nike', 'Adidas', 'Jordan', 'New Balance', 'Converse', 'Vans',
  'Asics', 'Salomon', 'On Running', 'Hoka', 'Puma', 'Reebok',
  // Bags & Accessories
  'Hermès', 'Coach', 'Kate Spade', 'Michael Kors', 'Tory Burch',
  'Mansur Gavriel', 'Polène', 'Jacquemus', 'By Far',
  // Watches & Jewelry
  'Rolex', 'Omega', 'Patek Philippe', 'Audemars Piguet', 'Cartier',
  'IWC', 'TAG Heuer', 'Breitling', 'Tiffany', 'Pandora', 'Van Cleef',
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getImage(item) {
  const media = item['media:content'] || item['media:thumbnail'];
  if (media) {
    if (typeof media === 'string') return media;
    if (media.$ && media.$.url) return media.$.url;
    if (Array.isArray(media) && media[0]?.$?.url) return media[0].$.url;
  }
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image')) {
    return item.enclosure.url;
  }
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

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Scraping ──────────────────────────────────────────────────────────────────

async function scrape() {
  const parser = new Parser({
    timeout: 8000,
    customFields: {
      item: [
        ['media:content', 'media:content'],
        ['media:thumbnail', 'media:thumbnail'],
        ['content:encoded', 'content:encoded'],
      ],
    },
  });

  const articles = [];

  for (const [category, feeds] of Object.entries(RSS_FEEDS)) {
    console.log(`\n[${category}]`);
    for (const [source, feedUrl] of Object.entries(feeds)) {
      process.stdout.write(`  → ${source} ... `);
      try {
        const feed = await parser.parseURL(feedUrl);
        let count = 0;

        for (const item of feed.items.slice(0, 20)) {
          const title = item.title?.trim() ?? '';
          const link  = item.link ?? '';
          const desc  = stripHtml(item.content || item.contentSnippet || item.summary || '').slice(0, 280);
          const image = getImage(item);
          const brands = findBrands(title + ' ' + desc);

          articles.push({ category, source, title, desc, link, image, brands });
          count++;
        }
        console.log(`${count} articles`);
      } catch (e) {
        console.log(`✗ ${e.message}`);
      }
    }
  }

  // Within each category: brand articles first, then articles with images
  articles.sort((a, b) => {
    if (a.category !== b.category) return 0;
    const aScore = (a.brands.length ? 0 : 2) + (a.image ? 0 : 1);
    const bScore = (b.brands.length ? 0 : 2) + (b.image ? 0 : 1);
    return aScore - bScore;
  });

  return articles;
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
.filter-bar { padding: 14px 32px; display: flex; gap: 8px; overflow-x: auto; border-bottom: 1px solid #1c1c1c; scrollbar-width: none; flex-wrap: wrap; row-gap: 8px; }
.filter-bar::-webkit-scrollbar { display: none; }
.filter-btn { white-space: nowrap; padding: 6px 16px; border-radius: 20px; border: 1px solid #2a2a2a; background: transparent; color: var(--muted); font-size: .75rem; cursor: pointer; transition: all .18s; letter-spacing: .05em; font-family: inherit; }
.filter-btn:hover { border-color: var(--accent); color: var(--accent); }
.filter-btn.active { background: var(--accent); color: #000; border-color: var(--accent); font-weight: 700; }
.stats { padding: 16px 32px 8px; color: var(--muted); font-size: .75rem; letter-spacing: .05em; }
.stats strong { color: var(--accent); }
.section { padding: 0 32px 48px; }
.section-header { display: flex; align-items: center; gap: 14px; padding: 28px 0 18px; }
.section-title { font-size: .72rem; font-weight: 900; letter-spacing: .22em; text-transform: uppercase; color: var(--accent); }
.section-line { flex: 1; height: 1px; background: #1e1e1e; }
.section-count { font-size: .68rem; color: var(--muted); letter-spacing: .06em; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 18px; }
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

const CATEGORY_EMOJI = {
  'VIRAL':        '🔥',
  'STREETWEAR':   '🏙️',
  'GOTH':         '🖤',
  'Y2K':          '💿',
  'KAWAII':       '🌸',
  'COQUETTE':     '🎀',
  'OLD MONEY':    '🤍',
  'TECHWEAR':     '🤖',
  'COTTAGECORE':  '🌿',
  'VINTAGE':      '👗',
  'PUNK GRUNGE':  '🎸',
  'E-GIRL':       '👾',
  'JEWELRY':      '💍',
  'BAGS':         '👜',
  'WATCHES':      '⌚',
  'SNEAKERS':     '👟',
  'ACCESSORIES':  '🕶️',
};

function generateHtml(articles, dateStr, allDays, passwordHash) {
  const categoryOrder = Object.keys(RSS_FEEDS);
  const grouped = {};
  for (const cat of categoryOrder) grouped[cat] = [];
  for (const a of articles) {
    if (grouped[a.category]) grouped[a.category].push(a);
  }

  const sections = categoryOrder.map(cat => {
    const catArticles = grouped[cat];
    if (!catArticles.length) return '';
    const emoji = CATEGORY_EMOJI[cat] || '';
    const cards = catArticles.map(cardHtml).join('\n');
    return `<section class="section" data-category="${cat}">
  <div class="section-header">
    <span class="section-title">${emoji} ${cat}</span>
    <div class="section-line"></div>
    <span class="section-count">${catArticles.length} articles</span>
  </div>
  <div class="grid">
${cards}
  </div>
</section>`;
  }).join('\n');

  const brandCount = articles.filter(a => a.brands.length).length;

  const dayLinks = allDays.map(d =>
    `<a class="day-link ${d === dateStr ? 'active' : ''}" href="${d}.html">${d}</a>`
  ).join('\n');

  // Filter buttons — ALL + one per category
  const filterButtons = [
    `<button class="filter-btn active" data-cat="ALL">ALL</button>`,
    ...categoryOrder.map(cat => {
      const emoji = CATEGORY_EMOJI[cat] || '';
      return `<button class="filter-btn" data-cat="${cat}">${emoji} ${cat}</button>`;
    }),
  ].join('\n    ');

  const authScript = passwordHash ? `
<style>
#auth-overlay {
  position:fixed; inset:0; background:#080808; z-index:9999;
  display:flex; align-items:center; justify-content:center;
}
.auth-box {
  background:#111; border:1px solid #2a2a2a; border-radius:14px;
  padding:40px 48px; text-align:center; width:320px;
}
.auth-box h1 { font-size:1.2rem; letter-spacing:.2em; text-transform:uppercase; color:#c9a84c; margin-bottom:8px; }
.auth-box p  { color:#555; font-size:.8rem; margin-bottom:28px; }
.auth-box input {
  width:100%; padding:12px 16px; background:#1a1a1a; border:1px solid #2a2a2a;
  border-radius:8px; color:#f0f0f0; font-size:1rem; outline:none;
  margin-bottom:14px; text-align:center; letter-spacing:.1em;
}
.auth-box input:focus { border-color:#c9a84c; }
.auth-box button {
  width:100%; padding:12px; background:#c9a84c; color:#000;
  border:none; border-radius:8px; font-weight:800; font-size:.9rem;
  cursor:pointer; letter-spacing:.08em;
}
.auth-error { color:#e05; font-size:.8rem; margin-top:10px; min-height:18px; }
</style>
<div id="auth-overlay">
  <div class="auth-box">
    <h1>Fashion Daily</h1>
    <p>Enter password to continue</p>
    <input type="password" id="pw-input" placeholder="••••••••" onkeydown="if(event.key==='Enter')checkPw()">
    <button onclick="checkPw()">Enter</button>
    <div class="auth-error" id="pw-error"></div>
  </div>
</div>
<script>
(function() {
  const HASH = '${passwordHash}';
  const KEY  = 'fd_auth';
  if (localStorage.getItem(KEY) === HASH) {
    document.getElementById('auth-overlay').remove();
  }
  async function sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }
  window.checkPw = async function() {
    const val = document.getElementById('pw-input').value;
    const h   = await sha256(val);
    if (h === HASH) {
      localStorage.setItem(KEY, HASH);
      document.getElementById('auth-overlay').remove();
    } else {
      document.getElementById('pw-error').textContent = 'Wrong password';
      document.getElementById('pw-input').value = '';
    }
  };
})();
</script>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Fashion Daily — ${dateStr}</title>
  <style>${CSS}</style>
</head>
<body>
${authScript}

<header>
  <div class="logo">Fashion Daily</div>
  <div class="date-badge">${dateStr}</div>
</header>

<nav class="day-nav">
${dayLinks}
</nav>

<div class="filter-bar">
    ${filterButtons}
</div>

<div class="stats">
  <strong>${articles.length}</strong> articles today &nbsp;·&nbsp;
  <strong>${brandCount}</strong> with brand mentions
</div>

<main>
${sections}
</main>

<script>
(function () {
  const btns = document.querySelectorAll('.filter-btn');
  const sections = document.querySelectorAll('section.section');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.cat;
      sections.forEach(s => {
        s.style.display = (cat === 'ALL' || s.dataset.category === cat) ? '' : 'none';
      });
    });
  });
})();
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

  const sitePassword = process.env.SITE_PASSWORD || '';
  const passwordHash = sitePassword
    ? createHash('sha256').update(sitePassword).digest('hex')
    : '';

  const html = generateHtml(articles, today, allDays, passwordHash);

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

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
