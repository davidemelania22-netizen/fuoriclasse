// Generates the Football Life app logo as an SVG (run: node assets/make-logo.mjs > assets/logo.svg)
const S = 1024;
const C = { x: 512, y: 486 };
const R = 300; // ball radius
const P = 120; // central pentagon circumradius

// central pentagon, point-up
const central = Array.from({ length: 5 }, (_, k) => {
  const t = (-90 + 72 * k) * (Math.PI / 180);
  return { x: C.x + P * Math.cos(t), y: C.y + P * Math.sin(t) };
});

const reflect = (p, a, b) => {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / (abx * abx + aby * aby);
  const px = a.x + t * abx;
  const py = a.y + t * aby;
  return { x: 2 * px - p.x, y: 2 * py - p.y };
};

const centroid = (pts) => ({
  x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
  y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
});

const shrink = (pts, f) => {
  const c = centroid(pts);
  return pts.map((p) => ({
    x: c.x + (p.x - c.x) * f,
    y: c.y + (p.y - c.y) * f,
  }));
};

const poly = (pts) =>
  `<polygon points="${pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}" />`;

// five outer pentagons sharing each central edge
const outers = [];
for (let i = 0; i < 5; i += 1) {
  const a = central[i];
  const b = central[(i + 1) % 5];
  outers.push(central.map((p) => reflect(p, a, b)));
}

const pentagons = [central, ...outers]
  .map((p) => poly(shrink(p, 0.9)))
  .join('\n      ');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#27c06a"/>
      <stop offset="0.55" stop-color="#129a4d"/>
      <stop offset="1" stop-color="#0a3d22"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.34" r="0.7">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="#ffd54a"/>
      <stop offset="1" stop-color="#ff9d2e"/>
    </linearGradient>
    <radialGradient id="ball" cx="0.42" cy="0.36" r="0.75">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#d7e4dc"/>
    </radialGradient>
  </defs>

  <rect x="40" y="40" width="944" height="944" rx="224" fill="url(#bg)"/>
  <rect x="40" y="40" width="944" height="944" rx="224" fill="url(#glow)"/>

  <!-- rising career arc -->
  <path d="M 196 812 C 360 720 470 470 596 300 L 700 232 L 612 360 C 520 520 420 720 256 856 Z"
        fill="url(#gold)" opacity="0.92"/>
  <!-- sparkle -->
  <g fill="#fff3c9">
    <path d="M 742 196 L 760 244 L 808 262 L 760 280 L 742 328 L 724 280 L 676 262 L 724 244 Z"/>
  </g>

  <!-- football -->
  <circle cx="${C.x}" cy="${C.y}" r="${R + 8}" fill="#0a3320" opacity="0.35"/>
  <circle cx="${C.x}" cy="${C.y}" r="${R}" fill="url(#ball)" stroke="#16221c" stroke-width="6"/>
  <g fill="#16221c">
      ${pentagons}
  </g>
</svg>
`;

process.stdout.write(svg);
