#!/usr/bin/env node
/**
 * Mappy AI Blog — Static build script
 *
 * Reads markdown posts from blog/posts/, generates:
 *   - blog/index.html        (listing page)
 *   - blog/{slug}/index.html (each post)
 *   - blog/feed.xml          (RSS feed)
 *
 * Usage: node blog/build.js
 */

const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { marked } = require("marked");

const SITE_URL = "https://mappy-ai.com";
const SITE_NAME = "Mappy AI";
const BLOG_TITLE = "Mappy AI Blog";
const BLOG_DESC =
  "Guides, workflows, and ideas for turning source material into visual understanding.";

const ROOT = path.resolve(__dirname, "..");
const POSTS_DIR = path.join(__dirname, "posts");
const BLOG_DIR = __dirname;
const COMPARE_POSTS_DIR = path.join(ROOT, "compare", "posts");
const COMPARE_DIR = path.join(ROOT, "compare");

// Helpers
function escapeXml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDate(d) {
  const date = new Date(d);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function isoDate(d) {
  return new Date(d).toISOString();
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function estimateReadTime(content) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

function extractHeadings(markdown) {
  const seen = new Map();
  return markdown
    .split("\n")
    .map((line) => line.match(/^(##|###)\s+(.+)$/))
    .filter(Boolean)
    .map(([, hashes, title]) => {
      const base = slugify(title.trim());
      const count = seen.get(base) || 0;
      seen.set(base, count + 1);
      const id = count === 0 ? base : `${base}-${count + 1}`;
      return { depth: hashes.length, title: title.trim(), id };
    });
}

function addHeadingAnchors(html, headings) {
  let headingIndex = 0;

  return html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (match, rawDepth, innerHtml) => {
    const depth = Number(rawDepth);
    const heading = headings[headingIndex];

    if (!heading || heading.depth !== depth) {
      return match;
    }

    headingIndex += 1;
    return `<h${depth} id="${heading.id}">${innerHtml}<a class="article-anchor" href="#${heading.id}" aria-label="Link to this section">#</a></h${depth}>`;
  });
}

function renderTagChips(tags = [], className = "blog-tag") {
  return tags
    .map((tag) => `<span class="${className}">${escapeXml(tag)}</span>`)
    .join("");
}

// Post-process: wrap FAQ section in semantic markup
function postProcessFaq(html) {
  const faqHeading = "<h2>FAQ</h2>";
  const idx = html.indexOf(faqHeading);
  if (idx === -1) return html;

  const before = html.slice(0, idx);
  const after = html.slice(idx + faqHeading.length);

  // FAQ ends at next <h2>, <hr>, or end of content
  const endMatch = after.match(/<h2>|<hr>/);
  const faqContent = endMatch ? after.slice(0, endMatch.index) : after;
  const rest = endMatch ? after.slice(endMatch.index) : "";

  // Parse Q/A pairs: <p><strong>Q</strong>\nA</p>
  const items = [];
  const itemRegex = /<p><strong>([\s\S]*?)<\/strong>\s*([\s\S]*?)<\/p>/g;
  let m;
  while ((m = itemRegex.exec(faqContent)) !== null) {
    items.push({ q: m[1], a: m[2].trim() });
  }

  if (items.length === 0) return html;

  const faqHtml = items
    .map(
      (item) =>
        `<div class="faq-item"><p class="faq-q">${item.q}</p><p class="faq-a">${item.a}</p></div>`
    )
    .join("\n");

  return `${before}<div class="faq"><h2>FAQ</h2>\n${faqHtml}</div>\n${rest}`;
}

// Read all posts
function loadPosts() {
  const files = fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .reverse();

  return files.map((file) => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf8");
    const { data, content } = matter(raw);
    const headings = extractHeadings(content);
    const html = addHeadingAnchors(postProcessFaq(marked.parse(content)), headings);

    return {
      ...data,
      author: data.author || "Mappy AI Team",
      content: html,
      file,
      headings,
      readTime: estimateReadTime(content),
      tags: Array.isArray(data.tags) ? data.tags : [],
      toc: headings.filter((heading) => heading.depth === 2),
    };
  });
}

// Shared HTML fragments
function headHtml({ title, description, url, isArticle, extraHead }) {
  const ogType = isArticle ? "article" : "website";
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeXml(title)}</title>
    <meta name="description" content="${escapeXml(description)}" />
    <link rel="canonical" href="${escapeXml(url)}" />
    <meta property="og:type" content="${ogType}" />
    <meta property="og:title" content="${escapeXml(title)}" />
    <meta property="og:description" content="${escapeXml(description)}" />
    <meta property="og:url" content="${escapeXml(url)}" />
    <meta property="og:image" content="${SITE_URL}/assets/mindmap_builder.svg" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeXml(title)}" />
    <meta name="twitter:description" content="${escapeXml(description)}" />
    <meta name="twitter:image" content="${SITE_URL}/assets/mindmap_builder.svg" />
    <link rel="icon" type="image/svg+xml" href="/assets/mindmap_builder.svg" />
    <link rel="icon" type="image/png" sizes="48x48" href="/assets/favicon_48x48.png" />
    <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon_32x32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/assets/favicon_16x16.png" />
    <link rel="manifest" href="/site.webmanifest" />
    <link rel="alternate" type="application/rss+xml" title="${BLOG_TITLE}" href="${SITE_URL}/blog/feed.xml" />
    <link rel="stylesheet" href="/styles.css" />
    <link rel="stylesheet" href="/blog/blog.css" />
    <script defer src="https://metrics.mappy-ai.com/script.js" data-website-id="82477cf9-ac03-4d35-9e62-6d16cd0c3d6b"></script>${extraHead ? "\n    " + extraHead : ""}
  </head>`;
}

function navHtml() {
  return `
    <header class="nav">
      <a class="brand" href="/">
        <img src="/assets/mindmap_builder.svg" alt="Mappy AI logo" />
        <span>Mappy AI</span>
      </a>
      <button
        class="nav-toggle"
        type="button"
        aria-expanded="false"
        aria-controls="navMenu"
        aria-label="Open menu"
        data-label-open="Open menu"
        data-label-close="Close menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
      <div class="nav-menu" id="navMenu">
        <nav class="nav-links">
          <a href="/">Home</a>
          <a href="/blog/">Blog</a>
          <a href="/#features">Features</a>
          <a href="/#pricing">Pricing</a>
        </nav>
        <div class="nav-cta">
          <a class="ghost" href="https://app.mappy-ai.com/login.html">Sign in</a>
          <a class="btn primary" href="/#pricing">Try Mappy AI free</a>
        </div>
      </div>
    </header>`;
}

function footerHtml() {
  return `
    <footer class="footer">
      <a class="footer-brand" href="/">
        <img src="/assets/mindmap_builder.svg" alt="Mappy AI logo" />
        <span>Mappy AI</span>
      </a>
      <div class="footer-links">
        <div class="footer-col">
          <span class="footer-title">Product</span>
          <a href="/">Home</a>
          <a href="/#features">Features</a>
          <a href="/#pricing">Pricing</a>
          <a href="/schools/">For Schools</a>
        </div>
        <div class="footer-col">
          <span class="footer-title">Resources</span>
          <a href="/blog/">Blog</a>
        </div>
        <div class="footer-col">
          <span class="footer-title">Legal</span>
          <a href="/terms.html">Terms</a>
          <a href="/privacy.html">Privacy</a>
        </div>
      </div>
      <div class="footer-meta">&copy; Mappy AI. All rights reserved.</div>
    </footer>
    <script src="/script.js"></script>`;
}

// Generate post page
function buildPost(post) {
  const url = `${SITE_URL}/blog/${post.slug}/`;
  const tocHtml = post.toc
    .map((item) => `<a href="#${item.id}">${escapeXml(item.title)}</a>`)
    .join("");
  const tagHtml = renderTagChips(post.tags, "article-tag");
  const html = `${headHtml({
    title: `${post.title} | ${BLOG_TITLE}`,
    description: post.description,
    url,
    isArticle: true,
  })}
  <body>
    ${navHtml()}
    <main class="article-main">
      <article class="article-shell">
        <section class="article-hero reveal">
          <a class="blog-back" href="/blog/">Back to blog</a>
          <div class="article-hero-frame">
            <div class="article-meta-strip">
              <span>${formatDate(post.date)}</span>
              <span>${post.readTime} min read</span>
              <span>${escapeXml(post.author)}</span>
            </div>
            <h1>${escapeXml(post.title)}</h1>
            <p class="article-desc">${escapeXml(post.description)}</p>
            ${tagHtml ? `<div class="article-tags">${tagHtml}</div>` : ""}
          </div>
        </section>
        <div class="article-layout">
          <aside class="article-sidebar reveal">
            ${
              tocHtml
                ? `<div class="article-sidebar-card">
              <p class="article-sidebar-title">In this guide</p>
              <nav class="article-toc">${tocHtml}</nav>
            </div>`
                : ""
            }
            <div class="article-sidebar-card article-sidebar-card-accent">
              <p class="article-sidebar-title">Build from source material</p>
              <p>Upload PDFs, links, or notes and generate a source-grounded map you can refine branch by branch.</p>
              <a class="btn primary" href="https://app.mappy-ai.com/login.html?mode=signup&amp;ref=blog_sidebar_cta">Try Mappy AI free</a>
            </div>
          </aside>
          <div class="article-content">
            <div class="article-body reveal">
              ${post.content}
            </div>
            <div class="article-cta reveal">
            <div>
              <h3>Try it yourself</h3>
              <p>Upload a research paper and see the mind map in seconds.</p>
            </div>
            <a class="btn primary" href="https://app.mappy-ai.com/login.html?mode=signup&amp;ref=blog_cta">Start free</a>
            </div>
          </div>
        </div>
      </article>
    </main>
    ${footerHtml()}
  </body>
</html>`;

  const dir = path.join(BLOG_DIR, post.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);
  console.log(`  ✓ blog/${post.slug}/index.html`);
}

// Generate blog index
function buildIndex(posts) {
  const url = `${SITE_URL}/blog/`;
  const items = posts
    .map(
      (p) => `
          <a class="blog-index-item" href="/blog/${p.slug}/">
            <div class="blog-index-item-meta">
              <span>${formatDate(p.date)}</span>
              <span>${p.readTime} min read</span>
            </div>
            <h2>${escapeXml(p.title)}</h2>
            <p>${escapeXml(p.description)}</p>
          </a>`
    )
    .join("\n");

  const html = `${headHtml({
    title: `${BLOG_TITLE} — Guides, workflows, and ideas`,
    description: BLOG_DESC,
    url,
    isArticle: false,
  })}
  <body class="blog-index-page">
    <header class="blog-index-header">
      <a class="brand" href="/">
        <img src="/assets/mindmap_builder.svg" alt="Mappy AI logo" />
        <span>Mappy AI</span>
      </a>
    </header>
    <main class="blog-index-main">
      <section class="blog-index-list-section">
        <p class="blog-index-kicker">Blog</p>
        <h1>Articles</h1>
        <div class="blog-index-list">
${items}
        </div>
      </section>
    </main>
    <footer class="blog-index-footer">
      <a class="footer-brand" href="/">
        <img src="/assets/mindmap_builder.svg" alt="Mappy AI logo" />
        <span>Mappy AI</span>
      </a>
      <div class="blog-index-footer-links">
        <a href="/">Home</a>
        <a href="/terms.html">Terms</a>
        <a href="/privacy.html">Privacy</a>
      </div>
      <div class="footer-meta">&copy; Mappy AI. All rights reserved.</div>
    </footer>
  </body>
</html>`;

  fs.writeFileSync(path.join(BLOG_DIR, "index.html"), html);
  console.log(`  ✓ blog/index.html`);
}

// Generate RSS feed
function buildFeed(posts) {
  const items = posts
    .map(
      (p) => `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${SITE_URL}/blog/${p.slug}/</link>
      <guid>${SITE_URL}/blog/${p.slug}/</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <description>${escapeXml(p.description)}</description>
    </item>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(BLOG_TITLE)}</title>
    <link>${SITE_URL}/blog/</link>
    <description>${escapeXml(BLOG_DESC)}</description>
    <language>en</language>
    <atom:link href="${SITE_URL}/blog/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  fs.writeFileSync(path.join(BLOG_DIR, "feed.xml"), xml);
  console.log(`  ✓ blog/feed.xml`);
}

