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
// The US store's reconstitution / bacteriostatic-water learn pages are retired tombstones
// ("This guide has been retired", ~180 characters, no content), so importing them would add
// three empty cards. The GT site carries its own reconstitution material instead — authored
// in tools/native/ in both languages, per the owner's 2026-09-16 request.
const SKIP_SLUGS = new Set(['reconstitution-solution', 'reconstitution-and-storage', 'bacteriostatic-water-vs-sterile-water']);

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
const RUO_SENTENCE = /\s*[^.!?<>]*\b(research[\s-]use[\s-]only|\bRUO\b|not (?:approved )?for human|human or veterinary use|for laboratory research|laboratory research use|intended for research|research purposes only|for research use)\b[^.!?<>]*[.!?]/gi;
function deRuo(html) {
  let out = html
    .replace(/\s*Glow Peptides supplies[^<>]*?(?:strictly as a reference material|reference material for such)[^<>]*?\.(?!\d)/gi, '')
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
  out = out.replace(/<(p|li)\b[^>]*>(?:(?!<\/?\1\b)[\s\S])*?distribution-in-vitro-diagnostic-products-labeled-research-use-only[\s\S]*?<\/\1>/gi, '');
  out = out.replace(/<h2\b[^>]*>(?:(?!<\/h2>)[\s\S])*research[\s-]use[\s-]only(?:(?!<\/h2>)[\s\S])*<\/h2>[\s\S]*?(?=<h2\b|$)/gi, '');
  out = out.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  out = out.replace(/<(p|li)[^>]*>\s*<\/\1>/g, '');
  return out;
}

