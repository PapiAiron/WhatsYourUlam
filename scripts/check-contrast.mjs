const PAIRS = [
  { theme: 'light', name: 'ink on paper', fg: '#2A2118', bg: '#F7F1E5', min: 4.5 },
  { theme: 'light', name: 'ink-2 on paper', fg: '#524538', bg: '#F7F1E5', min: 4.5 },
  { theme: 'light', name: 'ink-3 on paper', fg: '#6B5D4E', bg: '#F7F1E5', min: 4.5 },
  { theme: 'light', name: 'ink on card', fg: '#2A2118', bg: '#FFFBF3', min: 4.5 },
  { theme: 'light', name: 'on-clay on clay', fg: '#FFFBF3', bg: '#A3431B', min: 4.5 },
  { theme: 'light', name: 'on-moss on moss', fg: '#FFFBF3', bg: '#48582D', min: 4.5 },
  { theme: 'light', name: 'turmeric text on card', fg: '#8B600D', bg: '#FFFBF3', min: 4.5 },
  { theme: 'light', name: 'ink on turmeric-fill', fg: '#2A2118', bg: '#D49A2A', min: 4.5 },
  { theme: 'dark', name: 'ink on paper', fg: '#F3EADB', bg: '#1B1612', min: 4.5 },
  { theme: 'dark', name: 'ink-2 on paper', fg: '#CFC1AC', bg: '#1B1612', min: 4.5 },
  { theme: 'dark', name: 'ink-3 on card', fg: '#A99882', bg: '#28211B', min: 4.5 },
  { theme: 'dark', name: 'on-clay on clay', fg: '#FFFBF3', bg: '#BA4E22', min: 4.5 },
  { theme: 'dark', name: 'on-moss on moss', fg: '#1B1612', bg: '#8AA35E', min: 4.5 },
];

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16) / 255,
    parseInt(clean.slice(2, 4), 16) / 255,
    parseInt(clean.slice(4, 6), 16) / 255,
  ];
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg, bg) {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (light + 0.05) / (dark + 0.05);
}

let failed = false;
for (const p of PAIRS) {
  const ratio = contrastRatio(p.fg, p.bg);
  const ok = ratio >= p.min;
  console.log(
    `${ok ? 'PASS' : 'FAIL'} [${p.theme}] ${p.name}: ${ratio.toFixed(2)}:1 (min ${p.min}:1)`
  );
  if (!ok) failed = true;
}

if (failed) {
  process.exit(1);
}
