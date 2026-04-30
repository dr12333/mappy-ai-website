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
    const html = marked(content);
    return { ...data, content: html, file };
  });
}

// Shared HTML fragments
function headHtml({ title, description, url, isArticle }) {
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
    <link rel="alternate" type="application/rss+xml" title="${BLOG_TITLE}" href="${SITE_URL}/blog/feed.xml" />
    <link rel="stylesheet" href="/styles.css" />
    <link rel="stylesheet" href="/blog/blog.css" />
    <script defer src="https://metrics.mappy-ai.com/script.js" data-website-id="82477cf9-ac03-4d35-9e62-6d16cd0c3d6b"></script>
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
          <a href="/schools/index.html">For Schools</a>
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
  const html = `${headHtml({
    title: `${post.title} | ${BLOG_TITLE}`,
    description: post.description,
    url,
    isArticle: true,
  })}
  <body>
    ${navHtml()}
    <main>
      <article>
        <div class="article-header">
          <a class="blog-back" href="/blog/">Back to blog</a>
          <p class="article-meta">${formatDate(post.date)}</p>
          <h1>${escapeXml(post.title)}</h1>
          <p class="article-desc">${escapeXml(post.description)}</p>
        </div>
        <div class="article-body">
          ${post.content}
          <div class="article-cta">
            <div>
              <h3>Try it yourself</h3>
              <p>Upload a research paper and see the mind map in seconds.</p>
            </div>
            <a class="btn primary" href="https://app.mappy-ai.com/login.html?mode=signup&amp;ref=blog_cta">Start free</a>
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
  const cards = posts
    .map(
      (p) => `
          <article class="blog-card">
            <p class="blog-card-meta">${formatDate(p.date)}</p>
            <h2><a href="/blog/${p.slug}/">${escapeXml(p.title)}</a></h2>
            <p>${escapeXml(p.description)}</p>
            <a class="blog-card-link" href="/blog/${p.slug}/">Read more</a>
          </article>`
    )
    .join("\n");

  const html = `${headHtml({
    title: `${BLOG_TITLE} — Guides, workflows, and ideas`,
    description: BLOG_DESC,
    url,
    isArticle: false,
  })}
  <body>
    ${navHtml()}
    <main>
      <div class="blog-header">
        <h1>Blog</h1>
        <p>${escapeXml(BLOG_DESC)}</p>
      </div>
      <div class="blog-list">
${cards}
      </div>
    </main>
    ${footerHtml()}
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

// Main
console.log("Building Mappy AI blog...\n");
const posts = loadPosts();
console.log(`Found ${posts.length} post(s)\n`);

posts.forEach(buildPost);
buildIndex(posts);
buildFeed(posts);
buildSitemap(posts);

console.log("\nDone!");
