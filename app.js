/**
 * Visus Converter - Visual Acuity Calculator
 * Comprehensive bidirectional converter for refraction and optometry
 */

// Standard ETDRS / Snellen chart steps
const STANDARD_STEPS = [
  { snellenUS: '20/400', snellenM: '6/120', decimal: 0.05, percent: '5%',   logMAR: 1.30,  varScore: 35 },
  { snellenUS: '20/200', snellenM: '6/60',  decimal: 0.10, percent: '10%',  logMAR: 1.00,  varScore: 50 },
  { snellenUS: '20/160', snellenM: '6/48',  decimal: 0.125,percent: '12.5%',logMAR: 0.90,  varScore: 55 },
  { snellenUS: '20/125', snellenM: '6/38',  decimal: 0.16, percent: '16%',  logMAR: 0.80,  varScore: 60 },
  { snellenUS: '20/100', snellenM: '6/30',  decimal: 0.20, percent: '20%',  logMAR: 0.70,  varScore: 65 },
  { snellenUS: '20/80',  snellenM: '6/24',  decimal: 0.25, percent: '25%',  logMAR: 0.60,  varScore: 70 },
  { snellenUS: '20/63',  snellenM: '6/19',  decimal: 0.32, percent: '32%',  logMAR: 0.50,  varScore: 75 },
  { snellenUS: '20/50',  snellenM: '6/15',  decimal: 0.40, percent: '40%',  logMAR: 0.40,  varScore: 80 },
  { snellenUS: '20/40',  snellenM: '6/12',  decimal: 0.50, percent: '50%',  logMAR: 0.30,  varScore: 85 },
  { snellenUS: '20/32',  snellenM: '6/9.5', decimal: 0.63, percent: '63%',  logMAR: 0.20,  varScore: 90 },
  { snellenUS: '20/25',  snellenM: '6/7.5', decimal: 0.80, percent: '80%',  logMAR: 0.10,  varScore: 95 },
  { snellenUS: '20/20',  snellenM: '6/6',   decimal: 1.00, percent: '100%', logMAR: 0.00,  varScore: 100 },
  { snellenUS: '20/16',  snellenM: '6/4.8', decimal: 1.25, percent: '125%', logMAR: -0.10, varScore: 105 },
  { snellenUS: '20/12.5',snellenM: '6/3.8', decimal: 1.60, percent: '160%', logMAR: -0.20, varScore: 110 },
  { snellenUS: '20/10',  snellenM: '6/3',   decimal: 2.00, percent: '200%', logMAR: -0.30, varScore: 115 }
];

