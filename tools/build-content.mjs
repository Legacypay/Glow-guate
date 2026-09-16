// Builds content.js (window.LIBRARY) from the Glow Peptides main repo:
//   - public/learn/<slug>/index.html  → compound guides, comparisons, method explainers
//   - tools/blog_posts.json           → blog posts (markdown snapshot of the blog_posts table)
//
// Spanish: the 25 compound guides are ASSEMBLED in Spanish from tools/es/guides.json
// (per-compound subtitle/lead/background) plus the shared template below — the guides are
// identical apart from those few sentences, so this keeps every guide consistent.
// Comparisons, method explainers and blog posts get a full Spanish body from
// tools/es/<slug>.html, with their titles/subtitles in tools/es/meta.json.
//
// Run from the glow-gt repo root:
//   node tools/build-content.mjs [/path/to/Glow_peptides_live]
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
    let depth = 0;
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
// Guatemala storefront (different regulatory framing, per the owner). Remove the sentences
// that exist only to state that framing, but KEEP the sentence naming what the compound is
// studied for — that is the educational content.
const RUO_SENTENCE = /\s*[^.!?<>]*\b(research use only|RUO\b|not (?:approved )?for human|human or veterinary use|in[- ]vitro(?: diagnostic| research| and cosmetic)?|for laboratory research|laboratory research use|intended for research|research purposes|research setting|for research)\b[^.!?<>]*[.!?]/gi;
function deRuo(html) {
  let out = html
    .replace(/\s*Glow Peptides supplies[^.<>]*\./gi, '')
    .replace(/\s+using in[- ]vitro[^.<>]*(?=\.)/gi, '')
    .replace(/\s*(?:\(e\.g\.\s*)?It is not a therapeutic product and is\s*(?:<strong>)?\s*not for human or veterinary use\s*(?:<\/strong>)?\s*\.?/gi, '')
    .replace(/\s+for laboratory use\b/gi, '')
    .replace(/General laboratory handling practice for research materials of this type:/gi, 'Handling and storage guidance:')
    .replace(/research co-formulation/gi, 'co-formulation')
    .replace(/\(research name ([^)]+)\)/gi, '(also known as $1)')
    .replace(/\s*Our published customer rating is [^.<>]*\./gi, '')
    .replace(/\s*For the mechanics of preparing a lyophilized vial, see\s*\.?/gi, '')
    .replace(/Our Quality & COA verification page lets you search a lot and view its documentation without a purchase\./gi, 'Every lot certificate is published in the certificates section and can be downloaded without a purchase.')
    .replace(RUO_SENTENCE, '');
  out = out.replace(/research reference material/gi, 'reference material')
    .replace(/research[- ]grade/gi, 'premium-grade')
    .replace(/research peptides?/gi, (m) => (m.toLowerCase().endsWith('s') ? 'peptides' : 'peptide'))
    .replace(/\bresearchers\b/gi, 'users')
    .replace(/<h2[^>]*>\s*Research context\s*<\/h2>/i, '<h2>Background</h2>');
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

// Internal links: keep the reader on the GT site wherever an equivalent exists.
function rewriteLinks(html) {
  return html.replace(/href="([^"]+)"/g, (all, href) => {
    const path = href.replace(/^https?:\/\/(?:www\.)?glowpeptides\.com/, '');
    let m;
    if (/^\/quality\/?$/.test(path)) return 'href="#coas"';
    if ((m = path.match(/^\/products\/([a-z0-9-]+)\/?$/))) {
      const gt = GT_PRODUCT[m[1]];
      return gt ? `href="#/p/${gt}"` : `href="https://glowpeptides.com${path}" target="_blank" rel="noopener"`;
    }
    if ((m = path.match(/^\/(?:learn|blog)\/([a-z0-9-]+)\/?$/))) return `href="#/aprende/${m[1]}"`;
    if (path !== href) return `href="https://glowpeptides.com${path}" target="_blank" rel="noopener"`;
    if (href.startsWith('/')) return `href="https://glowpeptides.com${href}" target="_blank" rel="noopener"`;
    if (/^https?:\/\//.test(href) && !href.includes('glow-now.netlify.app')) return `href="${href}" target="_blank" rel="noopener"`;
    return all;
  });
}

