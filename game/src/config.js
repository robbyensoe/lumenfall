// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical area;
// the renderer scales it to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720, groundY: 656 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  width: 88,
  height: 40,
  speed: 620,
  invulnerable: 1.2,
};

export const LIVES = 3;

/** A mote of light: catch it for points and combo. Missing one breaks the combo. */
export const MOTE = {
  size: 30,
  speed: 205,
  speedPerLevel: 13,
  interval: 0.85,
  intervalJitter: 0.5,
  points: 10,
  driftAmp: 34,
};

/** A golden mote: rare, slow, worth five motes and a chunk of combo. */
export const GOLD = {
  size: 34,
  speed: 165,
  speedPerLevel: 8,
  interval: 8.5,
  intervalJitter: 4,
  points: 50,
  comboGain: 3,
  driftAmp: 22,
};

/** A void shard: catching one costs a life. Letting it shatter on the ground scores a point. */
export const SHARD = {
  size: 40,
  speed: 245,
  speedPerLevel: 27,
  speedJitter: 80,
  interval: 0.62,
  intervalScale: 0.885,
  minInterval: 0.15,
  dodgePoints: 1,
  driftAmp: 14,
};

/** Catching motes builds combo; every COMBO.perStep catches raise the score multiplier by one. */
export const COMBO = { window: 2.6, perStep: 8, maxMultiplier: 5 };

/** Seconds of play per level, and the last level: speeds and spawn rates stop growing there. */
export const LEVEL = { seconds: 12, max: 12 };

/** How many falling things can exist at once; the pool is allocated once, at boot. */
export const POOL_SIZE = 72;

/** How many particles can exist at once; the pool is allocated once, at boot. */
export const PARTICLE_POOL = 180;

export const PALETTE = {
  backdrop: '#05060f',
  skyTop: '#0a0d26',
  skyBottom: '#141038',
  groundGlow: '#1de9ff',
  ground: '#0a0c1e',
  player: '#37e0ff',
  playerCore: '#eafcff',
  mote: '#37e0ff',
  gold: '#ffd94d',
  shard: '#ff4757',
  shardCore: '#2a0d12',
  panel: 'rgba(10, 13, 34, 0.88)',
  panelEdge: '#37e0ff',
  text: '#eef6ff',
  muted: '#9aa7c7',
  combo: '#ffb84d',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'lumenfall.best';