// App State
const state = {
  decimalVisus: 1.0, // Primary canonical value (1.0 = 20/20 = 6/6)
  activeFieldId: null,
  theme: localStorage.getItem('visus-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
};

// DOM Elements
const elements = {
  snellenUS: document.getElementById('input-snellen-us'),
  snellenM: document.getElementById('input-snellen-m'),
  decimal: document.getElementById('input-decimal'),
  percent: document.getElementById('input-percent'),
  logmar: document.getElementById('input-logmar'),
  varScore: document.getElementById('input-var'),
  
  // Auxiliary UI
  classificationBadge: document.getElementById('visus-classification'),
  meterProgress: document.getElementById('meter-fill'),
  meterMarker: document.getElementById('meter-marker'),
  cpdValue: document.getElementById('cpd-value'),
  marValue: document.getElementById('mar-value'),
  
  presetsContainer: document.getElementById('presets-list'),
  refTableBody: document.getElementById('ref-table-body'),
  themeToggle: document.getElementById('theme-toggle'),
  zoomOutBtn: document.getElementById('zoom-out-btn'),
  zoomInBtn: document.getElementById('zoom-in-btn'),
  zoomResetBtn: document.getElementById('zoom-reset-btn'),
  zoomValue: document.getElementById('zoom-value'),
  copyBtn: document.getElementById('copy-btn'),
  resetBtn: document.getElementById('reset-btn'),
  copyNotification: document.getElementById('copy-notification')
};

// --------------------------------------------------------------------------
// Mathematical Conversions & Formatters
// --------------------------------------------------------------------------

function formatDecimal(val, decimals = 2) {
  if (val === null || isNaN(val)) return '';
  return Number(val.toFixed(decimals)).toString();
}

function formatLogMAR(logmar) {
  if (logmar === null || isNaN(logmar)) return '';
  const rounded = Math.round(logmar * 100) / 100;
  if (Object.is(rounded, -0) || rounded === 0) return '0.00';
  const prefix = rounded > 0 ? '+' : '';
  return prefix + rounded.toFixed(2);
}

function formatSnellenFraction(distance, dec) {
  if (!dec || dec <= 0) return '';
  const rawDenominator = distance / dec;
  
  // Format nicely (e.g. 12.5, 7.5, or integer like 20, 40, 200)
  let denomStr;
  if (Math.abs(rawDenominator - Math.round(rawDenominator)) < 0.05) {
    denomStr = Math.round(rawDenominator).toString();
  } else if (Math.abs(rawDenominator * 10 - Math.round(rawDenominator * 10)) < 0.1) {
    denomStr = (Math.round(rawDenominator * 10) / 10).toString();
  } else {
    denomStr = (Math.round(rawDenominator * 10) / 10).toFixed(1);
  }
  return `${distance}/${denomStr}`;
}

// --------------------------------------------------------------------------
// Input Parsers (Returns canonical decimal visus or null)
// --------------------------------------------------------------------------

function parseFractionOrNumber(str, defaultNumerator = null) {
  if (!str) return null;
  const clean = str.trim().replace(',', '.');
  
  // Check for fraction: a/b
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 2) {
      const num = parseFloat(parts[0]);
      const den = parseFloat(parts[1]);
      if (!isNaN(num) && !isNaN(den) && den > 0 && num > 0) {
        return num / den;
      }
    }
    return null;
  }
  
  // Check for single number
  const val = parseFloat(clean);
  if (isNaN(val) || val <= 0) return null;
  
  // If a defaultNumerator is specified (e.g. 20 for Snellen US), assume val is the denominator
  if (defaultNumerator !== null) {
    return defaultNumerator / val;
  }
  
  return val;
}

function parseSnellenUS(str) {
  return parseFractionOrNumber(str, 20);
}

function parseSnellenM(str) {
  return parseFractionOrNumber(str, 6);
}

function parseDecimal(str) {
  if (!str) return null;
  const clean = str.trim().replace(',', '.');
  const val = parseFloat(clean);
  return (!isNaN(val) && val > 0) ? val : null;
}

function parsePercent(str) {
  if (!str) return null;
  const clean = str.trim().replace('%', '').replace(',', '.');
  const val = parseFloat(clean);
  return (!isNaN(val) && val > 0) ? val / 100 : null;
}

function parseLogMAR(str) {
  if (!str) return null;
  const clean = str.trim().replace(',', '.');
  const val = parseFloat(clean);
  if (isNaN(val)) return null;
  // Visus = 10^(-logMAR)
  return Math.pow(10, -val);
}

function parseVAR(str) {
  if (!str) return null;
  const clean = str.trim().replace(',', '.');
  const val = parseFloat(clean);
  if (isNaN(val)) return null;
  // VAR = 100 - 50 * logMAR => logMAR = (100 - VAR) / 50
  const logmar = (100 - val) / 50;
  return Math.pow(10, -logmar);
}

// --------------------------------------------------------------------------
// Clinical WHO Impairment Categories
// --------------------------------------------------------------------------

function getAcuityCategory(dec) {
  if (!dec || dec <= 0) {
    return { name: 'Undetermined', badgeClass: 'badge-gray', color: '#94a3b8' };
  }
  if (dec >= 1.0) {
    return { name: 'Normal / Superior Vision (≥ 20/20)', badgeClass: 'badge-emerald', color: '#10b981' };
  }
  if (dec >= 0.8) {
    return { name: 'Near-Normal Vision (20/25)', badgeClass: 'badge-teal', color: '#14b8a6' };
  }
  if (dec >= 0.5) {
    return { name: 'Mild Visual Impairment (20/40 - Driving Std.)', badgeClass: 'badge-blue', color: '#3b82f6' };
  }
  if (dec >= 0.3) {
    return { name: 'Moderate Visual Impairment (20/60)', badgeClass: 'badge-amber', color: '#f59e0b' };
  }
  if (dec >= 0.1) {
    return { name: 'Severe Visual Impairment (20/200)', badgeClass: 'badge-orange', color: '#f97316' };
  }
  return { name: 'Profound Impairment / Legal Blindness (< 20/200)', badgeClass: 'badge-rose', color: '#ef4444' };
}

