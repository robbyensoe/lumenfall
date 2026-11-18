# Lumenfall

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/robbyensoe/lumenfall/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/robbyensoe/lumenfall/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

An original neon arcade game for the make.fun bounty
[Make the best game](https://make.fun/bounty/best-game-01).

Catch the falling light. You are the last light orb above a dark horizon. Motes of light rain
from the sky: catch them to score and build a combo that raises your multiplier, up to x5.
Golden motes are rare and worth five. Void shards fall with the light: one touch costs a life,
and three lives are all you get. Every twelve seconds the fall quickens. Miss a mote and your
combo breaks.

**Play:** mouse, arrow keys or A/D to move. Space or click to start and restart. P pauses.
Sound is synthesized live with WebAudio; there are no audio files and no network requests.
The game is plain static files under `game/` and plays offline in a desktop browser.

**Run it locally:**

```
node serve.ts          # serves game/ at http://localhost:8080
```

**Hand it in (what the harness runs):**

```
MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and writes
`dossier.json` with the vendored make.fun library in `vendor/`. The screenshots are real
renders of the game's own deterministic scenes (`?shot=start|play|end&seed=1`), taken in a
browser at 1280x720.

MIT licensed. Built by robbyensoe with Muse.