// Generate sitemap fragment for blog pages
function buildSitemap(posts) {
  const entries = [
    `  <url><loc>${SITE_URL}/blog/</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`,
    ...posts.map(
      (p) =>
        `  <url><loc>${SITE_URL}/blog/${p.slug}/</loc><lastmod>${isoDate(p.date).split("T")[0]}</lastmod><priority>0.8</priority></url>`
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

  fs.writeFileSync(path.join(BLOG_DIR, "sitemap-blog.xml"), xml);
  console.log(`  ✓ blog/sitemap-blog.xml`);
}

// Load comparison posts
function loadComparePosts() {
  if (!fs.existsSync(COMPARE_POSTS_DIR)) return [];
  const files = fs
    .readdirSync(COMPARE_POSTS_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .reverse();

  return files.map((file) => {
    const raw = fs.readFileSync(path.join(COMPARE_POSTS_DIR, file), "utf8");
    const { data, content } = matter(raw);
    const headings = extractHeadings(content);
    const html = addHeadingAnchors(postProcessFaq(marked.parse(content)), headings);

    return {
      ...data,
      author: data.author || "Mappy AI Team",
      content: html,
      file,
      headings,
      readTime: estimateReadTime(content),
      tags: Array.isArray(data.tags) ? data.tags : [],
      toc: headings.filter((heading) => heading.depth === 2),
    };
  });
}

// Generate comparison page
function buildComparePost(post) {
  const url = `${SITE_URL}/compare/${post.slug}/`;
  const tocHtml = post.toc
    .map((item) => `<a href="#${item.id}">${escapeXml(item.title)}</a>`)
    .join("");
  const tagHtml = renderTagChips(post.tags, "article-tag");

  const faqSchemaHtml = post.faqSchema
    ? `<script type="application/ld+json">${JSON.stringify(post.faqSchema)}</script>`
    : "";

  const html = `${headHtml({
    title: `${post.title} | ${SITE_NAME}`,
    description: post.description,
    url,
    isArticle: true,
    extraHead: faqSchemaHtml,
  })}
  <body>
    ${navHtml()}
    <main class="article-main">
      <article class="article-shell">
        <section class="article-hero reveal">
          <a class="blog-back" href="/blog/">Back to blog</a>
          <div class="article-hero-frame">
            <div class="article-meta-strip">
              <span>${formatDate(post.date)}</span>
              <span>${post.readTime} min read</span>
              <span>${escapeXml(post.author)}</span>
            </div>
            <h1>${escapeXml(post.title)}</h1>
            <p class="article-desc">${escapeXml(post.description)}</p>
            ${tagHtml ? `<div class="article-tags">${tagHtml}</div>` : ""}
          </div>
        </section>
        <div class="article-layout">
          <aside class="article-sidebar reveal">
            ${
              tocHtml
                ? `<div class="article-sidebar-card">
              <p class="article-sidebar-title">In this comparison</p>
              <nav class="article-toc">${tocHtml}</nav>
            </div>`
                : ""
            }
            <div class="article-sidebar-card article-sidebar-card-accent">
              <p class="article-sidebar-title">See the difference yourself</p>
              <p>Upload your own files and see how Mappy AI turns them into source-grounded mind maps.</p>
              <a class="btn primary" href="https://app.mappy-ai.com/login.html?mode=signup&amp;ref=compare_sidebar_cta">Try Mappy AI free</a>
            </div>
          </aside>
          <div class="article-content">
            <div class="article-body reveal">
              ${post.content}
            </div>
            <div class="article-cta reveal">
            <div>
              <h3>Try it yourself</h3>
              <p>Start free and see the difference in your first mind map.</p>
            </div>
            <a class="btn primary" href="https://app.mappy-ai.com/login.html?mode=signup&amp;ref=compare_cta">Start free</a>
            </div>
          </div>
        </div>
      </article>
    </main>
    ${footerHtml()}
  </body>
</html>`;

  const dir = path.join(COMPARE_DIR, post.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);
  console.log(`  ✓ compare/${post.slug}/index.html`);
}

// Generate comparison sitemap fragment
function buildCompareSitemap(comparePosts) {
  if (comparePosts.length === 0) return;

  const entries = comparePosts.map(
    (p) =>
      `  <url><loc>${SITE_URL}/compare/${p.slug}/</loc><lastmod>${isoDate(p.date).split("T")[0]}</lastmod><priority>0.8</priority></url>`
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

  fs.writeFileSync(path.join(COMPARE_DIR, "sitemap-compare.xml"), xml);
  console.log(`  ✓ compare/sitemap-compare.xml`);
}

// Main
console.log("Building Mappy AI blog...\n");
const posts = loadPosts();
console.log(`Found ${posts.length} post(s)\n`);

posts.forEach(buildPost);
buildIndex(posts);
buildFeed(posts);
buildSitemap(posts);

const comparePosts = loadComparePosts();
if (comparePosts.length > 0) {
  console.log(`\nFound ${comparePosts.length} comparison page(s)\n`);
  comparePosts.forEach(buildComparePost);
  buildCompareSitemap(comparePosts);
}

console.log("\nDone!");