// --------------------------------------------------------------------------
// Update & Render Functions
// --------------------------------------------------------------------------

function updateAllOutputs(sourceFieldId) {
  const dec = state.decimalVisus;
  
  if (dec === null || isNaN(dec) || dec <= 0) {
    // Clear outputs other than the active one
    Object.keys(elements).forEach(key => {
      const el = elements[key];
      if (el && el.tagName === 'INPUT' && el.id !== sourceFieldId) {
        el.value = '';
      }
    });
    if (elements.classificationBadge) {
      elements.classificationBadge.textContent = 'Invalid or Empty Input';
      elements.classificationBadge.className = 'badge badge-gray';
    }
    if (elements.cpdValue) elements.cpdValue.textContent = '--';
    if (elements.marValue) elements.marValue.textContent = '--';
    return;
  }

  // Calculate values
  const snellenUSStr = formatSnellenFraction(20, dec);
  const snellenMStr = formatSnellenFraction(6, dec);
  const decimalStr = dec >= 1 ? dec.toFixed(2) : (dec >= 0.1 ? dec.toFixed(2) : dec.toFixed(3));
  const percentStr = `${Math.round(dec * 100)}%`;
  
  const logmarVal = -Math.log10(dec);
  const logmarStr = formatLogMAR(logmarVal);
  
  const varScoreVal = Math.round(100 - (50 * logmarVal));
  const varStr = varScoreVal.toString();
  
  // Update inputs if they are not the active field being typed in
  if (sourceFieldId !== 'input-snellen-us') elements.snellenUS.value = snellenUSStr;
  if (sourceFieldId !== 'input-snellen-m') elements.snellenM.value = snellenMStr;
  if (sourceFieldId !== 'input-decimal') elements.decimal.value = decimalStr;
  if (sourceFieldId !== 'input-percent') elements.percent.value = percentStr;
  if (sourceFieldId !== 'input-logmar') elements.logmar.value = logmarStr;
  if (sourceFieldId !== 'input-var') elements.varScore.value = varStr;

  // Auxiliary metrics: MAR & Spatial Frequency (cpd)
  const mar = 1 / dec;
  if (elements.marValue) elements.marValue.textContent = `${mar.toFixed(1)}' arc`;
  if (elements.cpdValue) elements.cpdValue.textContent = `${(30 * dec).toFixed(1)} cpd`;

  // Update classification badge
  const cat = getAcuityCategory(dec);
  if (elements.classificationBadge) {
    elements.classificationBadge.textContent = cat.name;
    elements.classificationBadge.className = `badge ${cat.badgeClass}`;
  }

  // Update visual meter (scale logMAR from +1.30 [low] down to -0.30 [high])
  // Total span is 1.6 log units.
  // Clamp logmar between -0.30 and 1.30 for the meter
  const clampedLogMAR = Math.max(-0.30, Math.min(1.30, logmarVal));
  // 1.30 is 0% (bad vision), -0.30 is 100% (supernormal)
  const percentGauge = ((1.30 - clampedLogMAR) / (1.30 - (-0.30))) * 100;
  if (elements.meterMarker) {
    elements.meterMarker.style.left = `${percentGauge}%`;
  }
  if (elements.meterProgress) {
    elements.meterProgress.style.width = `${percentGauge}%`;
    elements.meterProgress.style.backgroundColor = cat.color;
  }

  // Update active preset button highlight
  highlightActivePreset(dec);
  highlightRefTableRow(dec);
}

function highlightActivePreset(dec) {
  const buttons = elements.presetsContainer.querySelectorAll('button');
  buttons.forEach(btn => {
    const stepDec = parseFloat(btn.dataset.decimal);
    if (Math.abs(stepDec - dec) < 0.015) {
      btn.classList.add('preset-active');
    } else {
      btn.classList.remove('preset-active');
    }
  });
}

