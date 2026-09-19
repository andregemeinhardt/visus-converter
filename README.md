# Visus Converter 👁️

A fast, minimalist, cross-platform visual acuity and refraction converter. Enter any notation and immediately see all the others in real-time.

![Visus App Icon](icon.svg)

---

## ✨ Features

- **Instant Live Bidirectional Conversion**:
  - **Snellen US (20 ft)** (e.g., `20/20`, `20/40`, `20/15`)
  - **Snellen Metric (6 m)** (e.g., `6/6`, `6/12`, `6/4.5`)
  - **Decimal / Monoyer** (e.g., `1.00`, `0.50`, `1.25`)
  - **Percentage Visus** (e.g., `100%`, `50%`, `125%`)
  - **logMAR** (e.g., `0.00`, `+0.30`, `-0.10`)
  - **VAR (Visual Acuity Rating)** (e.g., `100`, `85`, `50`)
- **Smart Input Parsing**:
  - Type `20/40` or just `40` in the US field.
  - Type `6/12` or just `12` in the Metric field.
  - Supports both decimal points (`.`) and commas (`,`).
  - Supports signed logMAR (e.g., `+0.30`, `-0.10`).
- **Standard Chart Lines (ETDRS Presets)**:
  - 1-tap quick buttons from `20/400` down to `20/10`.
- **WHO Impairment Categories & Visual Gauge**:
  - Real-time classification badge (Normal, Driving standard, Mild, Moderate, Severe, Legal Blindness).
  - Continuous gauge showing where acuity falls on the spectrum.
  - Minimum Angle of Resolution (MAR in arcmin) & Spatial frequency (cpd).
- **Interactive Reference Chart**:
  - Full ETDRS step table with real-time row highlighting matching your current input.
- **Cross-Platform & Offline Ready**:
  - Works on iOS, Android, macOS, Windows, Linux, and web browsers.
  - Progressive Web App (PWA) with Service Worker for 100% offline capability.
  - Dark mode and light mode support with automatic system preference detection.

---

## 🚀 How to Run

### Option 1: Direct File
Simply open `index.html` in any web browser (Chrome, Safari, Firefox, Edge).

### Option 2: Local HTTP Server (Python)
Run the following in this folder:
```bash
python3 -m http.server 8080
```
Then open `http://localhost:8080` in your browser.

---

## 📱 How to Install as an App (PWA)

- **iPhone & iPad (iOS Safari)**:
  1. Open the URL in Safari.
  2. Tap the **Share** button (box with an upward arrow).
  3. Scroll down and tap **"Add to Home Screen"**.
- **Android (Chrome)**:
  1. Open the URL in Chrome.
  2. Tap the three-dot menu and select **"Install App"** or **"Add to Home Screen"**.
- **Desktop (Chrome / Edge / Brave)**:
  1. Click the **Install** icon in the browser address bar (top right).

---

## 📐 Mathematical Formulas

All notations pivot through canonical **Decimal Visus ($V$)**:

| Notation | Value Formula | Inverse to Decimal ($V$) |
| :--- | :--- | :--- |
| **Snellen (20 ft)** | $20 / (20 / V)$ | $V = 20 / D_{20}$ |
| **Snellen (6 m)** | $6 / (6 / V)$ | $V = 6 / D_{6}$ |
| **Percentage** | $V \times 100\%$ | $V = \text{Percent} / 100$ |
| **logMAR** | $-\log_{10}(V)$ | $V = 10^{-\text{logMAR}}$ |
| **VAR** | $100 - (50 \times \text{logMAR})$ | $\text{logMAR} = (100 - \text{VAR}) / 50$ |
| **MAR** | $1 / V$ (arcminutes) | $V = 1 / \text{MAR}$ |
| **Spatial Frequency** | $30 \times V$ (cycles per degree) | $V = \text{cpd} / 30$ |
