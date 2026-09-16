// Builds content.js (window.LIBRARY) from the Glow Peptides main repo:
//   - public/learn/<slug>/index.html  → compound guides, comparisons, method explainers
//   - tools/blog_posts.json           → blog posts (markdown snapshot of the blog_posts table)
//
// Run from the glow-gt repo root:
//   node tools/build-content.mjs [/path/to/Glow_peptides_live]
// It needs `micromark` resolvable from the main repo's node_modules (it is).
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const MAIN = process.argv[2] || '/Users/anthonydel/Desktop/Glow_peptides_live';
const LEARN_DIR = join(MAIN, 'public', 'learn');
const { micromark } = createRequire(join(MAIN, 'package.json'))('micromark');

// store compound slug → GT product slug (only compounds the GT site sells)
const GT_PRODUCT = {
  'bpc-157': 'bpc-157-10mg', 'cjc-1295-ipamorelin': 'cjc-1295-ipamorelin', 'cjc-ipamorelin': 'cjc-1295-ipamorelin',
  'ghk-cu': 'ghk-cu-50mg', 'glow-blend': 'glow-blend-70mg', 'glutathione': 'glutathione-1500mg', 'klow-blend': 'klow-blend-80mg',
  'kpv': 'kpv-10mg', 'mots-c': 'mots-c-10mg', 'nad-plus': 'nad-plus-500mg', 'pt-141': 'pt-141-10mg', 'selank': 'selank-10mg',
  'semax': 'semax-10mg', 'tb-500': 'tb-500-10mg', 'tesamorelin': 'tesamorelin-10mg', 'wolverine': 'wolverine-20mg', 'bac-water': 'agua-bacteriostatica',
};
const METHOD_SLUGS = new Set(['how-to-read-a-coa', 'hplc-and-mass-spectrometry-purity', 'lyophilized-vials-vs-capsules']);

const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

// Remove an element (with balanced nesting for the same tag) whose opening tag matches `openRe`.
function removeElements(html, openRe) {
  let out = html, m;
  while ((m = openRe.exec(out))) {
    const tag = m[1];
    const start = m.index;
    let depth = 0, i = start;
    const tokRe = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'g');
    tokRe.lastIndex = start;
    let end = -1, t;
    while ((t = tokRe.exec(out))) {
      depth += t[1] === '/' ? -1 : 1;
      if (depth === 0) { end = t.index + t[0].length; break; }
    }
    if (end < 0) break;
    out = out.slice(0, start) + out.slice(end);
    openRe.lastIndex = 0;
  }
  return out;
}

// The US store's articles carry research-use-only boilerplate that does not apply to the
// Guatemala storefront (different regulatory framing, per the owner). Remove whole sentences
// that exist only to state that framing; soften a few recurring labels.
const RUO_SENTENCE = /\s*[^.!?<>]*\b(research use only|RUO\b|not (?:approved )?for human|human or veterinary use|in[- ]vitro(?: diagnostic| research| and cosmetic)?|for laboratory research|laboratory research use|intended for research|research purposes|research setting|research context|for research)\b[^.!?<>]*[.!?]/gi;
function deRuo(html) {
  let out = html
    // the guides' fixed disclaimer sentence carries inline <strong>, so handle it before the tag-free sentence pass
    .replace(/\s*(?:\(e\.g\.\s*)?It is not a therapeutic product and is\s*(?:<strong>)?\s*not for human or veterinary use\s*(?:<\/strong>)?\s*\.?/gi, '')
    .replace(/\s+for laboratory use\b/gi, '')
    .replace(/General laboratory handling practice for research materials of this type:/gi, 'Handling and storage guidance:')
    .replace(/research co-formulation/gi, 'co-formulation')
    .replace(/\(research name ([^)]+)\)/gi, '(also known as $1)')
    .replace(RUO_SENTENCE, '');
  out = out.replace(/research reference material/gi, 'reference material')
           .replace(/research[- ]grade/gi, 'premium-grade')
           .replace(/research peptides?/gi, (m) => (m.toLowerCase().endsWith('s') ? 'peptides' : 'peptide'))
           .replace(/\bresearchers\b/gi, 'users')
           .replace(/<h2[^>]*>\s*Research context\s*<\/h2>/i, '<h2>Background</h2>');
  // drop paragraphs / list items left empty by the sentence removal
  out = out.replace(/<(p|li)[^>]*>\s*<\/\1>/g, '');
  return out;
}

// Plain-text variant for excerpts / subtitles.
function cleanText(t) {
  return String(t).replace(/\s+/g, ' ')
    .replace(/\s*(?:For|All material is supplied for)\s+(?:laboratory\s+)?research use only\.?/gi, '')
    .replace(/research[- ]grade/gi, 'premium-grade').replace(/researcher-friendly/gi, 'reader-friendly')
    .replace(/A structured research overview/gi, 'A structured overview').replace(/\bresearch peptides?\b/gi, 'peptides')
    .replace(/\s+for AI-optimized search visibility/gi, '').trim();
}