function highlightRefTableRow(dec) {
  if (!elements.refTableBody) return;
  const rows = elements.refTableBody.querySelectorAll('tr');
  let closestRow = null;
  let minDiff = Infinity;

  rows.forEach(row => {
    row.classList.remove('row-active');
    const rowDec = parseFloat(row.dataset.decimal);
    const diff = Math.abs(rowDec - dec);
    if (diff < minDiff) {
      minDiff = diff;
      closestRow = row;
    }
  });

  if (closestRow && minDiff < 0.08) {
    closestRow.classList.add('row-active');
  }
}

// --------------------------------------------------------------------------
// Event Listeners for Live Reactive Conversion
// --------------------------------------------------------------------------

function attachInputHandler(element, parserFn, fieldId) {
  element.addEventListener('input', (e) => {
    state.activeFieldId = fieldId;
    const parsedDec = parserFn(e.target.value);
    if (parsedDec !== null && parsedDec > 0) {
      state.decimalVisus = parsedDec;
      updateAllOutputs(fieldId);
    } else if (e.target.value.trim() === '') {
      state.decimalVisus = null;
      updateAllOutputs(fieldId);
    }
  });

  // On blur, normalize the active field's display text to clean standard
  element.addEventListener('blur', () => {
    state.activeFieldId = null;
    if (state.decimalVisus !== null) {
      updateAllOutputs(null);
    }
  });

  // Select all text on focus for fast replacement
  element.addEventListener('focus', () => {
    element.select();
  });
}

// --------------------------------------------------------------------------
// Presets & Reference Table Setup
// --------------------------------------------------------------------------

function initPresets() {
  elements.presetsContainer.innerHTML = '';
  STANDARD_STEPS.forEach(step => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-btn';
    btn.dataset.decimal = step.decimal;
    btn.innerHTML = `<span class="preset-snellen">${step.snellenUS}</span><span class="preset-dec">${step.decimal}</span>`;
    
    btn.addEventListener('click', () => {
      state.decimalVisus = step.decimal;
      state.activeFieldId = null;
      updateAllOutputs(null);
    });
    
    elements.presetsContainer.appendChild(btn);
  });
}

function initReferenceTable() {
  if (!elements.refTableBody) return;
  elements.refTableBody.innerHTML = '';
  STANDARD_STEPS.forEach(step => {
    const tr = document.createElement('tr');
    tr.dataset.decimal = step.decimal;
    tr.innerHTML = `
      <td class="font-medium">${step.snellenUS}</td>
      <td>${step.snellenM}</td>
      <td class="font-mono">${step.decimal.toFixed(2)}</td>
      <td>${step.percent}</td>
      <td class="font-mono ${step.logMAR <= 0 ? 'text-positive' : 'text-negative'}">${formatLogMAR(step.logMAR)}</td>
      <td>${step.varScore}</td>
    `;
    
    tr.addEventListener('click', () => {
      state.decimalVisus = step.decimal;
      state.activeFieldId = null;
      updateAllOutputs(null);
    });
    
    elements.refTableBody.appendChild(tr);
  });
}

// --------------------------------------------------------------------------
// Theme & Copy to Clipboard Handlers
// --------------------------------------------------------------------------

function applyTheme(theme) {
  state.theme = theme;
  localStorage.setItem('visus-theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
  if (elements.themeToggle) {
    elements.themeToggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
    elements.themeToggle.innerHTML = theme === 'dark' 
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
  }
}

// --------------------------------------------------------------------------
// Zoom & Text Scaling
// --------------------------------------------------------------------------

const ZOOM_LEVELS = [
  { label: '80%', size: '11.6px' },
  { label: '90%', size: '13.0px' },
  { label: '100%', size: '14.5px' },
  { label: '110%', size: '16.0px' },
  { label: '125%', size: '18.1px' },
  { label: '140%', size: '20.3px' }
];

let currentZoomIndex = 2; // Default 100% (14.5px)

function applyZoom(index) {
  currentZoomIndex = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, index));
  localStorage.setItem('visus-zoom-index', currentZoomIndex.toString());
  const zoom = ZOOM_LEVELS[currentZoomIndex];
  document.documentElement.style.setProperty('--base-font-size', zoom.size);
  
  if (elements.zoomValue) {
    elements.zoomValue.textContent = zoom.label;
  }
  if (elements.zoomOutBtn) {
    elements.zoomOutBtn.disabled = currentZoomIndex === 0;
  }
  if (elements.zoomInBtn) {
    elements.zoomInBtn.disabled = currentZoomIndex === ZOOM_LEVELS.length - 1;
  }
}

