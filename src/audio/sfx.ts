import { AppState } from 'react-native';
import type { AudioPlayer } from 'expo-audio';

/**
 * Sound effects. expo-audio is a native module: until the app is rebuilt with it linked, the
 * require throws, so it is deferred behind a try/catch (as in the ads module) and every call
 * below is then a silent no-op instead of a crash. A missing sound must never stop the game.
 */
let mod: typeof import('expo-audio') | null | undefined;

function getModule() {
  if (mod !== undefined) return mod;
  try {
    mod = require('expo-audio');
  } catch {
    mod = null;
  }
  return mod;
}

/** Trimmed and compressed from longer original recordings (see README). */
const SOUNDS = {
  jump: require('../../assets/sounds/jump.mp3'),
  unlock: require('../../assets/sounds/unlock.mp3'),
  stageComplete: require('../../assets/sounds/stage_complete.mp3'),
  bossWin: require('../../assets/sounds/boss_win.mp3'),
  explosion: require('../../assets/sounds/explosion.mp3'),
  jet: require('../../assets/sounds/jet.mp3'),
} as const;

type SoundId = keyof typeof SOUNDS;
/** The engine's looping sound while flying. */
export type MotionSound = 'jet' | null;

const VOLUME: Partial<Record<SoundId, number>> = { jet: 0.45, jump: 0.8 };

const players: Partial<Record<SoundId, AudioPlayer | null>> = {};

function player(id: SoundId): AudioPlayer | null {
  if (players[id] !== undefined) return players[id]!;
  const m = getModule();
  let p: AudioPlayer | null = null;
  if (m) {
    try {
      p = m.createAudioPlayer(SOUNDS[id]);
      p.volume = VOLUME[id] ?? 1;
      if (id === 'jet') p.loop = true;
    } catch {
      p = null;
    }
  }
  players[id] = p;
  return p;
}

function playOnce(id: SoundId) {
  const p = player(id);
  if (!p) return;
  p.seekTo(0)
    .catch(() => {})
    .finally(() => {
      try {
        p.play();
      } catch {
        // best-effort
      }
    });
}

let motion: MotionSound = null;
let active = AppState.currentState === 'active';

function applyMotion() {
  for (const id of ['jet'] as const) {
    const p = players[id] ?? (motion === id ? player(id) : null);
    if (!p) continue;
    try {
      if (active && motion === id) {
        if (!p.playing) p.play();
      } else if (p.playing) p.pause();
    } catch {
      // best-effort
    }
  }
}

/** Called every frame by the scene; only acts when the rocket's engine starts or stops. */
export function setMotionSound(next: MotionSound) {
  if (next === motion) return;
  motion = next;
  applyMotion();
}

// no engine noise from a phone in a pocket
AppState.addEventListener('change', (s) => {
  active = s === 'active';
  applyMotion();
});

/** A part snaps onto the rocket. */
export const playJump = () => playOnce('jump');
/** Lift-off, a new flight, an upgrade bought. */
export const playUnlock = () => playOnce('unlock');
/** A hazard hit the rocket. */
export const playExplosion = () => playOnce('explosion');
/** The rocket reached the last checkpoint; boss stages get the bigger fanfare. */
export const playStageComplete = (boss: boolean) => playOnce(boss ? 'bossWin' : 'stageComplete');
