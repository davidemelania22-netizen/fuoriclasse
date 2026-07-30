import type { CareerCardData } from './careerCard';

/**
 * Draws the shareable career card straight onto a canvas — no libraries, so
 * the export works offline inside the desktop app too. Portrait 1080x1350,
 * the shape social apps show without cropping.
 */
const W = 1080;
const H = 1350;
const PAD = 72;
const GOLD = '#eab130';
const INK = '#f4f6fb';
const MUTED = '#93a0b8';

const FONT = (size: number, weight = 400) =>
  `${weight} ${size}px "Helvetica Neue", Helvetica, Arial, sans-serif`;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draws text, shrinking the font until it fits — names can be long. */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  weight = 400,
): void {
  let current = size;
  ctx.font = FONT(current, weight);
  while (ctx.measureText(text).width > maxWidth && current > 12) {
    current -= 2;
    ctx.font = FONT(current, weight);
  }
  ctx.fillText(text, x, y);
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawAvatar(
  ctx: CanvasRenderingContext2D,
  avatar: HTMLImageElement | null,
  initials: string,
  cx: number,
  cy: number,
  radius: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = '#1b2436';
  ctx.fill();
  if (avatar) {
    ctx.clip();
    // Cover-crop the square avatar into the circle.
    const side = Math.min(avatar.width, avatar.height);
    ctx.drawImage(
      avatar,
      (avatar.width - side) / 2,
      (avatar.height - side) / 2,
      side,
      side,
      cx - radius,
      cy - radius,
      radius * 2,
      radius * 2,
    );
  } else {
    ctx.fillStyle = MUTED;
    ctx.font = FONT(radius, 800);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, cx, cy + 2);
  }
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 5;
  ctx.stroke();
}

const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');

/** Renders the card and returns it as a PNG data URL. */
export async function renderCareerCard(data: CareerCardData): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas non supportato');

  // Background: deep pitch-at-night gradient with a gold frame.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0d1420');
  bg.addColorStop(0.55, '#131d2e');
  bg.addColorStop(1, '#1a1206');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W / 2, 210, 40, W / 2, 210, 620);
  glow.addColorStop(0, 'rgba(234, 177, 48, 0.22)');
  glow.addColorStop(1, 'rgba(234, 177, 48, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, 900);

  ctx.strokeStyle = 'rgba(234, 177, 48, 0.55)';
  ctx.lineWidth = 3;
  roundRect(ctx, 24, 24, W - 48, H - 48, 34);
  ctx.stroke();

  ctx.textBaseline = 'alphabetic';

  // --- header -------------------------------------------------------------
  ctx.textAlign = 'left';
  ctx.fillStyle = GOLD;
  ctx.font = FONT(26, 800);
  ctx.fillText('FUORICLASSE', PAD, 96);
  ctx.textAlign = 'right';
  ctx.fillStyle = MUTED;
  ctx.font = FONT(24, 600);
  ctx.fillText('CARRIERA', W - PAD, 96);

  // --- identity -----------------------------------------------------------
  const avatar = data.avatarDataUrl
    ? await loadImage(data.avatarDataUrl)
    : null;
  drawAvatar(ctx, avatar, initialsOf(data.playerName), W / 2, 300, 118);

  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  fitText(ctx, data.playerName, W / 2, 490, W - PAD * 2, 68, 800);

  ctx.fillStyle = GOLD;
  fitText(
    ctx,
    `${data.gradeIcon}  ${data.gradeLabel.toUpperCase()}`,
    W / 2,
    550,
    W - PAD * 2,
    38,
    800,
  );

  ctx.fillStyle = MUTED;
  ctx.font = FONT(26, 500);
  const subtitle = data.seasonSpan
    ? `${data.statusLine} · ${data.seasonSpan}`
    : data.statusLine;
  fitText(ctx, subtitle, W / 2, 594, W - PAD * 2, 26, 500);

  // --- stat grid ----------------------------------------------------------
  const cols = 3;
  const gap = 18;
  const cellW = (W - PAD * 2 - gap * (cols - 1)) / cols;
  const cellH = 132;
  const gridTop = 640;
  data.stats.forEach((stat, i) => {
    const x = PAD + (i % cols) * (cellW + gap);
    const y = gridTop + Math.floor(i / cols) * (cellH + gap);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    roundRect(ctx, x, y, cellW, cellH, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, cellW, cellH, 18);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = INK;
    fitText(ctx, stat.value, x + cellW / 2, y + 74, cellW - 24, 54, 800);
    ctx.fillStyle = MUTED;
    ctx.font = FONT(21, 600);
    ctx.fillText(stat.label.toUpperCase(), x + cellW / 2, y + 108);
  });

  // --- the bottom half must always fit above the footer -------------------
  // A long palmarès is trimmed to the room that is actually left, so a
  // 14-trophy legend never spills off the image.
  const ROW = 40;
  const HONOUR_LINE = 36;
  const bottomLimit = H - PAD - 46;
  let y = gridTop + 2 * (cellH + gap) + 40;

  const reserved =
    (data.clubs.length > 0 ? ROW : 0) + (data.bestSeason ? ROW : 0);
  const honourRoom = bottomLimit - reserved - y - 34;
  const honoursShown =
    data.honours.length > 0
      ? data.honours.slice(0, Math.max(0, Math.floor(honourRoom / HONOUR_LINE)))
      : [];

  ctx.textAlign = 'left';
  if (honoursShown.length > 0) {
    ctx.fillStyle = GOLD;
    ctx.font = FONT(22, 800);
    ctx.fillText('PALMARÈS', PAD, y);
    y += 32;
    ctx.fillStyle = INK;
    for (const honour of honoursShown) {
      fitText(
        ctx,
        `${honour.icon}  ${honour.title}`,
        PAD,
        y,
        W - PAD * 2,
        26,
        600,
      );
      y += HONOUR_LINE;
    }
    y += 6;
  }

  /** Gold label and its value on one line, to save vertical room. */
  const inlineRow = (label: string, value: string): void => {
    ctx.fillStyle = GOLD;
    ctx.font = FONT(22, 800);
    ctx.fillText(label, PAD, y);
    const offset = ctx.measureText(label).width + 16;
    ctx.fillStyle = INK;
    fitText(ctx, value, PAD + offset, y, W - PAD * 2 - offset, 26, 600);
    y += ROW;
  };

  if (data.clubs.length > 0) inlineRow('MAGLIE', data.clubs.join('  ›  '));
  if (data.bestSeason) inlineRow('MIGLIORE', data.bestSeason);

  // A career with nothing to show yet deserves a line, not a hole.
  if (honoursShown.length === 0 && reserved === 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = MUTED;
    fitText(
      ctx,
      'La storia è appena cominciata.',
      W / 2,
      y + 10,
      W - PAD * 2,
      28,
      600,
    );
  }

  // --- footer -------------------------------------------------------------
  ctx.textAlign = 'center';
  ctx.fillStyle = MUTED;
  ctx.font = FONT(23, 500);
  fitText(ctx, data.gradeDescription, W / 2, H - PAD, W - PAD * 2, 23, 500);

  return canvas.toDataURL('image/png');
}

/** Saves a data URL to the user's downloads under the given filename. */
export function downloadDataUrl(dataUrl: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
