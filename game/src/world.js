// The game's rules and state, with no drawing and no browser in it: the player's light orb, the
// pool of falling motes, golden motes and void shards, spawning, collisions, score, combo,
// lives, level and the particle bursts the renderer paints. step() advances one fixed step and
// returns what happened as bit flags, so the caller can react without the world knowing about
// screens or sound. Nothing here allocates after createWorld returns.
import { COMBO, FIELD, GOLD, LEVEL, LIVES, MOTE, PARTICLE_POOL, PLAYER, POOL_SIZE, SHARD } from './config.js';

export const KIND_MOTE = 0;
export const KIND_GOLD = 1;
export const KIND_SHARD = 2;

export const EVENT_CATCH = 1;
export const EVENT_GOLD = 2;
export const EVENT_HIT = 4;
export const EVENT_OVER = 8;
export const EVENT_LEVEL = 16;
export const EVENT_MISS = 32;

function overlaps(item, player) {
  return item.x < player.x + player.width && item.x + item.width > player.x
    && item.y < player.y + player.height && item.y + item.height > player.y;
}

export function createWorld(random) {
  const player = { x: 0, y: FIELD.groundY - PLAYER.height, width: PLAYER.width, height: PLAYER.height, invulnerable: 0 };
  const items = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    items.push({ active: false, kind: KIND_MOTE, x: 0, y: 0, width: 0, height: 0, speed: 0, phase: 0, driftAmp: 0, spin: 0 });
  }
  const particles = [];
  for (let index = 0; index < PARTICLE_POOL; index += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#ffffff' });
  }
  const state = {
    player, items, particles,
    score: 0, lives: LIVES, level: 1, elapsed: 0,
    combo: 0, comboTimer: 0, multiplier: 1,
    moteTimer: 0, goldTimer: 0, shardTimer: 0, shake: 0,
  };

  function burst(x, y, color, count, speed) {
    let spawned = 0;
    for (let index = 0; index < particles.length && spawned < count; index += 1) {
      const p = particles[index];
      if (p.active) continue;
      const angle = random() * Math.PI * 2;
      const velocity = speed * (0.3 + random() * 0.7);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * velocity;
      p.vy = Math.sin(angle) * velocity - speed * 0.35;
      p.maxLife = 0.35 + random() * 0.45;
      p.life = p.maxLife;
      p.size = 1.5 + random() * 2.5;
      p.color = color;
      spawned += 1;
    }
  }

  function reset() {
    player.x = (FIELD.width - player.width) / 2;
    player.invulnerable = 0;
    for (const item of items) item.active = false;
    for (const p of particles) p.active = false;
    state.score = 0;
    state.lives = LIVES;
    state.level = 1;
    state.elapsed = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.multiplier = 1;
    state.moteTimer = 0.35;
    state.goldTimer = GOLD.interval;
    state.shardTimer = SHARD.interval;
    state.shake = 0;
  }

  function freeItem() {
    for (let index = 0; index < items.length; index += 1) if (!items[index].active) return items[index];
    return null;
  }

  function spawn(kind, spec, speed) {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = kind;
    item.width = spec.size;
    item.height = spec.size;
    item.x = random() * (FIELD.width - spec.size);
    item.y = -spec.size;
    item.speed = speed;
    item.phase = random() * Math.PI * 2;
    item.driftAmp = spec.driftAmp;
    item.spin = random() * Math.PI * 2;
  }

  function shardInterval() {
    return Math.max(SHARD.minInterval, SHARD.interval * SHARD.intervalScale ** (state.level - 1));
  }

  function catchValue(base) {
    return base * state.multiplier;
  }

  function gainCombo(amount) {
    state.combo += amount;
    state.comboTimer = COMBO.window;
    state.multiplier = Math.min(COMBO.maxMultiplier, 1 + Math.floor(state.combo / COMBO.perStep));
  }

  /**
   * One fixed step. `direction` is -1, 0 or 1 (left, still, right). With `harmless` set (the
   * title screen's backdrop) things fall but nothing touches the player and nothing scores.
   */
  function step(dt, direction, harmless) {
    let events = 0;
    state.elapsed += dt;
    const nextLevel = Math.min(LEVEL.max, 1 + Math.floor(state.elapsed / LEVEL.seconds));
    if (nextLevel !== state.level) {
      state.level = nextLevel;
      events |= EVENT_LEVEL;
    }

    player.x = Math.min(FIELD.width - player.width, Math.max(0, player.x + direction * PLAYER.speed * dt));
    if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);
    if (state.comboTimer > 0) {
      state.comboTimer = Math.max(0, state.comboTimer - dt);
      if (state.comboTimer === 0) {
        state.combo = 0;
        state.multiplier = 1;
      }
    }
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 34);

    state.moteTimer -= dt;
    if (state.moteTimer <= 0) {
      spawn(KIND_MOTE, MOTE, MOTE.speed + MOTE.speedPerLevel * (state.level - 1));
      state.moteTimer += MOTE.interval + random() * MOTE.intervalJitter;
    }
    state.goldTimer -= dt;
    if (state.goldTimer <= 0) {
      spawn(KIND_GOLD, GOLD, GOLD.speed + GOLD.speedPerLevel * (state.level - 1));
      state.goldTimer += GOLD.interval + random() * GOLD.intervalJitter;
    }
    state.shardTimer -= dt;
    if (state.shardTimer <= 0) {
      spawn(KIND_SHARD, SHARD, SHARD.speed + SHARD.speedPerLevel * (state.level - 1) + random() * SHARD.speedJitter);
      state.shardTimer += shardInterval();
    }

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      item.y += item.speed * dt;
      item.x += Math.sin(state.elapsed * 2.1 + item.phase) * item.driftAmp * dt;
      if (item.x < 0) item.x = 0;
      if (item.x > FIELD.width - item.width) item.x = FIELD.width - item.width;
      item.spin += dt * 1.7;
      if (item.y > FIELD.groundY) {
        item.active = false;
        if (!harmless) {
          if (item.kind === KIND_SHARD) {
            state.score += SHARD.dodgePoints;
            burst(item.x + item.width / 2, FIELD.groundY, '#ff4757', 5, 120);
          } else if (item.kind === KIND_MOTE && state.combo > 0) {
            state.combo = 0;
            state.multiplier = 1;
            state.comboTimer = 0;
            events |= EVENT_MISS;
          }
        }
        continue;
      }
      if (harmless || !overlaps(item, player)) continue;
      const cx = item.x + item.width / 2;
      const cy = item.y + item.height / 2;
      if (item.kind === KIND_MOTE) {
        item.active = false;
        state.score += catchValue(MOTE.points);
        gainCombo(1);
        burst(cx, cy, '#37e0ff', 10, 170);
        events |= EVENT_CATCH;
      } else if (item.kind === KIND_GOLD) {
        item.active = false;
        state.score += catchValue(GOLD.points);
        gainCombo(GOLD.comboGain);
        burst(cx, cy, '#ffd94d', 18, 230);
        events |= EVENT_GOLD;
      } else if (player.invulnerable === 0) {
        item.active = false;
        state.lives -= 1;
        player.invulnerable = PLAYER.invulnerable;
        state.shake = 13;
        state.combo = 0;
        state.multiplier = 1;
        state.comboTimer = 0;
        burst(cx, cy, '#ff4757', 22, 280);
        events |= EVENT_HIT;
        if (state.lives === 0) {
          events |= EVENT_OVER;
          break;
        }
      }
    }

    for (let index = 0; index < particles.length; index += 1) {
      const p = particles[index];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.vy += 340 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    return events;
  }

  reset();
  return { state, reset, step };
}
