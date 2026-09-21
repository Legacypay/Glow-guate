/* Glow Peptides GT — admin centre */
(function () {
  "use strict";

  const API = "/.netlify/functions/admin";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const Q = (n) => "Q" + Number(n || 0).toLocaleString("es-GT");
  const USD = (n) => "$" + Number(n || 0).toFixed(2);

  const PRODUCTS = window.PRODUCTS || [];
  const bySlug = (slug) => PRODUCTS.find((p) => p.slug === slug);
  const pName = (slug) => { const p = bySlug(slug); return p ? `${p.name} ${p.strength}` : slug; };

  const STATUS = {
    nuevo:          { es: "Nuevo",          hint: "Esperando transferencia" },
    pendiente_pago: { es: "Pago pendiente", hint: "Pago con tarjeta iniciado, sin aprobar" },
    pagado:     { es: "Pagado",     hint: "Transferencia confirmada" },
    entregado:  { es: "Entregado",  hint: "Entregado al cliente" },
    cancelado:  { es: "Cancelado",  hint: "Pedido cancelado" },
  };

  let token = null;
  let DATA = { orders: [], inventory: { stock: {}, lowAt: 3 }, sold: {}, stats: {} };
  let filter = "todos";
  let query = "";

  /* ---------------- api ---------------- */
  async function api(action, payload) {
    const res = await fetch(API, {
      method: "POST",
      headers: Object.assign({ "content-type": "application/json" }, token ? { authorization: "Bearer " + token } : {}),
      body: JSON.stringify(Object.assign({ action }, payload || {})),
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 401 && action !== "login") { logout(); throw new Error("sesión expirada"); }
    if (!res.ok) throw new Error(body.error || "error " + res.status);
    return body;
  }

  function toast(msg) {
    const el = $("#toast"); el.textContent = msg; el.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove("show"), 2200);
  }

  /* ---------------- auth ---------------- */
  function logout() {
    token = null;
    try { sessionStorage.removeItem("gpgt_admin"); } catch (e) {}
    $("#app").hidden = true; $("#login").hidden = false;
  }

  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("#loginBtn"), err = $("#loginError");
    err.hidden = true; btn.disabled = true; btn.textContent = "Entrando…";
    try {
      const r = await api("login", { password: $("#pw").value });
      token = r.token;
      try { sessionStorage.setItem("gpgt_admin", token); } catch (x) {}
      $("#login").hidden = true; $("#app").hidden = false;
      await load();
    } catch (x) {
      err.textContent = "Contraseña incorrecta."; err.hidden = false;
    } finally { btn.disabled = false; btn.textContent = "Entrar"; $("#pw").value = ""; }
  });

  $("#logout").addEventListener("click", logout);
  $("#refresh").addEventListener("click", () => load(true));

  /* ---------------- load + render ---------------- */
  async function load(notify) {
    try {
      DATA = await api("data");
      renderAll();
      if (notify) toast("Actualizado");
    } catch (e) { toast(e.message); }
  }

  function renderAll() { renderStats(); renderRecent(); renderLow(); renderTop(); renderOrders(); renderInventory(); renderTabCounts(); }

  function renderTabCounts() {
    const nuevos = DATA.stats.nuevo || 0;
    $("#tabOrders").textContent = nuevos ? nuevos : "";
    const low = lowStockItems().length;
    $("#tabLow").textContent = low ? low : "";
  }

  function renderStats() {
    const s = DATA.stats;
    const cards = [
      { label: "Ingresos confirmados", value: Q(s.revenueQ), sub: "pedidos pagados y entregados", accent: true },
      { label: "Últimos 30 días", value: Q(s.revenueQ30), sub: `${Q(s.revenueQ7)} en 7 días` },
      { label: "Por cobrar", value: Q(s.pendingQ), sub: `${s.nuevo || 0} pedido(s) esperando transferencia`, warn: (s.nuevo || 0) > 0 },
      { label: "Pedidos", value: s.total || 0, sub: `${s.orders7 || 0} en los últimos 7 días` },
    ];
    $("#stats").innerHTML = cards.map((c) => `
      <div class="stat ${c.accent ? "accent" : ""} ${c.warn ? "warn" : ""}">
        <div class="stat-label">${esc(c.label)}</div>
        <div class="stat-value">${esc(c.value)}</div>
        <div class="stat-sub">${esc(c.sub)}</div>
      </div>`).join("");
  }

  const fmtDate = (iso) => { const d = new Date(iso); return isNaN(d) ? "—" : d.toLocaleString("es-GT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); };

  function orderRow(o) {
    return `<button type="button" class="orow" data-order="${esc(o.num)}">
      <span class="orow-main">
        <span class="orow-num">${esc(o.num)}</span>
        <span class="orow-name">${esc(o.nombre)}</span>
      </span>
      <span class="orow-meta">
        <span class="badge s-${esc(o.status)}">${esc((STATUS[o.status] || {}).es || o.status)}</span>
        <span class="orow-total">${Q(o.totalQ)}</span>
        <span class="orow-date">${esc(fmtDate(o.createdAt))}</span>
      </span>
    </button>`;
  }

  function renderRecent() {
    const list = DATA.orders.slice(0, 6);
    $("#recentOrders").innerHTML = list.length ? list.map(orderRow).join("") : `<p class="empty-note">Todavía no hay pedidos.</p>`;
  }

  const lowStockItems = () => {
    const inv = DATA.inventory || { stock: {}, lowAt: 3 };
    return PRODUCTS.map((p) => ({ slug: p.slug, stock: Number(inv.stock[p.slug] ?? 0) }))
      .filter((x) => x.stock <= (inv.lowAt ?? 3))
      .sort((a, b) => a.stock - b.stock);
  };

  function renderLow() {
    const low = lowStockItems();
    $("#lowStock").innerHTML = low.length
      ? low.map((x) => `<div class="lrow"><span>${esc(pName(x.slug))}</span><span class="badge ${x.stock === 0 ? "s-cancelado" : "s-nuevo"}">${x.stock} en stock</span></div>`).join("")
      : `<p class="empty-note">Todo con stock suficiente.</p>`;
  }

  function renderTop() {
    const sold = DATA.sold || {};
    const rows = Object.keys(sold).map((slug) => ({ slug, qty: sold[slug] })).sort((a, b) => b.qty - a.qty).slice(0, 8);
    $("#topProducts").innerHTML = rows.length
      ? rows.map((r) => { const p = bySlug(r.slug); const rev = p ? Math.round(p.price * 7.75) * r.qty : 0;
          return `<div class="lrow"><span>${esc(pName(r.slug))}</span><span class="muted">${r.qty} vendidos · ${Q(rev)}</span></div>`; }).join("")
      : `<p class="empty-note">Aún no hay ventas confirmadas.</p>`;
  }

  /* ---------------- orders ---------------- */
  function filteredOrders() {
    const q = query.trim().toLowerCase();
    return DATA.orders.filter((o) => {
      if (filter !== "todos" && o.status !== filter) return false;
      if (!q) return true;
      return [o.num, o.nombre, o.telefono, o.correo, o.municipio].join(" ").toLowerCase().includes(q);
    });
  }

  function renderOrders() {
    const counts = { todos: DATA.orders.length };
    Object.keys(STATUS).forEach((s) => { counts[s] = DATA.orders.filter((o) => o.status === s).length; });
    $("#statusChips").innerHTML = ["todos"].concat(Object.keys(STATUS)).map((s) =>
      `<button type="button" class="chip" data-filter="${s}" aria-pressed="${s === filter}">${s === "todos" ? "Todos" : STATUS[s].es} (${counts[s] || 0})</button>`).join("");
    const list = filteredOrders();
    $("#ordersList").innerHTML = list.length
      ? `<div class="olist">${list.map(orderRow).join("")}</div>`
      : `<p class="empty-note">No hay pedidos que coincidan.</p>`;
  }

  function openOrder(num) {
    const o = DATA.orders.find((x) => x.num === num);
    if (!o) return;
    const addr = o.entrega && /domicilio/i.test(o.entrega)
      ? `${esc(o.direccion)}<br />${esc(o.municipio)}, ${esc(o.departamento)}`
      : `<span class="muted">Recoge en punto de entrega</span>`;
    const items = (o.items || []).map((i) => `<tr><td>${i.qty} ×</td><td>${esc(i.name)} ${esc(i.strength)}</td><td class="num">${Q(i.gtq * i.qty)}</td></tr>`).join("");
    const hist = (o.history || []).map((h) => `<li>${esc(fmtDate(h.at))} — ${esc(h.from ? h.from + " → " : "")}${esc(h.to)}</li>`).join("");

    $("#modalPanel").innerHTML = `
      <button type="button" class="icon-btn modal-close" data-close aria-label="Cerrar">✕</button>
      <div class="odetail">
        <header>
          <span class="badge s-${esc(o.status)}">${esc((STATUS[o.status] || {}).es || o.status)}</span>
          <h2>${esc(o.num)}</h2>
          <p class="muted">${esc(fmtDate(o.createdAt))}</p>
        </header>

        <div class="odetail-grid">
          <section class="panel">
            <h3>Cliente</h3>
            <dl class="kv">
              <div><dt>Nombre</dt><dd>${esc(o.nombre)}</dd></div>
              <div><dt>Teléfono</dt><dd><a href="https://wa.me/${esc(String(o.telefono).replace(/\D/g, ""))}" target="_blank" rel="noopener">${esc(o.telefono)}</a></dd></div>
              <div><dt>Correo</dt><dd><a href="mailto:${esc(o.correo)}">${esc(o.correo)}</a></dd></div>
              <div><dt>Entrega</dt><dd>${esc(o.entrega)}</dd></div>
              ${o.pago ? `<div><dt>Pago</dt><dd>${esc(o.pago)}</dd></div>` : ""}
              <div><dt>Dirección</dt><dd>${addr}</dd></div>
              ${o.notas ? `<div><dt>Nota del cliente</dt><dd>${esc(o.notas)}</dd></div>` : ""}
            </dl>
          </section>

          <section class="panel">
            <h3>Pedido</h3>
            <table class="items"><tbody>${items}</tbody>
              <tfoot><tr><td></td><td><strong>Total</strong></td><td class="num"><strong>${Q(o.totalQ)}</strong><br /><span class="muted">${USD(o.totalUsd)}</span></td></tr></tfoot>
            </table>
          </section>
        </div>

        ${o.payment ? `<section class="panel">
          <h3>Pago con tarjeta</h3>
          <dl class="kv">
            <div><dt>Resultado</dt><dd>${esc(o.payment.decision || "sin respuesta")}${o.payment.reasonCode ? ` (${esc(o.payment.reasonCode)})` : ""}</dd></div>
            ${o.payment.authCode ? `<div><dt>Código de autorización</dt><dd>${esc(o.payment.authCode)}</dd></div>` : ""}
            ${o.payment.cardType || o.payment.last4 ? `<div><dt>Tarjeta</dt><dd>${esc(o.payment.cardType || "")} ${o.payment.last4 ? "•••• " + esc(o.payment.last4) : ""}</dd></div>` : ""}
            ${o.payment.transactionId ? `<div><dt>ID de solicitud</dt><dd>${esc(o.payment.transactionId)}</dd></div>` : ""}
            <div><dt>Ambiente</dt><dd>${esc(o.payment.env || "")}</dd></div>
          </dl>
          <p class="muted status-hint">Busca el ID de solicitud en el Business Center de CyberSource para anular o acreditar. Las anulaciones sólo se pueden hacer el mismo día.</p>
        </section>` : ""}

        <section class="panel">
          <h3>Estado</h3>
          <div class="status-actions">
            ${Object.keys(STATUS).map((s) => `<button type="button" class="btn ${s === o.status ? "btn-teal" : "btn-outline"} btn-sm" data-status="${s}" data-num="${esc(o.num)}" ${s === o.status ? "disabled" : ""}>${STATUS[s].es}</button>`).join("")}
          </div>
          <p class="muted status-hint">Marcar <strong>Pagado</strong> descuenta el stock de estos productos. <strong>Cancelado</strong> lo devuelve.</p>
          ${hist ? `<ul class="hist">${hist}</ul>` : ""}
        </section>

        <section class="panel">
          <h3>Notas internas</h3>
          <textarea id="adminNote" rows="3" placeholder="Ej. comprobante recibido, entregar el jueves…">${esc(o.adminNotes || "")}</textarea>
          <button type="button" class="btn btn-outline btn-sm" data-savenote="${esc(o.num)}">Guardar nota</button>
        </section>
      </div>`;
    $("#modal").classList.add("open");
    document.body.classList.add("no-scroll");
  }

  function closeModal() { $("#modal").classList.remove("open"); document.body.classList.remove("no-scroll"); }

  /* ---------------- inventory ---------------- */
  function renderInventory() {
    const inv = DATA.inventory || { stock: {}, lowAt: 3 };
    $("#lowAt").value = inv.lowAt ?? 3;
    $("#invNote").textContent = `${PRODUCTS.length} productos · el stock baja al marcar un pedido como pagado`;
    $("#inventoryList").innerHTML = `<div class="table-scroll"><table class="inv">
      <thead><tr><th>Producto</th><th class="num">Vendidos</th><th class="num">En stock</th><th></th></tr></thead>
      <tbody>${PRODUCTS.map((p) => {
        const stock = Number(inv.stock[p.slug] ?? 0);
        const sold = (DATA.sold || {})[p.slug] || 0;
        const low = stock <= (inv.lowAt ?? 3);
        return `<tr class="${low ? "low" : ""}">
          <td><strong>${esc(p.name)}</strong> <span class="muted">${esc(p.strength)}</span></td>
          <td class="num">${sold}</td>
          <td class="num"><input type="number" class="stock-input" min="0" value="${stock}" data-slug="${esc(p.slug)}" /></td>
          <td class="num">${low ? `<span class="badge ${stock === 0 ? "s-cancelado" : "s-nuevo"}">${stock === 0 ? "agotado" : "bajo"}</span>` : ""}</td>
        </tr>`;
      }).join("")}</tbody></table></div>`;
  }

  /* ---------------- events ---------------- */
  document.addEventListener("click", async (e) => {
    const tab = e.target.closest("[data-tab]");
    if (tab) { showTab(tab.dataset.tab); return; }
    const goto = e.target.closest("[data-goto]");
    if (goto) { showTab(goto.dataset.goto); return; }

    const f = e.target.closest("[data-filter]");
    if (f) { filter = f.dataset.filter; renderOrders(); return; }

    const row = e.target.closest("[data-order]");
    if (row) { openOrder(row.dataset.order); return; }

    if (e.target.closest("[data-close]") || e.target === $("#modal")) { closeModal(); return; }

    const st = e.target.closest("[data-status]");
    if (st) {
      const { status, num } = st.dataset;
      st.disabled = true;
      try {
        const r = await api("setStatus", { num, status });
        const i = DATA.orders.findIndex((o) => o.num === num);
        if (i > -1) DATA.orders[i] = r.order;
        if (r.inventory) DATA.inventory = r.inventory;
        await load();
        openOrder(num);
        toast(r.moves && r.moves.length ? "Estado y stock actualizados" : "Estado actualizado");
      } catch (x) { toast(x.message); st.disabled = false; }
      return;
    }

    const sn = e.target.closest("[data-savenote]");
    if (sn) {
      try { await api("setNote", { num: sn.dataset.savenote, note: $("#adminNote").value }); await load(); toast("Nota guardada"); }
      catch (x) { toast(x.message); }
      return;
    }

    if (e.target.id === "exportCsv") {
      const rows = [["Pedido", "Fecha", "Estado", "Cliente", "Telefono", "Correo", "Entrega", "Municipio", "Departamento", "Total GTQ", "Total USD", "Productos"]];
      filteredOrders().forEach((o) => rows.push([o.num, o.createdAt, o.status, o.nombre, o.telefono, o.correo, o.entrega, o.municipio, o.departamento, o.totalQ, o.totalUsd,
        (o.items || []).map((i) => `${i.qty}x ${i.name} ${i.strength}`).join("; ")]));
      const csv = rows.map((r) => r.map((c) => `"${String(c == null ? "" : c).replace(/"/g, '""')}"`).join(",")).join("\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
      a.download = `pedidos-glow-gt-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click(); URL.revokeObjectURL(a.href);
      return;
    }
  });

  document.addEventListener("change", async (e) => {
    if (e.target.classList.contains("stock-input")) {
      try { const r = await api("setStock", { slug: e.target.dataset.slug, value: e.target.value }); DATA.inventory = r.inventory; renderAll(); toast("Stock actualizado"); }
      catch (x) { toast(x.message); }
    }
    if (e.target.id === "lowAt") {
      try { const r = await api("setLowAt", { value: e.target.value }); DATA.inventory = r.inventory; renderAll(); }
      catch (x) { toast(x.message); }
    }
  });

  $("#orderSearch").addEventListener("input", (e) => { query = e.target.value; renderOrders(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  function showTab(name) {
    $$("[data-panel]").forEach((p) => { p.hidden = p.dataset.panel !== name; });
    $$("#tabs button").forEach((b) => b.setAttribute("aria-current", b.dataset.tab === name ? "page" : "false"));
  }

  /* ---------------- boot ---------------- */
  try { token = sessionStorage.getItem("gpgt_admin"); } catch (e) {}
  if (token) {
    $("#login").hidden = true; $("#app").hidden = false;
    load();
  }
})();
