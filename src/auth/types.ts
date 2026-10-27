/** What the sign-in layer needs from Firebase (client.ts), or nothing at all on web (client.web.ts). */
export type AuthUser = { uid: string; email: string; name: string | null };

export type AuthBackend = {
  /** False on web, and on a build without this app in google-services.json. */
  available(): boolean;
  onChange(cb: (user: AuthUser | null) => void): () => void;
  signUp(email: string, password: string, name: string): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  /** The game's cloud save: a `spaceBolt` field on the player's users/{uid} document. */
  loadSave(uid: string): Promise<unknown | null>;
  writeSave(uid: string, save: unknown): Promise<void>;
};

/** Firebase error codes → words a player understands. */
const MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'That email already has an account. Try signing in.',
  'auth/invalid-email': "That doesn't look like an email address.",
  'auth/weak-password': 'Use a password of at least 8 characters.',
  'auth/wrong-password': 'Wrong email or password.',
  'auth/user-not-found': 'Wrong email or password.',
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/too-many-requests': 'Too many tries. Wait a moment and try again.',
  'auth/network-request-failed': "Couldn't connect. Check your internet.",
};

export function authErrorMessage(e: unknown, fallback: string) {
  const code = (e as { code?: string } | null)?.code;
  return (code && MESSAGES[code]) || fallback;
}
