// Tiny synthesized sound: a WebAudio oscillator and a gain envelope, nothing loaded from a
// file. The context is created lazily on the first user gesture (browsers refuse audio before
// one). Every effect is a short blip whose pitch or shape says what happened: catches rise
// with the combo, gold chimes twice, a shard hit drops hard, game over descends.

export function createSound() {
  let context = null;
  let master = null;

  function ensure() {
    if (context !== null) {
      if (context.state === 'suspended') context.resume();
      return true;
    }
    try {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return false;
      context = new AudioCtor();
      master = context.createGain();
      master.gain.value = 0.16;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freqFrom, freqTo, seconds, type, volume, delay = 0) {
    if (!ensure()) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freqFrom, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, freqTo), start + seconds);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + seconds + 0.02);
  }

  return {
    /** Call from a click or key press so the browser allows the context to start. */
    unlock() {
      ensure();
    },
    catch(combo) {
      tone(520 + Math.min(combo, 24) * 26, 760 + Math.min(combo, 24) * 26, 0.09, 'sine', 0.5);
    },
    gold() {
      tone(880, 880, 0.1, 'sine', 0.5);
      tone(1318, 1318, 0.16, 'sine', 0.45, 0.07);
    },
    hit() {
      tone(170, 42, 0.28, 'sawtooth', 0.6);
    },
    miss() {
      tone(210, 150, 0.06, 'square', 0.12);
    },
    level() {
      tone(660, 660, 0.07, 'triangle', 0.4);
      tone(990, 990, 0.1, 'triangle', 0.4, 0.06);
    },
    over() {
      tone(392, 392, 0.16, 'triangle', 0.5);
      tone(311, 311, 0.16, 'triangle', 0.5, 0.15);
      tone(233, 220, 0.34, 'triangle', 0.5, 0.3);
    },
  };
}
