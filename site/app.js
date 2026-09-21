/* Glow Peptides GT — app logic (vanilla JS, no build step) */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ */
  /* CONFIG — the only things that should need editing day to day        */
  /* ------------------------------------------------------------------ */
  const CONFIG = {
    contactEmail: "macriarenas@glowguate.com", // where contact + order replies go
    whatsapp: "50255279444",                   // E.164 digits, no "+" (+502 5527 9444)
    fxRate: 7.75,                              // GTQ per USD — see the note under bank below
    pickupLocation: { es: "Ciudad de Guatemala", en: "Guatemala City" },
    formName: "pedido-gt",
    // Customers pay by bank transfer in quetzales, so fxRate below is REAL MONEY:
    // it sets the exact Q amount each order is transferred at, not a rough estimate.
    bank: {
      name: "Banco Industrial",
      type: { es: "Cuenta monetaria (quetzales)", en: "Checking account (quetzales)" },
      number: "0000244970",
      holder: "María Cristina Beatriz Arenas Echeverría",
    },
  };

  const DEPARTAMENTOS = ["Guatemala", "Sacatepéquez", "Chimaltenango", "Escuintla", "Santa Rosa", "Sololá", "Totonicapán", "Quetzaltenango", "Suchitepéquez", "Retalhuleu", "San Marcos", "Huehuetenango", "Quiché", "Baja Verapaz", "Alta Verapaz", "Petén", "Izabal", "Zacapa", "Chiquimula", "Jalapa", "Jutiapa", "El Progreso"];

  /* ------------------------------------------------------------------ */
  /* i18n                                                                */
  /* ------------------------------------------------------------------ */
  const I18N = {
    es: {
      "nav.products": "Productos", "nav.coas": "Certificados", "nav.how": "Cómo comprar", "nav.learn": "Aprende", "nav.contact": "Contacto", "nav.cart": "Pedido",
      "hero.eyebrow": "Ahora en Guatemala",
      "hero.title": "Péptidos verificados por laboratorio en USA, <em>entregados en tu ciudad.</em>",
      "hero.lead": "Cada lote se analiza en un laboratorio independiente en Estados Unidos y publicamos el certificado. Pide en línea, paga por transferencia bancaria, y recoge o recibe en tu domicilio.",
      "hero.cta1": "Ver productos", "hero.cta2": "Ver certificados de análisis",
      "trust.1": "Pureza ≥99% verificada en laboratorio de USA", "trust.2": "Certificado de análisis por lote", "trust.3": "Entrega local o recogida", "trust.4": "Pago por transferencia bancaria",
      "products.eyebrow": "Catálogo", "products.title": "Nuestros productos", "products.lead": "Toca cualquier producto para conocer para qué se usa, cómo funciona y ver su certificado de análisis.",
      "coas.eyebrow": "Calidad verificada", "coas.title": "Certificados de análisis (COA)", "coas.lead": "Cada lote se analiza por HPLC y espectrometría de masas en Freedom Diagnostics, un laboratorio independiente en Estados Unidos. Descarga el certificado de tu lote.",
      "coas.th.product": "Producto", "coas.th.lot": "Lote / Accesión", "coas.th.purity": "Pureza", "coas.th.date": "Fecha", "coas.th.file": "Certificado",
      "coas.note": "¿No ves el lote de tu vial? Todos los lotes de Glow pueden buscarse por número en <a href=\"https://glowpeptides.com/quality\" target=\"_blank\" rel=\"noopener\">glowpeptides.com/quality</a>, o escríbenos y te enviamos el certificado.",
      "coas.view": "Ver PDF", "coas.current": "Lote actual",
      "how.eyebrow": "Simple y directo", "how.title": "Cómo comprar",
      "how.s1.t": "Arma tu pedido", "how.s1.d": "Agrega los productos que quieres y envía tu pedido con tus datos de contacto. No necesitas crear cuenta.",
      "how.s2.t": "Paga por transferencia", "how.s2.d": "Al enviar tu pedido verás de inmediato los datos de nuestra cuenta de Banco Industrial y el monto exacto en quetzales. Transfiere usando tu número de pedido como referencia.",
      "how.s3.t": "Envía tu comprobante", "how.s3.d": "Mándanos el comprobante por WhatsApp, confirmamos tu pedido y coordinamos si lo recoges o te lo entregamos a domicilio.",
      "bank.title": "Datos para tu transferencia", "bank.amount": "Transfiere exactamente", "bank.bank": "Banco", "bank.type": "Tipo de cuenta", "bank.number": "Número de cuenta", "bank.holder": "A nombre de", "bank.ref": "Referencia",
      "bank.after": "Cuando hayas transferido, envíanos el comprobante por WhatsApp o correo y confirmamos tu pedido.",
      "bank.copy": "Copiar datos", "bank.copied": "Datos copiados",
      "learn.eyebrow": "Aprende", "learn.title": "¿Qué son los péptidos?",
      "learn.lead": "Los péptidos son cadenas cortas de aminoácidos — los mismos bloques que forman las proteínas de tu cuerpo. Actúan como mensajeros que le indican a las células qué hacer: reparar tejido, quemar grasa, producir colágeno o liberar hormonas. Por eso pueden ser tan específicos y tan efectivos.",
      "learn.c1.t": "¿Por qué importa la pureza?", "learn.c1.d": "Un péptido de baja pureza contiene fragmentos incompletos e impurezas que reducen su efecto y pueden causar reacciones. Nuestros lotes se analizan por HPLC y espectrometría de masas: todos superan el 99% de pureza.",
      "learn.c2.t": "¿Cómo se almacenan?", "learn.c2.d": "Los viales liofilizados (en polvo) se conservan en refrigeración o congelación, protegidos de la luz. Una vez reconstituidos con agua bacteriostática, se mantienen refrigerados y se usan dentro de 4 semanas.",
      "learn.c3.t": "¿Qué es el agua bacteriostática?", "learn.c3.d": "Agua estéril con un conservante suave que permite reconstituir el péptido y extraer varias dosis del mismo vial de forma segura. Recomendamos dos viales de agua por cada vial de péptido.",
      "learn.c4.t": "¿Necesito orientación?", "learn.c4.d": "Con tu pedido te compartimos una guía de uso y almacenamiento. Si tienes condiciones médicas o tomas medicamentos, consulta con tu profesional de salud antes de comenzar.",
      "lib.eyebrow": "Biblioteca", "lib.title": "Guías, comparativas y artículos", "lib.lead": "Todo lo que Glow Peptides ha publicado sobre cada compuesto, cómo se analiza y cómo leer un certificado. Toca un artículo para leerlo completo.",
      "lib.search": "Buscar por compuesto o tema…", "lib.all": "Todo", "lib.guide": "Guías de compuestos", "lib.compare": "Comparativas", "lib.method": "Calidad y métodos", "lib.prep": "Preparación y cuidado", "lib.blog": "Blog",
      "lib.type.guide": "Guía", "lib.type.compare": "Comparativa", "lib.type.method": "Calidad", "lib.type.prep": "Preparación", "lib.type.blog": "Blog",
      "lib.empty": "No encontramos artículos con ese término.", "lib.langnote": "Este artículo está disponible en inglés. Si prefieres una explicación en español, escríbenos y con gusto te ayudamos.",
      "lib.read": "Leer artículo", "lib.viewProduct": "Ver producto", "lib.back": "Volver a la biblioteca", "lib.by": "Por", "lib.guideFor": "Guía completa de este compuesto →",
      "contact.eyebrow": "Contacto", "contact.title": "¿Tienes preguntas? Escríbenos.", "contact.lead": "Te ayudamos a elegir el producto correcto, confirmar disponibilidad o coordinar tu entrega.", "contact.email": "Enviar correo",
      "footer.loc": "Ciudad de Guatemala",
      "footer.disclaimer": "La información de este sitio es educativa y describe los usos y beneficios documentados de cada compuesto. No sustituye la orientación de un profesional de salud. Si tienes una condición médica, estás embarazada o tomas medicamentos, consulta antes de usar cualquier producto.",
      "cart.title": "Tu pedido", "cart.empty": "Tu pedido está vacío.", "cart.browse": "Ver productos", "cart.subtotal": "Subtotal", "cart.approx": "aprox.", "cart.transfer": "A transferir:", "cart.checkout": "Finalizar pedido", "cart.continue": "Seguir comprando", "cart.remove": "Quitar",
      "cart.note": "El costo de entrega (si aplica) se confirma contigo antes de pagar.",
      "card.details": "Detalles", "card.add": "Agregar", "card.added": "Agregado al pedido", "card.coa": "COA",
      "pd.uses": "Para qué se usa", "pd.how": "Cómo funciona", "pd.know": "Lo que debes saber", "pd.add": "Agregar al pedido", "pd.coa": "Certificado de análisis del lote", "pd.coa.view": "Ver COA", "pd.coa.none": "Certificado disponible bajo solicitud — escríbenos con tu número de lote.",
      "pd.blend": "Contiene",
      "co.title": "Finalizar pedido", "co.lead": "Completa tus datos. Te contactaremos para confirmar y enviarte las instrucciones de pago.",
      "co.name": "Nombre completo", "co.phone": "Teléfono (WhatsApp)", "co.email": "Correo electrónico",
      "co.delivery": "Entrega", "co.pickup": "Recoger", "co.pickup.d": "En nuestro punto de entrega en {loc}. Coordinamos día y hora.", "co.home": "Entrega a domicilio", "co.home.d": "Te confirmamos el costo según tu zona antes de pagar.",
      "co.address": "Dirección", "co.municipio": "Municipio / Zona", "co.departamento": "Departamento",
      "co.payment": "Método de pago preferido", "co.bank": "Transferencia bancaria", "co.bank.d": "Verás los datos de la cuenta y el monto exacto en quetzales al enviar tu pedido.",
      "co.card": "Tarjeta de crédito o débito", "co.card.d": "Pago seguro en la página de CyberSource. Tus datos de tarjeta nunca pasan por este sitio.",
      "co.card.test": "Modo de prueba: no se cobra ninguna tarjeta real.",
      "co.pay": "Pagar {amount}", "co.redirect": "Redirigiendo al pago seguro…",
      "pay.ok.title": "¡Pago aprobado!", "pay.ok.lead": "Tu pago fue aprobado y tu pedido está confirmado. Te contactamos para coordinar la entrega.",
      "pay.fail.title": "El pago no se completó", "pay.fail.lead": "Tu tarjeta no fue cobrada. Puedes intentar de nuevo o pagar por transferencia bancaria.",
      "pay.review.title": "Pago en revisión", "pay.review.lead": "Tu pago quedó en revisión por seguridad. Lo verificamos y te confirmamos en breve — no vuelvas a pagar todavía.",
      "pay.error.title": "No pudimos confirmar el pago", "pay.error.lead": "Escríbenos con tu número de pedido y lo revisamos de inmediato.",
      "pay.retry": "Intentar de nuevo", "pay.order": "Pedido",
      "co.err.pay": "No pudimos iniciar el pago con tarjeta. Intenta de nuevo o elige transferencia bancaria.",
      "co.err.stale": "Los precios se actualizaron. Recarga la página para ver el monto correcto.",
      "co.notes": "Notas (opcional)", "co.notes.ph": "Horario preferido, referencias de la dirección, preguntas…",
      "co.summary": "Resumen", "co.total": "Total",
      "co.notice": "No se cobra nada automáticamente. Al enviar tu pedido verás los datos de la cuenta y el monto exacto en quetzales para hacer tu transferencia.",
      "co.submit": "Enviar pedido", "co.sending": "Enviando…", "co.back": "Volver al pedido",
      "co.err.required": "Por favor completa los campos marcados.", "co.err.send": "No pudimos enviar tu pedido. Intenta de nuevo o escríbenos a {email}.",
      "ok.title": "¡Pedido recibido!", "ok.lead": "Usa tu número de pedido como referencia al transferir. Cuando recibamos tu comprobante confirmamos disponibilidad y coordinamos la entrega.", "ok.close": "Cerrar", "ok.wa": "Confirmar por WhatsApp",
      "close": "Cerrar",
      "wa.order": "Hola, acabo de enviar el pedido {num} en Glow Peptides GT.",
    },
    en: {
      "nav.products": "Products", "nav.coas": "Certificates", "nav.how": "How to buy", "nav.learn": "Learn", "nav.contact": "Contact", "nav.cart": "Order",
      "hero.eyebrow": "Now in Guatemala",
      "hero.title": "USA lab-verified peptides, <em>delivered in your city.</em>",
      "hero.lead": "Every batch is tested by an independent laboratory in the United States and we publish the certificate. Order online, pay by bank transfer, and pick up or get it delivered.",
      "hero.cta1": "See products", "hero.cta2": "See certificates of analysis",
      "trust.1": "≥99% purity, USA lab-verified", "trust.2": "Certificate of analysis per batch", "trust.3": "Local delivery or pickup", "trust.4": "Payment by bank transfer",
      "products.eyebrow": "Catalog", "products.title": "Our products", "products.lead": "Tap any product to learn what it's used for, how it works, and see its certificate of analysis.",
      "coas.eyebrow": "Verified quality", "coas.title": "Certificates of analysis (COA)", "coas.lead": "Every batch is tested by HPLC and mass spectrometry at Freedom Diagnostics, an independent US laboratory. Download the certificate for your batch.",
      "coas.th.product": "Product", "coas.th.lot": "Lot / Accession", "coas.th.purity": "Purity", "coas.th.date": "Date", "coas.th.file": "Certificate",
      "coas.note": "Don't see your vial's lot? Every Glow lot can be searched by number at <a href=\"https://glowpeptides.com/quality\" target=\"_blank\" rel=\"noopener\">glowpeptides.com/quality</a>, or message us and we'll send the certificate.",
      "coas.view": "View PDF", "coas.current": "Current lot",
      "how.eyebrow": "Simple and direct", "how.title": "How to buy",
      "how.s1.t": "Build your order", "how.s1.d": "Add the products you want and send your order with your contact details. No account needed.",
      "how.s2.t": "Pay by bank transfer", "how.s2.d": "As soon as you send your order you will see our Banco Industrial account details and the exact amount in quetzales. Transfer using your order number as the reference.",
      "how.s3.t": "Send your receipt", "how.s3.d": "Send us the receipt by WhatsApp, we confirm your order and arrange pickup or home delivery.",
      "bank.title": "Your transfer details", "bank.amount": "Transfer exactly", "bank.bank": "Bank", "bank.type": "Account type", "bank.number": "Account number", "bank.holder": "Account holder", "bank.ref": "Reference",
      "bank.after": "Once you have transferred, send us the receipt by WhatsApp or email and we will confirm your order.",
      "bank.copy": "Copy details", "bank.copied": "Details copied",
      "learn.eyebrow": "Learn", "learn.title": "What are peptides?",
      "learn.lead": "Peptides are short chains of amino acids — the same building blocks as the proteins in your body. They act as messengers that tell cells what to do: repair tissue, burn fat, produce collagen or release hormones. That's why they can be so specific and so effective.",
      "learn.c1.t": "Why does purity matter?", "learn.c1.d": "A low-purity peptide contains incomplete fragments and impurities that reduce its effect and can cause reactions. Our batches are tested by HPLC and mass spectrometry: all exceed 99% purity.",
      "learn.c2.t": "How are they stored?", "learn.c2.d": "Lyophilized (powder) vials are kept refrigerated or frozen, away from light. Once reconstituted with bacteriostatic water, keep refrigerated and use within 4 weeks.",
      "learn.c3.t": "What is bacteriostatic water?", "learn.c3.d": "Sterile water with a mild preservative that lets you reconstitute the peptide and draw several doses from the same vial safely. We recommend two water vials per peptide vial.",
      "learn.c4.t": "Do I need guidance?", "learn.c4.d": "We share a usage and storage guide with your order. If you have medical conditions or take medication, consult your healthcare professional before starting.",
      "lib.eyebrow": "Library", "lib.title": "Guides, comparisons and articles", "lib.lead": "Everything Glow Peptides has published about each compound, how it's tested and how to read a certificate. Tap an article to read it in full.",
      "lib.search": "Search by compound or topic…", "lib.all": "All", "lib.guide": "Compound guides", "lib.compare": "Comparisons", "lib.method": "Quality & methods", "lib.prep": "Preparation & care", "lib.blog": "Blog",
      "lib.type.guide": "Guide", "lib.type.compare": "Comparison", "lib.type.method": "Quality", "lib.type.prep": "Prep", "lib.type.blog": "Blog",
      "lib.empty": "No articles match that search.", "lib.langnote": "",
      "lib.read": "Read article", "lib.viewProduct": "View product", "lib.back": "Back to library", "lib.by": "By", "lib.guideFor": "Full guide to this compound →",
      "contact.eyebrow": "Contact", "contact.title": "Questions? Write to us.", "contact.lead": "We'll help you choose the right product, confirm availability or coordinate your delivery.", "contact.email": "Send email",
      "footer.loc": "Guatemala City",
      "footer.disclaimer": "The information on this site is educational and describes the documented uses and benefits of each compound. It does not replace guidance from a healthcare professional. If you have a medical condition, are pregnant or take medication, consult before using any product.",
      "cart.title": "Your order", "cart.empty": "Your order is empty.", "cart.browse": "See products", "cart.subtotal": "Subtotal", "cart.approx": "approx.", "cart.transfer": "To transfer:", "cart.checkout": "Checkout", "cart.continue": "Continue shopping", "cart.remove": "Remove",
      "cart.note": "Delivery cost (if any) is confirmed with you before payment.",
      "card.details": "Details", "card.add": "Add", "card.added": "Added to order", "card.coa": "COA",
      "pd.uses": "What it's used for", "pd.how": "How it works", "pd.know": "Good to know", "pd.add": "Add to order", "pd.coa": "Certificate of analysis for this batch", "pd.coa.view": "View COA", "pd.coa.none": "Certificate available on request — message us with your lot number.",
      "pd.blend": "Contains",
      "co.title": "Checkout", "co.lead": "Fill in your details. We'll contact you to confirm and send payment instructions.",
      "co.name": "Full name", "co.phone": "Phone (WhatsApp)", "co.email": "Email",
      "co.delivery": "Delivery", "co.pickup": "Pickup", "co.pickup.d": "At our delivery point in {loc}. We coordinate day and time.", "co.home": "Home delivery", "co.home.d": "We confirm the cost for your area before payment.",
      "co.address": "Address", "co.municipio": "Municipality / Zone", "co.departamento": "Department",
      "co.payment": "Preferred payment method", "co.bank": "Bank transfer", "co.bank.d": "You will see the account details and the exact amount in quetzales when you send your order.",
      "co.card": "Credit or debit card", "co.card.d": "Secure payment on CyberSource's page. Your card details never pass through this site.",
      "co.card.test": "Test mode: no real card is charged.",
      "co.pay": "Pay {amount}", "co.redirect": "Redirecting to secure payment…",
      "pay.ok.title": "Payment approved!", "pay.ok.lead": "Your payment went through and your order is confirmed. We'll be in touch to arrange delivery.",
      "pay.fail.title": "Payment not completed", "pay.fail.lead": "Your card was not charged. You can try again or pay by bank transfer.",
      "pay.review.title": "Payment under review", "pay.review.lead": "Your payment is being reviewed for security. We'll verify and confirm shortly — please don't pay again yet.",
      "pay.error.title": "We couldn't confirm the payment", "pay.error.lead": "Write to us with your order number and we'll check it right away.",
      "pay.retry": "Try again", "pay.order": "Order",
      "co.err.pay": "We couldn't start the card payment. Try again or choose bank transfer.",
      "co.err.stale": "Prices have been updated. Reload the page to see the correct amount.",
      "co.notes": "Notes (optional)", "co.notes.ph": "Preferred time, address references, questions…",
      "co.summary": "Summary", "co.total": "Total",
      "co.notice": "Nothing is charged automatically. When you send your order you will see the account details and the exact amount in quetzales to transfer.",
      "co.submit": "Send order", "co.sending": "Sending…", "co.back": "Back to order",
      "co.err.required": "Please complete the highlighted fields.", "co.err.send": "We couldn't send your order. Try again or email us at {email}.",
      "ok.title": "Order received!", "ok.lead": "Use your order number as the reference when you transfer. Once we receive your receipt we confirm availability and arrange delivery.", "ok.close": "Close", "ok.wa": "Confirm on WhatsApp",
      "close": "Close",
      "wa.order": "Hi, I just sent order {num} on Glow Peptides GT.",
    },
  };

  /* ------------------------------------------------------------------ */
  /* State                                                               */
  /* ------------------------------------------------------------------ */
  let lang = (function () { try { return localStorage.getItem("gpgt_lang") || "es"; } catch (e) { return "es"; } })();
  let cart = (function () { try { return JSON.parse(localStorage.getItem("gpgt_cart") || "{}"); } catch (e) { return {}; } })();
  let activeCat = "all";
  let currentView = null;
  const VIEW_HASH = { inicio: "", coas: "#certificados", aprende: "#aprende" };
  let libType = "all";
  let libQuery = "";
  const LIB = Array.isArray(window.LIBRARY) ? window.LIBRARY : [];
  const LIB_TYPES = ["all", "guide", "compare", "method", "prep", "blog"];

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const t = (k, vars) => { let s = (I18N[lang] && I18N[lang][k]) || I18N.es[k] || k; if (vars) Object.keys(vars).forEach(v => { s = s.replace("{" + v + "}", vars[v]); }); return s; };
  const L = (o) => (o && (o[lang] || o.es)) || "";
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
  const usd = (n) => "$" + n.toFixed(2);
  // Whole quetzales per unit, so the lines a customer sees sum exactly to what they transfer.
  const qUnit = (usdPrice) => Math.round(usdPrice * CONFIG.fxRate);
  const fmtQ = (q) => "Q" + q.toLocaleString(lang === "es" ? "es-GT" : "en-US");
  const gtq = (n) => fmtQ(qUnit(n));
  const cartTotalQ = () => cartItems().reduce((s, x) => s + qUnit(x.p.price) * x.qty, 0);
  const prodName = (p) => (lang === "en" && p.nameEn) ? p.nameEn : p.name;
  const bySlug = (slug) => PRODUCTS.find(p => p.slug === slug);
  const coaOf = (p) => p.coa ? COAS.find(c => c.id === p.coa) : null;
  const saveCart = () => { try { localStorage.setItem("gpgt_cart", JSON.stringify(cart)); } catch (e) { /* ignore */ } };
  const cartItems = () => Object.keys(cart).map(slug => ({ p: bySlug(slug), qty: cart[slug] })).filter(x => x.p && x.qty > 0);
  const cartTotal = () => cartItems().reduce((s, x) => s + x.p.price * x.qty, 0);
  const cartCount = () => cartItems().reduce((s, x) => s + x.qty, 0);

  const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  const ICON_BANK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10h18M5 10V20M19 10V20M3 20h18M12 3l9 5H3z"/></svg>';
  const ICON_DOC = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>';
  const ICON_INFO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>';

  /* ------------------------------------------------------------------ */
  /* Rendering                                                           */
  /* ------------------------------------------------------------------ */
  function applyStatic() {
    document.documentElement.lang = lang;
    $$("[data-i18n]").forEach(el => { el.textContent = t(el.getAttribute("data-i18n")); });
    $$("[data-i18n-html]").forEach(el => { el.innerHTML = t(el.getAttribute("data-i18n-html")); });
    $$("[data-i18n-placeholder]").forEach(el => { el.placeholder = t(el.getAttribute("data-i18n-placeholder")); });
    $$(".lang-toggle button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    document.title = lang === "es" ? "Glow Peptides GT — Péptidos premium en Guatemala" : "Glow Peptides GT — Premium peptides in Guatemala";
    const mail = "mailto:" + CONFIG.contactEmail;
    $("#contactEmail").href = mail + "?subject=" + encodeURIComponent(lang === "es" ? "Consulta — Glow Peptides GT" : "Inquiry — Glow Peptides GT");
    $("#footerEmail").href = mail; $("#footerEmail").textContent = CONFIG.contactEmail;
    const wa = $("#contactWa");
    if (CONFIG.whatsapp) { wa.hidden = false; wa.href = "https://wa.me/" + CONFIG.whatsapp; } else { wa.hidden = true; }
    $("#year").textContent = new Date().getFullYear();
  }

  function renderChips() {
    $("#chips").innerHTML = CATEGORIES.map(c => `<button type="button" class="chip" data-cat="${c.id}" aria-pressed="${String(c.id === activeCat)}">${esc(c[lang] || c.es)}</button>`).join("");
  }

  function renderGrid() {
    const list = PRODUCTS.filter(p => activeCat === "all" || p.cats.includes(activeCat));
    $("#grid").innerHTML = list.map(p => {
      const coa = coaOf(p);
      return `<article class="card" data-slug="${p.slug}">
        <div class="card-media" role="button" tabindex="0" aria-label="${esc(prodName(p))} ${esc(p.strength)}">
          ${p.featured ? `<span class="badge">${lang === "es" ? "Popular" : "Popular"}</span>` : ""}
          ${coa ? `<span class="badge coa">${t("card.coa")} ${esc(coa.purity)}</span>` : ""}
          <img src="${p.img}" alt="${esc(prodName(p))} ${esc(p.strength)}" loading="lazy" />
        </div>
        <div class="card-body">
          <div class="card-title"><h3>${esc(prodName(p))}</h3><span class="strength">${esc(p.strength)}</span></div>
          <p class="tagline">${esc(L(p.tagline))}</p>
          <div class="price"><span class="usd">${usd(p.price)}</span><span class="gtq">${gtq(p.price)}</span></div>
          <div class="card-actions">
            <button type="button" class="btn btn-outline" data-action="details">${t("card.details")}</button>
            <button type="button" class="btn btn-primary" data-action="add">${t("card.add")}</button>
          </div>
        </div>
      </article>`;
    }).join("");
  }

  function renderCoas() {
    $("#coaRows").innerHTML = COAS.map(c => `<tr>
      <td><strong>${esc(c.product)}</strong>${c.primary ? ` <span class="badge-current">${t("coas.current")}</span>` : ""}</td>
      <td>${esc(c.lot)}</td>
      <td class="purity">${esc(c.purity)}</td>
      <td>${esc(c.date)}</td>
      <td><a href="${c.file}" target="_blank" rel="noopener">${ICON_DOC} ${t("coas.view")}</a></td>
    </tr>`).join("");
  }

  /* ---- Library (learn hub) ---- */
  function libItems() {
    const q = libQuery.trim().toLowerCase();
    return LIB.filter(x => (libType === "all" || x.type === libType) &&
      (!q || (x.title + " " + (x.title_es || "") + " " + (x.subtitle || "") + " " + (x.subtitle_es || "") + " " + (x.tags || []).join(" ")).toLowerCase().includes(q)));
  }
  const libTitle = (x) => ((lang === "es" && x.title_es) ? x.title_es : x.title);
  const libSub = (x) => ((lang === "es" && x.html_es) ? (x.subtitle_es || "") : (x.subtitle || ""));
  const libHtml = (x) => ((lang === "es" && x.html_es) ? x.html_es : x.html);
  const englishOnly = (x) => lang === "es" && !x.html_es;
  function libCover(x) {
    if (x.type === "blog" && x.cover) return `<img src="${x.cover}" alt="" loading="lazy" />`;
    const p = x.productSlug ? bySlug(x.productSlug) : null;
    if (p) return `<img class="vial" src="${p.img}" alt="" loading="lazy" />`;
    const glyph = x.type === "compare" ? "⇄" : x.type === "method" ? "🔬" : x.type === "prep" ? "🧪" : "📄";
    return `<span style="font-size:2rem;opacity:.5">${glyph}</span>`;
  }
  function renderLibrary() {
    const chips = $("#libChips"); if (!chips) return;
    chips.innerHTML = LIB_TYPES.map(ty => `<button type="button" class="chip" data-libtype="${ty}" aria-pressed="${String(ty === libType)}">${t("lib." + ty)}${ty === "all" ? ` (${LIB.length})` : ` (${LIB.filter(x => x.type === ty).length})`}</button>`).join("");
    const items = libItems();
    $("#libGrid").innerHTML = items.length ? items.map(x => `<button type="button" class="lib-card" data-action="read" data-slug="${x.slug}">
        <div class="cover">${libCover(x)}</div>
        <div class="body">
          <div class="meta"><span class="type ${x.type}">${t("lib.type." + x.type)}</span>${x.date ? `<span>${esc(x.date)}</span>` : ""}${englishOnly(x) ? `<span class="lang">EN</span>` : ""}</div>
          <h3>${esc(libTitle(x))}</h3>
          <p>${esc(libSub(x))}</p>
        </div>
      </button>`).join("") : `<div class="lib-empty">${t("lib.empty")}</div>`;
  }
  function openArticle(slug) {
    const x = LIB.find(i => i.slug === slug); if (!x) return;
    const p = x.productSlug ? bySlug(x.productSlug) : null;
    const note = englishOnly(x) && t("lib.langnote") ? `<div class="lang-note">${ICON_INFO.replace("<svg", '<svg width="18" height="18"')}<span>${t("lib.langnote")}</span></div>` : "";
    openModal(`<article class="article">
      <div class="meta"><span class="type">${t("lib.type." + x.type)}</span>${x.date ? `<span>${esc(x.date)}</span>` : ""}${x.author ? `<span>${t("lib.by")} ${esc(x.author)}</span>` : ""}</div>
      <h1>${esc(libTitle(x))}</h1>
      ${libSub(x) ? `<p class="subtitle">${esc(libSub(x))}</p>` : ""}
      ${note}
      ${x.type === "blog" && x.cover ? `<div class="cover"><img src="${x.cover}" alt="" /></div>` : ""}
      <div class="body">${libHtml(x)}</div>
      <div class="actions">
        ${p ? `<button type="button" class="btn btn-primary" data-action="details" data-slug="${p.slug}">${t("lib.viewProduct")}: ${esc(prodName(p))} ${esc(p.strength)}</button>` : ""}
        <button type="button" class="btn btn-outline" data-action="back-to-library">${t("lib.back")}</button>
      </div>
    </article>`, true);
    history.replaceState(null, "", "#/aprende/" + slug);
  }

  function renderCart() {
    const items = cartItems();
    $("#cartCount").textContent = cartCount() || "";
    $("#cartCount").dataset.zero = String(cartCount() === 0);
    if (!items.length) {
      $("#cartBody").innerHTML = `<div class="empty"><p>${t("cart.empty")}</p><button type="button" class="btn btn-outline" data-action="browse">${t("cart.browse")}</button></div>`;
      $("#cartFoot").innerHTML = "";
      return;
    }
    $("#cartBody").innerHTML = items.map(({ p, qty }) => `<div class="line-item" data-slug="${p.slug}">
      <img src="${p.img}" alt="" />
      <div>
        <div class="name">${esc(prodName(p))} <span class="meta">· ${esc(p.strength)}</span></div>
        <div class="meta">${usd(p.price)} · ${gtq(p.price)}</div>
        <div class="qty" style="margin-top:6px"><button type="button" data-action="dec" aria-label="−">−</button><span>${qty}</span><button type="button" data-action="inc" aria-label="+">+</button></div>
      </div>
      <div><div class="line-price">${usd(p.price * qty)}</div><button type="button" class="remove" data-action="remove">${t("cart.remove")}</button></div>
    </div>`).join("");
    const total = cartTotal();
    $("#cartFoot").innerHTML = `<div class="totals">
        <div class="row total"><span>${t("cart.subtotal")}</span><span>${usd(total)}</span></div>
        <div class="row"><span></span><span class="gtq">${t("cart.transfer")} ${fmtQ(cartTotalQ())}</span></div>
      </div>
      <p class="muted" style="font-size:.82rem">${t("cart.note")}</p>
      <button type="button" class="btn btn-teal btn-block" data-action="checkout">${t("cart.checkout")}</button>
      <button type="button" class="btn btn-ghost btn-block" data-action="close">${t("cart.continue")}</button>`;
  }

  function openCart() { $("#cartDrawer").classList.add("open"); $("#scrim").classList.add("open"); $("#cartDrawer").setAttribute("aria-hidden", "false"); $("#cartBtn").setAttribute("aria-expanded", "true"); document.body.classList.add("no-scroll"); }
  function closeCart() { $("#cartDrawer").classList.remove("open"); $("#scrim").classList.remove("open"); $("#cartDrawer").setAttribute("aria-hidden", "true"); $("#cartBtn").setAttribute("aria-expanded", "false"); if (!$("#modal").classList.contains("open")) document.body.classList.remove("no-scroll"); }

  function openModal(html, wide) { const panel = $("#modalPanel"); panel.classList.toggle("wide", !!wide); panel.innerHTML = `<button type="button" class="icon-btn modal-close" data-action="close-modal" aria-label="${t("close")}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>` + html; $("#modal").classList.add("open"); document.body.classList.add("no-scroll"); panel.scrollTop = 0; }
  function closeModal(keepHash) { $("#modal").classList.remove("open"); if (!$("#cartDrawer").classList.contains("open")) document.body.classList.remove("no-scroll"); if (!keepHash && location.hash.startsWith("#/")) history.replaceState(null, "", location.pathname + location.search + VIEW_HASH[currentView]); }

  function openProduct(slug) {
    const p = bySlug(slug); if (!p) return;
    const coa = coaOf(p);
    openModal(`<div class="pd">
      <div class="pd-media"><img src="${p.img}" alt="${esc(prodName(p))} ${esc(p.strength)}" /></div>
      <div class="pd-body">
        <div>
          <h2>${esc(prodName(p))}</h2>
          <div class="strength-line">${esc(p.strength)}${p.blend ? ` · <span class="blend">${t("pd.blend")}: ${esc(p.blend)}</span>` : ""}</div>
        </div>
        <p class="tagline">${esc(L(p.tagline))}</p>
        <p style="color:var(--ink-2)">${esc(L(p.description))}</p>
        <div class="pd-section"><h3>${t("pd.uses")}</h3><ul class="benefits">${(L(p.benefits) || []).map(b => `<li>${ICON_CHECK}<span>${esc(b)}</span></li>`).join("")}</ul></div>
        <div class="pd-section"><h3>${t("pd.how")}</h3><p>${esc(L(p.how))}</p></div>
        <div class="pd-section"><h3>${t("pd.know")}</h3><p>${esc(L(p.know))}</p></div>
        <div class="pd-coa">${ICON_DOC}<span>${coa ? `${t("pd.coa")}: <strong>${esc(coa.lot)}</strong> · ${esc(coa.purity)} — <a href="${coa.file}" target="_blank" rel="noopener">${t("pd.coa.view")}</a>` : t("pd.coa.none")}</span></div>
        ${(function () { const g = LIB.find(i => i.type === "guide" && i.productSlug === p.slug); return g ? `<a href="#/aprende/${g.slug}" class="btn btn-ghost" style="justify-content:flex-start;padding-left:0" data-action="read" data-slug="${g.slug}">${t("lib.guideFor")}</a>` : ""; })()}
        <div class="pd-buy">
          <div class="price"><span class="usd">${usd(p.price)}</span><span class="gtq">${gtq(p.price)}</span></div>
          <button type="button" class="btn btn-primary btn-block" data-action="add" data-slug="${p.slug}">${t("pd.add")}</button>
        </div>
      </div>
    </div>`);
    history.replaceState(null, "", "#/p/" + slug);
  }

  /* ------------------------------------------------------------------ */
  /* Card payment (CyberSource Secure Acceptance, Hosted Checkout)        */
  /* ------------------------------------------------------------------ */
  // The site asks the server what it can actually do rather than trusting a
  // flag here, so the card option can never appear before the keys exist.
  let payConfig = null;
  async function ensurePayConfig() {
    if (payConfig) return payConfig;
    try {
      const r = await fetch("/.netlify/functions/pay-config");
      payConfig = r.ok ? await r.json() : { card: false };
    } catch (e) { payConfig = { card: false }; }
    return payConfig;
  }

  // While CyberSource is still on its TEST account, the card option must stay
  // hidden from real customers — a test gateway takes no money. Open the site
  // with ?pruebapago=1 to unlock it for the certification test.
  let payTestUnlocked = false;
  try {
    if (/[?&]pruebapago=1/.test(location.search)) { localStorage.setItem("gpgt_paytest", "1"); }
    payTestUnlocked = localStorage.getItem("gpgt_paytest") === "1";
  } catch (e) { payTestUnlocked = /[?&]pruebapago=1/.test(location.search); }

  const cardOffered = () => !!(payConfig && payConfig.card && (payConfig.env === "live" || payTestUnlocked));

  // NeoNet require a Device Fingerprint on every production transaction. The
  // profiling script must load before the order is submitted, so it goes in as
  // soon as the checkout opens. We send only the unique identifier; the script
  // gets merchantID + identifier as its session_id.
  let deviceFingerprintId = null;
  function ensureDeviceFingerprint() {
    const df = payConfig && payConfig.deviceFingerprint;
    if (!df || deviceFingerprintId) return;
    deviceFingerprintId = (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).toUpperCase();
    const sid = encodeURIComponent(df.merchantId + deviceFingerprintId);
    const org = encodeURIComponent(df.orgId);
    const sc = document.createElement("script");
    sc.type = "text/javascript";
    sc.src = `https://h.online-metrix.net/fp/tags.js?org_id=${org}&session_id=${sid}`;
    document.head.appendChild(sc);
    const ns = document.createElement("noscript");
    ns.innerHTML = `<iframe style="width:100px;height:100px;border:0;position:absolute;top:-5000px" src="https://h.online-metrix.net/fp/tags?org_id=${org}&session_id=${sid}"></iframe>`;
    document.body.appendChild(ns);
  }

  const payButtonLabel = (method) =>
    method === "tarjeta" ? t("co.pay", { amount: fmtQ(cartTotalQ()) }) : t("co.submit");

  function paymentField() {
    if (!cardOffered()) {
      return `<div class="field"><label>${t("co.payment")}</label>
        <div class="pay-method">${ICON_BANK}<span><span class="rl">${t("co.bank")}</span><br /><span class="rd">${t("co.bank.d")}</span></span></div>
      </div>`;
    }
    return `<div class="field"><label>${t("co.payment")}</label>
      <div class="radio-group">
        <label class="radio"><input type="radio" name="pago" value="tarjeta" checked /><span><span class="rl">${t("co.card")}</span><br /><span class="rd">${t("co.card.d")}</span></span></label>
        <label class="radio"><input type="radio" name="pago" value="transferencia" /><span><span class="rl">${t("co.bank")}</span><br /><span class="rd">${t("co.bank.d")}</span></span></label>
      </div>
      ${payConfig.env === "test" ? `<p class="muted" style="margin-top:8px">${t("co.card.test")}</p>` : ""}
    </div>`;
  }

  async function openCheckout() {
    const items = cartItems(); if (!items.length) return;
    closeCart();
    await ensurePayConfig();
    ensureDeviceFingerprint();
    const total = cartTotal();
    const loc = L(CONFIG.pickupLocation);
    openModal(`<form class="checkout" id="checkoutForm" novalidate>
      <div><h2>${t("co.title")}</h2><p class="muted" style="margin-top:6px">${t("co.lead")}</p></div>
      <div class="form-grid two">
        <div class="field"><label for="f-nombre">${t("co.name")} *</label><input id="f-nombre" name="nombre" required autocomplete="name" /></div>
        <div class="field"><label for="f-telefono">${t("co.phone")} *</label><input id="f-telefono" name="telefono" type="tel" required autocomplete="tel" placeholder="+502 5555 1234" /></div>
        <div class="field" style="grid-column:1/-1"><label for="f-correo">${t("co.email")} *</label><input id="f-correo" name="correo" type="email" required autocomplete="email" /></div>
      </div>
      <div class="field"><label>${t("co.delivery")}</label>
        <div class="radio-group">
          <label class="radio"><input type="radio" name="entrega" value="pickup" checked /><span><span class="rl">${t("co.pickup")}</span><br /><span class="rd">${t("co.pickup.d", { loc })}</span></span></label>
          <label class="radio"><input type="radio" name="entrega" value="domicilio" /><span><span class="rl">${t("co.home")}</span><br /><span class="rd">${t("co.home.d")}</span></span></label>
        </div>
      </div>
      <div class="form-grid two" id="addrFields" hidden>
        <div class="field" style="grid-column:1/-1"><label for="f-direccion">${t("co.address")} *</label><input id="f-direccion" name="direccion" autocomplete="street-address" /></div>
        <div class="field"><label for="f-municipio">${t("co.municipio")} *</label><input id="f-municipio" name="municipio" placeholder="Zona 10, Mixco, Antigua…" /></div>
        <div class="field"><label for="f-departamento">${t("co.departamento")} *</label><select id="f-departamento" name="departamento">${DEPARTAMENTOS.map(d => `<option${d === "Guatemala" ? " selected" : ""}>${d}</option>`).join("")}</select></div>
      </div>
      ${paymentField()}
      <div class="field"><label for="f-notas">${t("co.notes")}</label><textarea id="f-notas" name="notas" placeholder="${esc(t("co.notes.ph"))}"></textarea></div>
      <div class="summary">
        <strong>${t("co.summary")}</strong>
        ${items.map(({ p, qty }) => `<div class="row"><span>${qty} × ${esc(prodName(p))} ${esc(p.strength)}</span><span>${usd(p.price * qty)}</span></div>`).join("")}
        <div class="row total"><span>${t("co.total")}</span><span>${fmtQ(cartTotalQ())} <span class="muted" style="font-weight:500">(${usd(total)})</span></span></div>
      </div>
      <div class="notice">${ICON_INFO}<span>${t("co.notice")}</span></div>
      <p class="form-error" id="formError" hidden></p>
      <button type="submit" class="btn btn-teal btn-block" id="submitBtn">${t("co.submit")}</button>
      <button type="button" class="btn btn-ghost btn-block" data-action="back-to-cart">${t("co.back")}</button>
    </form>`);
    history.replaceState(null, "", "#/checkout");
    const sb = $("#submitBtn");
    if (sb && cardOffered()) sb.textContent = payButtonLabel("tarjeta");
  }

  function orderNumber() {
    const d = new Date(); const pad = n => String(n).padStart(2, "0");
    const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `GT-${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${rnd}`;
  }

  function orderSummaryText(items, total) {
    const lines = items.map(({ p, qty }) => `${qty} × ${p.name} ${p.strength} — ${usd(p.price * qty)}`);
    lines.push(`TOTAL: ${fmtQ(cartTotalQ())} GTQ  (${usd(total)} USD)`);
    return lines.join("\n");
  }

  async function submitOrder(form) {
    const err = $("#formError"); err.hidden = true;
    const data = new FormData(form);
    const delivery = data.get("entrega");
    const required = ["nombre", "telefono", "correo"].concat(delivery === "domicilio" ? ["direccion", "municipio"] : []);
    let bad = false;
    required.forEach(n => { const el = form.elements[n]; if (!el) return; const ok = String(el.value || "").trim().length > 1; el.style.borderColor = ok ? "" : "#b42318"; if (!ok) bad = true; });
    const emailEl = form.elements.correo; if (emailEl && !/^\S+@\S+\.\S+$/.test(emailEl.value)) { emailEl.style.borderColor = "#b42318"; bad = true; }
    if (bad) { err.textContent = t("co.err.required"); err.hidden = false; return; }

    const items = cartItems(); const total = cartTotal(); const num = orderNumber();
    const method = (form.elements.pago && form.elements.pago.value) || "transferencia";
    const body = new URLSearchParams();
    body.set("form-name", CONFIG.formName);
    body.set("numero_pedido", num);
    body.set("nombre", data.get("nombre")); body.set("telefono", data.get("telefono")); body.set("correo", data.get("correo"));
    body.set("entrega", delivery === "domicilio" ? "Entrega a domicilio" : "Recoger");
    body.set("direccion", delivery === "domicilio" ? data.get("direccion") : ""); body.set("municipio", delivery === "domicilio" ? data.get("municipio") : ""); body.set("departamento", delivery === "domicilio" ? data.get("departamento") : "");
    body.set("pago", method === "tarjeta" ? "Tarjeta (CyberSource)" : "Transferencia bancaria — " + CONFIG.bank.name);
    body.set("notas", data.get("notas") || "");
    body.set("resumen", orderSummaryText(items, total));
    body.set("total_usd", total.toFixed(2)); body.set("total_gtq", String(Math.round(total * CONFIG.fxRate)));
    body.set("idioma", lang);

    const payload = {
      num, nombre: data.get("nombre"), telefono: data.get("telefono"), correo: data.get("correo"),
      entrega: body.get("entrega"), direccion: body.get("direccion"), municipio: body.get("municipio"),
      departamento: body.get("departamento"), pago: body.get("pago"), notas: body.get("notas"),
      idioma: lang, totalUsd: total, totalQ: cartTotalQ(),
      items: items.map(({ p, qty }) => ({ slug: p.slug, name: p.name, strength: p.strength, qty, usd: p.price, gtq: qUnit(p.price) })),
    };

    const btn = $("#submitBtn"); btn.disabled = true; btn.textContent = method === "tarjeta" ? t("co.redirect") : t("co.sending");
    try {
      const isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);

      // Card: the server stores the order and signs the amount, then the browser
      // hands the customer to CyberSource. The cart is deliberately left alone —
      // it is cleared on the receipt screen, so a declined card keeps the order
      // intact to retry.
      if (method === "tarjeta" && !isLocal) {
        const r = await fetch("/.netlify/functions/pay-start", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: { ...payload, deviceFingerprintId } }),
        });
        if (r.status === 409) { const e = new Error("stale prices"); e.stale = true; throw e; }
        const out = r.ok ? await r.json() : null;
        if (!out || !out.fields || !out.endpoint) throw new Error("pay-start " + r.status);
        const f = document.createElement("form");
        f.method = "POST"; f.action = out.endpoint; f.style.display = "none";
        Object.keys(out.fields).forEach((k) => {
          const i = document.createElement("input");
          i.type = "hidden"; i.name = k; i.value = out.fields[k];
          f.appendChild(i);
        });
        document.body.appendChild(f);
        f.submit();
        return;
      }

      if (isLocal) { await new Promise(r => setTimeout(r, 500)); }
      else {
        // The function stores the order for the admin centre and forwards it to the
        // Netlify form so the email alerts still fire. If it is unavailable we post
        // the form directly, so an order is never lost to a function outage.
        let stored = false;
        try {
          const r = await fetch("/.netlify/functions/order", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: payload }),
          });
          stored = r.ok;
        } catch (e) { stored = false; }
        if (!stored) {
          const res = await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() });
          if (!res.ok) throw new Error("HTTP " + res.status);
        }
      }
      const paidQ = cartTotalQ();
      cart = {}; saveCart(); renderCart();
      showSuccess(num, paidQ);
    } catch (e) {
      console.error("order submit failed", e);
      err.textContent = e && e.stale ? t("co.err.stale")
        : method === "tarjeta" ? t("co.err.pay") : t("co.err.send", { email: CONFIG.contactEmail });
      err.hidden = false;
      btn.disabled = false; btn.textContent = payButtonLabel(method);
    }
  }

  function bankPanel(num, amountQ) {
    const b = CONFIG.bank;
    if (!b || !b.number) return "";
    const rows = [
      [t("bank.bank"), b.name],
      [t("bank.type"), L(b.type)],
      [t("bank.number"), b.number],
      [t("bank.holder"), b.holder],
      [t("bank.ref"), num],
    ];
    const plain = `${t("bank.amount")} ${fmtQ(amountQ)}\n` + rows.map(([k, v]) => `${k}: ${v}`).join("\n");
    return `<section class="bank">
      <h3>${t("bank.title")}</h3>
      <div class="bank-amount"><span>${t("bank.amount")}</span><strong>${fmtQ(amountQ)}</strong></div>
      <dl class="bank-rows">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
      <p class="bank-after">${t("bank.after")}</p>
      <button type="button" class="btn btn-outline btn-sm" data-action="copy-bank" data-copy="${esc(plain)}">${t("bank.copy")}</button>
    </section>`;
  }

  function showSuccess(num, amountQ) {
    const wa = CONFIG.whatsapp ? `<a class="btn btn-teal" href="https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(t("wa.order", { num }))}" target="_blank" rel="noopener">${t("ok.wa")}</a>` : "";
    openModal(`<div class="success">
      <div class="check">${ICON_CHECK.replace("<svg", '<svg width="32" height="32"')}</div>
      <h2>${t("ok.title")}</h2>
      <div class="order-no">${num}</div>
      <p>${t("ok.lead")}</p>
      ${bankPanel(num, amountQ)}
      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">${wa}<button type="button" class="btn btn-outline" data-action="close-modal">${t("ok.close")}</button></div>
    </div>`);
    history.replaceState(null, "", location.pathname + location.search);
  }

  // CyberSource returns the customer to /#/pago/<pedido>/<resultado>. The
  // result was decided server-side against the signed reply — this only draws it.
  function showPayResult(num, result) {
    const done = result === "ok" || result === "revision";
    if (done) { cart = {}; saveCart(); renderCart(); }
    const titles = { ok: "pay.ok", revision: "pay.review", fail: "pay.fail" };
    const key = titles[result] || "pay.error";
    const wa = CONFIG.whatsapp
      ? `<a class="btn ${result === "ok" ? "btn-outline" : "btn-teal"}" href="https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(t("wa.order", { num }))}" target="_blank" rel="noopener">${t("ok.wa")}</a>`
      : "";
    const retry = result === "fail" || result === "error"
      ? `<button type="button" class="btn btn-teal" data-action="checkout">${t("pay.retry")}</button>` : "";
    openModal(`<div class="success">
      <div class="check">${result === "ok" ? ICON_CHECK.replace("<svg", '<svg width="32" height="32"') : ICON_INFO.replace("<svg", '<svg width="32" height="32"')}</div>
      <h2>${t(key + ".title")}</h2>
      <div class="order-no">${esc(num)}</div>
      <p>${t(key + ".lead")}</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">${retry}${wa}<button type="button" class="btn btn-outline" data-action="close-modal">${t("ok.close")}</button></div>
    </div>`);
    history.replaceState(null, "", location.pathname + location.search);
  }

  function toast(msg) { const el = $("#toast"); el.textContent = msg; el.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove("show"), 1800); }

  function addToCart(slug, qty) { cart[slug] = (cart[slug] || 0) + (qty || 1); saveCart(); renderCart(); toast(t("card.added")); }

  function renderAll() { applyStatic(); renderChips(); renderGrid(); renderCoas(); renderLibrary(); renderCart(); }

  /* ------------------------------------------------------------------ */
  /* Events                                                              */
  /* ------------------------------------------------------------------ */
  document.addEventListener("click", (e) => {
    const langBtn = e.target.closest(".lang-toggle button");
    if (langBtn) { lang = langBtn.dataset.lang; try { localStorage.setItem("gpgt_lang", lang); } catch (x) { } renderAll(); if ($("#modal").classList.contains("open")) { if (location.hash === "#/checkout") openCheckout(); else route(); } return; }

    const libChip = e.target.closest(".chip[data-libtype]");
    if (libChip) { libType = libChip.dataset.libtype; renderLibrary(); return; }
    const chip = e.target.closest(".chip");
    if (chip) { activeCat = chip.dataset.cat; renderChips(); renderGrid(); return; }

    if (e.target.closest("#cartBtn")) { openCart(); return; }
    if (e.target.closest("#cartClose") || e.target === $("#scrim")) { closeCart(); return; }

    const act = e.target.closest("[data-action]");
    if (act) {
      const a = act.dataset.action;
      const card = act.closest(".card"); const line = act.closest(".line-item");
      const slug = act.dataset.slug || (card && card.dataset.slug) || (line && line.dataset.slug);
      if (a === "details" && slug) return openProduct(slug);
      if (a === "add" && slug) { addToCart(slug, 1); return; }
      if (a === "inc" && slug) { cart[slug] = (cart[slug] || 0) + 1; saveCart(); renderCart(); return; }
      if (a === "dec" && slug) { cart[slug] = Math.max(0, (cart[slug] || 0) - 1); if (!cart[slug]) delete cart[slug]; saveCart(); renderCart(); return; }
      if (a === "remove" && slug) { delete cart[slug]; saveCart(); renderCart(); return; }
      if (a === "browse") { closeCart(); if (location.hash === "#productos") route(); else location.hash = "#productos"; return; }
      if (a === "close") { closeCart(); return; }
      if (a === "checkout") { openCheckout(); return; }
      if (a === "copy-bank") {
        const text = act.dataset.copy || "";
        (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => toast(t("bank.copied"))).catch(() => {
          const ta = document.createElement("textarea");
          ta.value = text; document.body.appendChild(ta); ta.select();
          try { document.execCommand("copy"); toast(t("bank.copied")); } catch (x) { /* nothing to fall back to */ }
          ta.remove();
        });
        return;
      }
      if (a === "close-modal") { closeModal(); return; }
      if (a === "back-to-cart") { closeModal(); openCart(); return; }
      if (a === "read" && slug) { e.preventDefault(); openArticle(slug); return; }
      if (a === "back-to-library") { closeModal(true); history.replaceState(null, "", location.pathname + location.search + "#aprende"); document.getElementById("aprende").querySelector(".library").scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    }

    const media = e.target.closest(".card-media");
    if (media) { const c = media.closest(".card"); if (c) openProduct(c.dataset.slug); return; }

    if (e.target === $("#modal")) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { if ($("#modal").classList.contains("open")) closeModal(); else closeCart(); }
    if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("card-media")) { e.preventDefault(); const c = e.target.closest(".card"); if (c) openProduct(c.dataset.slug); }
  });

  document.addEventListener("change", (e) => {
    if (e.target.name === "entrega") { const addr = $("#addrFields"); if (addr) addr.hidden = e.target.value !== "domicilio"; }
    if (e.target.name === "pago") { const sb = $("#submitBtn"); if (sb) sb.textContent = payButtonLabel(e.target.value); }
  });
  document.addEventListener("input", (e) => {
    if (e.target.id === "libSearch") { libQuery = e.target.value; renderLibrary(); }
  });

  document.addEventListener("submit", (e) => {
    if (e.target.id === "checkoutForm") { e.preventDefault(); submitOrder(e.target); }
  });

  /* ---- view routing: home shows the products; certificates and the library are their own views ---- */
  function viewOfHash(h) {
    if (/^#\/aprende\//.test(h) || /^#aprende$/.test(h)) return "aprende";
    if (/^#(coas|certificados)$/.test(h)) return "coas";
    return "inicio";
  }
  function setView(v) {
    if (currentView === v) return false;
    currentView = v;
    $$("[data-view]").forEach(el => { el.hidden = el.dataset.view !== v; });
    $$(".nav a").forEach(a => {
      const href = a.getAttribute("href");
      const active = href === "#productos" ? v === "inicio" : viewOfHash(href) === v && href !== "#como-comprar" && href !== "#contacto";
      a.setAttribute("aria-current", active ? "page" : "false");
    });
    return true;
  }
  function route() {
    const h = location.hash;
    const changed = setView(viewOfHash(h));
    let m;
    if ((m = h.match(/^#\/pago\/([^/]+)\/([a-z]+)$/))) return showPayResult(decodeURIComponent(m[1]), m[2]);
    if ((m = h.match(/^#\/p\/(.+)$/))) return openProduct(m[1]);
    if ((m = h.match(/^#\/aprende\/(.+)$/))) return openArticle(m[1]);
    if ($("#modal").classList.contains("open")) closeModal(true);
    const el = h.length > 1 && !h.startsWith("#/") ? document.getElementById(h.slice(1)) : null;
    if (el && !el.hidden) el.scrollIntoView({ behavior: changed ? "auto" : "smooth", block: "start" });
    else window.scrollTo({ top: 0, behavior: changed ? "auto" : "smooth" });
  }
  window.addEventListener("hashchange", route);

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */
  renderAll();
  route();
})();