/* ---------------- Spanish guide template ---------------- */
const ES = {
  handling: {
    vial: (n) => `<p>${n} se suministra liofilizado (secado por congelación). Guía de manejo y almacenamiento:</p> <ul> <li><strong>Viales sellados:</strong> conserva el polvo liofilizado en frío y protegido de la luz; para almacenamiento prolongado, en congelador. Mantén el vial sellado hasta el momento de usarlo.</li> <li><strong>Documentación:</strong> anota el número de lote y guarda su certificado de análisis.</li> </ul>`,
    capsule: (n) => `<p>${n} se suministra en cápsulas. Guía de manejo y almacenamiento:</p> <ul> <li><strong>Almacenamiento:</strong> mantén las cápsulas selladas en un lugar fresco y seco, protegidas de la luz y la humedad; la refrigeración prolonga su vida útil.</li> <li><strong>Listas para usar:</strong> las cápsulas no requieren reconstitución ni preparación.</li> <li><strong>Documentación:</strong> anota el número de lote y guarda su certificado de análisis.</li> </ul>`,
  },
  quality: (n) => `<p>Cada lote de ${n} que suministramos se analiza de forma independiente en un laboratorio de USA y se acompaña de un certificado de análisis propio de ese lote. El análisis incluye HPLC con detección UV para la pureza y espectrometría de masas para la identidad, con nuestro estándar de pureza en ≥99.2%.</p> <p>Puedes consultar todos los lotes y descargar sus certificados en la <a href="#coas">sección de certificados</a>, y entender qué significa cada dato en <a href="#/aprende/how-to-read-a-coa">cómo leer un certificado de análisis</a>.</p> <div class="card"> <p style="margin:0 0 10px"><strong>${n}</strong> se ofrece con pureza verificada de forma independiente (≥99.2%) y certificado de análisis por lote.</p> </div>`,
  faq: (n, form) => `<h2>Preguntas frecuentes</h2> <div class="faq"> <h3>¿Cómo se verifica la pureza de ${n}?</h3><p>Cada lote se analiza de forma independiente en un laboratorio de USA mediante HPLC con detección UV (pureza) y espectrometría de masas (identidad), y se acompaña de un certificado de análisis propio de ese lote. Nuestro estándar de pureza es ≥99.2%.</p> <h3>¿Cómo se debe almacenar ${n}?</h3><p>${form === 'capsule' ? 'Mantén las cápsulas selladas en un lugar fresco y seco, protegidas de la luz y la humedad; la refrigeración prolonga su vida útil.' : 'Los viales liofilizados sellados se conservan en frío y protegidos de la luz; para almacenamiento prolongado, congelados. Mantén el vial sellado hasta el momento de usarlo.'}</p> </div>`,
};

function esGuideHtml(name, tr, form) {
  const bg = tr.bg ? `<h2>Antecedentes</h2> <p>${tr.bg}</p> ` : '';
  return `<div class="wrap"> <p class="lead">${tr.lead}</p> ${bg}<h2>Manejo y almacenamiento</h2> ${ES.handling[form](name)} <h2>Calidad y análisis</h2> ${ES.quality(name)} ${ES.faq(name, form)}</div>`;
}

const esGuides = existsSync(join(here, 'es', 'guides.json')) ? JSON.parse(readFileSync(join(here, 'es', 'guides.json'), 'utf8')) : {};
const esMeta = existsSync(join(here, 'es', 'meta.json')) ? JSON.parse(readFileSync(join(here, 'es', 'meta.json'), 'utf8')) : {};
const esBody = (slug) => {
  const f = join(here, 'es', `${slug}.html`);
  return existsSync(f) ? readFileSync(f, 'utf8').trim() : null;
};

