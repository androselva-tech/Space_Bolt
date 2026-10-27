import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { gameStore, mergeProfiles, profileFrom } from '../game/store';
import { backend } from './client';
import { authErrorMessage, type AuthUser } from './types';

/**
 * Optional sign-in. Signed out, the game saves on the device as always. Signed in, progress is
 * also kept in the cloud: on sign-in the device and cloud saves are merged (nothing is lost on
 * either side), and every change after that is uploaded a few seconds later.
 */
export type AuthScreen = 'login' | 'signup' | 'forgot';

type Session = {
  available: boolean;
  user: AuthUser | null;
  /** The sign-in sheet that's open, if any. */
  screen: AuthScreen | null;
  busy: boolean;
  error: string | null;
  /** A success note ("Check your email…"). */
  info: string | null;
  syncedAt: number | null;
  syncError: boolean;
};

export const sessionStore = createStore<Session>()(() => ({
  available: false, user: null, screen: null, busy: false, error: null, info: null, syncedAt: null, syncError: false,
}));
export const useSession = <T,>(sel: (s: Session) => T) => useStore(sessionStore, sel);

const set = sessionStore.setState;
let pushTimer: ReturnType<typeof setTimeout> | undefined;

async function push() {
  const user = sessionStore.getState().user;
  if (!user) return;
  try {
    await backend.writeSave(user.uid, gameStore.getState().profile);
    set({ syncedAt: Date.now(), syncError: false });
  } catch {
    set({ syncError: true });
  }
}

/** Merge this device's save with the cloud's, use the result here, and upload it. */
async function pull(user: AuthUser) {
  try {
    const cloud = profileFrom(await backend.loadSave(user.uid));
    if (cloud) gameStore.getState().adoptProfile(mergeProfiles(gameStore.getState().profile, cloud));
  } catch {
    set({ syncError: true });
  }
  await push();
}

let started = false;
/** Call once at startup. */
export function startSession() {
  if (started) return;
  started = true;
  const available = backend.available();
  set({ available });
  if (!available) return;
  backend.onChange((user) => {
    set({ user });
    if (user) pull(user);
  });
  // every change to the player's progress is uploaded a few seconds later
  gameStore.subscribe((s, prev) => {
    if (s.profile === prev.profile || !sessionStore.getState().user) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(push, 4000);
  });
}

async function run(task: () => Promise<unknown>, fallback: string, done?: Partial<Session>) {
  set({ busy: true, error: null, info: null });
  try {
    await task();
    set({ busy: false, ...done });
  } catch (e) {
    set({ busy: false, error: authErrorMessage(e, fallback) });
  }
}

export const auth = {
  open: (screen: AuthScreen) => set({ screen, error: null, info: null }),
  close: () => set({ screen: null, error: null, info: null }),
  signUp: (email: string, password: string, name: string) =>
    run(() => backend.signUp(email, password, name), "Couldn't create the account. Try again.", { screen: null }),
  signIn: (email: string, password: string) =>
    run(() => backend.signIn(email, password), "Couldn't sign in. Try again.", { screen: null }),
  resetPassword: (email: string) =>
    run(() => backend.resetPassword(email), "Couldn't send the email. Try again.", { info: 'If that email has an account, a reset link is on its way.' }),
  signOut: async () => {
    await push(); // last changes up first
    await backend.signOut().catch(() => {});
    set({ user: null, syncedAt: null });
  },
};
