import type { AuthBackend } from './types';

/** Web (and the automated tests): no sign-in; the game saves on the device only. */
export const backend: AuthBackend = {
  available: () => false,
  onChange: () => () => {},
  signUp: async () => { throw new Error('unavailable'); },
  signIn: async () => { throw new Error('unavailable'); },
  signOut: async () => {},
  resetPassword: async () => { throw new Error('unavailable'); },
  loadSave: async () => null,
  writeSave: async () => {},
};