function learnPage(slug) {
  const file = join(LEARN_DIR, slug, 'index.html');
  if (!existsSync(file)) return null;
  const raw = readFileSync(file, 'utf8');
  const hero = (raw.match(/<section class="hero">([\s\S]*?)<\/section>/) || [, ''])[1];
  const title = decode(strip((hero.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [, ''])[1]));
  const subtitle = cleanText(decode(strip((hero.match(/<h1[^>]*>[\s\S]*?<\/h1>\s*<p[^>]*>([\s\S]*?)<\/p>/) || [, ''])[1])))
    .replace(/\s*[·\-–]\s*(research use only|for research use|reference material for in-vitro research)\.?$/i, '')
    .replace(/\s*·\s*research use only/gi, '')
    .replace(/research materials?/gi, 'materials').replace(/\bin-vitro research\b/gi, 'laboratory analysis');
  let main = (raw.match(/<main[^>]*>([\s\S]*?)<\/main>/) || [, ''])[1];

  main = removeElements(main, /<(div|aside|section|p|a)\b[^>]*class="[^"]*\b(cta|ruo|ruo-full|crumbs|related)\b[^"]*"[^>]*>/g);
  main = main.replace(/<h2[^>]*>\s*Related guides\s*<\/h2>[\s\S]*$/i, '');
  main = main.replace(/<h3[^>]*>[^<]*intended for human use\?[^<]*<\/h3>\s*(<p[^>]*>[\s\S]*?<\/p>|<div[^>]*>[\s\S]*?<\/div>)/gi, '');
  main = main.replace(/<h2[^>]*>\s*Verify any Glow Peptides lot\s*<\/h2>[\s\S]*?(?=<h2|$)/i, '');
  main = rewriteLinks(deRuo(main.replace(/\s+/g, ' '))).trim();

  const isCompare = /-vs-/.test(slug);
  const type = METHOD_SLUGS.has(slug) ? 'method' : isCompare ? 'compare' : 'guide';
  const item = { id: slug, type, slug, title, subtitle, html: main, productSlug: type === 'guide' ? (GT_PRODUCT[slug] || null) : null };

  if (type === 'guide' && esGuides[slug]) {
    const tr = esGuides[slug];
    const form = /capsule form|in capsule/i.test(main) ? 'capsule' : 'vial';
    item.title_es = tr.title || title;
    item.subtitle_es = tr.sub;
    item.html_es = esGuideHtml(item.title_es, tr, form);
  } else {
    const body = esBody(slug);
    if (body) {
      item.html_es = body;
      item.title_es = (esMeta[slug] || {}).title || title;
      item.subtitle_es = (esMeta[slug] || {}).sub || subtitle;
    }
  }
  return item;
}

function blogPosts() {
  const posts = JSON.parse(readFileSync(join(here, 'blog_posts.json'), 'utf8'))
    .filter((p) => p.is_published !== false)
    .sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
  return posts.map((p) => {
    const html = rewriteLinks(deRuo(micromark(p.content || '').replace(/\s+/g, ' ')));
    const cover = ['webp', 'jpg', 'png'].map((e) => `img/blog/${p.slug}.${e}`).find((f) => existsSync(join(here, '..', f))) || null;
    const item = {
      id: p.slug, type: 'blog', slug: p.slug, title: p.title, subtitle: cleanText(p.excerpt || ''), html, cover,
      date: (p.published_at || p.created_at || '').slice(0, 10), tags: p.tags || [], author: p.author_name || 'Glow Peptides',
    };
    const body = esBody(p.slug);
    if (body) {
      item.html_es = body;
      item.title_es = (esMeta[p.slug] || {}).title || p.title;
      item.subtitle_es = (esMeta[p.slug] || {}).sub || item.subtitle;
    }
    return item;
  });
}

const learnSlugs = readdirSync(LEARN_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
const learn = learnSlugs.map(learnPage).filter(Boolean);
const LIBRARY = [...learn, ...blogPosts()];

const out = `/* GENERATED by tools/build-content.mjs — do not edit by hand. ${LIBRARY.length} items. */\nwindow.LIBRARY = ${JSON.stringify(LIBRARY)};\n`;
writeFileSync(join(here, '..', 'content.js'), out);

const count = (t) => LIBRARY.filter((x) => x.type === t).length;
const es = (t) => LIBRARY.filter((x) => x.type === t && x.html_es).length;
console.log(`content.js: ${LIBRARY.length} items — guides ${count('guide')}, compare ${count('compare')}, method ${count('method')}, blog ${count('blog')} — ${(out.length / 1024).toFixed(0)} KB`);
console.log(`Spanish: guides ${es('guide')}/${count('guide')}, compare ${es('compare')}/${count('compare')}, method ${es('method')}/${count('method')}, blog ${es('blog')}/${count('blog')} — total ${LIBRARY.filter((x) => x.html_es).length}/${LIBRARY.length}`);
const missing = LIBRARY.filter((x) => !x.html_es).map((x) => x.slug);
if (missing.length) console.log('  still English-only:', missing.join(', '));
const leftovers = (re) => LIBRARY.reduce((n, x) => n + ((x.html.match(re) || []).length) + (((x.html_es || '').match(re) || []).length), 0);
console.log('  leftovers — RUO:', leftovers(/research use only/gi), '| not-for-human:', leftovers(/not (approved )?for human/gi), '| store links:', leftovers(/glowpeptides\.com\/(quality|learn)/gi));
for (const x of LIBRARY) if (x.type === 'guide' && x.html_es && !/Antecedentes/.test(x.html_es)) console.warn('  ! no background:', x.slug);