function initZoomControls() {
  const savedZoom = localStorage.getItem('visus-zoom-index');
  if (savedZoom !== null && !isNaN(parseInt(savedZoom, 10))) {
    currentZoomIndex = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, parseInt(savedZoom, 10)));
  }

  applyZoom(currentZoomIndex);

  if (elements.zoomOutBtn) {
    elements.zoomOutBtn.addEventListener('click', () => {
      if (currentZoomIndex > 0) {
        applyZoom(currentZoomIndex - 1);
      }
    });
  }

  if (elements.zoomInBtn) {
    elements.zoomInBtn.addEventListener('click', () => {
      if (currentZoomIndex < ZOOM_LEVELS.length - 1) {
        applyZoom(currentZoomIndex + 1);
      }
    });
  }

  if (elements.zoomResetBtn) {
    elements.zoomResetBtn.addEventListener('click', () => {
      applyZoom(2); // Reset to 100%
    });
  }
}

function initThemeToggle() {
  applyTheme(state.theme);
  if (elements.themeToggle) {
    elements.themeToggle.addEventListener('click', () => {
      applyTheme(state.theme === 'dark' ? 'light' : 'dark');
    });
  }
}

function initCopyButton() {
  if (!elements.copyBtn) return;
  elements.copyBtn.addEventListener('click', async () => {
    if (!state.decimalVisus) return;
    const summary = `Visual Acuity: ${elements.snellenUS.value} (US) | ${elements.snellenM.value} (Metric) | Dec: ${elements.decimal.value} (${elements.percent.value}) | logMAR: ${elements.logmar.value} | VAR: ${elements.varScore.value}`;
    try {
      await navigator.clipboard.writeText(summary);
      showCopyToast();
    } catch (err) {
      // Fallback
      const tempInput = document.createElement('textarea');
      tempInput.value = summary;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      showCopyToast();
    }
  });
}

function showCopyToast() {
  if (!elements.copyNotification) return;
  elements.copyNotification.classList.add('show');
  setTimeout(() => {
    elements.copyNotification.classList.remove('show');
  }, 2200);
}

function initResetButton() {
  if (!elements.resetBtn) return;
  elements.resetBtn.addEventListener('click', () => {
    state.decimalVisus = 1.00;
    state.activeFieldId = null;
    updateAllOutputs(null);
    elements.snellenUS.focus();
  });
}

// --------------------------------------------------------------------------
// Service Worker Registration for PWA Offline Support
// --------------------------------------------------------------------------

function registerPWA() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('Visus PWA ServiceWorker registered', reg.scope))
        .catch(err => console.log('Visus PWA ServiceWorker registration skipped/failed', err));
    });
  }
}

// --------------------------------------------------------------------------
// Application Initialization
// --------------------------------------------------------------------------

function initApp() {
  initZoomControls();
  initThemeToggle();
  initPresets();
  initReferenceTable();
  initCopyButton();
  initResetButton();

  // Attach reactive listeners to all 6 input fields
  attachInputHandler(elements.snellenUS, parseSnellenUS, 'input-snellen-us');
  attachInputHandler(elements.snellenM, parseSnellenM, 'input-snellen-m');
  attachInputHandler(elements.decimal, parseDecimal, 'input-decimal');
  attachInputHandler(elements.percent, parsePercent, 'input-percent');
  attachInputHandler(elements.logmar, parseLogMAR, 'input-logmar');
  attachInputHandler(elements.varScore, parseVAR, 'input-var');

  // Initialize with standard 20/20 (Decimal 1.0)
  updateAllOutputs(null);
  registerPWA();
}

// Start on DOM Ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