// Inline markdown that can appear inside a table cell.
function mdInline(c) {
  return String(c)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

// micromark core does not implement GFM tables; convert pipe tables to HTML before parsing.
function mdTables(md) {
  const lines = String(md).split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const isRow = (l) => /^\s*\|.*\|\s*$/.test(l || '');
    const isSep = (l) => /^\s*\|[\s:|-]+\|\s*$/.test(l || '');
    if (isRow(lines[i]) && isSep(lines[i + 1])) {
      const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = cells(lines[i]);
      let j = i + 2;
      const body = [];
      while (isRow(lines[j]) && !isSep(lines[j])) { body.push(cells(lines[j])); j++; }
      out.push(
        '<table class="cmp"><tr>' + head.map((c) => `<th>${mdInline(c)}</th>`).join('') + '</tr>' +
        body.map((r) => '<tr>' + r.map((c) => `<td>${mdInline(c)}</td>`).join('') + '</tr>').join('') +
        '</table>'
      );
      i = j - 1;
    } else out.push(lines[i]);
  }
  return out.join('\n');
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

/* ---------------- human evidence ----------------
   The GT market is not RUO, so the guides say what a compound has actually
   been tested for in people. The honest answer is often "nothing" — ten of
   these compounds have no human trials at all, and saying so plainly is the
   informative outcome, not a hole to paper over. Nothing in evidence.json is
   invented; where a trial is named it was really run and really published. */
const evidence = existsSync(join(here, 'evidence.json'))
  ? JSON.parse(readFileSync(join(here, 'evidence.json'), 'utf8')) : {};

const EV_LABEL = {
  es: {
    approved: 'Medicamento aprobado',
    trials: 'Ensayos clínicos publicados',
    limited: 'Evidencia humana limitada',
    none: 'Sin ensayos clínicos en humanos',
  },
  en: {
    approved: 'Approved medicine',
    trials: 'Published clinical trials',
    limited: 'Limited human evidence',
    none: 'No human clinical trials',
  },
};

const EV_HEAD = { es: 'Evidencia en humanos', en: 'Human evidence' };
const EV_SAFETY = { es: 'Seguridad y advertencias', en: 'Safety and cautions' };
const EV_FOOT = {
  es: 'Esta información es educativa y describe lo que se ha estudiado. No sustituye la consulta con un profesional de salud, que es quien debe valorar tu caso, tus condiciones y tus medicamentos.',
  en: 'This information is educational and describes what has been studied. It does not replace consulting a health professional, who is the person to assess your case, your conditions and your medicines.',
};

// Comparison articles get both compounds side by side. A badge each is more
// use than prose here: in two of the five, one side is an approved medicine
// and the other was never approved anywhere.
const COMPOUND_NAME = {
  'bpc-157': 'BPC-157', 'tb-500': 'TB-500', 'cjc-1295-ipamorelin': 'CJC-1295 / Ipamorelina',
  'tesamorelin': 'Tesamorelina', 'glow-blend': 'GLOW Blend', 'klow-blend': 'KLOW Blend',
  'mt-ii': 'MT-II', 'pt-141': 'PT-141', 'semax': 'Semax', 'selank': 'Selank',
};

/* ---------------- technical specifications ----------------
   Where a compound has no human trial to report, verifiable chemical identity
   takes its place: CAS, PubChem, formula, mass, sequence. A customer can check
   these against the certificate of analysis, which is the whole point — it is
   data they can confirm, not a claim they have to take on faith. */
const specs = existsSync(join(here, 'specs.json'))
  ? JSON.parse(readFileSync(join(here, 'specs.json'), 'utf8')) : {};

const SPEC_LABEL = {
  es: {
    cas: 'Número CAS', pubchem: 'PubChem CID', formula: 'Fórmula molecular',
    mw: 'Peso molecular', sequence: 'Secuencia de aminoácidos', length: 'Número de residuos',
    source: 'Origen', synonyms: 'Sinónimos', class: 'Clase', target: 'Diana molecular',
    evidence_note: 'Estado de la investigación', total: 'Contenido total por vial',
    ratio: 'Proporción de componentes', appearance: 'Aspecto',
  },
  en: {
    cas: 'CAS number', pubchem: 'PubChem CID', formula: 'Molecular formula',
    mw: 'Molecular weight', sequence: 'Amino acid sequence', length: 'Residue count',
    source: 'Source', synonyms: 'Synonyms', class: 'Class', target: 'Molecular target',
    evidence_note: 'Research status', total: 'Total content per vial',
    ratio: 'Component ratio', appearance: 'Appearance',
  },
};

const SPEC_HEAD = { es: 'Ficha técnica', en: 'Technical specifications' };
const SPEC_LEAD = {
  es: 'Sin ensayos clínicos que reportar, lo que sí podemos darte es identidad química verificable. Estos datos son públicos y comprobables, y puedes contrastarlos con el certificado de análisis de tu lote.',
  en: 'With no clinical trials to report, what we can give you is verifiable chemical identity. These values are public and checkable, and you can compare them against the certificate of analysis for your lot.',
};

// A value is either language-neutral (CAS, formula, mass, sequence) or an
// {es, en} pair. Neutral values must NOT be duplicated per language — that is
// how a CAS number ends up diverging between the two sites.
const specValue = (v, lang) => (v && typeof v === 'object' ? (v[lang] || v.en || '') : v);

const specTable = (rows, lang) =>
  `<table class="spec"><tbody>${rows.map(([k, v]) =>
    `<tr><th>${SPEC_LABEL[lang][k] || k}</th><td>${specValue(v, lang)}</td></tr>`).join('')}</tbody></table>`;

function specsHtml(slug, lang) {
  const sp = specs[slug];
  if (!sp) return '';
  let body = '';
  if (sp.blend) {
    if (sp.totals) body += specTable(sp.totals, lang);
    body += sp.blend.map((c) =>
      `<h3>${c.name}${c.mg ? ` — ${c.mg}` : ''}</h3>${specTable(c.rows, lang)}`).join('');
  } else if (sp.rows) {
    body += specTable(sp.rows, lang);
  }
  if (!body) return '';
  return `<h2>${SPEC_HEAD[lang]}</h2> <p>${SPEC_LEAD[lang]}</p> ${body} `;
}

const EV_COMPARE_HEAD = { es: 'Evidencia en humanos, lado a lado', en: 'Human evidence, side by side' };

function compareEvidenceHtml(slug, lang, nameOf) {
  const c = (evidence._compare || {})[slug];
  if (!c) return '';
  const cell = (key) => {
    const e = evidence[key];
    if (!e) return '';
    return `<div class="ev-col ev-${e.status}">`
      + `<h3>${nameOf(key)}</h3>`
      + `<p class="ev-badge">${EV_LABEL[lang][e.status]}</p>`
      + `<p>${lang === 'es' ? e[lang].resumen : e[lang].summary}</p>`
      + `</div>`;
  };
  return `<h2>${EV_COMPARE_HEAD[lang]}</h2> `
    + `<div class="evidence ev-compare"> `
    + `<div class="ev-cols">${cell(c.a)}${cell(c.b)}</div> `
    + `<p class="ev-verdict">${c[lang]}</p> `
    + `<p class="ev-foot">${EV_FOOT[lang]}</p> `
    + `</div> `;
}

function evidenceHtml(slug, lang) {
  const e = evidence[slug];
  if (!e) return '';
  const b = e[lang];
  if (!b) return '';
  const summary = lang === 'es' ? b.resumen : b.summary;
  const points = (lang === 'es' ? b.puntos : b.points) || [];
  const safety = lang === 'es' ? b.seguridad : b.safety;
  return `<h2>${EV_HEAD[lang]}</h2> `
    + `<div class="evidence ev-${e.status}"> `
    + `<p class="ev-badge">${EV_LABEL[lang][e.status]}</p> `
    + `<p>${summary}</p> `
    + (points.length ? `<ul>${points.map((x) => `<li>${x}</li>`).join(' ')}</ul> ` : '')
    + (safety ? `<p class="ev-safety"><strong>${EV_SAFETY[lang]}.</strong> ${safety}</p> ` : '')
    + `<p class="ev-foot">${EV_FOOT[lang]}</p> `
    + `</div> `;
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

function esGuideHtml(name, tr, form, slug) {
  const bg = tr.bg ? `<h2>Antecedentes</h2> <p>${tr.bg}</p> ` : '';
  // Evidence goes above handling and quality: it is the first thing a customer
  // deciding whether to buy actually needs.
  return `<div class="wrap"> <p class="lead">${tr.lead}</p> ${evidenceHtml(slug, 'es')}${specsHtml(slug, 'es')}${bg}<h2>Manejo y almacenamiento</h2> ${ES.handling[form](name)} <h2>Calidad y análisis</h2> ${ES.quality(name)} ${ES.faq(name, form)}</div>`;
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
  // Same section on the English side. The body comes from the US store, so it
  // is spliced in after the opening paragraph rather than templated.
  const displayName = (key) => (esGuides[key] && esGuides[key].title) || COMPOUND_NAME[key] || key;
  const ev = type === 'compare'
    ? compareEvidenceHtml(slug, 'en', displayName)
    : evidenceHtml(slug, 'en') + specsHtml(slug, 'en');
  if (ev) {
    const cut = main.indexOf('</p>');
    main = cut === -1 ? main + ' ' + ev : main.slice(0, cut + 4) + ' ' + ev + main.slice(cut + 4);
  }

  const item = { id: slug, type, slug, title, subtitle, html: main, productSlug: type === 'guide' ? (GT_PRODUCT[slug] || null) : null };

  if (type === 'guide' && esGuides[slug]) {
    const tr = esGuides[slug];
    const form = /capsule form|in capsule/i.test(main) ? 'capsule' : 'vial';
    item.title_es = tr.title || title;
    item.subtitle_es = tr.sub;
    item.html_es = esGuideHtml(item.title_es, tr, form, slug);
  } else {
    const body0 = esBody(slug);
    const evEs = type === 'compare' ? compareEvidenceHtml(slug, 'es', displayName) : '';
    const body = body0 && evEs
      ? (() => { const cut = body0.indexOf('</p>'); return cut === -1 ? body0 + ' ' + evEs : body0.slice(0, cut + 4) + ' ' + evEs + body0.slice(cut + 4); })()
      : body0;
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
    const html = rewriteLinks(deRuo(micromark(mdTables(p.content || ''), { allowDangerousHtml: true }).replace(/\s+/g, ' ')));
    const cover = ['webp', 'jpg', 'png'].map((e) => `img/blog/${p.slug}.${e}`).find((f) => existsSync(join(here, '..', 'site', f))) || null;
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

// Articles written for the GT site itself (not imported). The US store's reconstitution
// pages are retired tombstones with no content, so this material is authored here, in both
// languages, from tools/native/index.json + <slug>.en.html / <slug>.es.html.
function nativeArticles() {
  const dir = join(here, 'native');
  if (!existsSync(join(dir, 'index.json'))) return [];
  return JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')).map((m) => ({
    id: m.slug, type: m.type || 'prep', slug: m.slug,
    title: m.title, subtitle: m.sub,
    html: readFileSync(join(dir, `${m.slug}.en.html`), 'utf8').trim().replace('{{EVIDENCE}}', evidenceHtml(m.evidence || m.slug, 'en')),
    title_es: m.title_es, subtitle_es: m.sub_es,
    html_es: readFileSync(join(dir, `${m.slug}.es.html`), 'utf8').trim().replace('{{EVIDENCE}}', evidenceHtml(m.evidence || m.slug, 'es')),
    productSlug: m.productSlug || null,
  }));
}

const learnSlugs = readdirSync(LEARN_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
const skipped = learnSlugs.filter((x) => SKIP_SLUGS.has(x));
const learn = learnSlugs.filter((x) => !SKIP_SLUGS.has(x)).map(learnPage).filter(Boolean);
const LIBRARY = [...learn, ...nativeArticles(), ...blogPosts()];

// The US store keeps adding figures to its learn pages. Those images live in
// its repo, not ours, so a silent import is a broken image on glowguate.com.
// Fail loudly instead of shipping one.
const mediaRefs = [...new Set(
  LIBRARY.flatMap((x) => [x.html, x.html_es])
    .join(' ')
    .match(/\/learn-media\/[A-Za-z0-9._-]+/g) || []
)];
const missingMedia = mediaRefs.filter((r) => !existsSync(join(here, '..', 'site', r.replace(/^\//, ''))));
if (missingMedia.length) {
  console.error(`\n  MISSING IMAGES — copy these from the main repo into site/learn-media/ before deploying:`);
  missingMedia.forEach((m) => console.error(`    ${m}`));
  process.exitCode = 1;
} else if (mediaRefs.length) {
  console.log(`  learn-media: ${mediaRefs.length} image(s) referenced, all present`);
}

const out = `/* GENERATED by tools/build-content.mjs — do not edit by hand. ${LIBRARY.length} items. */\nwindow.LIBRARY = ${JSON.stringify(LIBRARY)};\n`;
writeFileSync(join(here, '..', 'site', 'content.js'), out);

const count = (t) => LIBRARY.filter((x) => x.type === t).length;
const es = (t) => LIBRARY.filter((x) => x.type === t && x.html_es).length;
console.log(`content.js: ${LIBRARY.length} items — guides ${count('guide')}, compare ${count('compare')}, method ${count('method')}, prep ${count('prep')}, blog ${count('blog')} — ${(out.length / 1024).toFixed(0)} KB`);
console.log(`Spanish: guides ${es('guide')}/${count('guide')}, compare ${es('compare')}/${count('compare')}, method ${es('method')}/${count('method')}, prep ${es('prep')}/${count('prep')}, blog ${es('blog')}/${count('blog')} — total ${LIBRARY.filter((x) => x.html_es).length}/${LIBRARY.length}`);
if (skipped.length) console.log('  skipped (reconstitution policy):', skipped.join(', '));
const missing = LIBRARY.filter((x) => !x.html_es).map((x) => x.slug);
if (missing.length) console.log('  still English-only:', missing.join(', '));
const leftovers = (re) => LIBRARY.reduce((n, x) => n + ((x.html.match(re) || []).length) + (((x.html_es || '').match(re) || []).length), 0);
console.log('  leftovers — RUO:', leftovers(/research use only/gi), '| not-for-human:', leftovers(/not (approved )?for human/gi), '| store links:', leftovers(/glowpeptides\.com\/(quality|learn)/gi));
for (const x of LIBRARY) if (x.type === 'guide' && x.html_es && !/Antecedentes/.test(x.html_es)) console.warn('  ! no background:', x.slug);
