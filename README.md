# Probabilidades de Mercado

Web estática que, con datos diarios, estima para acciones y ETF la **probabilidad de subir**, la **ganancia/pérdida media** si sube/baja, el **valor esperado** de tu inversión y el rango de escenarios (P10–P90), con cartera personal y backtest de fiabilidad.

- `scripts/update_data.py` descarga precios (Yahoo Finance), calcula indicadores y simula (bootstrap) → `data/market.json`
- `index.html`, `app.js`, `style.css` leen ese JSON (sin dependencias)
- `.github/workflows/daily.yml` actualiza los datos cada día laborable y publica en GitHub Pages
- `tickers.json`: edita aquí los valores que quieres seguir

```bash
python3 scripts/update_data.py          # datos reales
python3 scripts/update_data.py --demo   # datos sintéticos
python3 -m http.server                  # abre http://localhost:8000
```

Uso educativo; no es asesoramiento financiero. Ningún modelo predice el mercado con certeza.
