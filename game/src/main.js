// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The
// game moves between four screens: title, play, paused and game over. Sound is synthesized
// (sound.js) and driven by the world's event flags.
//
// ?seed=N fixes the falling pattern. ?shot=start|play|end (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, FIELD, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CATCH, EVENT_GOLD, EVENT_HIT, EVENT_LEVEL, EVENT_MISS, EVENT_OVER, KIND_SHARD } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createSound } from './sound.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const sound = createSound();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    sound.unlock();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Playing. ${LIVES} lives.`);
  }

  function endGame() {
    screen = SCREEN_OVER;
    sound.over();
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Game over. Score ${world.state.score}. Best ${best}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  /** Steering for one step: a held key wins; otherwise steer toward the pointer when it is known. */
  function steer() {
    const keyDirection = input.direction();
    if (keyDirection !== 0) {
      input.clearPointer();
      return keyDirection;
    }
    const clientX = input.pointerClientX();
    if (clientX === null) return 0;
    const rect = renderer.fieldRect();
    const target = ((clientX - rect.x) / rect.width) * FIELD.width;
    const centre = world.state.player.x + world.state.player.width / 2;
    if (target > centre + 7) return 1;
    if (target < centre - 7) return -1;
    return 0;
  }

  /** On the title screen the orb drifts after the lowest mote, so the backdrop feels alive. */
  function attractDirection() {
    const state = world.state;
    let prize = null;
    for (const item of state.items) {
      if (item.active && item.kind !== KIND_SHARD && (prize === null || item.y > prize.y)) prize = item;
    }
    if (prize === null) return 0;
    const target = prize.x + prize.width / 2;
    const centre = state.player.x + state.player.width / 2;
    if (target > centre + 10) return 1;
    if (target < centre - 10) return -1;
    return 0;
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, attractDirection(), true);
      return;
    }
    const events = world.step(STEP, steer(), false);
    if (events & EVENT_CATCH) sound.catch(world.state.combo);
    if (events & EVENT_GOLD) sound.gold();
    if (events & EVENT_MISS) sound.miss();
    if (events & EVENT_LEVEL) sound.level();
    if (events & EVENT_HIT) {
      sound.hit();
      announce(world.state.lives === 1 ? 'Hit by a shard. 1 life left.' : `Hit by a shard. ${world.state.lives} lives left.`);
    }
    if (events & EVENT_OVER) endGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting the light fall unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Lumenfall. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