function rewriteLinks(html) {
  return html.replace(/href="([^"]+)"/g, (all, href) => {
    let m;
    if ((m = href.match(/^\/products\/([a-z0-9-]+)\/?$/))) {
      const gt = GT_PRODUCT[m[1]];
      return gt ? `href="#/p/${gt}"` : `href="https://glowpeptides.com${href}" target="_blank" rel="noopener"`;
    }
    if ((m = href.match(/^\/learn\/([a-z0-9-]+)\/?$/))) return `href="#/aprende/${m[1]}"`;
    if ((m = href.match(/^\/blog\/([a-z0-9-]+)\/?$/))) return `href="#/aprende/${m[1]}"`;
    if (href.startsWith('/')) return `href="https://glowpeptides.com${href}" target="_blank" rel="noopener"`;
    if (/^https?:\/\//.test(href) && !href.includes('glow-now.netlify.app')) return `href="${href}" target="_blank" rel="noopener"`;
    return all;
  });
}

function learnPage(slug) {
  const file = join(LEARN_DIR, slug, 'index.html');
  if (!existsSync(file)) return null;
  const raw = readFileSync(file, 'utf8');
  const hero = (raw.match(/<section class="hero">([\s\S]*?)<\/section>/) || [, ''])[1];
  const title = decode(strip((hero.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [, ''])[1]));
  const subtitle = decode(strip((hero.match(/<h1[^>]*>[\s\S]*?<\/h1>\s*<p[^>]*>([\s\S]*?)<\/p>/) || [, ''])[1]))
    .replace(/\s*[·\-–]\s*(research use only|for research use|reference material for in-vitro research)\.?$/i, '')
    .replace(/\s*·\s*research use only/gi, '')
    .replace(/research materials?/gi, 'materials').replace(/\bin-vitro research\b/gi, 'laboratory analysis');
  let main = (raw.match(/<main[^>]*>([\s\S]*?)<\/main>/) || [, ''])[1];

  // drop chrome-ish blocks: CTA, RUO banners, related grid, breadcrumbs
  main = removeElements(main, /<(div|aside|section|p|a)\b[^>]*class="[^"]*\b(cta|ruo|ruo-full|crumbs|related)\b[^"]*"[^>]*>/g);
  main = main.replace(/<h2[^>]*>\s*Related guides\s*<\/h2>[\s\S]*$/i, '');
  // drop the "intended for human use?" FAQ item (h3 + following p/div)
  main = main.replace(/<h3[^>]*>[^<]*intended for human use\?[^<]*<\/h3>\s*(<p[^>]*>[\s\S]*?<\/p>|<div[^>]*>[\s\S]*?<\/div>)/gi, '');
  // drop "Verify any Glow Peptides lot" section on the COA explainer (points at the US store's tool)
  main = main.replace(/<h2[^>]*>\s*Verify any Glow Peptides lot\s*<\/h2>[\s\S]*?(?=<h2|$)/i, '');
  main = rewriteLinks(deRuo(main.replace(/\s+/g, ' '))).trim();

  const isCompare = /-vs-/.test(slug);
  const type = METHOD_SLUGS.has(slug) ? 'method' : isCompare ? 'compare' : 'guide';
  return { id: slug, type, slug, title, subtitle, html: main, productSlug: type === 'guide' ? (GT_PRODUCT[slug] || null) : null, lang: 'en' };
}

function blogPosts() {
  const posts = JSON.parse(readFileSync(join(here, 'blog_posts.json'), 'utf8'))
    .filter((p) => p.is_published !== false)
    .sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
  return posts.map((p) => {
    let html = micromark(p.content || '');
    html = rewriteLinks(deRuo(html.replace(/\s+/g, ' ')));
    const cover = ['webp', 'jpg', 'png'].map((e) => `img/blog/${p.slug}.${e}`).find((f) => existsSync(join(here, '..', f))) || null;
    return { id: p.slug, type: 'blog', slug: p.slug, title: p.title, subtitle: cleanText(p.excerpt || ''), html, cover, date: (p.published_at || p.created_at || '').slice(0, 10), tags: p.tags || [], author: p.author_name || 'Glow Peptides', lang: 'en' };
  });
}

const learnSlugs = readdirSync(LEARN_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
const learn = learnSlugs.map(learnPage).filter(Boolean);
const blog = blogPosts();
const LIBRARY = [...learn, ...blog];

const out = `/* GENERATED by tools/build-content.mjs — do not edit by hand. ${LIBRARY.length} items. */\nwindow.LIBRARY = ${JSON.stringify(LIBRARY, null, 0)};\n`;
writeFileSync(join(here, '..', 'content.js'), out);
const count = (t) => LIBRARY.filter((x) => x.type === t).length;
console.log(`content.js written: ${LIBRARY.length} items — guides ${count('guide')}, compare ${count('compare')}, method ${count('method')}, blog ${count('blog')} — ${(out.length / 1024).toFixed(0)} KB`);
for (const x of learn) if (!x.title || x.html.length < 500) console.warn('  ! thin:', x.slug, x.title, x.html.length);
const leftovers = (re) => LIBRARY.reduce((n, x) => n + (x.html.match(re) || []).length, 0);
console.log('  leftovers — RUO:', leftovers(/research use only/gi), '| not-for-human:', leftovers(/not (approved )?for human/gi), '| in-vitro:', leftovers(/in[- ]vitro/gi), '| cta:', leftovers(/class="cta"/g));
