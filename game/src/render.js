// Drawing only: the world's state and the current screen in, pixels out. The 1280x720 playfield
// is scaled to fit the window and centred, the margin filled with the backdrop colour. Neon
// glow throughout: radial halos on the motes, a lit horizon, a shining orb for the player.
// The starfield comes from a fixed local seed, so a screenshot scene paints the same sky on
// every run. Text that holds a number is rebuilt only when the number changes.
import { FIELD, FONT, LIVES, PALETTE } from './config.js';
import { KIND_GOLD, KIND_MOTE, KIND_SHARD } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const PANEL = { width: 640, top: 150, line: 36, bottom: 76 };
const LIFE_SIZE = 18;
const LIFE_GAP = 10;

/** The backdrop stars: fixed positions from a tiny local generator, twinkling by elapsed time. */
const STARS = [];
{
  let a = 1234567;
  const next = () => {
    a = (Math.imul(a, 1103515245) + 12345) | 0;
    return ((a >>> 9) & 0xffff) / 0x10000;
  };
  for (let index = 0; index < 110; index += 1) {
    STARS.push({ x: next() * FIELD.width, y: next() * (FIELD.groundY - 60), r: 0.8 + next() * 1.7, p: next() * Math.PI * 2 });
  }
}

function cachedLabel(prefix, suffix = '') {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next + suffix;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0, ratio: 1 };
  const scoreLabel = cachedLabel('SCORE ');
  const levelLabel = cachedLabel('LEVEL ');
  const comboLabel = cachedLabel('COMBO x');
  const finalLabel = cachedLabel('Score ');
  const bestLabel = cachedLabel('Best ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.ratio = ratio;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, glow = 0) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    if (glow > 0) {
      context.shadowColor = color;
      context.shadowBlur = glow;
    }
    context.fillText(value, x, y);
    context.shadowBlur = 0;
  }

  function halo(x, y, radius, color) {
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.globalAlpha = 0.5;
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
  }

  function drawSky(state) {
    const gradient = context.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, PALETTE.skyTop);
    gradient.addColorStop(1, PALETTE.skyBottom);
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    for (const star of STARS) {
      const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(state.elapsed * 1.7 + star.p));
      context.globalAlpha = twinkle * 0.8;
      context.fillStyle = '#cfe8ff';
      context.beginPath();
      context.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    // The lit horizon and the dark ground below it.
    context.fillStyle = PALETTE.ground;
    context.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    context.shadowColor = PALETTE.groundGlow;
    context.shadowBlur = 16;
    context.fillStyle = PALETTE.groundGlow;
    context.fillRect(0, FIELD.groundY, FIELD.width, 2.5);
    context.shadowBlur = 0;
  }

  function drawShard(item) {
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    const r = item.width / 2;
    halo(cx, cy, r * 1.9, 'rgba(255, 71, 87, 0.55)');
    context.save();
    context.translate(cx, cy);
    context.rotate(item.spin);
    context.beginPath();
    const points = 7;
    for (let index = 0; index < points; index += 1) {
      const angle = (index / points) * Math.PI * 2;
      const radius = index % 2 === 0 ? r : r * 0.55;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (index === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();
    context.fillStyle = PALETTE.shardCore;
    context.shadowColor = PALETTE.shard;
    context.shadowBlur = 14;
    context.fill();
    context.strokeStyle = PALETTE.shard;
    context.lineWidth = 2.5;
    context.stroke();
    context.restore();
    context.shadowBlur = 0;
  }

  function drawMote(item, color, core) {
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    const pulse = 1 + 0.12 * Math.sin(item.phase * 3 + item.spin * 2.4);
    const r = (item.width / 2) * pulse;
    halo(cx, cy, r * 2.3, color);
    context.beginPath();
    context.arc(cx, cy, r, 0, Math.PI * 2);
    context.fillStyle = color;
    context.shadowColor = color;
    context.shadowBlur = 18;
    context.fill();
    context.shadowBlur = 0;
    context.beginPath();
    context.arc(cx, cy, r * 0.42, 0, Math.PI * 2);
    context.fillStyle = core;
    context.fill();
  }

  function drawPlayer(state) {
    const player = state.player;
    // Blink while invulnerable after a hit: hidden on every other tenth of a second.
    if (player.invulnerable !== 0 && Math.floor(player.invulnerable * 10) % 2 === 0) return;
    const cx = player.x + player.width / 2;
    const cy = player.y + player.height / 2;
    // Ground reflection.
    context.globalAlpha = 0.25;
    context.beginPath();
    context.ellipse(cx, FIELD.groundY + 16, player.width * 0.5, 7, 0, 0, Math.PI * 2);
    context.fillStyle = PALETTE.player;
    context.fill();
    context.globalAlpha = 1;
    halo(cx, cy, 64, 'rgba(55, 224, 255, 0.6)');
    // The capture crescent: an open ring the motes fall into.
    context.beginPath();
    context.arc(cx, cy, 30, Math.PI * 1.08, Math.PI * 1.92);
    context.strokeStyle = PALETTE.player;
    context.lineWidth = 7;
    context.lineCap = 'round';
    context.shadowColor = PALETTE.player;
    context.shadowBlur = 16;
    context.stroke();
    context.shadowBlur = 0;
    // The orb's bright core.
    const gradient = context.createRadialGradient(cx - 6, cy - 6, 2, cx, cy, 21);
    gradient.addColorStop(0, PALETTE.playerCore);
    gradient.addColorStop(1, PALETTE.player);
    context.beginPath();
    context.arc(cx, cy, 20, 0, Math.PI * 2);
    context.fillStyle = gradient;
    context.fill();
  }

  function drawParticles(state) {
    context.globalCompositeOperation = 'lighter';
    for (const p of state.particles) {
      if (!p.active) continue;
      context.globalAlpha = Math.max(0, p.life / p.maxLife);
      context.fillStyle = p.color;
      context.beginPath();
      context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
  }

  function drawField(state) {
    drawSky(state);
    for (const item of state.items) {
      if (!item.active) continue;
      if (item.kind === KIND_SHARD) drawShard(item);
      else if (item.kind === KIND_GOLD) drawMote(item, PALETTE.gold, '#fff7d6');
      else drawMote(item, PALETTE.mote, '#eafcff');
    }
    drawPlayer(state);
    drawParticles(state);
  }

  function drawHud(state) {
    context.textBaseline = 'top';
    text(scoreLabel(state.score), 24, 18, 30, PALETTE.text, 'left', 8);
    text(levelLabel(state.level), 24, 54, 19, PALETTE.muted, 'left');
    if (state.combo > 1) {
      const hot = state.multiplier >= 3;
      text(comboLabel(state.multiplier), FIELD.width / 2, 18, 30, hot ? PALETTE.gold : PALETTE.combo, 'center', 12);
      text(state.combo + ' caught in a row', FIELD.width / 2, 54, 17, PALETTE.muted, 'center');
    }
    const firstLife = FIELD.width - 24 - LIVES * (LIFE_SIZE + LIFE_GAP) + LIFE_GAP;
    text('LIVES', firstLife - 14, 20, 24, PALETTE.text, 'right');
    for (let life = 0; life < LIVES; life += 1) {
      const cx = firstLife + life * (LIFE_SIZE + LIFE_GAP) + LIFE_SIZE / 2;
      const cy = 30;
      context.beginPath();
      context.arc(cx, cy, LIFE_SIZE / 2, 0, Math.PI * 2);
      if (life < state.lives) {
        context.fillStyle = PALETTE.player;
        context.shadowColor = PALETTE.player;
        context.shadowBlur = 10;
      } else {
        context.fillStyle = '#232842';
        context.shadowBlur = 0;
      }
      context.fill();
      context.shadowBlur = 0;
    }
  }

  function drawPanel(title, lines, prompt, titleSize = 52) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.beginPath();
    context.roundRect(x, y, PANEL.width, height, 18);
    context.fillStyle = PALETTE.panel;
    context.shadowColor = PALETTE.panelEdge;
    context.shadowBlur = 24;
    context.fill();
    context.shadowBlur = 0;
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.stroke();
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 84, titleSize, PALETTE.player, 'center', 22);
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 22, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 24, PALETTE.gold, 'center', 10);
  }

  const TITLE_LINES = [
    'Catch the falling light. Build your combo.',
    'Golden motes are worth five. Shards cost a life.',
    'Move with the mouse, or with the arrow keys or A D.',
    '',
  ];
  const PAUSED_LINES = ['The light will wait for you.'];
  const OVER_LINES = ['', ''];

  /** Paint one frame: the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const shakeX = state.shake > 0 ? Math.sin(state.elapsed * 91) * state.shake : 0;
    const shakeY = state.shake > 0 ? Math.cos(state.elapsed * 77) * state.shake * 0.6 : 0;
    context.setTransform(view.scale, 0, 0, view.scale, view.x + shakeX * view.scale, view.y + shakeY * view.scale);
    drawField(state);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[3] = bestLabel(best);
      drawPanel('LUMENFALL', TITLE_LINES, 'Press Space or click to play');
      return;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', PAUSED_LINES, 'Press P to resume', 44);
    else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(state.score);
      OVER_LINES[1] = bestLabel(best);
      drawPanel('The light fades', OVER_LINES, 'Press Space or click to play again', 44);
    }
  }

  /** The playfield's rectangle in CSS pixels, for turning pointer positions into field x. */
  function fieldRect() {
    return {
      x: view.x / view.ratio,
      width: (FIELD.width * view.scale) / view.ratio,
    };
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, fieldRect };
}
