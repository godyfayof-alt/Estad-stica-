#!/usr/bin/env python3
"""Actualización diaria: descarga precios (Yahoo Finance), calcula indicadores y
probabilidades por simulación bootstrap y escribe data/market.json.

Uso:
  python scripts/update_data.py          # datos reales (necesita red)
  python scripts/update_data.py --demo   # datos sintéticos para probar la web
Solo usa la librería estándar de Python.
"""
import json, math, random, sys, time, urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "market.json"
HORIZONS = [1, 5, 21, 63]          # días de mercado
N_SIMS = 4000
HIST_KEEP = 260


# ---------- datos ----------
def fetch_yahoo(symbol):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range=5y&interval=1d"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (market-analytics)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        j = json.load(r)
    res = j["chart"]["result"][0]
    ts, close = res["timestamp"], res["indicators"]["quote"][0]["close"]
    rows = [(datetime.fromtimestamp(t, timezone.utc).date().isoformat(), c)
            for t, c in zip(ts, close) if c is not None]
    return rows, res["meta"].get("currency", "USD")


def synth(symbol, seed_extra=0):
    rng = random.Random(sum(map(ord, symbol)) * 131 + seed_extra)
    mu, vol = rng.uniform(0.04, 0.16), rng.uniform(0.14, 0.45)
    p = rng.uniform(40, 400)
    d, rows = date.today() - timedelta(days=int(5 * 365 * 1.0)), []
    while d <= date.today():
        if d.weekday() < 5:
            p *= math.exp((mu - vol * vol / 2) / 252 + vol / math.sqrt(252) * rng.gauss(0, 1))
            rows.append((d.isoformat(), round(p, 2)))
        d += timedelta(days=1)
    return rows, "USD"


# ---------- indicadores ----------
def mean(x): return sum(x) / len(x)
def std(x):
    m = mean(x); return math.sqrt(sum((v - m) ** 2 for v in x) / max(1, len(x) - 1))
def clip(v, a, b): return max(a, min(b, v))
def phi(x): return 0.5 * (1 + math.erf(x / math.sqrt(2)))

def rsi(c, n=14):
    if len(c) <= n: return 50.0
    g = l = 0.0
    for i in range(len(c) - n, len(c)):
        d = c[i] - c[i - 1]
        g += max(d, 0); l += max(-d, 0)
    return 100.0 if l == 0 else 100 - 100 / (1 + g / l)

def sma(c, n): return mean(c[-n:]) if len(c) >= n else mean(c)

def ewma_vol(rets, lam=0.94):
    v = std(rets[:30]) ** 2
    for r in rets:
        v = lam * v + (1 - lam) * r * r
    return math.sqrt(v)

def signal_score(c):
    """-1 (muy bajista) … +1 (muy alcista) a partir de tendencia, momentum y RSI."""
    price = c[-1]
    parts = [1 if price > sma(c, 50) else -1,
             1 if sma(c, 50) > sma(c, 200) else -1]
    if len(c) > 64:
        rets = [math.log(c[i] / c[i - 1]) for i in range(max(1, len(c) - 250), len(c))]
        s = std(rets) * math.sqrt(63)
        parts.append(clip(math.log(price / c[-64]) / s if s else 0, -1, 1))
    r = rsi(c)
    parts.append(-0.5 if r > 70 else 0.5 if r < 30 else 0)
    return clip(mean(parts), -1, 1)

TILT = 0.0002  # ≈ 5 % anual como máximo atribuible a señales: deliberadamente pequeño

def daily_drift(c, score):
    rets = [math.log(c[i] / c[i - 1]) for i in range(max(1, len(c) - 504), len(c))]
    hist = clip(mean(rets), -0.0008, 0.0008)   # recorta deriva histórica extrema
    return 0.5 * hist + score * TILT


