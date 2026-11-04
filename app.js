(() => {
const $ = (s, r = document) => r.querySelector(s);
const S = { data: null, hz: "5", type: "all", q: "", sort: "p_up", dir: -1, sel: null, amount: 1000 };
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const HZ_LABEL = { 1: "1 día", 5: "1 semana", 21: "1 mes", 63: "3 meses" };

const fmtPct = (x, d = 1, sign = true) => (sign && x > 0 ? "+" : "") + (x * 100).toFixed(d).replace(".", ",") + "%";
const money = (v, cur = "USD") => new Intl.NumberFormat("es-ES", { style: "currency", currency: cur, maximumFractionDigits: 2 }).format(v);
const sgn = (x) => (x > 0 ? "up" : x < 0 ? "dn" : "");
const fc = (t) => t.forecast[S.hz];
const pColor = (p) => (p >= 0.55 ? "var(--up)" : p <= 0.45 ? "var(--dn)" : "var(--ac)");

async function load() {
  try {
    const r = await fetch("data/market.json", { cache: "no-store" });
    S.data = await r.json();
  } catch (e) {
    $("#updated").textContent = "No se pudieron cargar los datos";
    $("#banner").hidden = false;
    $("#banner").textContent = "No se pudo leer data/market.json. Si abriste el archivo con doble clic, sírvelo con: python3 -m http.server";
    return;
  }
  const d = S.data;
  S.hz = store.get("hz", "5"); S.amount = store.get("amount", 1000);
  if (!d.horizons.map(String).includes(S.hz)) S.hz = "5";
  $("#updated").textContent = "Actualizado: " + new Date(d.generated_at).toLocaleString("es-ES") + " · datos al cierre del " + d.tickers[0].asof;
  if (d.demo) { $("#banner").hidden = false; $("#banner").innerHTML = "<b>Modo demo:</b> estos datos son sintéticos (no son precios reales). Ejecuta <code>python scripts/update_data.py</code> o activa la GitHub Action para datos reales."; }
  $("#horizonSeg").innerHTML = d.horizons.map((h) => `<button data-h="${h}">${HZ_LABEL[h] || h + " d"}</button>`).join("");
  $("#posSym").innerHTML = d.tickers.map((t) => `<option>${t.symbol}</option>`).join("");
  S.sel = d.tickers[0].symbol;
  bind(); render();
}

function bind() {
  $("#viewTabs").onclick = (e) => { const v = e.target.dataset.view; if (!v) return;
    document.querySelectorAll("#viewTabs button").forEach((b) => b.classList.toggle("on", b === e.target));
    ["market", "portfolio", "method"].forEach((n) => ($("#view-" + n).hidden = n !== v)); render(); };
  $("#horizonSeg").onclick = (e) => { if (!e.target.dataset.h) return; S.hz = e.target.dataset.h; store.set("hz", S.hz); render(); };
  $("#typeSeg").onclick = (e) => { if (!e.target.dataset.type) return; S.type = e.target.dataset.type;
    document.querySelectorAll("#typeSeg button").forEach((b) => b.classList.toggle("on", b === e.target)); render(); };
  $("#search").oninput = (e) => { S.q = e.target.value.toLowerCase(); render(); };
  $("#tbl thead").onclick = (e) => { const k = e.target.dataset.sort; if (!k) return;
    S.dir = S.sort === k ? -S.dir : -1; S.sort = k; render(); };
  $("#tbl tbody").onclick = (e) => { const tr = e.target.closest("tr"); if (tr) { S.sel = tr.dataset.s; render(); if (innerWidth < 900) $("#detail").scrollIntoView({ behavior: "smooth" }); } };
  $("#posSym").onchange = () => { $("#posAvg").value = tk($("#posSym").value).price; };
  $("#posForm").onsubmit = (e) => { e.preventDefault();
    const p = store.get("pos", []); p.push({ s: $("#posSym").value, q: +$("#posQty").value, a: +$("#posAvg").value });
    store.set("pos", p); render(); };
  $("#pfOut").onclick = (e) => { if (e.target.dataset.del == null) return;
    const p = store.get("pos", []); p.splice(+e.target.dataset.del, 1); store.set("pos", p); render(); };
  $("#posAvg").value = S.data.tickers[0].price;
  addEventListener("resize", () => drawChart());
}

const tk = (s) => S.data.tickers.find((t) => t.symbol === s);

function render() {
  if (!S.data) return;
  document.querySelectorAll("#horizonSeg button").forEach((b) => b.classList.toggle("on", b.dataset.h === S.hz));
  $("#pfHz").textContent = HZ_LABEL[S.hz] || S.hz + " días";
  renderTable(); renderDetail(); renderPortfolio();
}

function renderTable() {
  const val = { symbol: (t) => t.symbol, price: (t) => t.price, change: (t) => t.change_1d, p_up: (t) => fc(t).p_up, exp_ret: (t) => fc(t).exp_ret };
  const rows = S.data.tickers
    .filter((t) => (S.type === "all" || t.type === S.type) && (t.symbol + t.name).toLowerCase().includes(S.q))
    .sort((a, b) => { const x = val[S.sort](a), y = val[S.sort](b); return (x > y ? 1 : x < y ? -1 : 0) * S.dir; });
  $("#tbl tbody").innerHTML = rows.map((t) => { const f = fc(t);
    return `<tr class="row ${t.symbol === S.sel ? "sel" : ""}" data-s="${t.symbol}">
      <td><span class="sym">${t.symbol}</span><span class="nm">${t.name}</span></td>
      <td class="r">${money(t.price, t.currency)}</td><td class="r ${sgn(t.change_1d)}">${fmtPct(t.change_1d, 2)}</td>
      <td><div class="pbar"><span>${(f.p_up * 100).toFixed(0)}%</span><i><b style="width:${f.p_up * 100}%;background:${pColor(f.p_up)}"></b></i></div></td>
      <td class="r ${sgn(f.exp_ret)}">${fmtPct(f.exp_ret, 2)}</td></tr>`; }).join("") || `<tr><td colspan="5" class="muted">Sin resultados</td></tr>`;
}

function scoreText(s) { return s > 0.5 ? "Muy alcista" : s > 0.15 ? "Alcista" : s < -0.5 ? "Muy bajista" : s < -0.15 ? "Bajista" : "Neutral"; }

function renderDetail() {
  const t = tk(S.sel); if (!t) return; const f = fc(t), ind = t.indicators, cur = t.currency, bt = t.backtest;
  const A = S.amount, C = 2 * Math.PI * 62;
  const gain = A * f.up_mean, loss = A * f.down_mean, ev = A * f.exp_ret;
  $("#detail").innerHTML = `<div class="card">
    <div class="head"><h2>${t.symbol} <span class="muted" style="font-size:14px;font-weight:400">${t.name} · ${t.type === "etf" ? "ETF" : "Acción"}</span></h2>
      <div><b>${money(t.price, cur)}</b> <span class="${sgn(t.change_1d)}">${fmtPct(t.change_1d, 2)}</span></div></div>
    <div class="hero">
      <div class="gauge"><svg viewBox="0 0 140 140"><circle cx="70" cy="70" r="62" fill="none" stroke="var(--line)" stroke-width="12"/>
        <circle cx="70" cy="70" r="62" fill="none" stroke="${pColor(f.p_up)}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C * f.p_up} ${C}"/></svg>
        <div class="v">${(f.p_up * 100).toFixed(0)}%<small>subir en ${HZ_LABEL[S.hz] || S.hz + " d"}</small></div></div>
      <div>
        <div class="calc"><label class="muted small">Si inviertes</label><input id="amt" type="number" min="0" step="100" value="${A}"><span class="muted">${cur}</span></div>
        <div class="grid">
          <div class="stat"><span>Si sube (media)</span><b class="up">${money(gain, cur)}</b><em>${fmtPct(f.up_mean, 2)} · prob. ${(f.p_up * 100).toFixed(0)}%</em></div>
          <div class="stat"><span>Si baja (media)</span><b class="dn">${money(loss, cur)}</b><em>${fmtPct(f.down_mean, 2)} · prob. ${((1 - f.p_up) * 100).toFixed(0)}%</em></div>
          <div class="stat"><span>Valor esperado</span><b class="${sgn(ev)}">${money(ev, cur)}</b><em>${fmtPct(f.exp_ret, 2)}</em></div>
        </div></div></div>
    <div class="grid">
      <div class="stat"><span>Escenario optimista (P90)</span><b class="up">${money(A * f.q90, cur)}</b><em>${fmtPct(f.q90, 1)} · 1 de cada 10</em></div>
      <div class="stat"><span>Escenario central (P50)</span><b>${money(A * f.q50, cur)}</b><em>${fmtPct(f.q50, 1)}</em></div>
      <div class="stat"><span>Escenario adverso (P10)</span><b class="dn">${money(A * f.q10, cur)}</b><em>${fmtPct(f.q10, 1)} · 1 de cada 10</em></div>
    </div>
    <canvas id="chart"></canvas><p class="muted small">Último año + cono de probabilidad (rango 80 %, línea punteada = mediana).</p>
    <div class="sec"><h3>Señales técnicas</h3><div class="grid">
      <div class="stat"><span>Señal global</span><b>${scoreText(ind.score)}</b><em>puntuación ${ind.score}</em></div>
      <div class="stat"><span>RSI (14)</span><b>${ind.rsi14}</b><em>${ind.rsi14 > 70 ? "sobrecompra" : ind.rsi14 < 30 ? "sobreventa" : "zona normal"}</em></div>
      <div class="stat"><span>Precio vs SMA200</span><b class="${sgn(t.price - ind.sma200)}">${fmtPct(t.price / ind.sma200 - 1, 1)}</b><em>SMA50 ${money(ind.sma50, cur)}</em></div>
      <div class="stat"><span>Momentum 1m / 3m</span><b>${fmtPct(ind.mom_1m, 1)} / ${fmtPct(ind.mom_3m, 1)}</b></div>
      <div class="stat"><span>Volatilidad anual</span><b>${fmtPct(ind.vol_ann, 1, false)}</b></div>
      <div class="stat"><span>Caída desde máximo 1 año</span><b class="dn">${fmtPct(ind.drawdown, 1)}</b></div></div></div>
    ${bt ? `<div class="sec"><h3>Fiabilidad histórica (backtest a ${bt.horizon} días)</h3><div class="grid">
      <div class="stat"><span>Acierto de dirección</span><b>${(bt.accuracy * 100).toFixed(1)}%</b><em>${bt.n} predicciones</em></div>
      <div class="stat"><span>Tasa base (subió)</span><b>${(bt.base_rate_up * 100).toFixed(1)}%</b><em>si siempre dijeras “sube”</em></div>
      <div class="stat"><span>Error Brier</span><b>${bt.brier}</b><em>referencia ${bt.brier_baseline} (menor es mejor)</em></div></div></div>` : ""}
    <p class="disc">Estimación estadística, no asesoramiento financiero. Una probabilidad no es una garantía.</p></div>`;
  $("#amt").onchange = (e) => { S.amount = Math.max(0, +e.target.value || 0); store.set("amount", S.amount); renderDetail(); };
  drawChart();
}

function drawChart() {
  const cv = $("#chart"); if (!cv) return; const t = tk(S.sel), ctx = cv.getContext("2d"), dpr = devicePixelRatio || 1;
  const W = cv.clientWidth, H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const hist = t.history.c, n = hist.length, HZ = S.data.horizons, maxH = HZ[HZ.length - 1];
  const last = hist[n - 1];
  const pts = [[0, 0, 0, 0], ...HZ.map((h) => [h, t.forecast[h].q10, t.forecast[h].q50, t.forecast[h].q90])];
  const lo = Math.min(...hist, ...pts.map((p) => last * (1 + p[1]))), hi = Math.max(...hist, ...pts.map((p) => last * (1 + p[3])));
  const pad = { l: 8, r: 52, t: 8, b: 8 }, total = n + maxH * 0.9;
  const X = (i) => pad.l + (i / total) * (W - pad.l - pad.r), Y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  ctx.clearRect(0, 0, W, H); ctx.font = "11px system-ui"; ctx.fillStyle = css("--mut"); ctx.strokeStyle = css("--line");
  for (let k = 0; k <= 4; k++) { const v = lo + ((hi - lo) * k) / 4, y = Y(v); ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke(); ctx.fillText(v.toFixed(v > 100 ? 0 : 1), W - pad.r + 6, y + 4); }
  const x0 = n - 1, fx = (h) => X(x0 + h * 0.9);
  ctx.beginPath(); pts.forEach((p, i) => { const x = fx(p[0]), y = Y(last * (1 + p[3])); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(fx(pts[i][0]), Y(last * (1 + pts[i][1])));
  ctx.closePath(); ctx.fillStyle = css("--ac") + "33"; ctx.fill();
  ctx.setLineDash([5, 4]); ctx.beginPath(); pts.forEach((p, i) => { const x = fx(p[0]), y = Y(last * (1 + p[2])); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  ctx.strokeStyle = css("--ac"); ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
  ctx.beginPath(); hist.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v))));
  ctx.strokeStyle = css("--tx"); ctx.lineWidth = 1.6; ctx.stroke();
}

function renderPortfolio() {
  const pos = store.get("pos", []), out = $("#pfOut"); if ($("#view-portfolio").hidden) return;
  if (!pos.length) { out.innerHTML = `<div class="card muted">Añade tus posiciones para ver cuánto tienes invertido, tu ganancia/pérdida actual y el resultado esperado.</div>`; return; }
  let inv = 0, val = 0, exp = 0, down = 0, up = 0, pw = 0;
  const rows = pos.map((p, i) => { const t = tk(p.s); if (!t) return ""; const f = fc(t);
    const cost = p.q * p.a, v = p.q * t.price; inv += cost; val += v; exp += v * f.exp_ret; down += v * f.q10; up += v * f.q90; pw += v * f.p_up;
    return `<tr><td><b>${p.s}</b></td><td class="r">${p.q}</td><td class="r">${money(cost, t.currency)}</td><td class="r">${money(v, t.currency)}</td>
      <td class="r ${sgn(v - cost)}">${money(v - cost, t.currency)} (${fmtPct(v / cost - 1, 1)})</td>
      <td class="r">${(f.p_up * 100).toFixed(0)}%</td><td class="r ${sgn(f.exp_ret)}">${money(v * f.exp_ret, t.currency)}</td>
      <td class="r dn">${money(v * f.q10, t.currency)}</td><td class="r up">${money(v * f.q90, t.currency)}</td><td><button class="x" data-del="${i}">✕</button></td></tr>`; }).join("");
  out.innerHTML = `<div class="card"><div class="grid">
    <div class="stat"><span>Invertido</span><b>${money(inv)}</b></div>
    <div class="stat"><span>Valor actual</span><b>${money(val)}</b><em class="${sgn(val - inv)}">${money(val - inv)} (${fmtPct(inv ? val / inv - 1 : 0, 1)})</em></div>
    <div class="stat"><span>Esperado (${HZ_LABEL[S.hz]})</span><b class="${sgn(exp)}">${money(exp)}</b><em>prob. media de subir ${val ? ((pw / val) * 100).toFixed(0) : 0}%</em></div>
    <div class="stat"><span>Rango 80 % (suma de P10 / P90)</span><b><span class="dn">${money(down)}</span> / <span class="up">${money(up)}</span></b><em>límite prudente: no asume diversificación</em></div></div>
    <p class="muted small" style="margin-top:8px">Importes de distintas divisas se suman sin convertir.</p></div>
    <div class="card"><table><thead><tr><th>Valor</th><th class="r">Títulos</th><th class="r">Invertido</th><th class="r">Valor</th><th class="r">P&amp;L actual</th><th class="r">Prob. subir</th><th class="r">Esperado</th><th class="r">P10</th><th class="r">P90</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

load();
})();