# ---------- pronóstico ----------
def forecast(c, rng):
    rets = [math.log(c[i] / c[i - 1]) for i in range(1, len(c))]
    score = signal_score(c)
    mu = daily_drift(c, score)
    sig = ewma_vol(rets)
    # residuos estandarizados (vol. EWMA en cada día) para conservar colas gordas
    z, v = [], std(rets[:30]) ** 2
    for r in rets:
        z.append(r / math.sqrt(v)); v = 0.94 * v + 0.06 * r * r
    zm = mean(z); z = [x - zm for x in z]
    out = {}
    for h in HORIZONS:
        sims = sorted(sum(rng.choice(z) for _ in range(h)) * sig + mu * h for _ in range(N_SIMS))
        pct = [math.exp(s) - 1 for s in sims]
        ups = [x for x in pct if x > 0]; dns = [x for x in pct if x <= 0]
        q = lambda p: pct[int(p * (N_SIMS - 1))]
        out[str(h)] = {
            "p_up": round(len(ups) / N_SIMS, 4),
            "exp_ret": round(mean(pct), 5),
            "up_mean": round(mean(ups), 5) if ups else 0,
            "down_mean": round(mean(dns), 5) if dns else 0,
            "q10": round(q(.10), 5), "q50": round(q(.50), 5), "q90": round(q(.90), 5),
        }
    return out, score, sig


def backtest(c, h=5):
    """Walk-forward: ¿acierta la dirección a h días el modelo analítico? vs. tasa base."""
    hits = base = brier = brier0 = n = 0
    ups_total = sum(1 for i in range(260, len(c) - h) if c[i + h] > c[i])
    base_rate = ups_total / max(1, len(c) - h - 260)
    for i in range(260, len(c) - h, 3):
        past = c[: i + 1]
        rets = [math.log(past[k] / past[k - 1]) for k in range(max(1, i - 250), i + 1)]
        mu = daily_drift(past, signal_score(past)); s = std(rets) * math.sqrt(h)
        p = phi(mu * h / s) if s else .5
        up = c[i + h] > c[i]
        hits += (p > .5) == up; n += 1
        brier += (p - up) ** 2; brier0 += (base_rate - up) ** 2
    if not n: return None
    return {"horizon": h, "n": n, "accuracy": round(hits / n, 4),
            "base_rate_up": round(base_rate, 4),
            "brier": round(brier / n, 4), "brier_baseline": round(brier0 / n, 4)}


def analyse(symbol, name, kind, rows, currency, rng):
    dates = [r[0] for r in rows]; c = [r[1] for r in rows]
    if len(c) < 300: raise ValueError("histórico insuficiente")
    fc, score, sig = forecast(c, rng)
    peak = max(c[-252:])
    return {
        "symbol": symbol, "name": name, "type": kind, "currency": currency,
        "price": round(c[-1], 2), "asof": dates[-1],
        "change_1d": round(c[-1] / c[-2] - 1, 5),
        "indicators": {
            "rsi14": round(rsi(c), 1), "sma50": round(sma(c, 50), 2), "sma200": round(sma(c, 200), 2),
            "mom_1m": round(c[-1] / c[-22] - 1, 4), "mom_3m": round(c[-1] / c[-64] - 1, 4),
            "vol_ann": round(sig * math.sqrt(252), 4), "drawdown": round(c[-1] / peak - 1, 4),
            "score": round(score, 3)},
        "forecast": fc,
        "backtest": backtest(c),
        "history": {"d": dates[-HIST_KEEP:], "c": [round(x, 2) for x in c[-HIST_KEEP:]]},
    }


def main():
    demo = "--demo" in sys.argv
    cfg = json.loads((ROOT / "tickers.json").read_text())
    old = {}
    if OUT.exists():
        try: old = {t["symbol"]: t for t in json.loads(OUT.read_text())["tickers"]}
        except Exception: pass
    rng = random.Random(date.today().toordinal())
    tickers, errors = [], []
    for kind, key in (("stock", "stocks"), ("etf", "etfs")):
        for sym, name in cfg[key]:
            try:
                rows, cur = synth(sym) if demo else fetch_yahoo(sym)
                tickers.append(analyse(sym, name, kind, rows, cur, rng))
                print("ok ", sym)
            except Exception as e:
                errors.append(f"{sym}: {e}"); print("ERR", sym, e, file=sys.stderr)
                if sym in old and not demo: tickers.append(old[sym])
            if not demo: time.sleep(0.4)
    if not tickers: sys.exit("No se pudo obtener ningún dato")
    OUT.write_text(json.dumps({
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "demo": demo, "horizons": HORIZONS, "errors": errors, "tickers": tickers,
    }, separators=(",", ":")))
    print(f"{len(tickers)} tickers → {OUT}")


if __name__ == "__main__":
    main()
